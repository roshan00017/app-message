import { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { statusService } from '../../services/status.service.js';
import { ConversationService } from './conversation.service.js';
import { exportChatHistory } from './conversation.export.js';

const conversationService = new ConversationService();

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;

  const conversations = await conversationService.getConversations(userId);
  res.json({ data: conversations });
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { id } = req.params;

  const conversation = await conversationService.getConversationById(id, userId);
  res.json({ data: conversation });
});

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { type, participantIds, name } = req.body;

  const conversation = await conversationService.createConversation(
    type,
    participantIds,
    name,
    userId
  );

  res.status(201).json({ data: conversation });
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cursor, limit } = req.query;

  const messages = await conversationService.getMessages(
    id,
    cursor as string | undefined,
    limit ? parseInt(limit as string, 10) : 50
  );

  res.json({ data: messages });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { id } = req.params;
  const { content, type } = req.body;

  const message = await conversationService.sendMessage(id, userId, content, type);

  res.status(201).json({ data: message });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { id } = req.params;

  const result = await statusService.markAsRead(id, userId);
  res.json({ data: { modifiedCount: result.modifiedCount } });
});

export const getUnreadCounts = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;

  const counts = await conversationService.getUnreadCounts(userId);
  res.json({ data: counts });
});

export const exportChat = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { id } = req.params;
  const { format = 'json', limit } = req.query;

  const content = await exportChatHistory({
    conversationId: id,
    userId,
    format: format as 'json' | 'csv',
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${id}.csv"`);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${id}.json"`);
  }

  res.send(content);
});

export const getAllConversations = asyncHandler(async (req: Request, res: Response) => {
  const { status, assignedAgent, search, limit, offset } = req.query;

  const result = await conversationService.getAllConversations({
    status: status as 'waiting' | 'active' | 'closed' | undefined,
    assignedAgent: assignedAgent as string | undefined,
    search: search as string | undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  res.json({ data: result.conversations, total: result.total });
});

export const updateConversationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['waiting', 'active', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const conversation = await conversationService.updateConversationStatus(id, status);
  res.json({ data: conversation });
});

export const closeConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversation = await conversationService.closeConversation(id);
  res.json({ data: conversation });
});

export const getConversationLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit } = req.query;

  const logs = await conversationService.getConversationLogs(
    id,
    limit ? parseInt(limit as string, 10) : 50
  );

  res.json({ data: logs });
});
