import { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { analyticsService } from './analytics.service.js';

export const getRealtimeMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await analyticsService.getRealtimeMetrics();
  res.json({ data: metrics });
});
