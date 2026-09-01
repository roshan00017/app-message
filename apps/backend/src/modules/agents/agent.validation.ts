import { z } from 'zod';

export const createAgentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  skills: z.array(z.string()).optional().default([]),
  maxConcurrentChats: z.number().int().min(1).max(20).optional().default(5),
});

export const updateAgentSchema = z.object({
  skills: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().int().min(1).max(20).optional(),
});

export const assignAgentSchema = z.object({
  algorithm: z.enum(['round-robin', 'skill-based', 'load-balanced', 'hybrid']).optional(),
  skills: z.array(z.string()).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AssignAgentInput = z.infer<typeof assignAgentSchema>;
