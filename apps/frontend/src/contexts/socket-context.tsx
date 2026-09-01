import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';

import { connectSocket, getSocket, SOCKET_EVENTS } from '@/services/socket';
import { startPresenceHeartbeat, stopPresenceHeartbeat } from '@/services/presence';
import { usePresenceStore } from '@/stores/usePresenceStore';
import { useTypingStore } from '@/stores/useTypingStore';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket>(getSocket());
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);
  const setStatus = usePresenceStore((s) => s.setStatus);
  const setTyping = useTypingStore((s) => s.setTyping);

  // Auth state from store (reactive)
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Track whether socket is intentionally connected for current auth state
  const wasConnectedRef = useRef(false);

  // Always reference the live socket singleton. `getSocket()` returns the same
  // instance until it is recreated (e.g. after a logout disconnect), so we keep
  // the ref in sync to avoid binding handlers to a stale/disconnected socket.
  const ensureLiveSocket = () => {
    socketRef.current = getSocket();
    return socketRef.current;
  };

  // Register socket event handlers (runs once)
  useEffect(() => {
    const socket = ensureLiveSocket();

    const handleConnect = () => {
      setConnectionStatus('connected');
      startPresenceHeartbeat();
    };

    const handleDisconnect = (reason: string) => {
      setConnectionStatus('disconnected');
      stopPresenceHeartbeat();
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };

    const handleReconnectAttempt = () => setConnectionStatus('reconnecting');
    const handleReconnect = () => setConnectionStatus('connected');
    const handleConnectError = () => setConnectionStatus('error');

    const handlePresenceChange = (data: Record<string, unknown>) => {
      setStatus(data.userId as string, data.status as string, data.lastSeen as Date);
    };

    const handleTypingUpdate = (data: Record<string, unknown>) => {
      setTyping(data.conversationId as string, data.userId as string, data.isTyping as boolean);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);
    socket.on('connect_error', handleConnectError);
    socket.on(SOCKET_EVENTS.PRESENCE_CHANGE, handlePresenceChange);
    socket.on(SOCKET_EVENTS.TYPING_UPDATE, handleTypingUpdate);

    // Handle unread count sync
    const handleUnreadSync = (_data: { conversationId: string; unreadCount: number }) => {
      // This will be handled by the query invalidation in useSocketSync
      // But we can also update local state if needed
    };
    socket.on(SOCKET_EVENTS.UNREAD_SYNC, handleUnreadSync);

    const handleOnline = () => {
      if (useAuthStore.getState().user && !socket.connected) {
        socket.connect();
      }
    };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('connect_error', handleConnectError);
      socket.off(SOCKET_EVENTS.PRESENCE_CHANGE, handlePresenceChange);
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, handleTypingUpdate);
      socket.off(SOCKET_EVENTS.UNREAD_SYNC, handleUnreadSync);
      stopPresenceHeartbeat();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setConnectionStatus, setStatus, setTyping]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    const socket = ensureLiveSocket();

    // Don't act while auth is still loading
    if (isLoading) return;

    if (user && !wasConnectedRef.current) {
      // User just became authenticated → connect
      wasConnectedRef.current = true;
      if (!socket.connected) {
        connectSocket();
      }
    } else if (!user && wasConnectedRef.current) {
      // User just logged out → disconnect
      wasConnectedRef.current = false;
      stopPresenceHeartbeat();
      if (socket.connected) {
        socket.disconnect();
      }
      setConnectionStatus('connecting'); // Reset for next login
    }
  }, [user, isLoading, setConnectionStatus]);

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = getSocket();
    socket?.on(event, handler);
    return () => {
      socket?.off(event, handler);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: ensureLiveSocket(), emit, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
