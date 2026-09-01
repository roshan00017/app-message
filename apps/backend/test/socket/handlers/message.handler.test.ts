import type { Server, Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { registerMessageHandlers } from '@/socket/handlers/message.handler.js';

const mocks = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
  analyticsTrackMessageMock: vi.fn().mockResolvedValue(undefined),
  queuePushNotificationMock: vi.fn().mockResolvedValue(undefined),
  markAsReadMock: vi.fn().mockResolvedValue({ modifiedCount: 2, matchedCount: 2 }),
  markAsDeliveredMock: vi.fn().mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
  getPresenceMock: vi.fn().mockResolvedValue(null),
  conversationFindByIdMock: vi.fn().mockResolvedValue({
    participants: ['user-1', 'user-2'],
    name: 'Test',
  }),
}));

const {
  sendMessageMock,
  analyticsTrackMessageMock,
  queuePushNotificationMock,
  markAsReadMock,
  markAsDeliveredMock,
  getPresenceMock,
  conversationFindByIdMock,
} = mocks;

vi.mock('@/models/conversation.model.js', () => ({
  ConversationModel: {
    findById: mocks.conversationFindByIdMock,
  },
}));

vi.mock('@/modules/conversations/conversation.service.js', () => ({
  ConversationService: class {
    sendMessage = mocks.sendMessageMock;
  },
}));

vi.mock('@/modules/analytics/analytics.service.js', () => ({
  analyticsService: {
    trackMessage: mocks.analyticsTrackMessageMock,
  },
}));

vi.mock('@/services/queue.service.js', () => ({
  queuePushNotification: mocks.queuePushNotificationMock,
}));

vi.mock('@/services/status.service.js', () => ({
  statusService: {
    markAsRead: mocks.markAsReadMock,
    markAsDelivered: mocks.markAsDeliveredMock,
  },
}));

vi.mock('@/services/cache.service.js', () => ({
  cacheService: {
    getPresence: mocks.getPresenceMock,
  },
}));

describe('message handlers', () => {
  let mockSocket: Socket;
  const emitMock = vi.fn();
  let serverEmitMock: ReturnType<typeof vi.fn>;
  const findMock = vi.fn();
  const sendMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    serverEmitMock = vi.fn();
    sendMock.mockResolvedValue(undefined);

    mockSocket = {
      data: { userId: 'user-1', user: { name: 'Alice' } },
      id: 'socket-1',
      emit: emitMock,
      on: vi.fn((event: string, handler: unknown) => {
        (mockSocket as unknown as Record<string, unknown>)[`handler:${event}`] = handler;
      }),
    } as unknown as Socket;

    const mockIO = {
      to: vi.fn().mockReturnValue({ emit: serverEmitMock }),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
        sockets: new Map(),
      },
    } as unknown as Server;

    registerMessageHandlers(mockIO, mockSocket);
  });

  it('registers message:send and message:read handlers', () => {
    expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_SEND, expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_READ, expect.any(Function));
  });

  it('persists and broadcasts the message on message:send', async () => {
    const message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'hello',
      type: 'text',
      statuses: [],
      createdAt: new Date(),
    };
    sendMessageMock.mockResolvedValue(message);

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.MESSAGE_SEND}`
    ] as (data: { conversationId: string; content: string; type?: string }) => Promise<void>;

    await handler({ conversationId: 'conv-1', content: 'hello', type: 'text' });

    expect(sendMessageMock).toHaveBeenCalledWith('conv-1', 'user-1', 'hello', 'text');
    expect(serverEmitMock).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_NEW, message);
    expect(analyticsTrackMessageMock).toHaveBeenCalledWith('conv-1');
  });

  it('defaults message type to text', async () => {
    sendMessageMock.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'hello',
      type: 'text',
      statuses: [],
      createdAt: new Date(),
    });

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.MESSAGE_SEND}`
    ] as (data: { conversationId: string; content: string }) => Promise<void>;

    await handler({ conversationId: 'conv-1', content: 'hello' });

    expect(sendMessageMock).toHaveBeenCalledWith('conv-1', 'user-1', 'hello', 'text');
  });

  it('emits error to sender on failure', async () => {
    sendMessageMock.mockRejectedValue(new Error('DB down'));

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.MESSAGE_SEND}`
    ] as (data: { conversationId: string; content: string }) => Promise<void>;

    await handler({ conversationId: 'conv-1', content: 'hello' });

    expect(emitMock).toHaveBeenCalledWith(SOCKET_EVENTS.ERROR, {
      message: 'DB down',
      code: 'MESSAGE_SEND_FAILED',
    });
  });

  it('marks messages as read and broadcasts status on message:read', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.MESSAGE_READ}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: 'conv-1' });

    expect(markAsReadMock).toHaveBeenCalledWith('conv-1', 'user-1');
    expect(serverEmitMock).toHaveBeenCalledWith(
      SOCKET_EVENTS.MESSAGE_STATUS,
      expect.objectContaining({
        conversationId: 'conv-1',
        userId: 'user-1',
        status: 'read',
        modifiedCount: 2,
      })
    );
  });
});