import type { Server, Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { registerTypingHandlers } from '@/socket/handlers/typing.handler.js';

describe('typing handlers', () => {
  let mockServer: Pick<Server, 'to' | 'emit'>;
  let mockSocket: Socket;

  beforeEach(() => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });

    mockServer = { to, emit };
    mockSocket = {
      data: { userId: 'user-1' },
      id: 'socket-1',
      to: vi.fn().mockReturnValue({ emit }),
      on: vi.fn((event: string, handler: unknown) => {
        (mockSocket as unknown as Record<string, unknown>)[`handler:${event}`] = handler;
      }),
    } as unknown as Socket;

    registerTypingHandlers(mockServer as Server, mockSocket);
  });

  it('registers typing:start and typing:stop handlers', () => {
    expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.TYPING_START, expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.TYPING_STOP, expect.any(Function));
  });

  it('broadcasts typing:update with isTyping=true on typing:start', () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.TYPING_START}`
    ] as (data: { conversationId: string }) => void;

    handler({ conversationId: 'conv-1' });

    expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
    const toResult = mockSocket.to as ReturnType<typeof vi.fn>;
    const toReturn = toResult.mock.results[0].value as { emit: ReturnType<typeof vi.fn> };
    expect(toReturn.emit).toHaveBeenCalledWith(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId: 'conv-1',
      userId: 'user-1',
      isTyping: true,
    });
  });

  it('broadcasts typing:update with isTyping=false on typing:stop', () => {
    const handler = (mockSocket as unknown as Record<string, unknown>)[
      `handler:${SOCKET_EVENTS.TYPING_STOP}`
    ] as (data: { conversationId: string }) => void;

    handler({ conversationId: 'conv-1' });

    expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
    const toResult = mockSocket.to as ReturnType<typeof vi.fn>;
    const toReturn = toResult.mock.results[0].value as { emit: ReturnType<typeof vi.fn> };
    expect(toReturn.emit).toHaveBeenCalledWith(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId: 'conv-1',
      userId: 'user-1',
      isTyping: false,
    });
  });
});