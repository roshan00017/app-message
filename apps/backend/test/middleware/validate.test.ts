import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { validate } from '@/middleware/validate.js';

describe('validate middleware', () => {
  const schema = z.object({
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18'),
  });

  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {} };
    res = {};
    next = vi.fn();
  });

  it('parses valid body and replaces req.body with parsed value', () => {
    req.body = { email: 'test@example.com', age: 25 };

    validate(schema)(req as Request, res as Response, next);

    expect(req.body).toEqual({ email: 'test@example.com', age: 25 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with 400 for invalid email', () => {
    req.body = { email: 'not-an-email', age: 25 };

    validate(schema)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('Invalid email format');
  });

  it('calls next with 400 for too-young age', () => {
    req.body = { email: 'test@example.com', age: 15 };

    validate(schema)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('Must be at least 18');
  });

  it('calls next with 400 and joined messages for multiple errors', () => {
    req.body = { email: 'bad', age: 10 };

    validate(schema)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error & { statusCode?: number };
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('Invalid email format');
    expect(error.message).toContain('Must be at least 18');
  });

  it('forwards non-Zod errors directly to next', () => {
    const throwingSchema = {
      parse: () => {
        throw new Error('custom failure');
      },
    } as unknown as z.ZodSchema;

    validate(throwingSchema)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0] as Error;
    expect(error.message).toBe('custom failure');
  });
});