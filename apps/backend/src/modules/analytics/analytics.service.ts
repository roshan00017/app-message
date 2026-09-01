import { getRedisConnection } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

interface RealtimeMetrics {
  activeUsers: number;
  messagesPerMinute: number;
  messagesPerHour: number;
  onlineUsers: number;
  activeConversations: number;
  avgResponseTime: number;
}

export class AnalyticsService {
  private get redis() {
    return getRedisConnection();
  }

  private readonly ONLINE_USERS_KEY = 'analytics:online_users';
  private readonly ACTIVE_CONVERSATIONS_KEY = 'analytics:active_conversations';
  private readonly MESSAGES_KEY = 'analytics:messages';
  private readonly RESPONSE_TIMES_KEY = 'analytics:response_times';

  /**
   * Track a new message
   */
  async trackMessage(conversationId: string): Promise<void> {
    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000) * 60000;
      const hour = Math.floor(now / 3600000) * 3600000;

      const pipeline = this.redis.pipeline();

      pipeline.zadd(this.MESSAGES_KEY, minute, `minute:${minute}`);
      pipeline.zadd(this.MESSAGES_KEY, hour, `hour:${hour}`);

      pipeline.sadd(this.ACTIVE_CONVERSATIONS_KEY, conversationId);
      pipeline.expire(this.ACTIVE_CONVERSATIONS_KEY, 300);

      await pipeline.exec();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to track message analytics');
    }
  }

  /**
   * Track user online status
   */
  async trackUserOnline(userId: string): Promise<void> {
    try {
      await this.redis.sadd(this.ONLINE_USERS_KEY, userId);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to track user online');
    }
  }

  /**
   * Track user offline
   */
  async trackUserOffline(userId: string): Promise<void> {
    try {
      await this.redis.srem(this.ONLINE_USERS_KEY, userId);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to track user offline');
    }
  }

  /**
   * Track response time
   */
  async trackResponseTime(conversationId: string, responseTimeMs: number): Promise<void> {
    try {
      const now = Date.now();
      await this.redis.zadd(this.RESPONSE_TIMES_KEY, now, `${conversationId}:${responseTimeMs}`);
      await this.redis.zremrangebyscore(this.RESPONSE_TIMES_KEY, 0, now - 3600000);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to track response time');
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    try {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const oneHourAgo = now - 3600000;

      const pipeline = this.redis.pipeline();

      pipeline.scard(this.ONLINE_USERS_KEY);
      pipeline.scard(this.ACTIVE_CONVERSATIONS_KEY);
      pipeline.zcount(this.MESSAGES_KEY, oneMinuteAgo, now);
      pipeline.zcount(this.MESSAGES_KEY, oneHourAgo, now);
      pipeline.zrange(this.RESPONSE_TIMES_KEY, 0, -1);

      const results = await pipeline.exec();

      const onlineUsers = (results?.[0]?.[1] as number) ?? 0;
      const activeConversations = (results?.[1]?.[1] as number) ?? 0;
      const messagesPerMinute = (results?.[2]?.[1] as number) ?? 0;
      const messagesPerHour = (results?.[3]?.[1] as number) ?? 0;

      const responseTimes = (results?.[4]?.[1] as string[]) ?? [];
      let avgResponseTime = 0;
      if (responseTimes.length > 0) {
        const times = responseTimes.map((t) => {
          const parts = t.split(':');
          return parseInt(parts[parts.length - 1], 10);
        });
        const validTimes = times.filter((t) => !isNaN(t));
        if (validTimes.length > 0) {
          avgResponseTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        }
      }

      return {
        activeUsers: onlineUsers,
        messagesPerMinute,
        messagesPerHour,
        onlineUsers,
        activeConversations,
        avgResponseTime: Math.round(avgResponseTime),
      };
    } catch (error) {
      logger.warn({ err: error }, 'Failed to get analytics metrics');
      return {
        activeUsers: 0,
        messagesPerMinute: 0,
        messagesPerHour: 0,
        onlineUsers: 0,
        activeConversations: 0,
        avgResponseTime: 0,
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
