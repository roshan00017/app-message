import Redis from 'ioredis';
import { Queue, Worker, type Job } from 'bullmq';

import { config } from '../config/env.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../utils/logger.js';

interface PushNotificationJobData {
  userId: string;
  title: string;
  body: string;
  conversationId?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

// BullMQ requires a separate Redis connection without maxRetriesPerRequest
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const pushQueue = new Queue<PushNotificationJobData>('push-notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 15s, 45s
    },
    removeOnComplete: true,
    removeOnFail: 100, // Keep last 100 failed jobs
  },
});

let worker: Worker<PushNotificationJobData> | null = null;

/**
 * Start the push notification worker
 */
export function startPushWorker(): Worker<PushNotificationJobData> {
  if (worker) {
    logger.warn('Push worker already running');
    return worker;
  }

  worker = new Worker<PushNotificationJobData>(
    'push-notifications',
    async (job: Job<PushNotificationJobData>) => {
      const { userId, title, body, conversationId, icon, data } = job.data;

      logger.info({ jobId: job.id, userId }, 'Processing push notification job');

      await notificationService.sendToUser(userId, {
        title,
        body,
        icon: icon || '/favicon.svg',
        badge: '/favicon.svg',
        data: { conversationId, ...data },
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });

      logger.info({ jobId: job.id, userId }, 'Push notification job completed');
      return { success: true };
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 60000, // Max 100 notifications per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Push notification job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message, userId: job?.data.userId },
      'Push notification job failed'
    );
  });

  worker.on('error', (error) => {
    logger.error({ err: error }, 'Push worker error');
  });

  logger.info('Push notification worker started');
  return worker;
}

/**
 * Stop the push notification worker
 */
export async function stopPushWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Push notification worker stopped');
  }
}

/**
 * Queue a push notification for delivery
 */
export async function queuePushNotification(
  data: PushNotificationJobData
): Promise<Job<PushNotificationJobData> | null> {
  try {
    // Skip if VAPID keys not configured
    if (!notificationService.isConfigured()) {
      logger.debug('Push notifications not configured, skipping');
      return null;
    }

    const job = await pushQueue.add('send', data, {
      priority: data.conversationId ? 1 : 5, // Conversations get higher priority
    });

    logger.debug({ jobId: job.id, userId: data.userId }, 'Push notification queued');
    return job;
  } catch (error) {
    logger.error({ err: error, userId: data.userId }, 'Failed to queue push notification');
    return null;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    pushQueue.getWaitingCount(),
    pushQueue.getActiveCount(),
    pushQueue.getCompletedCount(),
    pushQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
