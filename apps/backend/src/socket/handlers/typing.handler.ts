import type { Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { logger } from '../../utils/logger.js';

export function registerTypingHandlers(_io: Socket['server'], socket: Socket): void {
  socket.on(SOCKET_EVENTS.TYPING_START, (data: { conversationId: string }) => {
    const { conversationId } = data;

    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId,
      userId: socket.data.userId,
      isTyping: true,
    });

    logger.debug({
      event: 'typing:start',
      userId: socket.data.userId,
      conversationId,
    });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { conversationId: string }) => {
    const { conversationId } = data;

    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId,
      userId: socket.data.userId,
      isTyping: false,
    });

    logger.debug({
      event: 'typing:stop',
      userId: socket.data.userId,
      conversationId,
    });
  });
}
