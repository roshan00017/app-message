import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { errorResponse, sessionAuth, userPublicSchema } from '../../openapi/registry.js';

const agentSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    user: userPublicSchema,
    skills: z.array(z.string()),
    maxConcurrentChats: z.number(),
    currentChats: z.number(),
    isAvailable: z.boolean(),
    createdAt: z.string().openapi({ format: 'date-time' }),
    updatedAt: z.string().openapi({ format: 'date-time' }),
  })
  .openapi('Agent');

const createAgentSchema = z.object({
  userId: z.string(),
  skills: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().int().min(1).max(20).optional(),
});

const updateAgentSchema = z.object({
  skills: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().int().min(1).max(20).optional(),
});

const assignAgentSchema = z.object({
  algorithm: z.enum(['round-robin', 'skill-based', 'load-balanced', 'hybrid']).optional(),
  skills: z.array(z.string()).optional(),
});

export function registerAgentPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    method: 'get',
    path: '/agents',
    tags: ['Agents'],
    summary: 'List agents',
    description: 'Returns all agents with optional filters.',
    security: sessionAuth,
    request: {
      query: z.object({
        isAvailable: z.enum(['true', 'false']).optional(),
        skills: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'List of agents',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(agentSchema) }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });

  reg.registerPath({
    method: 'get',
    path: '/agents/{id}',
    tags: ['Agents'],
    summary: 'Get agent by ID',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: 'Agent details',
        content: {
          'application/json': {
            schema: z.object({ data: agentSchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Agent not found'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/agents',
    tags: ['Agents'],
    summary: 'Create agent',
    description: 'Create an agent from an existing user. Admin only.',
    security: sessionAuth,
    request: {
      body: { content: { 'application/json': { schema: createAgentSchema } } },
    },
    responses: {
      201: {
        description: 'Agent created',
        content: {
          'application/json': {
            schema: z.object({ data: agentSchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      403: errorResponse(403, 'Forbidden'),
      409: errorResponse(409, 'User is already an agent'),
    },
  });

  reg.registerPath({
    method: 'put',
    path: '/agents/{id}',
    tags: ['Agents'],
    summary: 'Update agent',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { 'application/json': { schema: updateAgentSchema } } },
    },
    responses: {
      200: {
        description: 'Agent updated',
        content: {
          'application/json': {
            schema: z.object({ data: agentSchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Agent not found'),
    },
  });

  reg.registerPath({
    method: 'patch',
    path: '/agents/{id}/toggle-availability',
    tags: ['Agents'],
    summary: 'Toggle agent availability',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: 'Availability toggled',
        content: {
          'application/json': {
            schema: z.object({ data: agentSchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Agent not found'),
    },
  });

  reg.registerPath({
    method: 'delete',
    path: '/agents/{id}',
    tags: ['Agents'],
    summary: 'Delete agent',
    security: sessionAuth,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: 'Agent deleted',
        content: {
          'application/json': {
            schema: z.object({ message: z.string() }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'Agent not found'),
    },
  });

  reg.registerPath({
    method: 'post',
    path: '/agents/assign/{conversationId}',
    tags: ['Agents'],
    summary: 'Assign agent to conversation',
    security: sessionAuth,
    request: {
      params: z.object({ conversationId: z.string() }),
      body: { content: { 'application/json': { schema: assignAgentSchema } } },
    },
    responses: {
      200: {
        description: 'Agent assigned',
        content: {
          'application/json': {
            schema: z.object({ data: agentSchema }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
      404: errorResponse(404, 'No available agents'),
    },
  });

  reg.registerPath({
    method: 'delete',
    path: '/agents/unassign/{conversationId}/{agentId}',
    tags: ['Agents'],
    summary: 'Unassign agent from conversation',
    security: sessionAuth,
    request: {
      params: z.object({
        conversationId: z.string(),
        agentId: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Agent unassigned',
        content: {
          'application/json': {
            schema: z.object({ message: z.string() }),
          },
        },
      },
      401: errorResponse(401, 'Not authenticated'),
    },
  });
}
