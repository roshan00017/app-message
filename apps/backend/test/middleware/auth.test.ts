import type { NextFunction, Response } from 'express';

import { requireAuth, requireRole, AuthRequest } from '@/middleware/auth.js';

function createRequest(session?: unknown): Partial<AuthRequest> {
  const req: Partial<AuthRequest> = {};
  if (session) {
    (req as unknown as { session: unknown }).session = session;
  }
  return req;
}

describe('requireAuth', () => {
  const res = {} as Response;
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next with 401 when no session user exists', () => {
    const req = createRequest({});

    requireAuth(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('calls next with 401 when session is undefined', () => {
    const req = createRequest();

    requireAuth(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(401);
  });

  it('attaches user to request and calls next without error when session has user', () => {
    const user = { id: 'user-1', email: 'a@b.com', name: 'Alice', role: 'user' };
    const req = createRequest({ user });

    requireAuth(req as AuthRequest, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireRole', () => {
  const res = {} as Response;
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next with 401 when request has no authenticated user', () => {
    const req = createRequest({});

    requireRole('admin')(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(401);
  });

  it('calls next with 403 when user role is not in allowed roles', () => {
    const req = createRequest({
      user: { id: 'user-1', email: 'a@b.com', name: 'Alice', role: 'user' },
    });
    (req as AuthRequest).user = { id: 'user-1', email: 'a@b.com', name: 'Alice', role: 'user' };

    requireRole('admin')(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Insufficient permissions');
  });

  it('calls next without error when user role is allowed', () => {
    const req = createRequest({
      user: { id: 'admin-1', email: 'admin@b.com', name: 'Admin', role: 'admin' },
    });
    (req as AuthRequest).user = {
      id: 'admin-1',
      email: 'admin@b.com',
      name: 'Admin',
      role: 'admin',
    };

    requireRole('admin')(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows any of multiple roles', () => {
    const req = createRequest({
      user: { id: 'agent-1', email: 'agent@b.com', name: 'Agent', role: 'agent' },
    });
    (req as AuthRequest).user = {
      id: 'agent-1',
      email: 'agent@b.com',
      name: 'Agent',
      role: 'agent',
    };

    requireRole('user', 'agent')(req as AuthRequest, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});