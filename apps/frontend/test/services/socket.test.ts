import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { disconnectSocket, getSocket } from '@/services/socket';

describe('socket service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('returns a singleton socket instance via getSocket', async () => {
    const { getSocket, disconnectSocket } = await import('@/services/socket');
    const socketA = getSocket();
    const socketB = getSocket();

    expect(socketA).toBe(socketB);
    disconnectSocket();
  });

  it('creates a new socket after disconnect', async () => {
    const { getSocket, disconnectSocket } = await import('@/services/socket');
    const socketA = getSocket();
    disconnectSocket();

    const module2 = await import('@/services/socket');
    const socketB = module2.getSocket();

    expect(socketB).not.toBe(socketA);
    disconnectSocket();
  });

  it('configures the socket with credentials and no auto-connect', async () => {
    const ioMock = vi.fn();
    vi.doMock('socket.io-client', () => ({
      io: ioMock,
    }));

    const { getSocket } = await import('@/services/socket');
    getSocket();

    expect(ioMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        withCredentials: true,
        autoConnect: false,
        reconnection: true,
      })
    );
  });
});