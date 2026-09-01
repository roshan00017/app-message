import { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { notificationService } from './notification.service.js';

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys) {
    res.status(400).json({ error: 'Missing endpoint or keys' });
    return;
  }

  const subscription = await notificationService.subscribe(userId, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  res.status(201).json({ data: subscription });
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;
  const { endpoint } = req.body;

  await notificationService.unsubscribe(userId, endpoint);
  res.json({ message: 'Unsubscribed' });
});

export const getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session.userId as string;

  const subscriptions = await notificationService.getSubscriptions(userId);
  res.json({ data: subscriptions });
});
