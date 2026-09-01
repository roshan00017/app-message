import type { Socket } from 'socket.io';

import { logger } from '../../utils/logger.js';

export function socketErrorHandler(socket: Socket): void {
  socket.on('error', (error: Error) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      userId: socket.data.userId,
      socketId: socket.id,
    });

    socket.emit('error', {
      message: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
    });
  });
}
