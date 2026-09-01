import { z } from 'zod';

import type { Message } from './message.js';
import type { UserPublic } from './user.js';

export const ConversationType = z.enum(['direct', 'group']);
export type ConversationType = z.infer<typeof ConversationType>;

export const ConversationStatus = z.enum(['waiting', 'active', 'closed']);
export type ConversationStatus = z.infer<typeof ConversationStatus>;

export interface Conversation {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  participants: string[];
  name: string | null;
  lastMessage: Message | null;
  lastMessageAt: Date;
  assignedAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  participants: UserPublic[];
  name: string | null;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  lastMessageAt: Date;
  assignedAgent: string | null;
  createdAt: Date;
}

export const CreateConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  participantIds: z.array(z.string()).default([]),
  name: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
