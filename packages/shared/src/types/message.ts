import { z } from 'zod';

export const MessageType = z.enum(['text', 'image', 'file']);
export type MessageType = z.infer<typeof MessageType>;

export const MessageStatus = z.enum(['sent', 'delivered', 'read']);
export type MessageStatus = z.infer<typeof MessageStatus>;

export interface MessageStatusInfo {
  recipientId: string;
  status: MessageStatus;
  timestamp: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  statuses: MessageStatusInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageListItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  statuses: { recipientId: string; status: MessageStatus; timestamp: Date }[];
  createdAt: Date;
}

export const SendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).default('text'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
