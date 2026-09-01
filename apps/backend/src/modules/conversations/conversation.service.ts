import mongoose from 'mongoose';

import { ConversationModel } from '../../models/conversation.model.js';
import { ConversationLogModel } from '../../models/conversation-log.model.js';
import { MessageModel } from '../../models/message.model.js';
import { cacheService } from '../../services/cache.service.js';
import { conversationEvents, CONVERSATION_EVENTS } from '../../services/conversation-events.js';
import { logger } from '../../utils/logger.js';

interface PopulatedParticipant {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar: string | null;
  status: string;
}

interface PopulatedMessage {
  _id: mongoose.Types.ObjectId;
  content: string;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface PopulatedSender {
  _id: mongoose.Types.ObjectId;
  name: string;
  avatar: string | null;
}

export interface ConversationSummary {
  id: string;
  type: string;
  status: 'waiting' | 'active' | 'closed';
  name: string | null;
  participants: { id: string; name: string; avatar: string | null; status: string }[];
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  lastMessageAt: Date;
  assignedAgent: string | null;
  createdAt: Date;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  statuses: { recipientId: string; status: string; timestamp: Date }[];
  createdAt: Date;
}

export interface PaginatedMessages {
  items: MessageItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class ConversationService {
  async getConversations(userId: string): Promise<ConversationSummary[]> {
    const cached = await cacheService.getConversations(userId);
    if (cached) return cached as ConversationSummary[];

    const conversations = await ConversationModel.find({
      participants: new mongoose.Types.ObjectId(userId),
    })
      .sort({ lastMessageAt: -1 })
      .populate('lastMessage', 'content senderId createdAt')
      .populate('participants', 'name avatar status')
      .lean();

    const result = conversations.map((conv) => ({
      id: (conv._id as mongoose.Types.ObjectId).toString(),
      type: conv.type,
      status: (conv as any).status || 'waiting',
      name: conv.name,
      participants: (conv.participants as unknown as PopulatedParticipant[]).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
        status: p.status,
      })),
      lastMessage: conv.lastMessage
        ? {
            id: (conv.lastMessage as unknown as PopulatedMessage)._id.toString(),
            content: (conv.lastMessage as unknown as PopulatedMessage).content,
            senderId: (conv.lastMessage as unknown as PopulatedMessage).senderId.toString(),
            createdAt: (conv.lastMessage as unknown as PopulatedMessage).createdAt,
          }
        : null,
      lastMessageAt: conv.lastMessageAt,
      assignedAgent: conv.assignedAgent ? conv.assignedAgent.toString() : null,
      createdAt: conv.createdAt,
    }));

