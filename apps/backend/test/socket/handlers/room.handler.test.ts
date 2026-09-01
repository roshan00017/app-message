import type { Server, Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';

const mocks = vi.hoisted(() => ({
  conversationFindByIdMock: vi.fn(),
}));

vi.mock('@/models/conversation.model.js', () => ({
  ConversationModel: {
    findById: mocks.conversationFindByIdMock,
  },
}));

import { registerRoomHandlers } from '@/socket/handlers/room.handler.js';

const oid = (seed: string): string => {
  const hex = seed
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return (hex + '0'.repeat(24)).slice(0, 24);
};

const CONV_ID = oid('conv-1');
const USER_ID = oid('user-1');

function queryChain<T>(result: T) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn().mockReturnValue(q);
  q.lean = vi.fn().mockResolvedValue(result);
  return q;
}

describe('room handlers', () => {
  let mockServer: Pick<Server, 'to' | 'emit'>;
  let mockSocket: Socket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {};
    mockSocket = {
      data: { userId: USER_ID },
      id: 'socket-1',
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      on: vi.fn((event: string, handler: unknown) => {
        (mockSocket as unknown as Record<string, unknown>)[`handler:${event}`] = handler;
      }),
    } as unknown as Socket;

    registerRoomHandlers(mockServer as Server, mockSocket);
  });

  it('registers conversations:join and conversations:leave handlers', () => {
    expect(mockSocket.on).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONVERSATION_JOIN,
      expect.any(Function)
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONVERSATION_LEAVE,
      expect.any(Function)
    );
  });

  it('joins the conversation room when user is a participant', async () => {
    mocks.conversationFindByIdMock.mockReturnValue(
      queryChain({
        participants: [{ toString: () => USER_ID }],
      })
    );

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.CONVERSATION_JOIN}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: CONV_ID });

    expect(mockSocket.join).toHaveBeenCalledWith(`conversation:${CONV_ID}`);
  });

  it('rejects join when user is not a participant', async () => {
    mocks.conversationFindByIdMock.mockReturnValue(
      queryChain({
        participants: [{ toString: () => oid('other-user') }],
      })
    );

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.CONVERSATION_JOIN}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: CONV_ID });

    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ERROR, {
      message: 'You are not a participant of this conversation',
    });
  });

  it('rejects join when conversation does not exist', async () => {
    mocks.conversationFindByIdMock.mockReturnValue(queryChain(null));

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.CONVERSATION_JOIN}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: CONV_ID });

    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ERROR, {
      message: 'Conversation not found',
    });
  });

  it('rejects join for anonymous users', async () => {
    (mockSocket as unknown as Record<string, unknown>).data = { userId: 'anonymous' };

    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.CONVERSATION_JOIN}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: CONV_ID });

    expect(mockSocket.join).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ERROR, {
      message: 'Authentication required to join conversations',
    });
  });

  it('leaves the conversation room on conversation:leave', async () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.CONVERSATION_LEAVE}`
    ] as (data: { conversationId: string }) => Promise<void>;

    await handler({ conversationId: CONV_ID });

    expect(mockSocket.leave).toHaveBeenCalledWith(`conversation:${CONV_ID}`);
  });
});
