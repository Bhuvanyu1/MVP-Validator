import { Env } from '../types';

/**
 * Security Audit and Protection Service
 * Provides authentication, authorization, input validation, and security monitoring
 */
export class SecurityService {
  private env: Env;
  private suspiciousActivities: Map<string, number>;
  private blockedIPs: Set<string>;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(env: Env) {
    this.env = env;
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Set();
  }

  /**
   * Validate and sanitize input data
   */
  sanitizeInput(input: any, rules: {
    maxLength?: number;
    allowedChars?: RegExp;
    required?: boolean;
    type?: 'string' | 'number' | 'email' | 'url';
  }): { isValid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];
    let sanitized = input;

    // Check if required
    if (rules.required && (input === null || input === undefined || input === '')) {
      errors.push('Field is required');
      return { isValid: false, sanitized: null, errors };
    }

    // Skip validation if input is empty and not required
    if (!rules.required && (input === null || input === undefined || input === '')) {
      return { isValid: true, sanitized: null, errors: [] };
    }

    // Type validation and conversion
    switch (rules.type) {
      case 'string':
        sanitized = String(input).trim();
        break;
      case 'number':
        sanitized = Number(input);
        if (isNaN(sanitized)) {
          errors.push('Must be a valid number');
        }
        break;
      case 'email':
        sanitized = String(input).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          errors.push('Must be a valid email address');
        }
        break;
      case 'url':
        sanitized = String(input).trim();
        try {
          new URL(sanitized);
        } catch {
          errors.push('Must be a valid URL');
        }
        break;
    }

    // Length validation
    if (rules.maxLength && String(sanitized).length > rules.maxLength) {
      errors.push(`Must be at most ${rules.maxLength} characters`);
    }

    // Character validation
    if (rules.allowedChars && !rules.allowedChars.test(String(sanitized))) {
      errors.push('Contains invalid characters');
    }

    // XSS prevention - strip dangerous HTML
    if (typeof sanitized === 'string') {
      sanitized = this.stripXSS(sanitized);
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * Validate JWT token and extract user info
   */
  async validateToken(token: string): Promise<{
    isValid: boolean;
    userId?: string;
    email?: string;
    exp?: number;
  }> {
    try {
      if (!token || !token.startsWith('Bearer ')) {
        return { isValid: false };
      }

      const jwtToken = token.substring(7);
      
      // Decode JWT payload (without verification for now - would need proper JWT library)
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        return { isValid: false };
      }

      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: payload.sub || payload.userId,
        email: payload.email,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false };
    }
  }

  /**
   * Check if user has permission to access resource
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin'
  ): Promise<boolean> {
    try {
      // For now, implement basic ownership-based permissions
      // In future, this could integrate with a proper RBAC system
      
      if (resource.startsWith('project:')) {
        const projectId = resource.split(':')[1];
        return await this.checkProjectOwnership(userId, projectId);
      }

      if (resource.startsWith('user:')) {
        const targetUserId = resource.split(':')[1];
        return userId === targetUserId || action === 'read';
      }

      // Default deny
      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Rate limiting with IP-based tracking
   */
  async checkRateLimit(
    ip: string,
    endpoint: string,
    maxRequests: number = 100,
    windowMinutes: number = 15
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const resetTime = now + windowMs;

    try {
      // Check if IP is blocked
      if (this.blockedIPs.has(ip)) {
        return { allowed: false, remaining: 0, resetTime };
      }

      // Simple in-memory rate limiting (would use Redis in production)
      const current = this.suspiciousActivities.get(key) || 0;
      
      if (current >= maxRequests) {
        // Block IP temporarily for suspicious activity
        this.blockedIPs.add(ip);
        setTimeout(() => this.blockedIPs.delete(ip), this.BLOCK_DURATION);
        
        console.warn('Rate limit exceeded, IP blocked:', { ip, endpoint, requests: current });
        return { allowed: false, remaining: 0, resetTime };
      }

      this.suspiciousActivities.set(key, current + 1);
      
      // Clean up old entries
      setTimeout(() => this.suspiciousActivities.delete(key), windowMs);

      return {
        allowed: true,
        remaining: maxRequests - current - 1,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    event: 'login_attempt' | 'login_success' | 'login_failure' | 'permission_denied' | 'rate_limit_exceeded' | 'suspicious_activity',
    details: {
      userId?: string;
      ip?: string;
      userAgent?: string;
      endpoint?: string;
      additionalData?: Record<string, any>;
    }
  ): Promise<void> {
    const securityLog = {
      event,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getEventSeverity(event)
    };

    console.log('Security Event:', securityLog);

    // Send to security monitoring service if configured
    if (this.env.SECURITY_WEBHOOK_URL) {
      try {
        await fetch(this.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(securityLog)
        });
      } catch (error) {
        console.error('Failed to send security log:', error);
      }
    }

    // Track failed login attempts
    if (event === 'login_failure' && details.ip) {
      const failureKey = `login_failures:${details.ip}`;
      const failures = this.suspiciousActivities.get(failureKey) || 0;
      
      if (failures >= this.MAX_LOGIN_ATTEMPTS) {
        this.blockedIPs.add(details.ip);
        setTimeout(() => this.blockedIPs.delete(details.ip!), this.BLOCK_DURATION);
        
        await this.logSecurityEvent('suspicious_activity', {
          ...details,
          additionalData: { reason: 'Multiple failed login attempts', failures }
        });
      } else {
        this.suspiciousActivities.set(failureKey, failures + 1);
        setTimeout(() => this.suspiciousActivities.delete(failureKey), this.BLOCK_DURATION);
      }
    }
  }

  /**
   * Security middleware for API endpoints
   */
  securityMiddleware = async (c: any, next: () => Promise<void>) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    const endpoint = `${c.req.method} ${c.req.path}`;

    try {
      // Check if IP is blocked
      if (this.blockedIPs.has(ip)) {
        await this.logSecurityEvent('rate_limit_exceeded', { ip, userAgent, endpoint });
        return c.json({ error: 'Access temporarily blocked' }, 429);
      }

      // Rate limiting
      const rateLimit = await this.checkRateLimit(ip, endpoint);
      if (!rateLimit.allowed) {
        return c.json({ 
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime
        }, 429);
      }

      // Add security headers
      c.res.headers.set('X-Content-Type-Options', 'nosniff');
      c.res.headers.set('X-Frame-Options', 'DENY');
      c.res.headers.set('X-XSS-Protection', '1; mode=block');
      c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

      await next();
    } catch (error) {
      await this.logSecurityEvent('suspicious_activity', {
        ip,
        userAgent,
        endpoint,
        additionalData: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  };

  /**
   * Validate request data against schema
   */
  validateRequestData(data: any, schema: Record<string, any>): {
    isValid: boolean;
    sanitized: Record<string, any>;
    errors: Record<string, string[]>;
  } {
    const sanitized: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const validation = this.sanitizeInput(data[field], rules);
      
      if (!validation.isValid) {
        errors[field] = validation.errors;
        isValid = false;
      } else {
        sanitized[field] = validation.sanitized;
      }
    }

    return { isValid, sanitized, errors };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash password securely
   */
  async hashPassword(password: string): Promise<string> {
    // In production, use a proper password hashing library like bcrypt
    // For now, simulate with a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.env.PASSWORD_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check project ownership
   */
  private async checkProjectOwnership(userId: string, projectId: string): Promise<boolean> {
    try {
      const stmt = this.env.DB.prepare('SELECT user_id FROM projects WHERE id = ?');
      const result = await stmt.bind(projectId).first();
      return result?.user_id === userId;
    } catch (error) {
      console.error('Project ownership check error:', error);
      return false;
    }
  }

  /**
   * Strip XSS attempts from input
   */
  private stripXSS(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<\s*\/?\s*(script|iframe|object|embed|form)\b[^>]*>/gi, '');
  }

  /**
   * Get event severity level
   */
  private getEventSeverity(event: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (event) {
      case 'login_success':
        return 'low';
      case 'login_attempt':
        return 'low';
      case 'login_failure':
        return 'medium';
      case 'permission_denied':
        return 'medium';
      case 'rate_limit_exceeded':
        return 'high';
      case 'suspicious_activity':
        return 'critical';
      default:
        return 'medium';
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    blockedIPs: number;
    suspiciousActivities: number;
    recentEvents: Array<{ event: string; count: number }>;
  } {
    const eventCounts = new Map<string, number>();
    
    // Count suspicious activities by type
    for (const [key] of this.suspiciousActivities) {
      const eventType = key.split(':')[0];
      eventCounts.set(eventType, (eventCounts.get(eventType) || 0) + 1);
    }

    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivities.size,
      recentEvents: Array.from(eventCounts.entries()).map(([event, count]) => ({
        event,
        count
      }))
    };
  }

  /**
   * Clear security data (for testing)
   */
  clearSecurityData(): void {
    this.suspiciousActivities.clear();
    this.blockedIPs.clear();
  }
}