    await cacheService.setConversations(userId, result);
    return result;
  }

  async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<ConversationSummary> {
    if (!mongoose.isValidObjectId(conversationId)) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      participants: new mongoose.Types.ObjectId(userId),
    })
      .populate('lastMessage', 'content senderId createdAt')
      .populate('participants', 'name avatar status')
      .lean();

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    return {
      id: (conversation._id as mongoose.Types.ObjectId).toString(),
      type: conversation.type,
      status: (conversation as any).status || 'waiting',
      name: conversation.name,
      participants: (conversation.participants as unknown as PopulatedParticipant[]).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
        status: p.status,
      })),
      lastMessage: conversation.lastMessage
        ? {
            id: (conversation.lastMessage as unknown as PopulatedMessage)._id.toString(),
            content: (conversation.lastMessage as unknown as PopulatedMessage).content,
            senderId: (conversation.lastMessage as unknown as PopulatedMessage).senderId.toString(),
            createdAt: (conversation.lastMessage as unknown as PopulatedMessage).createdAt,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt,
      assignedAgent: conversation.assignedAgent ? conversation.assignedAgent.toString() : null,
      createdAt: conversation.createdAt,
    };
  }

  async createConversation(
    type: 'direct' | 'group',
    participantIds: string[],
    name?: string,
    creatorId?: string
  ): Promise<ConversationSummary> {
    if (type === 'direct' && participantIds.length === 2) {
      const existing = await ConversationModel.findOne({
        type: 'direct',
        participants: {
          $all: participantIds.map((id) => new mongoose.Types.ObjectId(id)),
          $size: 2,
        },
      }).populate('participants', 'name avatar status');

      if (existing) {
        return {
          id: (existing._id as mongoose.Types.ObjectId).toString(),
          type: existing.type,
          status: (existing as any).status || 'waiting',
          name: existing.name,
          participants: (existing.participants as unknown as PopulatedParticipant[]).map((p) => ({
            id: p._id.toString(),
            name: p.name,
            avatar: p.avatar,
            status: p.status,
          })),
          lastMessage: null,
          lastMessageAt: existing.lastMessageAt,
          assignedAgent: existing.assignedAgent ? existing.assignedAgent.toString() : null,
          createdAt: existing.createdAt,
        };
      }
    }

    const allParticipantIds = creatorId
      ? [...new Set([creatorId, ...participantIds])]
      : participantIds;

    const conversation = await ConversationModel.create({
      type,
      status: 'waiting',
      participants: allParticipantIds.map((id) => new mongoose.Types.ObjectId(id)),
      name: name || null,
      lastMessageAt: new Date(),
    });

    const populated = await ConversationModel.findById(conversation._id).populate(
      'participants',
      'name avatar status'
    );

    if (!populated) {
      throw new Error('Failed to create conversation');
    }

    logger.info({ conversationId: populated._id, type }, 'Conversation created');

    // Auto-assign an available agent for customer support conversations
    if (type === 'direct') {
      try {
        const { AgentModel } = await import('../../models/agent.model.js');
        const availableAgent = await AgentModel.findOne({
          isAvailable: true,
          status: 'online',
        })
          .sort({ currentChats: 1 })
          .lean();

        if (availableAgent) {
          await AgentModel.findByIdAndUpdate(availableAgent._id, {
            $inc: { currentChats: 1 },
          });
          await ConversationModel.findByIdAndUpdate(populated._id, {
            $set: { assignedAgent: availableAgent._id, status: 'active' },
            $addToSet: { participants: availableAgent.userId },
          });
          logger.info({ conversationId: populated._id, agentId: availableAgent._id }, 'Agent auto-assigned');

          // Emit event for real-time updates
          conversationEvents.emit(CONVERSATION_EVENTS.AGENT_ASSIGNED, {
            conversationId: populated._id.toString(),
            agentId: availableAgent._id.toString(),
            agentUserId: availableAgent.userId.toString(),
            participants: allParticipantIds,
          } as import('../../services/conversation-events.js').AgentAssignedEvent);
        }
      } catch (assignError) {
        logger.warn({ err: assignError }, 'Failed to auto-assign agent');
      }
    }

    const result = {
      id: (populated._id as mongoose.Types.ObjectId).toString(),
      type: populated.type,
      status: (populated as any).status || 'waiting',
      name: populated.name,
      participants: (populated.participants as unknown as PopulatedParticipant[]).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
        status: p.status,
      })),
      lastMessage: null,
      lastMessageAt: populated.lastMessageAt,
      assignedAgent: populated.assignedAgent ? populated.assignedAgent.toString() : null,
      createdAt: populated.createdAt,
    };

    // Invalidate participant conversation caches
    for (const participantId of allParticipantIds) {
      await cacheService.invalidateConversations(participantId);
    }

    return result;
  }

  async getMessages(
    conversationId: string,
    cursor?: string,
    limit = 50
  ): Promise<PaginatedMessages> {
    const cappedLimit = Math.min(Math.max(limit, 1), 100);

    // Messages are always returned in ASCENDING (oldest→newest) order so the
    // latest message lands at the bottom of the result, matching the UI.
    //  - No cursor  → return the MOST RECENT `limit` messages (chronological),
    //    used for the initial view which should open scrolled to the bottom.
    //  - With cursor → return the `limit` messages OLDER than the cursor
    //    (chronological), used to prepend history when scrolling up.
    const matches: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

    if (cursor) {
      matches.createdAt = { $lt: new Date(cursor) };
    }

    const found = await MessageModel.find(matches)
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .populate('senderId', 'name avatar')
      .lean();

    // Reverse so the returned array is oldest→newest (latest at the bottom).
    found.reverse();

    const items = found.map((msg) => {
      const sender = msg.senderId as unknown as PopulatedSender;
      return {
        id: (msg._id as mongoose.Types.ObjectId).toString(),
        conversationId: msg.conversationId.toString(),
        senderId: sender._id ? sender._id.toString() : msg.senderId.toString(),
        content: msg.content,
        type: msg.type,
        statuses: msg.statuses.map((s) => ({
          recipientId: s.recipientId.toString(),
          status: s.status,
          timestamp: s.timestamp,
        })),
        createdAt: msg.createdAt,
      };
    });

    // Determine whether older messages exist (before the oldest in this page).
    let hasMore = false;
    const oldestCreatedAt = items[0]?.createdAt as Date | undefined;
    if (oldestCreatedAt) {
      const olderCount = await MessageModel.countDocuments({
        conversationId: new mongoose.Types.ObjectId(conversationId),
        createdAt: { $lt: oldestCreatedAt },
      });
      hasMore = olderCount > 0;
    }

    // nextCursor points to the oldest message of the current page so the caller
    // can fetch even older messages. It is null when there is nothing older.
    const nextCursor = hasMore && oldestCreatedAt ? oldestCreatedAt.toISOString() : null;

    const result: PaginatedMessages = { items, nextCursor, hasMore };

    // Cache only the initial (latest) page under the conversation key.
    if (!cursor) {
      await cacheService.setMessages(conversationId, result);
    }
    return result;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text'
  ): Promise<MessageItem> {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), {
        statusCode: 404,
      });
    }

    const message = await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(senderId),
      content,
      type,
      statuses: conversation.participants
        .filter((p) => p.toString() !== senderId)
        .map((p) => ({
          recipientId: p,
          status: 'sent' as const,
          timestamp: new Date(),
        })),
    });

    await ConversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    const populated = await MessageModel.findById(message._id).populate('senderId', 'name avatar');

    if (!populated) {
      throw new Error('Failed to send message');
    }

    logger.info({ messageId: populated._id, conversationId, senderId }, 'Message sent');

    // Invalidate caches
    await cacheService.invalidateMessages(conversationId);
    await cacheService.invalidateConversations(senderId);
    for (const p of conversation.participants) {
      if (p.toString() !== senderId) {
        await cacheService.invalidateConversations(p.toString());
      }
    }

    const sender = populated.senderId as unknown as PopulatedSender;

    return {
      id: (populated._id as mongoose.Types.ObjectId).toString(),
      conversationId: populated.conversationId.toString(),
      senderId: sender._id ? sender._id.toString() : populated.senderId.toString(),
      content: populated.content,
      type: populated.type,
      statuses: populated.statuses.map((s) => ({
        recipientId: s.recipientId.toString(),
        status: s.status,
        timestamp: s.timestamp,
      })),
      createdAt: populated.createdAt,
    };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await MessageModel.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        statuses: {
          $elemMatch: {
            recipientId: new mongoose.Types.ObjectId(userId),
            status: { $ne: 'read' },
          },
        },
      },
      {
        $set: {
          'statuses.$.status': 'read',
          'statuses.$.timestamp': new Date(),
        },
      }
    );

    await cacheService.resetUnreadCount(userId, conversationId);
    await cacheService.invalidateMessages(conversationId);
  }

  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const results = await MessageModel.aggregate([
      {
        $match: {
          'statuses.recipientId': new mongoose.Types.ObjectId(userId),
          'statuses.status': { $ne: 'read' },
        },
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, number> = {};
    results.forEach((r) => {
      counts[r._id.toString()] = r.count;
    });
    return counts;
  }

  /**
   * Admin: Get all conversations with optional filters
   */
  async getAllConversations(filters?: {
    status?: 'waiting' | 'active' | 'closed';
    assignedAgent?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: ConversationSummary[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.assignedAgent) {
      query.assignedAgent = new mongoose.Types.ObjectId(filters.assignedAgent);
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const total = await ConversationModel.countDocuments(query);

    const conversations = await ConversationModel.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('lastMessage', 'content senderId createdAt')
      .populate('participants', 'name avatar status')
      .populate('assignedAgent', 'userId')
      .lean();

    const result = conversations.map((conv) => ({
      id: (conv._id as mongoose.Types.ObjectId).toString(),
      type: conv.type,
      status: (conv as any).status || 'waiting',
      name: conv.name,
      participants: (conv.participants as unknown as PopulatedParticipant[]).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
        status: p.status,
      })),
      lastMessage: conv.lastMessage
        ? {
            id: (conv.lastMessage as unknown as PopulatedMessage)._id.toString(),
            content: (conv.lastMessage as unknown as PopulatedMessage).content,
            senderId: (conv.lastMessage as unknown as PopulatedMessage).senderId.toString(),
            createdAt: (conv.lastMessage as unknown as PopulatedMessage).createdAt,
          }
        : null,
      lastMessageAt: conv.lastMessageAt,
      assignedAgent: conv.assignedAgent ? conv.assignedAgent.toString() : null,
      createdAt: conv.createdAt,
    }));

    return { conversations: result, total };
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: string,
    status: 'waiting' | 'active' | 'closed'
  ): Promise<ConversationSummary> {
    const conversation = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { status },
      { new: true }
    )
      .populate('lastMessage', 'content senderId createdAt')
      .populate('participants', 'name avatar status')
      .lean();

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    // Invalidate caches for all participants
    for (const participant of conversation.participants) {
      const p = participant as unknown as PopulatedParticipant;
      await cacheService.invalidateConversations(p._id.toString());
    }

    // Log status change
    await ConversationLogModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      action: 'status_change',
      details: { previousStatus: (conversation as any).status, newStatus: status },
    });

    // Emit status change event
    conversationEvents.emit(CONVERSATION_EVENTS.STATUS_CHANGED, {
      conversationId,
      status,
      assignedAgent: conversation.assignedAgent ? conversation.assignedAgent.toString() : null,
      participants: (conversation.participants as unknown as PopulatedParticipant[]).map((p) => p._id.toString()),
    } as import('../../services/conversation-events.js').ConversationStatusChangeEvent);

    logger.info({ conversationId, status }, 'Conversation status updated');

    return {
      id: (conversation._id as mongoose.Types.ObjectId).toString(),
      type: conversation.type,
      status: (conversation as any).status || status,
      name: conversation.name,
      participants: (conversation.participants as unknown as PopulatedParticipant[]).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        avatar: p.avatar,
        status: p.status,
      })),
      lastMessage: conversation.lastMessage
        ? {
            id: (conversation.lastMessage as unknown as PopulatedMessage)._id.toString(),
            content: (conversation.lastMessage as unknown as PopulatedMessage).content,
            senderId: (conversation.lastMessage as unknown as PopulatedMessage).senderId.toString(),
            createdAt: (conversation.lastMessage as unknown as PopulatedMessage).createdAt,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt,
      assignedAgent: conversation.assignedAgent ? conversation.assignedAgent.toString() : null,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Close a conversation and unassign the agent
   */
  async closeConversation(conversationId: string): Promise<ConversationSummary> {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    // Update status to closed
    await ConversationModel.findByIdAndUpdate(conversationId, { status: 'closed' });

    // Unassign agent if assigned
    if (conversation.assignedAgent) {
      const { AgentModel } = await import('../../models/agent.model.js');
      await AgentModel.findByIdAndUpdate(conversation.assignedAgent, {
        $inc: { currentChats: -1 },
      });
      await ConversationModel.findByIdAndUpdate(conversationId, {
        $unset: { assignedAgent: '' },
      });
    }

    // Invalidate caches
    for (const participant of conversation.participants) {
      await cacheService.invalidateConversations(participant.toString());
    }

    // Log closure
    await ConversationLogModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      action: 'closed',
      details: { previousStatus: (conversation as any).status },
    });

    // Emit status change event
    conversationEvents.emit(CONVERSATION_EVENTS.STATUS_CHANGED, {
      conversationId,
      status: 'closed',
      assignedAgent: null,
      participants: conversation.participants.map((p) => p.toString()),
    } as import('../../services/conversation-events.js').ConversationStatusChangeEvent);

    logger.info({ conversationId }, 'Conversation closed');

    return this.getConversationById(conversationId, conversation.participants[0].toString());
  }

  /**
   * Get conversation log/history
   */
  async getConversationLogs(
    conversationId: string,
    limit = 50
  ): Promise<Array<{
    id: string;
    action: string;
    performedBy: string | null;
    details: Record<string, unknown>;
    createdAt: Date;
  }>> {
    const logs = await ConversationLogModel.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email')
      .lean();

    return logs.map((log) => ({
      id: (log._id as mongoose.Types.ObjectId).toString(),
      action: log.action,
      performedBy: log.performedBy ? log.performedBy.toString() : null,
      details: log.details,
      createdAt: log.createdAt,
    }));
  }
}
