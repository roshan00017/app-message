import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { errorResponse, sessionAuth, userSchema } from '../../openapi/registry.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userDataResponse = z.object({
  data: z.object({ user: userSchema }),
});

export function registerAuthPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user',
    description:
      'Creates a user account, returns the user, and issues a session cookie. ' +
      'Rate-limited to 5 requests per minute.',
    request: {
      body: { content: { 'application/json': { schema: registerSchema } } },
    },
    responses: {
      201: {
        description: 'Account created; `Set-Cookie` issued',
        content: { 'application/json': { schema: userDataResponse } },
      },
      400: errorResponse(400, 'Invalid request body'),
      409: errorResponse(409, 'Email already registered'),
      429: errorResponse(429, 'Too many requests'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    summary: 'Log in',
    description:
      'Validates credentials and issues a session cookie. Rate-limited to 5 requests per minute.',
    request: {
      body: { content: { 'application/json': { schema: loginSchema } } },
    },
    responses: {
      200: {
        description: 'Authenticated; `Set-Cookie` issued',
        content: { 'application/json': { schema: userDataResponse } },
      },
      400: errorResponse(400, 'Invalid request body'),
      401: errorResponse(401, 'Invalid email or password'),
      429: errorResponse(429, 'Too many requests'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['Auth'],
    summary: 'Log out',
    description: 'Invalidates the current session and clears the cookie.',
    security: sessionAuth,
    responses: {
      200: {
        description: 'Logged out successfully',
        content: {
          'application/json': {
            schema: z.object({ message: z.string() }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['Auth'],
    summary: 'Current user',
    description: 'Returns the user attached to the session cookie, if valid.',
    security: sessionAuth,
    responses: {
      200: {
        description: 'The authenticated user',
        content: { 'application/json': { schema: userDataResponse } },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });
}
