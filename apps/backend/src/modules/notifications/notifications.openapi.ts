import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { errorResponse, sessionAuth } from '../../openapi/registry.js';

const pushKeysSchema = z.object({
  p256dh: z.string().describe('Base64-encoded P-256 DH public key'),
  auth: z.string().describe('Base64-encoded auth secret'),
});

const subscribeSchema = z.object({
  endpoint: z.string().url('Invalid push subscription endpoint'),
  keys: pushKeysSchema,
});

const pushSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  endpoint: z.string(),
  keys: pushKeysSchema,
  expiresAt: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }).nullable(),
  createdAt: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
});

const subscriptionsResponse = z.object({
  data: z.array(pushSubscriptionSchema),
});

export function registerNotificationPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    method: 'post',
    path: '/notifications/subscribe',
    tags: ['Notifications'],
    summary: 'Subscribe to push notifications',
    description: 'Registers a Web Push subscription for the authenticated user.',
    security: sessionAuth,
    request: {
      body: { content: { 'application/json': { schema: subscribeSchema } } },
    },
    responses: {
      201: {
        description: 'Subscription registered',
        content: {
          'application/json': {
            schema: z.object({ data: pushSubscriptionSchema }),
          },
        },
      },
      400: errorResponse(400, 'Missing endpoint or keys'),
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'delete',
    path: '/notifications/subscribe',
    tags: ['Notifications'],
    summary: 'Unsubscribe from push notifications',
    description: 'Removes a push subscription by endpoint.',
    security: sessionAuth,
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({ endpoint: z.string().url() }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Unsubscribed successfully',
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
    path: '/notifications/subscriptions',
    tags: ['Notifications'],
    summary: 'List push subscriptions',
    description: 'Returns all push subscriptions for the authenticated user.',
    security: sessionAuth,
    responses: {
      200: {
        description: 'List of subscriptions',
        content: { 'application/json': { schema: subscriptionsResponse } },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });
}
