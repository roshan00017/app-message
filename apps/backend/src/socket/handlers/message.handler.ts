import type { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { ConversationModel } from '../../models/conversation.model.js';
import { ConversationService } from '../../modules/conversations/conversation.service.js';
import { analyticsService } from '../../modules/analytics/analytics.service.js';
import { cacheService } from '../../services/cache.service.js';
import { queuePushNotification } from '../../services/queue.service.js';
import { statusService } from '../../services/status.service.js';
import { logger } from '../../utils/logger.js';

const conversationService = new ConversationService();

export function registerMessageHandlers(io: Server, socket: Socket): void {
  socket.on(
    SOCKET_EVENTS.MESSAGE_SEND,
    async (data: { conversationId: string; content: string; type?: 'text' | 'image' | 'file' }) => {
      try {
        const { conversationId, content, type = 'text' } = data;

        const message = await conversationService.sendMessage(
          conversationId,
          socket.data.userId,
          content,
          type
        );

        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, message);

        // Emit unread count updates to all participants
        try {
          const { ConversationModel } = await import('../../models/conversation.model.js');
          const conversation = await ConversationModel.findById(conversationId).select('participants');
          if (conversation) {
            for (const participantId of conversation.participants) {
              const pid = participantId.toString();
              if (pid === socket.data.userId) continue;

              // Get unread count for this participant
              const { MessageModel } = await import('../../models/message.model.js');
              const unreadCount = await MessageModel.countDocuments({
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: { $ne: new mongoose.Types.ObjectId(pid) },
                'statuses.recipientId': new mongoose.Types.ObjectId(pid),
                'statuses.status': { $ne: 'read' },
              });

              // Send to the specific user's socket
              io.to(`user:${pid}`).emit(SOCKET_EVENTS.UNREAD_SYNC, {
                conversationId,
                unreadCount,
              });
            }
          }
        } catch (unreadError) {
          logger.warn({ err: unreadError }, 'Failed to emit unread count updates');
        }

        // Check delivery: mark as delivered if recipients are online
        // Uses Redis presence (shared across servers) instead of local socket
        // registry, which only sees sockets on THIS server instance.
        try {
          if (message.statuses) {
            for (const status of message.statuses) {
              const presence = await cacheService.getPresence(status.recipientId);
              if (presence && (presence as { status: string }).status === 'online') {
                // Recipient is online (on any server) — mark as delivered
                await statusService.markAsDelivered(conversationId, status.recipientId, [message.id]);
                io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_STATUS, {
                  conversationId,
                  userId: status.recipientId,
                  status: 'delivered' as const,
                  timestamp: new Date(),
                });
              }
            }
          }
        } catch (deliveryError) {
          logger.warn({ err: deliveryError }, 'Failed to check delivery status');
        }

        // Track analytics
        await analyticsService.trackMessage(conversationId);

        // Queue push notifications for offline participants
        try {
          const conversation = await ConversationModel.findById(conversationId).select('participants name');
          if (conversation) {
            const senderName = socket.data.user?.name || 'Someone';
            for (const participantId of conversation.participants) {
              const pid = participantId.toString();
              if (pid === socket.data.userId) continue;

              // Check if user is online via cache
              const presence = await cacheService.getPresence(pid);
              if (presence && (presence as { status: string }).status === 'online') continue;

              // Queue push notification for offline user
              await queuePushNotification({
                userId: pid,
                title: senderName,
                body: content.length > 100 ? content.slice(0, 100) + '...' : content,
                conversationId,
              });
            }
          }
        } catch (pushError) {
          logger.warn({ err: pushError }, 'Failed to queue push notifications');
        }

        logger.info({
          event: 'message:sent',
          messageId: message.id,
          conversationId,
          senderId: socket.data.userId,
        });
      } catch (error) {
        logger.error({ error, event: 'message:send', userId: socket.data.userId });

        socket.emit(SOCKET_EVENTS.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to send message',
          code: 'MESSAGE_SEND_FAILED',
        });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_READ,
    async (data: { conversationId: string; messageIds?: string[] }) => {
      try {
        const { conversationId } = data;

        const result = await statusService.markAsRead(conversationId, socket.data.userId);

        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_STATUS, {
          conversationId,
          userId: socket.data.userId,
          status: 'read' as const,
          timestamp: new Date(),
          modifiedCount: result.modifiedCount,
        });

        logger.info({
          event: 'message:read',
          conversationId,
          userId: socket.data.userId,
          count: result.modifiedCount,
        });
      } catch (error) {
        logger.error({ error, event: 'message:read', userId: socket.data.userId });
      }
    }
  );
}
