import type { RealtimeMetrics } from './analytics.js';
import type { Message, MessageStatus } from './message.js';
import type { UserStatus } from './user.js';

export interface ClientToServerEvents {
  'conversation:join': (data: { conversationId: string }) => void;
  'conversation:leave': (data: { conversationId: string }) => void;
  'message:send': (data: {
    conversationId: string;
    content: string;
    type: 'text' | 'image' | 'file';
  }) => void;
  'typing:start': (data: { conversationId: string }) => void;
  'typing:stop': (data: { conversationId: string }) => void;
  'presence:update': (data: { status: UserStatus }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[] }) => void;
  'analytics:subscribe': () => void;
}

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:status': (data: {
    messageId: string;
    status: MessageStatus;
    userId: string;
    timestamp: Date;
  }) => void;
  'typing:update': (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'presence:change': (data: { userId: string; status: UserStatus; lastSeen: Date }) => void;
  'conversation:update': (data: {
    conversationId: string;
    unreadCount: number;
    lastMessage?: Message;
  }) => void;
  'analytics:update': (metrics: RealtimeMetrics) => void;
  error: (data: { message: string; code: string }) => void;
}
