import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';

import { CACHE_KEYS, SOCKET_EVENTS } from '@messaging/shared/constants';
import { AgentModel } from '../../models/agent.model.js';
import { ConversationModel } from '../../models/conversation.model.js';
import { analyticsService } from '../../modules/analytics/analytics.service.js';
import { conversationEvents, CONVERSATION_EVENTS } from '../../services/conversation-events.js';
import { logger } from '../../utils/logger.js';

/**
 * Presence TTL: 30 seconds.
 * If no heartbeat arrives within this window, the Redis key auto-expires
 * and other clients detect the user as offline via polling/subscription.
 * We do NOT immediately mark offline on disconnect — this handles
 * brief network interruptions, tab switches, and sleep mode gracefully.
 */
const PRESENCE_TTL_SECONDS = 30;

/**
 * Try to auto-assign an available agent to the oldest waiting conversation.
 * Called when an agent comes online or becomes available.
 */
async function tryAutoAssignWaiting(): Promise<void> {
  try {
    // Find the oldest waiting conversation (no assigned agent)
    const waiting = await ConversationModel.findOne({
      status: 'waiting',
      assignedAgent: null,
    }).sort({ createdAt: 1 }).lean();

    if (!waiting) return;

    // Find least-loaded available agent
    const agent = await AgentModel.findOne({
      isAvailable: true,
      status: 'online',
    }).sort({ currentChats: 1 }).lean();

    if (!agent) return;
    if (agent.currentChats >= agent.maxConcurrentChats) return;

    const conversationId = (waiting._id as mongoose.Types.ObjectId).toString();
    const agentId = (agent._id as mongoose.Types.ObjectId).toString();
    const agentUserId = (agent.userId as mongoose.Types.ObjectId).toString();

    // Atomically assign
    const updated = await ConversationModel.findOneAndUpdate(
      { _id: conversationId, status: 'waiting', assignedAgent: null },
      {
        $set: { assignedAgent: agent._id, status: 'active' },
        $addToSet: { participants: agent.userId },
      },
      { new: true },
    );

    if (!updated) return; // someone else got it

    await AgentModel.findByIdAndUpdate(agentId, { $inc: { currentChats: 1 } });

    // Collect all participant user IDs for notification
    const participantIds = updated.participants.map((p) => p.toString());

    conversationEvents.emit(CONVERSATION_EVENTS.AGENT_ASSIGNED, {
      conversationId,
      agentId,
      agentUserId,
      participants: participantIds,
    });

    conversationEvents.emit(CONVERSATION_EVENTS.STATUS_CHANGED, {
      conversationId,
      status: 'active',
      assignedAgent: agentId,
      participants: participantIds,
    });

    logger.info({ conversationId, agentId }, 'Auto-assigned waiting conversation on agent connect');
  } catch (err) {
    logger.warn({ err }, 'Auto-assign on agent connect failed');
  }
}

export function registerPresenceHandlers(io: Server, socket: Socket, redis: Redis): void {
  socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, async (data: { status: string }) => {
    try {
      const userId = socket.data.userId;
      const { status } = data;

      // Store presence with TTL — key expires automatically if no heartbeat
      await redis.set(
        `${CACHE_KEYS.USER_PRESENCE}:${userId}`,
        JSON.stringify({
          status,
          socketId: socket.id,
          lastSeen: new Date().toISOString(),
        }),
        'EX',
        PRESENCE_TTL_SECONDS
      );

      // For agents: sync status to MongoDB so auto-assignment queries work
      // Wrapped in its own try-catch so invalid userIds don't block the rest
      if (status === 'online' || status === 'offline') {
        try {
          if (mongoose.Types.ObjectId.isValid(userId)) {
            const agent = await AgentModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
            if (agent) {
              await AgentModel.findByIdAndUpdate(agent._id, {
                status: status === 'online' ? 'online' : 'offline',
                isAvailable: status === 'online',
              });
              logger.debug({ userId, agentId: agent._id, status }, 'Agent MongoDB status synced');

              if (status === 'online') {
                await tryAutoAssignWaiting();
              }
            }
          }
        } catch (agentErr) {
          logger.warn({ err: agentErr, userId }, 'Failed to sync agent status');
        }
      }

      // Broadcast presence change to all clients
      io.emit(SOCKET_EVENTS.PRESENCE_CHANGE, {
        userId,
        status,
        lastSeen: new Date(),
      });

      // Track analytics
      if (status === 'online') {
        await analyticsService.trackUserOnline(userId);
      } else if (status === 'offline') {
        await analyticsService.trackUserOffline(userId);
      }

      logger.debug({ event: 'presence:update', userId, status });
    } catch (error) {
      logger.error({ error, event: 'presence:update', userId: socket.data.userId });
    }
  });

  /**
   * On disconnect:
   * - Do NOT immediately set offline or delete the Redis key.
   * - The TTL (30s) handles the expiration naturally.
   * - For agents: after the TTL expires, if the key is gone we mark them
   *   offline in MongoDB. This handles brief network drops gracefully.
   */
  socket.on('disconnect', async () => {
    const userId = socket.data.userId;

    logger.info({ event: 'disconnect', userId, socketId: socket.id });

    try {
      // Track user offline in analytics only
      await analyticsService.trackUserOffline(userId);

      // For agents: schedule a delayed check after the presence TTL expires.
      // If the key is gone (no reconnect), mark agent offline in MongoDB.
      if (mongoose.Types.ObjectId.isValid(userId)) {
        try {
          const agent = await AgentModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
          if (agent) {
            const agentId = agent._id;
            setTimeout(async () => {
              try {
                const presenceKey = `${CACHE_KEYS.USER_PRESENCE}:${userId}`;
                const stillPresent = await redis.exists(presenceKey);
                if (!stillPresent) {
                  await AgentModel.findByIdAndUpdate(agentId, {
                    status: 'offline',
                    isAvailable: false,
                  });
                  logger.debug({ userId, agentId }, 'Agent marked offline after disconnect grace period');
                }
              } catch (err) {
                logger.error({ err, userId }, 'Failed delayed agent offline check');
              }
            }, (PRESENCE_TTL_SECONDS + 2) * 1000);
          }
        } catch (agentErr) {
          logger.warn({ err: agentErr, userId }, 'Failed to check agent on disconnect');
        }
      }
    } catch (error) {
      logger.error({ error, event: 'disconnect:cleanup', userId });
    }
  });
}
