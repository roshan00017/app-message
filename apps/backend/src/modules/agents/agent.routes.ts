import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  assignAgent,
  createAgent,
  deleteAgent,
  getAgentById,
  getAgents,
  setAgentStatus,
  toggleAvailability,
  unassignAgent,
  updateAgent,
} from './agent.controller.js';
import { assignAgentSchema, createAgentSchema, updateAgentSchema } from './agent.validation.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, getAgents);
router.get('/:id', requireAuth, getAgentById);
router.post('/', requireAuth, requireRole('admin'), validate(createAgentSchema), createAgent);
router.put('/:id', requireAuth, requireRole('admin'), validate(updateAgentSchema), updateAgent);
router.patch('/:id/toggle-availability', requireAuth, toggleAvailability);
router.patch('/:id/status', requireAuth, setAgentStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteAgent);

router.post(
  '/assign/:conversationId',
  requireAuth,
  requireRole('admin'),
  validate(assignAgentSchema),
  assignAgent
);
router.delete(
  '/unassign/:conversationId/:agentId',
  requireAuth,
  requireRole('admin'),
  unassignAgent
);

export default router;
