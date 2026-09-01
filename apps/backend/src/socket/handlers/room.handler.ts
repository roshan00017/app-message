import type { Socket } from 'socket.io';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { ConversationModel } from '../../models/conversation.model.js';
import { logger } from '../../utils/logger.js';

export function registerRoomHandlers(_io: Socket['server'], socket: Socket): void {
  socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, async (data: { conversationId: string }) => {
    const { conversationId } = data;
    const userId = socket.data.userId;

    if (!userId || userId === 'anonymous') {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Authentication required to join conversations' });
      return;
    }

    const conversation = await ConversationModel.findById(conversationId)
      .select('participants')
      .lean();

    if (!conversation) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Conversation not found' });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'You are not a participant of this conversation',
      });
      logger.warn({
        event: 'conversation:join:denied',
        userId,
        conversationId,
        socketId: socket.id,
      });
      return;
    }

    const roomName = `conversation:${conversationId}`;
    await socket.join(roomName);

    logger.info({
      event: 'conversation:join',
      userId,
      conversationId,
      socketId: socket.id,
    });
  });

  socket.on(SOCKET_EVENTS.CONVERSATION_LEAVE, async (data: { conversationId: string }) => {
    const { conversationId } = data;
    const roomName = `conversation:${conversationId}`;

    await socket.leave(roomName);

    logger.info({
      event: 'conversation:leave',
      userId: socket.data.userId,
      conversationId,
      socketId: socket.id,
    });
  });
}
