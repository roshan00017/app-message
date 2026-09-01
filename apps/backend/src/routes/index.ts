import { Router } from 'express';

import agentRoutes from '../modules/agents/agent.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import conversationRoutes from '../modules/conversations/conversation.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/agents', agentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
