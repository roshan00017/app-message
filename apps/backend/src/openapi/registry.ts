import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { z } from 'zod';

extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// The OpenAPI registry is the single place that collects every REST contract.
// Module `*.openapi.ts` files register paths against it; `register.ts` wires
// the per-module registrars in so the docs can never silently drift from the
// modules that exist. Runtime validation stays in each module's validation.ts;
// request bodies reference those schemas directly (single source of truth).
// ---------------------------------------------------------------------------

export const registry = new OpenAPIRegistry();

// ---- Shared schemas -------------------------------------------------------

/** A user as returned to clients. Never includes `passwordHash`. */
export const userSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatar: z.string().nullable(),
    role: z.enum(['user', 'agent', 'admin']),
    status: z.enum(['online', 'offline', 'busy', 'away']),
    lastSeen: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
    createdAt: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
    updatedAt: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
  })
  .openapi('User', { description: 'A user exactly as returned to clients.' });
registry.register('User', userSchema);

/** User as returned in lists with limited info. */
export const userPublicSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
    status: z.enum(['online', 'offline', 'busy', 'away']),
  })
  .openapi('UserPublic', { description: 'Public user info (limited fields).' });
registry.register('UserPublic', userPublicSchema);

/** Message status info for each recipient. */
export const messageStatusInfoSchema = z
  .object({
    recipientId: z.string(),
    status: z.enum(['sent', 'delivered', 'read']),
    timestamp: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
  })
  .openapi('MessageStatusInfo');
registry.register('MessageStatusInfo', messageStatusInfoSchema);

/** A message as returned to clients. */
export const messageSchema = z
  .object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    content: z.string(),
    type: z.enum(['text', 'image', 'file']),
    statuses: z.array(messageStatusInfoSchema),
    createdAt: z.string().openapi({ format: 'date-time', description: 'ISO 8601' }),
  })
  .openapi('Message', { description: 'A message in a conversation.' });
registry.register('Message', messageSchema);

/** Error envelope */
export const errorEnvelopeSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .openapi('ErrorEnvelope', { description: 'Uniform error body.' });
registry.register('ErrorEnvelope', errorEnvelopeSchema);

/** Data envelope used by success responses */
export function dataResponse(schema: z.ZodType) {
  return z.object({ data: schema });
}

/** Error response helper */
export function errorResponse(_status: number, description: string) {
  return {
    description,
    content: { 'application/json': { schema: errorEnvelopeSchema } },
  };
}

/** Auth cookie — the only credential the API trusts. */
registry.registerComponent('securitySchemes', 'sessionCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'sessionId',
  description: 'HttpOnly session cookie issued by register/login.',
});

/** Security requirement to inline on protected paths. */
export const sessionAuth = [{ sessionCookie: [] }];

// ---- Document builder ------------------------------------------------------

export function buildOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Messaging API',
      version: '1.0.0',
      description:
        'Real-time messaging application API with Socket.IO.\n\n' +
        'Auth is a server-side HttpOnly session cookie — see `sessionCookie` security scheme.',
    },
    servers: [{ url: '/api/v1' }],
  });
}
