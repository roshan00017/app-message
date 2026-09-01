import { CACHE_KEYS, CACHE_TTL } from '@messaging/shared/constants';

import { getRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export class CacheService {
  private get redis() {
    return getRedisConnection();
  }

  // ─── Generic Cache Operations ────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      logger.debug({ key }, 'Cache hit');
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache get failed, falling back to DB');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      logger.debug({ key, ttl: ttlSeconds }, 'Cache set');
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache set failed');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache delete failed');
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
      }
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Cache pattern delete failed');
    }
  }

  // ─── User Cache ──────────────────────────────────────────────

  async getUser(userId: string) {
    return this.get(CACHE_KEYS.USER(userId));
  }

  async setUser(userId: string, user: unknown) {
    return this.set(CACHE_KEYS.USER(userId), user, CACHE_TTL.USER);
  }

  async invalidateUser(userId: string) {
    return this.del(CACHE_KEYS.USER(userId));
  }

  // ─── Conversations Cache ─────────────────────────────────────

  async getConversations(userId: string) {
    return this.get(CACHE_KEYS.CONVERSATIONS(userId));
  }

  async setConversations(userId: string, conversations: unknown) {
    return this.set(CACHE_KEYS.CONVERSATIONS(userId), conversations, CACHE_TTL.CONVERSATIONS);
  }

  async invalidateConversations(userId: string) {
    return this.del(CACHE_KEYS.CONVERSATIONS(userId));
  }

  async invalidateAllConversations() {
    return this.delPattern('conversations:*');
  }

  // ─── Messages Cache ──────────────────────────────────────────

  async getMessages(conversationId: string) {
    return this.get(CACHE_KEYS.MESSAGES(conversationId));
  }

  async setMessages(conversationId: string, messages: unknown) {
    return this.set(CACHE_KEYS.MESSAGES(conversationId), messages, CACHE_TTL.MESSAGES);
  }

  async invalidateMessages(conversationId: string) {
    return this.del(CACHE_KEYS.MESSAGES(conversationId));
  }

  async invalidateAllMessages() {
    return this.delPattern('messages:*');
  }

  // ─── Presence Cache ──────────────────────────────────────────

  async getPresence(userId: string) {
    return this.get(CACHE_KEYS.PRESENCE(userId));
  }

  async setPresence(userId: string, presence: unknown) {
    return this.set(CACHE_KEYS.PRESENCE(userId), presence, CACHE_TTL.PRESENCE);
  }

  async invalidatePresence(userId: string) {
    return this.del(CACHE_KEYS.PRESENCE(userId));
  }

  // ─── Unread Count Cache ──────────────────────────────────────

  async getUnreadCount(userId: string, conversationId: string) {
    return this.get<number>(CACHE_KEYS.UNREAD_COUNT(userId, conversationId));
  }

  async setUnreadCount(userId: string, conversationId: string, count: number) {
    return this.set(CACHE_KEYS.UNREAD_COUNT(userId, conversationId), count, CACHE_TTL.UNREAD_COUNT);
  }

  async invalidateUnreadCounts(userId: string) {
    return this.delPattern(`unread:${userId}:*`);
  }

  async incrementUnreadCount(userId: string, conversationId: string) {
    try {
      const key = CACHE_KEYS.UNREAD_COUNT(userId, conversationId);
      const current = await this.redis.get(key);
      const newCount = current ? parseInt(current, 10) + 1 : 1;
      await this.redis.setex(key, CACHE_TTL.UNREAD_COUNT, newCount.toString());
      return newCount;
    } catch (error) {
      logger.warn({ err: error, userId, conversationId }, 'Failed to increment unread count');
      return null;
    }
  }

  async resetUnreadCount(userId: string, conversationId: string) {
    try {
      const key = CACHE_KEYS.UNREAD_COUNT(userId, conversationId);
      await this.redis.setex(key, CACHE_TTL.UNREAD_COUNT, '0');
    } catch (error) {
      logger.warn({ err: error, userId, conversationId }, 'Failed to reset unread count');
    }
  }

  // ─── Batch Operations ────────────────────────────────────────

  async pipelineGet(keys: string[]): Promise<(string | null)[]> {
    try {
      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();
      return results?.map(([err, val]) => (err ? null : (val as string | null))) ?? [];
    } catch (error) {
      logger.warn({ err: error }, 'Pipeline get failed');
      return keys.map(() => null);
    }
  }

  // ─── Cache Statistics ────────────────────────────────────────

  async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const keys = await this.redis.dbsize();
      return {
        keys,
        memory: memoryMatch?.[1] ?? 'unknown',
      };
    } catch (error) {
      return { keys: 0, memory: 'unknown' };
    }
  }
}

export const cacheService = new CacheService();
