import webPush from 'web-push';

import { PushSubscriptionModel } from '../../models/push-subscription.model.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Configure VAPID keys
if (config.vapidPublicKey && config.vapidPrivateKey) {
  webPush.setVapidDetails(
    config.vapidEmail,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

export class NotificationService {
  /**
   * Store a push subscription for a user
   */
  async subscribe(
    userId: string,
    subscription: { endpoint: string; p256dh: string; auth: string }
  ) {
    const existing = await PushSubscriptionModel.findOne({
      userId,
      endpoint: subscription.endpoint,
    });

    if (existing) {
      existing.keys = { p256dh: subscription.p256dh, auth: subscription.auth };
      await existing.save();
      return existing;
    }

    const doc = await PushSubscriptionModel.create({
      userId,
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    });

    logger.info({ userId }, 'Push subscription created');
    return doc;
  }

  /**
   * Remove a push subscription
   */
  async unsubscribe(userId: string, endpoint: string) {
    await PushSubscriptionModel.findOneAndDelete({ userId, endpoint });
    logger.info({ userId }, 'Push subscription removed');
  }

  /**
   * Get all subscriptions for a user
   */
  async getSubscriptions(userId: string) {
    return PushSubscriptionModel.find({ userId });
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const subscriptions = await PushSubscriptionModel.find({ userId });

    if (subscriptions.length === 0) {
      logger.debug({ userId }, 'No push subscriptions found');
      return;
    }

    const notificationPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            notificationPayload
          );
          return { success: true };
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await PushSubscriptionModel.findByIdAndDelete(sub._id);
            logger.info({ userId, endpoint: sub.endpoint }, 'Expired subscription removed');
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info({ userId, successful, failed }, 'Push notifications sent');
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map((userId) => this.sendToUser(userId, payload)));
  }

  /**
   * Send new message notification
   */
  async sendNewMessageNotification(
    recipientId: string,
    senderName: string,
    content: string,
    conversationId: string
  ) {
    await this.sendToUser(recipientId, {
      title: senderName,
      body: content.length > 100 ? content.slice(0, 100) + '...' : content,
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      data: { conversationId, type: 'new_message' },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Check if push notifications are configured
   */
  isConfigured(): boolean {
    return !!(config.vapidPublicKey && config.vapidPrivateKey);
  }
}

export const notificationService = new NotificationService();
