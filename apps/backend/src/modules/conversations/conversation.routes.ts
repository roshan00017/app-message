import { Router } from 'express';

import { CreateConversationSchema, SendMessageSchema } from '@messaging/shared/types';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createConversation,
  exportChat,
  getConversation,
  getConversations,
  getMessages,
  getUnreadCounts,
  markAsRead,
  sendMessage,
  getAllConversations,
  updateConversationStatus,
  closeConversation,
  getConversationLogs,
} from './conversation.controller.js';

const router: Router = Router();

router.use(requireAuth);

// User routes
router.get('/', getConversations);
router.get('/unread-counts', getUnreadCounts);
router.get('/:id', getConversation);
router.post('/', validate(CreateConversationSchema), createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', validate(SendMessageSchema), sendMessage);
router.patch('/:id/read', markAsRead);
router.get('/:id/export', exportChat);

// Admin routes
router.get('/admin/all', requireRole('admin'), getAllConversations);
router.patch('/:id/status', requireRole('admin'), updateConversationStatus);
router.post('/:id/close', requireRole('admin'), closeConversation);
router.get('/:id/logs', requireRole('admin'), getConversationLogs);

export default router;
