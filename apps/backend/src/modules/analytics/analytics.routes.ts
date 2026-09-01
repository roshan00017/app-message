import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getRealtimeMetrics } from './analytics.controller.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/realtime', getRealtimeMetrics);

export default router;
