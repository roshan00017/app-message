import mongoose from 'mongoose';

import { MessageModel } from '../../models/message.model.js';
import { ConversationModel } from '../../models/conversation.model.js';

export type ExportFormat = 'json' | 'csv';

interface ExportOptions {
  conversationId: string;
  userId: string;
  format: ExportFormat;
  limit?: number;
}

interface ExportMessage {
  id: string;
  conversationId: string;
  senderName: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
}

export async function exportChatHistory(options: ExportOptions): Promise<string> {
  const { conversationId, userId, format, limit = 10000 } = options;

  // Verify user has access to this conversation
  const conversation = await ConversationModel.findOne({
    _id: new mongoose.Types.ObjectId(conversationId),
    participants: new mongoose.Types.ObjectId(userId),
  });

  if (!conversation) {
    throw Object.assign(new Error('Conversation not found or access denied'), {
      statusCode: 404,
    });
  }

  // Fetch messages
  const messages = await MessageModel.find({
    conversationId: new mongoose.Types.ObjectId(conversationId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name')
    .lean();

  const exportData: ExportMessage[] = messages.map((msg) => {
    const sender = msg.senderId as unknown as { _id: mongoose.Types.ObjectId; name: string };
    const ownStatus = msg.statuses.find(
      (s) => s.recipientId.toString() === userId
    );

    return {
      id: (msg._id as mongoose.Types.ObjectId).toString(),
      conversationId: msg.conversationId.toString(),
      senderName: sender.name ?? 'Unknown',
      content: msg.content,
      type: msg.type,
      status: ownStatus?.status ?? 'sent',
      createdAt: msg.createdAt.toISOString(),
    };
  });

  if (format === 'json') {
    return JSON.stringify(
      {
        conversationId,
        exportedAt: new Date().toISOString(),
        messageCount: exportData.length,
        messages: exportData.reverse(), // Chronological order
      },
      null,
      2
    );
  }

  // CSV format
  const headers = ['Timestamp', 'Sender', 'Content', 'Type', 'Status'];
  const rows = exportData.map((msg) => [
    msg.createdAt,
    msg.senderName,
    `"${msg.content.replace(/"/g, '""')}"`,
    msg.type,
    msg.status,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
