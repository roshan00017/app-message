import type { Socket } from 'socket.io';

import { socketErrorHandler } from '@/socket/middleware/error.middleware.js';

describe('socketErrorHandler', () => {
  it('registers an error listener on the socket', () => {
    const on = vi.fn();
    const socket = { id: 's1', data: { userId: 'user-1' }, on } as unknown as Socket;

    socketErrorHandler(socket);

    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('emits an internal error message to the client', () => {
    const emit = vi.fn();
    let handler: ((error: Error) => void) | undefined;
    const socket = {
      id: 's1',
      data: { userId: 'user-1' },
      emit,
      on: vi.fn((_event: string, fn: (error: Error) => void) => {
        handler = fn;
      }),
    } as unknown as Socket;

    socketErrorHandler(socket);
    handler?.(new Error('boom'));

    expect(emit).toHaveBeenCalledWith('error', {
      message: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
    });
  });
});