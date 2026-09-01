import { useEffect } from 'react';

import { SOCKET_EVENTS } from '@messaging/shared/constants';

import { getSocket } from '@/services/socket';

/**
 * Joins/leaves the Socket.IO room for a conversation so the backend can
 * deliver real-time events (`message:new`, `message:status`, typing, etc.)
 * to this socket. Re-emits the join after every (re)connect since room
 * membership is lost when the socket is recreated.
 */
export function useConversationSocket(conversationId?: string): void {
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();

    const join = () => {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId });
      }
    };

    const handleConnect = () => join();

    socket.on('connect', handleConnect);
    join();

    return () => {
      socket.off('connect', handleConnect);
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.CONVERSATION_LEAVE, { conversationId });
      }
    };
  }, [conversationId]);
}
