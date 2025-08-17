import { Env } from '../types';

/**
 * Redis Caching Service for MVP Validator
 * Provides distributed caching with TTL, invalidation patterns, and performance monitoring
 */
export class CacheService {
  private env: Env;
  private localCache: Map<string, { value: any; expiry: number }>;
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(env: Env) {
    this.env = env;
    this.localCache = new Map();
  }

  /**
   * Get value from cache (Redis first, then local fallback)
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.env.REDIS) {
        const redisValue = await this.env.REDIS.get(key);
        if (redisValue !== null) {
          this.cacheHits++;
          return JSON.parse(redisValue);
        }
      }

      // Fallback to local cache
      const localValue = this.localCache.get(key);
      if (localValue && Date.now() < localValue.expiry) {
        this.cacheHits++;
        return localValue.value;
      }

      // Remove expired local cache entry
      if (localValue) {
        this.localCache.delete(key);
      }

      this.cacheMisses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', { key, error });
      this.cacheMisses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis if available
      if (this.env.REDIS) {
        await this.env.REDIS.setex(key, ttlSeconds, serializedValue);
      }

      // Also set in local cache as fallback
      this.localCache.set(key, {
        value,
        expiry: Date.now() + (ttlSeconds * 1000)
      });

      // Cleanup expired local cache entries periodically
      if (this.localCache.size > 1000) {
        this.cleanupLocalCache();
      }
    } catch (error) {
      console.error('Cache set error:', { key, error });
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.env.REDIS) {
        await this.env.REDIS.del(key);
      }
      this.localCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', { key, error });
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.env.REDIS) {
        // Redis pattern deletion
        const keys = await this.env.REDIS.keys(pattern);
        if (keys.length > 0) {
          await this.env.REDIS.del(...keys);
        }
      }

      // Local cache pattern deletion
      const keysToDelete: string[] = [];
      for (const key of this.localCache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.localCache.delete(key));
    } catch (error) {
      console.error('Cache delete pattern error:', { pattern, error });
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fetchFunction();
      await this.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      console.error('Cache getOrSet error:', { key, error });
      throw error;
    }
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, amount: number = 1, ttlSeconds?: number): Promise<number> {
    try {
      if (this.env.REDIS) {
        const result = await this.env.REDIS.incrby(key, amount);
        if (ttlSeconds) {
          await this.env.REDIS.expire(key, ttlSeconds);
        }
        return result;
      }

      // Local cache increment
      const current = await this.get<number>(key) || 0;
      const newValue = current + amount;
      await this.set(key, newValue, ttlSeconds || this.DEFAULT_TTL);
      return newValue;
    } catch (error) {
      console.error('Cache increment error:', { key, error });
      return 0;
    }
  }

  /**
   * Cache project data with hierarchical invalidation
   */
  async cacheProject(projectId: string, data: any, ttlSeconds: number = 300): Promise<void> {
    const key = `project:${projectId}`;
    await this.set(key, data, ttlSeconds);
  }

  /**
   * Cache user projects list
   */
  async cacheUserProjects(userId: string, data: any, ttlSeconds: number = 180): Promise<void> {
    const key = `user_projects:${userId}`;
    await this.set(key, data, ttlSeconds);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(projectId: string, timeRange: string, data: any, ttlSeconds: number = 300): Promise<void> {
    const key = `analytics:${projectId}:${timeRange}`;
    await this.set(key, data, ttlSeconds);
  }

  /**
   * Cache API response
   */
  async cacheApiResponse(endpoint: string, params: any, data: any, ttlSeconds: number = 60): Promise<void> {
    const paramHash = this.hashObject(params);
    const key = `api:${endpoint}:${paramHash}`;
    await this.set(key, data, ttlSeconds);
  }

  /**
   * Invalidate project-related cache
   */
  async invalidateProject(projectId: string): Promise<void> {
    await this.deletePattern(`project:${projectId}*`);
    await this.deletePattern(`analytics:${projectId}*`);
    await this.deletePattern(`campaign:${projectId}*`);
    await this.deletePattern(`ab_test:${projectId}*`);
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`user_projects:${userId}*`);
    await this.deletePattern(`user:${userId}*`);
  }

  /**
   * Rate limiting using cache
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    try {
      if (this.env.REDIS) {
        // Redis-based rate limiting with sliding window
        const pipeline = this.env.REDIS.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zadd(key, now, now);
        pipeline.zcard(key);
        pipeline.expire(key, windowSeconds);
        
        const results = await pipeline.exec();
        const currentCount = results[2][1] as number;
        
        return {
          allowed: currentCount <= maxRequests,
          remaining: Math.max(0, maxRequests - currentCount),
          resetTime: now + (windowSeconds * 1000)
        };
      }

      // Local cache fallback (simple counter-based)
      const current = await this.get<number>(key) || 0;
      if (current >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (windowSeconds * 1000)
        };
      }

      await this.increment(key, 1, windowSeconds);
      return {
        allowed: true,
        remaining: maxRequests - current - 1,
        resetTime: now + (windowSeconds * 1000)
      };
    } catch (error) {
      console.error('Rate limit check error:', { identifier, error });
      // Allow request on error
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + (windowSeconds * 1000)
      };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    localCacheSize: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hitRate: total > 0 ? this.cacheHits / total : 0,
      totalHits: this.cacheHits,
      totalMisses: this.cacheMisses,
      localCacheSize: this.localCache.size
    };
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    try {
      if (this.env.REDIS) {
        await this.env.REDIS.flushall();
      }
      this.localCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Cleanup expired entries from local cache
   */
  private cleanupLocalCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.localCache) {
      if (now >= value.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.localCache.delete(key));
  }

  /**
   * Check if key matches pattern (simple glob-style matching)
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Hash object for consistent cache keys
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
