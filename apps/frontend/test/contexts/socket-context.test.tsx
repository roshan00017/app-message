import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { SocketProvider, useSocketContext } from '@/contexts/socket-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useTypingStore } from '@/stores/useTypingStore';
import { usePresenceStore } from '@/stores/usePresenceStore';

// Mock the socket client to a controllable fake.
let mockEmit: ReturnType<typeof vi.fn>;
let mockOn: ReturnType<typeof vi.fn>;
let mockOff: ReturnType<typeof vi.fn>;
let mockConnect: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;
let registeredHandlers: Record<string, (...args: never[]) => void>;
let mockSocket: {
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

vi.mock('@/services/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: () => mockConnect(),
  disconnectSocket: () => mockDisconnect(),
  SOCKET_EVENTS: {
    PRESENCE_CHANGE: 'presence:change',
    TYPING_UPDATE: 'typing:update',
  },
}));

vi.mock('@/services/presence', () => ({
  startPresenceHeartbeat: vi.fn(),
  stopPresenceHeartbeat: vi.fn(),
}));

function setupMockSocket() {
  registeredHandlers = {};
  mockEmit = vi.fn();
  mockOn = vi.fn((event: string, handler: (...args: never[]) => void) => {
    registeredHandlers[event] = handler;
  });
  mockOff = vi.fn();
  mockConnect = vi.fn();
  mockDisconnect = vi.fn();
  mockSocket = {
    connected: false,
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    connect: mockConnect,
    disconnect: mockDisconnect,
  } as unknown as typeof mockSocket;
}

function Consumer() {
  const { socket, emit, on } = useSocketContext();
  return (
    <div>
      <span data-testid="has-socket">{socket ? 'yes' : 'no'}</span>
      <button onClick={() => emit('test:event', { a: 1 })}>Emit</button>
      <button onClick={() => on('x', () => {})}>On</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <SocketProvider>
      <Consumer />
    </SocketProvider>
  );
}

describe('SocketProvider (integration)', () => {
  beforeEach(() => {
    setupMockSocket();
    useAuthStore.setState({ user: null, isLoading: false });
    useUIStore.setState({ connectionStatus: 'connecting' });
    useTypingStore.setState({ typing: {} });
    usePresenceStore.setState({ statuses: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides the socket through context', () => {
    renderProvider();
    expect(screen.getByTestId('has-socket').textContent).toBe('yes');
  });

  it('registers connect/disconnect/typing/presence handlers on mount', () => {
    renderProvider();

    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('reconnect_attempt', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('reconnect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('typing:update', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('presence:change', expect.any(Function));
  });

  it('connects the socket when a user authenticates', () => {
    renderProvider();
    expect(mockConnect).not.toHaveBeenCalled();

    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        name: 'Alice',
        email: 'a@b.com',
        role: 'user',
        status: 'offline',
        lastSeen: new Date(),
      });
    });

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('updates connection status on connect event', () => {
    renderProvider();

    act(() => {
      registeredHandlers['connect']?.();
    });

    expect(useUIStore.getState().connectionStatus).toBe('connected');
  });

  it('updates connection status on disconnect event', () => {
    renderProvider();

    act(() => {
      registeredHandlers['disconnect']?.('transport close');
    });

    expect(useUIStore.getState().connectionStatus).toBe('disconnected');
  });

  it('updates presence store when presence:change is received', () => {
    renderProvider();

    act(() => {
      registeredHandlers['presence:change']?.({
        userId: 'user-9',
        status: 'online',
        lastSeen: new Date(),
      });
    });

    const status = usePresenceStore.getState().getStatus('user-9');
    expect(status.status).toBe('online');
  });

  it('updates typing store when typing:update is received', () => {
    renderProvider();

    act(() => {
      registeredHandlers['typing:update']?.({
        conversationId: 'conv-1',
        userId: 'user-9',
        isTyping: true,
      });
    });

    expect(useTypingStore.getState().getTypingUsers('conv-1')).toEqual(['user-9']);

    act(() => {
      registeredHandlers['typing:update']?.({
        conversationId: 'conv-1',
        userId: 'user-9',
        isTyping: false,
      });
    });

    expect(useTypingStore.getState().getTypingUsers('conv-1')).toEqual([]);
  });

  it('exposes an emit function that forwards events to the socket', () => {
    mockSocket.connected = true;
    renderProvider();

    act(() => {
      screen.getByText('Emit').click();
    });

    expect(mockEmit).toHaveBeenCalledWith('test:event', { a: 1 });
  });
});