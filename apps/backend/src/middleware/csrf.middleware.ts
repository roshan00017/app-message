import crypto from 'crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { config } from '../config/env.js';
import { parseCookieHeader } from '../utils/cookies.js';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Double-submit cookie pattern:
 *  - A random token is stored in a readable cookie (not HttpOnly) and echoed
 *    back in the `x-csrf-token` header by the client for state-changing requests.
 *  - The server compares both values; they must match.
 */
export function attachCsrfToken(): RequestHandler {
  return (req, res, next) => {
    const existing = parseCookieHeader(req.headers.cookie)[CSRF_COOKIE_NAME];
    if (existing) {
      res.locals.csrf = existing;
      return next();
    }

    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/',
      maxAge: CSRF_TTL_MS,
    });
    res.locals.csrf = token;
    return next();
  };
}

export function csrfProtection(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    // Socket.IO polling transport issues POST requests without a CSRF header;
    // it authenticates via the HttpOnly session cookie instead.
    if (req.path.startsWith('/socket.io')) {
      return next();
    }

    const cookieToken = parseCookieHeader(req.headers.cookie)[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }

    return next();
  };
}