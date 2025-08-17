import { Env } from '../types';

/**
 * Error Monitoring and Performance Tracking Service
 * Integrates with Sentry and provides custom monitoring capabilities
 */
export class MonitoringService {
  private env: Env;
  private performanceMetrics: Map<string, number[]>;
  private errorCounts: Map<string, number>;

  constructor(env: Env) {
    this.env = env;
    this.performanceMetrics = new Map();
    this.errorCounts = new Map();
  }

  /**
   * Initialize Sentry (if available)
   */
  initSentry(): void {
    if (this.env.SENTRY_DSN) {
      // Sentry initialization would go here
      // For Cloudflare Workers, we'd use @sentry/cloudflare-workers
      console.log('Sentry monitoring initialized');
    }
  }

  /**
   * Log error with context and send to Sentry
   */
  async logError(
    error: Error | string,
    context: {
      userId?: string;
      projectId?: string;
      endpoint?: string;
      userAgent?: string;
      ip?: string;
      additionalData?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const errorData = {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      context,
      environment: this.env.ENVIRONMENT || 'production'
    };

    try {
      // Send to Sentry if configured
      if (this.env.SENTRY_DSN) {
        await this.sendToSentry(errorData);
      }

      // Log to console with structured data
      console.error('Application Error:', errorData);

      // Track error counts
      const errorKey = `${context.endpoint || 'unknown'}:${errorMessage}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

      // Send to custom error tracking endpoint if configured
      if (this.env.ERROR_WEBHOOK_URL) {
        await this.sendToWebhook(errorData);
      }

    } catch (monitoringError) {
      console.error('Monitoring service error:', monitoringError);
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata: Record<string, any> = {}
  ): void {
    const performanceData = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };

    // Track performance metrics
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) { // > 1 second
      console.warn('Slow operation detected:', performanceData);
    }

    // Send to monitoring if configured
    if (this.env.PERFORMANCE_WEBHOOK_URL) {
      this.sendPerformanceData(performanceData).catch(error => {
        console.error('Failed to send performance data:', error);
      });
    }
  }

  /**
   * Middleware for automatic error tracking
   */
  errorMiddleware = async (c: any, next: () => Promise<void>) => {
    const startTime = Date.now();
    const endpoint = `${c.req.method} ${c.req.path}`;

    try {
      await next();
      
      // Log successful request performance
      const duration = Date.now() - startTime;
      this.logPerformance(endpoint, duration, {
        status: c.res.status,
        method: c.req.method,
        path: c.req.path
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error with request context
      await this.logError(error as Error, {
        endpoint,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
        additionalData: {
          method: c.req.method,
          path: c.req.path,
          duration,
          status: 500
        }
      });

      // Re-throw error for proper error response
      throw error;
    }
  };

  /**
   * Database operation monitoring wrapper
   */
  async monitorDatabaseOperation<T>(
    operation: string,
    dbFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await dbFunction();
      const duration = Date.now() - startTime;
      
      this.logPerformance(`db:${operation}`, duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logError(error as Error, {
        additionalData: {
          operation: `db:${operation}`,
          duration
        }
      });
      
      throw error;
    }
  }

  /**
   * External API call monitoring
   */
  async monitorExternalAPI<T>(
    apiName: string,
    apiFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiFunction();
      const duration = Date.now() - startTime;
      
      this.logPerformance(`api:${apiName}`, duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logError(error as Error, {
        additionalData: {
          operation: `api:${apiName}`,
          duration,
          apiName
        }
      });
      
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  }> {
    const stats: Record<string, any> = {};

    for (const [operation, metrics] of this.performanceMetrics) {
      if (metrics.length === 0) continue;

      const sorted = [...metrics].sort((a, b) => a - b);
      const sum = metrics.reduce((a, b) => a + b, 0);
      
      stats[operation] = {
        count: metrics.length,
        average: Math.round(sum / metrics.length),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)]
      };
    }

    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Health check endpoint data
   */
  getHealthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    performance: Record<string, any>;
    errors: Record<string, number>;
    uptime: number;
  } {
    const performanceStats = this.getPerformanceStats();
    const errorStats = this.getErrorStats();
    
    // Determine health status based on performance and errors
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for high error rates
    const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
    if (totalErrors > 10) {
      status = 'degraded';
    }
    if (totalErrors > 50) {
      status = 'unhealthy';
    }
    
    // Check for slow performance
    for (const stats of Object.values(performanceStats)) {
      if (stats.average > 2000) { // > 2 seconds average
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      performance: performanceStats,
      errors: errorStats,
      uptime: Date.now() - (this.env.START_TIME || Date.now())
    };
  }

  /**
   * Send error to Sentry
   */
  private async sendToSentry(errorData: any): Promise<void> {
    try {
      // This would integrate with @sentry/cloudflare-workers
      // For now, we'll simulate the API call
      if (this.env.SENTRY_DSN) {
        const sentryPayload = {
          message: errorData.message,
          level: 'error',
          timestamp: errorData.timestamp,
          environment: errorData.environment,
          extra: errorData.context,
          exception: {
            values: [{
              type: 'Error',
              value: errorData.message,
              stacktrace: errorData.stack ? {
                frames: this.parseStackTrace(errorData.stack)
              } : undefined
            }]
          }
        };

        // Send to Sentry API
        await fetch(`https://sentry.io/api/0/projects/${this.env.SENTRY_PROJECT_ID}/store/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${this.env.SENTRY_KEY}`
          },
          body: JSON.stringify(sentryPayload)
        });
      }
    } catch (error) {
      console.error('Failed to send to Sentry:', error);
    }
  }

  /**
   * Send error to webhook
   */
  private async sendToWebhook(errorData: any): Promise<void> {
    try {
      await fetch(this.env.ERROR_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      });
    } catch (error) {
      console.error('Failed to send to webhook:', error);
    }
  }

  /**
   * Send performance data to monitoring service
   */
  private async sendPerformanceData(performanceData: any): Promise<void> {
    try {
      await fetch(this.env.PERFORMANCE_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(performanceData)
      });
    } catch (error) {
      console.error('Failed to send performance data:', error);
    }
  }

  /**
   * Parse stack trace for Sentry
   */
  private parseStackTrace(stack: string): any[] {
    return stack.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
            colno: parseInt(match[4])
          };
        }
        return { function: line.trim() };
      });
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.performanceMetrics.clear();
    this.errorCounts.clear();
  }
}
