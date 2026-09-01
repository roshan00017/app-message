import Redis from 'ioredis';

import { logger } from '../utils/logger.js';
import { config } from './env.js';

let redis: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redis.on('error', (error) => {
      logger.error({ err: error }, 'Redis error');
    });

    redis.on('reconnecting', () => {
      logger.warn('Reconnecting to Redis');
    });
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
