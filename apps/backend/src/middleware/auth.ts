import { NextFunction, Request, Response } from 'express';

import { createError } from './async-handler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  const session = authReq.session as unknown as Record<string, unknown>;
  if (!session?.user) {
    return next(createError(401, 'Authentication required'));
  }
  authReq.user = session.user as AuthRequest['user'];
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(createError(401, 'Authentication required'));
    }
    if (!roles.includes(authReq.user.role)) {
      return next(createError(403, 'Insufficient permissions'));
    }
    next();
  };
}
