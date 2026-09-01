import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  errorResponse,
  messageSchema,
  sessionAuth,
  userPublicSchema,
} from '../../openapi/registry.js';

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  participantIds: z.array(z.string()).min(1),
  name: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).default('text'),
});

const conversationSummarySchema = z
  .object({
    id: z.string(),
    type: z.enum(['direct', 'group']),
    status: z.enum(['waiting', 'active', 'closed']),
    participants: z.array(userPublicSchema),
    name: z.string().nullable(),
    lastMessage: z
      .object({
        id: z.string(),
        content: z.string(),
        senderId: z.string(),
        createdAt: z.string().openapi({ format: 'date-time' }),
      })
      .nullable(),
    lastMessageAt: z.string().openapi({ format: 'date-time' }),
    assignedAgent: z.string().nullable(),
    createdAt: z.string().openapi({ format: 'date-time' }),
  })
  .openapi('ConversationSummary');

const paginatedMessagesSchema = z.object({
  data: z.object({
    items: z.array(messageSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

const unreadCountsSchema = z.object({
  data: z.record(z.string(), z.number()),
});

export function registerConversationPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    method: 'get',
    path: '/conversations',
    tags: ['Conversations'],
    summary: 'List conversations',
    description: 'Returns all conversations the authenticated user participates in.',
    security: sessionAuth,
    responses: {
      200: {
        description: 'List of conversations',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(conversationSummarySchema) }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/conversations',
    tags: ['Conversations'],
    summary: 'Create or find conversation',
    description:
      'Creates a new conversation or returns an existing direct conversation with the same participant.',
    security: sessionAuth,
    request: {
      body: { content: { 'application/json': { schema: createConversationSchema } } },
    },
    responses: {
      201: {
        description: 'Conversation created or found',
        content: {
          'application/json': {
            schema: z.object({ data: conversationSummarySchema }),
          },
        },
      },
      400: errorResponse(400, 'Invalid request body'),
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'get',
    path: '/conversations/unread-counts',
    tags: ['Conversations'],
    summary: 'Get unread message counts',
    description: 'Returns unread message counts for all conversations.',
    security: sessionAuth,
    responses: {
      200: {
        description: 'Unread counts per conversation',
        content: { 'application/json': { schema: unreadCountsSchema } },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'get',
    path: '/conversations/{id}/messages',
    tags: ['Conversations'],
    summary: 'Get messages (cursor pagination)',
    description: 'Returns messages for a conversation using cursor-based pagination.',
    security: sessionAuth,
    request: {
      params: z.object({
        id: z.string(),
      }),
      query: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
    },
    responses: {
      200: {
        description: 'Paginated messages',
        content: { 'application/json': { schema: paginatedMessagesSchema } },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/conversations/{id}/messages',
    tags: ['Conversations'],
    summary: 'Send a message',
    description: 'Sends a message to a conversation.',
    security: sessionAuth,
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: { content: { 'application/json': { schema: sendMessageSchema } } },
    },
    responses: {
      201: {
        description: 'Message sent',
        content: { 'application/json': { schema: z.object({ data: messageSchema }) } },
      },
      400: errorResponse(400, 'Invalid request body'),
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });

  reg.registerPath({
    method: 'patch',
    path: '/conversations/{id}/read',
    tags: ['Conversations'],
    summary: 'Mark conversation as read',
    description: 'Marks all messages in a conversation as read for the authenticated user.',
    security: sessionAuth,
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Marked as read',
        content: {
          'application/json': {
            schema: z.object({ message: z.string() }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });

  // Admin endpoints
  reg.registerPath({
    method: 'get',
    path: '/conversations/admin/all',
    tags: ['Conversations - Admin'],
    summary: 'List all conversations (admin)',
    description: 'Returns all conversations with optional filters. Admin only.',
    security: sessionAuth,
    request: {
      query: z.object({
        status: z.enum(['waiting', 'active', 'closed']).optional(),
        assignedAgent: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
    responses: {
      200: {
        description: 'List of conversations',
        content: {
          'application/json': {
            schema: z.object({
              data: z.array(conversationSummarySchema),
              total: z.number(),
            }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      403: errorResponse(403, 'Admin role required'),
    },
  });

  reg.registerPath({
    method: 'patch',
    path: '/conversations/{id}/status',
    tags: ['Conversations - Admin'],
    summary: 'Update conversation status (admin)',
    description: 'Updates the status of a conversation. Admin only.',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({ status: z.enum(['waiting', 'active', 'closed']) }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Conversation updated',
        content: {
          'application/json': {
            schema: z.object({ data: conversationSummarySchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      403: errorResponse(403, 'Admin role required'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/conversations/{id}/close',
    tags: ['Conversations - Admin'],
    summary: 'Close conversation (admin)',
    description: 'Closes a conversation and unassigns the agent. Admin only.',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: 'Conversation closed',
        content: {
          'application/json': {
            schema: z.object({ data: conversationSummarySchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      403: errorResponse(403, 'Admin role required'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });

  const conversationLogSchema = z.object({
    id: z.string(),
    action: z.enum(['status_change', 'agent_assigned', 'agent_unassigned', 'created', 'closed']),
    performedBy: z.string().nullable(),
    details: z.record(z.unknown()),
    createdAt: z.string().openapi({ format: 'date-time' }),
  });

  reg.registerPath({
    method: 'get',
    path: '/conversations/{id}/logs',
    tags: ['Conversations - Admin'],
    summary: 'Get conversation logs (admin)',
    description: 'Returns the audit log for a conversation. Admin only.',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
    },
    responses: {
      200: {
        description: 'Conversation logs',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(conversationLogSchema) }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      403: errorResponse(403, 'Admin role required'),
      404: errorResponse(404, 'Conversation not found'),
    },
  });
}
