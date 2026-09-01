import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { registerPresenceHandlers } from '@/socket/handlers/presence.handler.js';

const mocks = vi.hoisted(() => ({
  analyticsService: {
    trackUserOnline: vi.fn().mockResolvedValue(undefined),
    trackUserOffline: vi.fn().mockResolvedValue(undefined),
  },
  agentModel: {
    findOne: vi.fn().mockResolvedValue(null),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
  conversationModel: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/modules/analytics/analytics.service.js', () => ({
  analyticsService: mocks.analyticsService,
}));

vi.mock('@/models/agent.model.js', () => ({
  AgentModel: mocks.agentModel,
}));

vi.mock('@/models/conversation.model.js', () => ({
  ConversationModel: mocks.conversationModel,
}));

vi.mock('@/services/conversation-events.js', () => ({
  conversationEvents: {
    emit: vi.fn(),
  },
  CONVERSATION_EVENTS: {
    STATUS_CHANGED: 'conversation:status-changed',
    AGENT_ASSIGNED: 'conversation:agent-assigned',
  },
}));

describe('presence handlers', () => {
  let mockServer: Server;
  let mockSocket: Socket;
  let mockRedis: Redis;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
    } as unknown as Redis;

    mockServer = {
      emit: vi.fn(),
    } as unknown as Server;

    mockSocket = {
      data: { userId: 'user-1' },
      id: 'socket-1',
      on: vi.fn((event: string, handler: unknown) => {
        (mockSocket as unknown as Record<string, unknown>)[`handler:${event}`] = handler;
      }),
    } as unknown as Socket;

    registerPresenceHandlers(mockServer, mockSocket, mockRedis);
  });

  it('registers presence:update and disconnect handlers', () => {
    expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.PRESENCE_UPDATE, expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('stores presence in Redis with TTL 30s and broadcasts on presence:update', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.PRESENCE_UPDATE}`
    ] as (data: { status: string }) => Promise<void>;

    await handler({ status: 'online' });

    expect(mockRedis.set).toHaveBeenCalledWith(
      'presence:user-1',
      expect.stringContaining('"status":"online"'),
      'EX',
      30
    );

    expect(mockServer.emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE_CHANGE,
      expect.objectContaining({
        userId: 'user-1',
        status: 'online',
      })
    );
  });

  it('calls analyticsService.trackUserOnline for online status', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.PRESENCE_UPDATE}`
    ] as (data: { status: string }) => Promise<void>;

    await handler({ status: 'online' });

    expect(mocks.analyticsService.trackUserOnline).toHaveBeenCalledWith('user-1');
  });

  it('calls analyticsService.trackUserOffline for offline status', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.PRESENCE_UPDATE}`
    ] as (data: { status: string }) => Promise<void>;

    await handler({ status: 'offline' });

    expect(mocks.analyticsService.trackUserOffline).toHaveBeenCalledWith('user-1');
  });

  it('tracks user offline on disconnect', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      'handler:disconnect'
    ] as () => Promise<void>;

    await handler();

    expect(mocks.analyticsService.trackUserOffline).toHaveBeenCalledWith('user-1');
  });
});