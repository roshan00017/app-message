import type { Server as HttpServer } from 'http';
import type { Server, Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { setupSocket } from '@/socket/setup.js';

const mocks = vi.hoisted(() => {
  const mockedSocketServer = {
    use: vi.fn(),
    on: vi.fn((event: string, handler: unknown) => {
      (mockedSocketServer as unknown as Record<string, unknown>)[`io:${event}`] = handler;
    }),
  } as unknown as Record<string, unknown>;

  return {
    mockedSocketServer,
    registerRoomHandlersMock: vi.fn(),
    registerMessageHandlersMock: vi.fn(),
    registerPresenceHandlersMock: vi.fn(),
    registerTypingHandlersMock: vi.fn(),
    socketErrorHandlerMock: vi.fn(),
    socketAuthMiddlewareMock: vi.fn((_socket: Socket, next: (err?: Error) => void) => next()),
    getRealtimeMetricsMock: vi.fn().mockResolvedValue({
      activeUsers: 5,
      messagesPerMinute: 10,
      messagesPerHour: 120,
      onlineUsers: 3,
      activeConversations: 2,
      averageResponseTime: 1200,
    }),
    getRedisConnectionMock: vi.fn(),
    initializeSocketMock: vi.fn().mockResolvedValue(undefined),
  };
});

const {
  mockedSocketServer,
  registerRoomHandlersMock,
  registerMessageHandlersMock,
  registerPresenceHandlersMock,
  registerTypingHandlersMock,
  socketErrorHandlerMock,
  socketAuthMiddlewareMock,
  getRealtimeMetricsMock,
  getRedisConnectionMock,
  initializeSocketMock,
} = mocks;

vi.mock('@/socket/index.js', () => ({
  initializeSocket: mocks.initializeSocketMock,
}));

vi.mock('@/socket/handlers/room.handler.js', () => ({ registerRoomHandlers: mocks.registerRoomHandlersMock }));
vi.mock('@/socket/handlers/message.handler.js', () => ({ registerMessageHandlers: mocks.registerMessageHandlersMock }));
vi.mock('@/socket/handlers/presence.handler.js', () => ({ registerPresenceHandlers: mocks.registerPresenceHandlersMock }));
vi.mock('@/socket/handlers/typing.handler.js', () => ({ registerTypingHandlers: mocks.registerTypingHandlersMock }));
vi.mock('@/socket/middleware/auth.middleware.js', () => ({ socketAuthMiddleware: mocks.socketAuthMiddlewareMock }));
vi.mock('@/socket/middleware/error.middleware.js', () => ({ socketErrorHandler: mocks.socketErrorHandlerMock }));
vi.mock('@/config/redis.js', () => ({ getRedisConnection: mocks.getRedisConnectionMock }));
vi.mock('@/modules/analytics/analytics.service.js', () => ({
  analyticsService: {
    getRealtimeMetrics: mocks.getRealtimeMetricsMock,
  },
}));

function createSocket(overrides: Partial<Record<string, unknown>> = {}): Socket {
  const socket = {
    data: { userId: 'user-1', user: { id: 'user-1', role: 'user' } },
    id: 'socket-1',
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
    on: vi.fn((event: string, handler: unknown) => {
      (socket as unknown as Record<string, unknown>)[`socket:${event}`] = handler;
    }),
    ...overrides,
  } as unknown as Socket;
  socket.on = vi.fn((event: string, handler: unknown) => {
    (socket as unknown as Record<string, unknown>)[`socket:${event}`] = handler;
  }) as Socket['on'];
  return socket;
}

describe('setupSocket (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The mocked initializeSocket must resolve to the mocked server.
    initializeSocketMock.mockResolvedValue(mockedSocketServer);
    // Reset the mock's event map for io.on
    Object.keys(mockedSocketServer).forEach((k) => {
      if (k.startsWith('io:')) delete (mockedSocketServer as unknown as Record<string, unknown>)[k];
    });
  });

  it('registers the auth middleware and returns the server', async () => {
    const httpServer = {} as HttpServer;
    const io = await setupSocket(httpServer);

    expect((mockedSocketServer as unknown as { use: ReturnType<typeof vi.fn> }).use).toHaveBeenCalledWith(
      socketAuthMiddlewareMock
    );
    expect(io).toBe(mockedSocketServer);
  });

  it('registers all handlers on connection', async () => {
    await setupSocket({} as HttpServer);

    const connectionHandler = (mockedSocketServer as unknown as Record<string, unknown>)[
      'io:connection'
    ] as (socket: Socket) => void;

    const socket = createSocket();
    connectionHandler(socket);

    expect(registerRoomHandlersMock).toHaveBeenCalledWith(mockedSocketServer, socket);
    expect(registerMessageHandlersMock).toHaveBeenCalledWith(mockedSocketServer, socket);
    expect(registerPresenceHandlersMock).toHaveBeenCalledWith(
      mockedSocketServer,
      socket,
      getRedisConnectionMock()
    );
    expect(registerTypingHandlersMock).toHaveBeenCalledWith(mockedSocketServer, socket);
    expect(socketErrorHandlerMock).toHaveBeenCalledWith(socket);
  });

  it('allows an admin user to subscribe to analytics and receive initial metrics', async () => {
    await setupSocket({} as HttpServer);

    const connectionHandler = (mockedSocketServer as unknown as Record<string, unknown>)[
      'io:connection'
    ] as (socket: Socket) => void;

    const socket = createSocket({
      data: { userId: 'admin-1', user: { id: 'admin-1', role: 'admin' } },
    });
    connectionHandler(socket);

    const subscribeHandler = (socket as unknown as Record<string, unknown>)[
      `socket:${SOCKET_EVENTS.ANALYTICS_SUBSCRIBE}`
    ] as () => Promise<void>;

    await subscribeHandler();

    expect(socket.join).toHaveBeenCalledWith('analytics:global');
    expect(getRealtimeMetricsMock).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ANALYTICS_UPDATE, {
      activeUsers: 5,
      messagesPerMinute: 10,
      messagesPerHour: 120,
      onlineUsers: 3,
      activeConversations: 2,
      averageResponseTime: 1200,
    });
  });

  it('ignores analytics:subscribe for non-admin users', async () => {
    await setupSocket({} as HttpServer);

    const connectionHandler = (mockedSocketServer as unknown as Record<string, unknown>)[
      'io:connection'
    ] as (socket: Socket) => void;

    const socket = createSocket(); // role: 'user'
    connectionHandler(socket);

    const subscribeHandler = (socket as unknown as Record<string, unknown>)[
      `socket:${SOCKET_EVENTS.ANALYTICS_SUBSCRIBE}`
    ] as () => Promise<void>;

    await subscribeHandler();

    // socket.join was called once for the user room on connection, but not for analytics:global
    expect(socket.join).not.toHaveBeenCalledWith('analytics:global');
    expect(getRealtimeMetricsMock).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('supports leaving the analytics room', async () => {
    await setupSocket({} as HttpServer);

    const connectionHandler = (mockedSocketServer as unknown as Record<string, unknown>)[
      'io:connection'
    ] as (socket: Socket) => void;

    const socket = createSocket();
    connectionHandler(socket);

    const leaveHandler = (socket as unknown as Record<string, unknown>)[
      `socket:${SOCKET_EVENTS.ANALYTICS_SUBSCRIBE}:leave`
    ] as () => void;

    leaveHandler();
    expect(socket.leave).toHaveBeenCalledWith('analytics:global');
  });
});