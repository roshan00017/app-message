import type { Server as HttpServer } from 'http';
import type { Server } from 'socket.io';
import mongoose from 'mongoose';

import { getRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { ConversationModel } from '../models/conversation.model.js';
import { analyticsService } from '../modules/analytics/analytics.service.js';
import { conversationEvents, CONVERSATION_EVENTS } from '../services/conversation-events.js';
import { statusService } from '../services/status.service.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { initializeSocket } from './index.js';
import { socketAuthMiddleware } from './middleware/auth.middleware.js';
import { socketErrorHandler } from './middleware/error.middleware.js';

/**
 * When a user connects, mark all pending `sent` messages as `delivered`
 * across all their conversations. This handles the case where messages
 * were sent while the user was offline.
 */
async function deliverPendingMessages(io: Server, userId: string): Promise<void> {
  try {
    const conversations = await ConversationModel.find({
      participants: new mongoose.Types.ObjectId(userId),
    }).select('_id').lean();

    for (const conv of conversations) {
      const convId = (conv._id as mongoose.Types.ObjectId).toString();
      const result = await statusService.markAsDelivered(convId, userId);

      if (result.modifiedCount > 0) {
        // Broadcast status update to the conversation room
        io.to(`conversation:${convId}`).emit(SOCKET_EVENTS.MESSAGE_STATUS, {
          conversationId: convId,
          userId,
          status: 'delivered' as const,
          timestamp: new Date(),
          modifiedCount: result.modifiedCount,
        });

        logger.info(
          { userId, conversationId: convId, count: result.modifiedCount },
          'Auto-delivered pending messages on reconnect'
        );
      }
    }
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to deliver pending messages on reconnect');
  }
}

export async function setupSocket(httpServer: HttpServer): Promise<Server> {
  const io = await initializeSocket(httpServer);
  const redis = getRedisConnection();

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info({ userId: socket.data.userId, socketId: socket.id }, 'Socket connected');

    // Join user-specific room for direct messaging (unread counts, etc.)
    if (socket.data.userId && socket.data.userId !== 'anonymous') {
      socket.join(`user:${socket.data.userId}`);
    }

    registerRoomHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket, redis);
    registerTypingHandlers(io, socket);
    socketErrorHandler(socket);

    // Auto-deliver pending messages for this user (handles offline → online)
    if (socket.data.userId && socket.data.userId !== 'anonymous') {
      deliverPendingMessages(io, socket.data.userId);
    }

    // Analytics room subscription
    socket.on(SOCKET_EVENTS.ANALYTICS_SUBSCRIBE, async () => {
      const user = socket.data.user;
      if (user?.role === 'admin') {
        socket.join('analytics:global');
        logger.info({ userId: socket.data.userId }, 'Subscribed to analytics room');

        // Send initial metrics
        const metrics = await analyticsService.getRealtimeMetrics();
        socket.emit(SOCKET_EVENTS.ANALYTICS_UPDATE, metrics);
      }
    });

    socket.on(SOCKET_EVENTS.ANALYTICS_SUBSCRIBE + ':leave', () => {
      socket.leave('analytics:global');
    });

    socket.on('disconnect', () => {
      logger.info({ userId: socket.data.userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  // Subscribe to conversation events for real-time broadcasting
  conversationEvents.on(CONVERSATION_EVENTS.STATUS_CHANGED, (data) => {
    const { conversationId, status, participants } = data as import('../services/conversation-events.js').ConversationStatusChangeEvent;
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_STATUS_CHANGE, {
      conversationId,
      status,
    });
    // Also broadcast to each participant's user room
    for (const participantId of participants) {
      io.to(`user:${participantId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, {
        conversationId,
        status,
      });
    }
    logger.debug({ conversationId, status }, 'Broadcast conversation status change');
  });

  conversationEvents.on(CONVERSATION_EVENTS.AGENT_ASSIGNED, (data) => {
    const { conversationId, agentUserId, participants } = data as import('../services/conversation-events.js').AgentAssignedEvent;
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.AGENT_ASSIGNED, {
      conversationId,
      agentUserId,
    });
    for (const participantId of participants) {
      io.to(`user:${participantId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, {
        conversationId,
        agentUserId,
      });
    }
    logger.debug({ conversationId, agentUserId }, 'Broadcast agent assignment');
  });

  return io;
}
