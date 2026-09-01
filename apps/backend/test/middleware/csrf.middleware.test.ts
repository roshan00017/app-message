import crypto from 'crypto';

import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
  attachCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  csrfProtection,
} from '@/middleware/csrf.middleware.js';

function createMocks(method = 'GET', cookie?: string, path = '/api/v1/x') {
  const res = {
    cookie: vi.fn().mockReturnThis(),
    locals: {} as Record<string, unknown>,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const req = {
    method,
    headers: { cookie },
    path,
  } as unknown as Request;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('attachCsrfToken', () => {
  it('generates a token and sets a readable cookie when none exists', () => {
    const { req, res, next } = createMocks('GET', undefined);
    attachCsrfToken()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'lax' })
    );
    expect(res.locals.csrf).toEqual(expect.any(String));
    expect(res.locals.csrf).not.toBe('a');
  });

  it('keeps an existing token without generating a new one', () => {
    const existing = crypto.randomBytes(16).toString('hex');
    const { req, res, next } = createMocks('GET', `${CSRF_COOKIE_NAME}=${existing}`);
    attachCsrfToken()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.locals.csrf).toBe(existing);
  });
});

describe('csrfProtection', () => {
  it('allows safe methods (GET/HEAD/OPTIONS) without a token', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const { req, res, next } = createMocks(method, undefined);
      csrfProtection()(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('allows POST with matching cookie and header tokens', () => {
    const token = crypto.randomBytes(16).toString('hex');
    const { req, res, next } = createMocks('POST', `${CSRF_COOKIE_NAME}=${token}`);

    req.headers = { cookie: `${CSRF_COOKIE_NAME}=${token}`, [CSRF_HEADER_NAME]: token };
    csrfProtection()(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects POST with mismatched header and cookie', () => {
    const { req, res, next } = createMocks('POST', `${CSRF_COOKIE_NAME}=one`);

    req.headers = { cookie: `${CSRF_COOKIE_NAME}=one`, [CSRF_HEADER_NAME]: 'two' };
    csrfProtection()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or missing CSRF token' });
  });

  it('rejects POST with a header but no cookie', () => {
    const { req, res, next } = createMocks('POST', undefined);

    req.headers = { [CSRF_HEADER_NAME]: 'token' };
    csrfProtection()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects POST with a cookie but no header', () => {
    const { req, res, next } = createMocks('POST', `${CSRF_COOKIE_NAME}=token`);
    csrfProtection()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('skips Socket.IO polling POSTs (session-cookie auth instead)', () => {
    const { req, res, next } = createMocks('POST', undefined, '/socket.io/');
    csrfProtection()(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});