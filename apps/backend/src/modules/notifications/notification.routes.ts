import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import {
  subscribe,
  unsubscribe,
  getSubscriptions,
} from './notification.controller.js';

const router: Router = Router();

router.use(requireAuth);

router.post('/subscribe', subscribe);
router.delete('/subscribe', unsubscribe);
router.get('/subscriptions', getSubscriptions);

export default router;
