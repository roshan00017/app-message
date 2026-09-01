import { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/async-handler.js';
import { AuthService } from './auth.service.js';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);

  const session = req.session as unknown as Record<string, unknown>;
  session.userId = user.id;
  session.user = user;

  res.status(201).json({ data: user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.login(email, password);

  const session = req.session as unknown as Record<string, unknown>;
  session.userId = user.id;
  session.user = user;

  res.json({ data: user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Logged out' });
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session?.userId as string | undefined;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await authService.getUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  res.json({ data: user });
});
