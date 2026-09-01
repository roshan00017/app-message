import { z } from 'zod';

import type { User } from './user.js';

export const AgentStatus = z.enum(['online', 'offline', 'busy', 'away']);
export type AgentStatus = z.infer<typeof AgentStatus>;

export interface Agent {
  id: string;
  userId: string;
  user: User;
  skills: string[];
  maxConcurrentChats: number;
  currentChats: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMetrics {
  agentId: string;
  totalChats: number;
  averageResponseTime: number;
  satisfactionScore: number;
  messagesHandled: number;
}
