import type { NextFunction, Request, Response } from 'express';

import { AppError, asyncHandler } from '@/middleware/async-handler.js';

describe('asyncHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('calls the wrapped function with req, res, and next', async () => {
    const fn = vi.fn(async () => {});
    const middleware = asyncHandler(fn);

    await middleware(req as Request, res as Response, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('passes resolved value through without modifying response', async () => {
    const fn = vi.fn(async () => 'value');
    const middleware = asyncHandler(fn);

    await middleware(req as Request, res as Response, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards rejected errors to next', async () => {
    const error = new Error('Something broke');
    const fn = vi.fn(async () => {
      throw error;
    });
    const middleware = asyncHandler(fn);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards synchronous thrown errors to next', async () => {
    const error = new Error('Sync failure');
    const fn = vi.fn(() => {
      throw error;
    });
    const middleware = asyncHandler(fn);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('createError', () => {
  it('creates an error with a status code', () => {
    const err = new Error('Not authorized') as AppError;
    err.statusCode = 401;

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not authorized');
    expect(err.statusCode).toBe(401);
  });
});