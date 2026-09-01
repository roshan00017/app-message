import MongoStore from 'connect-mongo';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import { createServer } from 'http';

import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';
import { disconnectRedis, getRedisConnection } from './config/redis.js';
import { attachCsrfToken, csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { openApiRouter } from './openapi/router.js';
import apiRoutes from './routes/index.js';
import { setupSocket } from './socket/setup.js';
import { startPushWorker, stopPushWorker } from './services/queue.service.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDatabase();
  getRedisConnection();

  const app = express();
  const httpServer = createServer(app);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });
  app.use(limiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'sessionId',
      cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
      store: MongoStore.create({
        mongoUrl: config.mongodbUri,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60,
        autoRemove: 'native',
      }),
    })
  );

  app.use(requestLogger);
  app.use(attachCsrfToken());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Diagnostic: check if Socket.IO is reachable
  app.get('/socket.io-test', (_req, res) => {
    res.json({ socketio: 'reachable', port: config.port });
  });

  app.use('/api-docs', openApiRouter);

  app.use(csrfProtection());
  app.use('/api/v1', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  await setupSocket(httpServer);

  // Start push notification worker
  startPushWorker();

  httpServer.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`API docs: http://localhost:${config.port}/api-docs/docs`);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    await stopPushWorker();
    httpServer.close();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
