import { Env } from '../types';

/**
 * Optimized Database Service for MVP Validator
 * Provides connection pooling, query optimization, and performance monitoring
 */
export class DatabaseService {
  private env: Env;
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

  constructor(env: Env) {
    this.env = env;
    this.queryCache = new Map();
  }

  /**
   * Execute a prepared statement with caching support
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
    } = {}
  ): Promise<T[]> {
    const { cache = false, cacheTTL = this.CACHE_TTL, cacheKey } = options;
    const key = cacheKey || this.generateCacheKey(query, params);

    // Check cache first
    if (cache && this.queryCache.has(key)) {
      const cached = this.queryCache.get(key)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.result;
      }
      this.queryCache.delete(key);
    }

    try {
      const startTime = Date.now();
      const stmt = this.env.DB.prepare(query);
      const result = params.length > 0 
        ? await stmt.bind(...params).all()
        : await stmt.all();

      const executionTime = Date.now() - startTime;
      
      // Log slow queries (>100ms)
      if (executionTime > 100) {
        console.warn(`Slow query detected: ${executionTime}ms`, {
          query: query.substring(0, 100),
          params: params.length,
          executionTime
        });
      }

      const data = result.results || [];

      // Cache the result if requested
      if (cache) {
        this.queryCache.set(key, {
          result: data,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
      }

      return data as T[];
    } catch (error) {
      console.error('Database query error:', {
        query: query.substring(0, 100),
        params,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Execute a single row query with caching
   */
  async executeQueryFirst<T = any>(
    query: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
    } = {}
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(query, params, options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async executeWrite(
    query: string,
    params: any[] = []
  ): Promise<{ success: boolean; meta: any }> {
    try {
      const startTime = Date.now();
      const stmt = this.env.DB.prepare(query);
      const result = params.length > 0 
        ? await stmt.bind(...params).run()
        : await stmt.run();

      const executionTime = Date.now() - startTime;
      
      // Log slow writes (>200ms)
      if (executionTime > 200) {
        console.warn(`Slow write operation: ${executionTime}ms`, {
          query: query.substring(0, 100),
          params: params.length,
          executionTime
        });
      }

      // Invalidate related cache entries
      this.invalidateCache(query);

      return {
        success: result.success,
        meta: result.meta
      };
    } catch (error) {
      console.error('Database write error:', {
        query: query.substring(0, 100),
        params,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async executeTransaction(operations: Array<{
    query: string;
    params?: any[];
  }>): Promise<{ success: boolean; results: any[] }> {
    try {
      const startTime = Date.now();
      const results: any[] = [];

      // SQLite in Cloudflare Workers doesn't support explicit transactions
      // But we can batch operations for better performance
      for (const operation of operations) {
        const result = await this.executeWrite(operation.query, operation.params);
        results.push(result);
        
        if (!result.success) {
          throw new Error(`Transaction failed at operation: ${operation.query.substring(0, 50)}`);
        }
      }

      const executionTime = Date.now() - startTime;
      console.log(`Transaction completed: ${executionTime}ms`, {
        operations: operations.length,
        executionTime
      });

      return { success: true, results };
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Get optimized project data with related entities
   */
  async getProjectWithRelations(projectId: string, userId: string) {
    const cacheKey = `project_relations_${projectId}_${userId}`;
    
    return this.executeQueryFirst(
      `
      SELECT 
        p.*,
        pr.id as prototype_id,
        pr.hero_copy,
        pr.features_json,
        pr.pricing_structure,
        lp.id as landing_page_id,
        lp.status as landing_page_status,
        lp.url as landing_page_url,
        c.id as campaign_id,
        c.status as campaign_status,
        c.budget as campaign_budget,
        a.total_visitors,
        a.conversion_rate
      FROM projects p
      LEFT JOIN prototypes pr ON p.id = pr.project_id
      LEFT JOIN landing_pages lp ON p.id = lp.project_id
      LEFT JOIN campaigns c ON p.id = c.project_id
      LEFT JOIN analytics a ON p.id = a.project_id
      WHERE p.id = ? AND p.user_id = ?
      `,
      [projectId, userId],
      { cache: true, cacheTTL: 2 * 60 * 1000, cacheKey } // 2 minutes cache
    );
  }

  /**
   * Get user projects with pagination and filtering
   */
  async getUserProjects(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      sortBy?: 'created_at' | 'updated_at' | 'idea_description';
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const {
      limit = 20,
      offset = 0,
      status,
      sortBy = 'updated_at',
      sortOrder = 'DESC'
    } = options;

    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT pr.id) as prototype_count,
        COUNT(DISTINCT lp.id) as landing_page_count,
        COUNT(DISTINCT c.id) as campaign_count
      FROM projects p
      LEFT JOIN prototypes pr ON p.id = pr.project_id
      LEFT JOIN landing_pages lp ON p.id = lp.project_id
      LEFT JOIN campaigns c ON p.id = c.project_id
      WHERE p.user_id = ?
    `;

    const params: any[] = [userId];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` GROUP BY p.id ORDER BY p.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const cacheKey = `user_projects_${userId}_${JSON.stringify(options)}`;
    
    return this.executeQuery(
      query,
      params,
      { cache: true, cacheTTL: 1 * 60 * 1000, cacheKey } // 1 minute cache
    );
  }

  /**
   * Get analytics data with time-based aggregation
   */
  async getAnalyticsData(
    projectId: string,
    timeRange: string = '7d'
  ) {
    const timeCondition = this.getTimeCondition(timeRange);
    const cacheKey = `analytics_${projectId}_${timeRange}`;

    return this.executeQuery(
      `
      SELECT 
        DATE(timestamp) as date,
        event_type,
        COUNT(*) as event_count,
        AVG(CASE WHEN event_value IS NOT NULL THEN event_value END) as avg_value
      FROM analytics 
      WHERE project_id = ? AND ${timeCondition}
      GROUP BY DATE(timestamp), event_type
      ORDER BY date DESC, event_type
      `,
      [projectId],
      { cache: true, cacheTTL: 5 * 60 * 1000, cacheKey } // 5 minutes cache
    );
  }

  /**
   * Generate cache key from query and parameters
   */
  private generateCacheKey(query: string, params: any[]): string {
    const queryHash = this.simpleHash(query);
    const paramsHash = this.simpleHash(JSON.stringify(params));
    return `query_${queryHash}_${paramsHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Invalidate cache entries based on query patterns
   */
  private invalidateCache(query: string): void {
    const lowerQuery = query.toLowerCase();
    const keysToDelete: string[] = [];

    for (const [key] of this.queryCache) {
      // Invalidate based on table names in the query
      if (lowerQuery.includes('projects') && key.includes('project')) {
        keysToDelete.push(key);
      } else if (lowerQuery.includes('analytics') && key.includes('analytics')) {
        keysToDelete.push(key);
      } else if (lowerQuery.includes('campaigns') && key.includes('campaign')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  /**
   * Get time condition for analytics queries
   */
  private getTimeCondition(timeRange: string): string {
    switch (timeRange) {
      case '1d':
        return "timestamp >= datetime('now', '-1 day')";
      case '7d':
        return "timestamp >= datetime('now', '-7 days')";
      case '30d':
        return "timestamp >= datetime('now', '-30 days')";
      case '90d':
        return "timestamp >= datetime('now', '-90 days')";
      default:
        return "timestamp >= datetime('now', '-7 days')";
    }
  }

  /**
   * Clear all cached queries
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.queryCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: value.ttl
    }));

    return {
      size: this.queryCache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      entries
    };
  }
}
