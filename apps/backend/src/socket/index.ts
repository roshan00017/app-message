import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import { config } from '../config/env.js';
import { getRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export async function initializeSocket(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
  });

  // Try to set up Redis adapter for horizontal scaling
  try {
    const redis = getRedisConnection();
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    await Promise.all([
      new Promise<void>((resolve) => pubClient.once('ready', resolve)),
      new Promise<void>((resolve) => subClient.once('ready', resolve)),
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO initialized with Redis adapter');
  } catch (error) {
    logger.warn(
      { err: error },
      'Redis adapter unavailable — running in single-server mode'
    );
  }

  return io;
}
