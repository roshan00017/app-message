import mongoose from 'mongoose';

import { MessageModel, type IMessageStatus } from '../models/message.model.js';
import { cacheService } from './cache.service.js';
import { logger } from '../utils/logger.js';

type MessageStatusType = 'sent' | 'delivered' | 'read';

interface StatusUpdateResult {
  modifiedCount: number;
  matchedCount: number;
}

export class StatusService {
  /**
   * Mark messages as delivered when recipient's socket connects.
   * Only messages currently `sent` are upgraded, so a later "read" can
   * never be downgraded by a racing "delivered" update. The `$elemMatch`
   * query guarantees the positional `$` targets the recipient's own entry
   * (important for group conversations with multiple status entries).
   */
  async markAsDelivered(
    conversationId: string,
    recipientId: string,
    messageIds?: string[]
  ): Promise<StatusUpdateResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const query: Record<string, unknown> = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: { $ne: new mongoose.Types.ObjectId(recipientId) },
        statuses: {
          $elemMatch: {
            recipientId: new mongoose.Types.ObjectId(recipientId),
            status: 'sent',
          },
        },
      };

      if (messageIds?.length) {
        query._id = { $in: messageIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }

      const result = await MessageModel.updateMany(
        query,
        {
          $set: {
            'statuses.$.status': 'delivered',
            'statuses.$.timestamp': new Date(),
          },
        },
        { session }
      );

      await session.commitTransaction();

      if (result.modifiedCount > 0) {
        await cacheService.invalidateMessages(conversationId);
        logger.info(
          { conversationId, recipientId, count: result.modifiedCount },
          'Messages marked as delivered'
        );
      }

      return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
    } catch (error) {
      await session.abortTransaction();
      logger.error({ err: error, conversationId, recipientId }, 'Failed to mark as delivered');
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Mark all messages before a timestamp as read.
   * Batch update for efficiency when user opens a conversation.
   * Targets every non-read message (sent or delivered), so a concurrent
   * "delivered" update can never downgrade an already-read message.
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    beforeTimestamp?: Date
  ): Promise<StatusUpdateResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const query: Record<string, unknown> = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        statuses: {
          $elemMatch: {
            recipientId: new mongoose.Types.ObjectId(userId),
            status: { $ne: 'read' },
          },
        },
      };

      if (beforeTimestamp) {
        query.createdAt = { $lte: beforeTimestamp };
      }

      const result = await MessageModel.updateMany(
        query,
        {
          $set: {
            'statuses.$.status': 'read',
            'statuses.$.timestamp': new Date(),
          },
        },
        { session }
      );

      await session.commitTransaction();

      // Reset unread count in cache
      await cacheService.resetUnreadCount(userId, conversationId);
      await cacheService.invalidateMessages(conversationId);

      if (result.modifiedCount > 0) {
        logger.info(
          { conversationId, userId, count: result.modifiedCount },
          'Messages marked as read'
        );
      }

      return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
    } catch (error) {
      await session.abortTransaction();
      logger.error({ err: error, conversationId, userId }, 'Failed to mark as read');
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get status summary for a conversation from the perspective of a user.
   */
  async getStatusSummary(
    conversationId: string,
    userId: string
  ): Promise<Record<MessageStatusType, number>> {
    const results = await MessageModel.aggregate([
      {
        $match: {
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderId: new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: '$statuses' },
      { $match: { 'statuses.recipientId': { $ne: new mongoose.Types.ObjectId(userId) } } },
      {
        $group: {
          _id: '$statuses.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const summary: Record<MessageStatusType, number> = {
      sent: 0,
      delivered: 0,
      read: 0,
    };

    results.forEach((r) => {
      if (r._id in summary) {
        summary[r._id as MessageStatusType] = r.count;
      }
    });

    return summary;
  }

  /**
   * Get status for a specific message.
   */
  async getMessageStatus(messageId: string): Promise<IMessageStatus[]> {
    const message = await MessageModel.findById(messageId).select('statuses').lean();
    return message?.statuses ?? [];
  }

  /**
   * Batch update statuses in a state-machine-safe way.
   * 'delivered' only upgrades 'sent'; 'read' upgrades anything not read.
   * This is idempotent — applying the same update twice produces the same result.
   */
  async batchUpdateStatus(
    conversationId: string,
    recipientId: string,
    status: MessageStatusType
  ): Promise<StatusUpdateResult> {
    const from = status === 'delivered' ? 'sent' : { $ne: 'read' };

    const result = await MessageModel.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: { $ne: new mongoose.Types.ObjectId(recipientId) },
        statuses: {
          $elemMatch: {
            recipientId: new mongoose.Types.ObjectId(recipientId),
            status: from,
          },
        },
      },
      {
        $set: {
          'statuses.$.status': status,
          'statuses.$.timestamp': new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      await cacheService.invalidateMessages(conversationId);

      if (status === 'read') {
        await cacheService.resetUnreadCount(recipientId, conversationId);
      }
    }

    return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
  }
}

export const statusService = new StatusService();
