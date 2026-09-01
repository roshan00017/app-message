export const SOCKET_EVENTS = {
  // Client -> Server
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  MESSAGE_SEND: 'message:send',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_UPDATE: 'presence:update',
  MESSAGE_READ: 'message:read',
  ANALYTICS_SUBSCRIBE: 'analytics:subscribe',
  UNREAD_REQUEST: 'unread:request',

  // Server -> Client
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_CHANGE: 'presence:change',
  CONVERSATION_UPDATE: 'conversation:update',
  CONVERSATION_STATUS_CHANGE: 'conversation:status-change',
  AGENT_ASSIGNED: 'agent:assigned',
  ANALYTICS_UPDATE: 'analytics:update',
  UNREAD_SYNC: 'unread:sync',
  ERROR: 'error',
} as const;

export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  CONVERSATIONS: (userId: string) => `conversations:${userId}`,
  MESSAGES: (conversationId: string) => `messages:${conversationId}`,
  USER_PRESENCE: 'presence',
  PRESENCE: (userId: string) => `presence:${userId}`,
  UNREAD_COUNT: (userId: string, conversationId: string) => `unread:${userId}:${conversationId}`,
} as const;

export const CACHE_TTL = {
  USER: 300,
  CONVERSATIONS: 60,
  MESSAGES: 120,
  PRESENCE: 30,
  UNREAD_COUNT: 300,
} as const;
