import type { NextFunction, Request, Response } from 'express';

import { errorHandler, notFoundHandler } from '@/middleware/error-handler.js';

describe('errorHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('responds with 500 and "Internal server error" for errors without statusCode', () => {
    const error = new Error('boom');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('uses statusCode and original message for known errors', () => {
    const error = new Error('Email already registered') as Error & { statusCode?: number };
    error.statusCode = 409;

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
  });

  it('masks 500 messages with generic text', () => {
    const error = new Error('sensitive detail') as Error & { statusCode?: number };
    error.statusCode = 500;

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('passes code along only when present in json payload', () => {
    const error = Object.assign(new Error('Validation failed'), {
      statusCode: 400,
      code: 'VALIDATION',
    });

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed' });
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with "Not found"', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    notFoundHandler({} as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });
});