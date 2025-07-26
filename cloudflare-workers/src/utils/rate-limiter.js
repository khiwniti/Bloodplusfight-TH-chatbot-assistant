/**
 * Rate Limiter for Cloudflare Workers
 * Implements sliding window rate limiting using Workers KV
 */

export class RateLimiter {
  constructor(env) {
    this.env = env;
    this.kv = env.KV;
    
    // Default rate limiting configuration
    this.config = {
      // Global rate limits
      globalLimit: parseInt(env.RATE_LIMIT || '100'), // requests per window
      globalWindow: parseInt(env.RATE_LIMIT_WINDOW || '60'), // window in seconds
      
      // Per-user rate limits
      userLimit: parseInt(env.USER_RATE_LIMIT || '30'), // requests per window
      userWindow: parseInt(env.USER_RATE_LIMIT_WINDOW || '60'), // window in seconds
      
      // Per-endpoint rate limits
      webhookLimit: parseInt(env.WEBHOOK_RATE_LIMIT || '50'), // webhook requests per window
      webhookWindow: parseInt(env.WEBHOOK_RATE_LIMIT_WINDOW || '60'), // window in seconds
      
      // Burst protection
      burstLimit: parseInt(env.BURST_RATE_LIMIT || '10'), // burst requests
      burstWindow: parseInt(env.BURST_RATE_WINDOW || '10'), // burst window in seconds
      
      // Ban configuration
      banThreshold: parseInt(env.BAN_THRESHOLD || '5'), // violations before ban
      banDuration: parseInt(env.BAN_DURATION || '3600'), // ban duration in seconds
      
      // Enable/disable features
      enabled: env.ENABLE_RATE_LIMITING !== 'false',
      enableBans: env.ENABLE_RATE_LIMIT_BANS !== 'false',
      enableBurstProtection: env.ENABLE_BURST_PROTECTION !== 'false'
    };

    // Key prefixes for different rate limit types
    this.keyPrefixes = {
      global: 'rl:global',
      user: 'rl:user',
      webhook: 'rl:webhook',
      burst: 'rl:burst',
      ban: 'ban',
      violations: 'violations'
    };
  }

  /**
   * Check rate limit for a request
   * @param {string} clientIP - Client IP address
   * @param {string} url - Request URL
   * @param {string} lineUserId - LINE user ID (if available)
   * @returns {Promise<Object>} Rate limit result
   */
  async checkLimit(clientIP, url, lineUserId = null) {
    if (!this.config.enabled) {
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        retryAfter: 0,
        type: 'disabled'
      };
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const identifier = this.getIdentifier(clientIP, lineUserId);

      // Check if client is banned
      if (this.config.enableBans) {
        const banResult = await this.checkBan(identifier, now);
        if (!banResult.allowed) {
          return banResult;
        }
      }

      // Check burst protection first (most restrictive)
      if (this.config.enableBurstProtection) {
        const burstResult = await this.checkBurstLimit(identifier, now);
        if (!burstResult.allowed) {
          await this.recordViolation(identifier, 'burst', now);
          return burstResult;
        }
      }

      // Determine endpoint type
      const endpointType = this.getEndpointType(url);

      // Check endpoint-specific limits
      let endpointResult = null;
      if (endpointType === 'webhook') {
        endpointResult = await this.checkWebhookLimit(identifier, now);
      }

      if (endpointResult && !endpointResult.allowed) {
        await this.recordViolation(identifier, 'webhook', now);
        return endpointResult;
      }

      // Check per-user limits (if LINE user ID available)
      if (lineUserId) {
        const userResult = await this.checkUserLimit(lineUserId, now);
        if (!userResult.allowed) {
          await this.recordViolation(identifier, 'user', now);
          return userResult;
        }
      }

      // Check global limits
      const globalResult = await this.checkGlobalLimit(now);
      if (!globalResult.allowed) {
        await this.recordViolation(identifier, 'global', now);
        return globalResult;
      }

      // All checks passed - record the request
      await this.recordRequest(identifier, endpointType, lineUserId, now);

      return {
        allowed: true,
        limit: this.config.globalLimit,
        remaining: Math.max(0, this.config.globalLimit - (globalResult.count || 0)),
        retryAfter: 0,
        type: 'allowed'
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      
      // On error, allow the request but log the issue
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        retryAfter: 0,
        type: 'error'
      };
    }
  }

  /**
   * Check if client is banned
   * @param {string} identifier - Client identifier
   * @param {number} now - Current timestamp
   * @returns {Promise<Object>} Ban check result
   */
  async checkBan(identifier, now) {
    try {
      const banKey = `${this.keyPrefixes.ban}:${identifier}`;
      const banData = await this.kv.get(banKey, 'json');

      if (banData && banData.expires > now) {
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          retryAfter: banData.expires - now,
          type: 'banned',
          reason: banData.reason,
          expires: banData.expires
        };
      }

      // Clean up expired ban
      if (banData && banData.expires <= now) {
        await this.kv.delete(banKey);
      }

      return { allowed: true };

    } catch (error) {
      console.error('Ban check error:', error);
      return { allowed: true };
    }
  }

  /**
   * Check burst protection limit
   * @param {string} identifier - Client identifier
   * @param {number} now - Current timestamp
   * @returns {Promise<Object>} Burst limit result
   */
  async checkBurstLimit(identifier, now) {
    return await this.checkSlidingWindow(
      `${this.keyPrefixes.burst}:${identifier}`,
      this.config.burstLimit,
      this.config.burstWindow,
      now,
      'burst'
    );
  }

  /**
   * Check webhook-specific rate limit
   * @param {string} identifier - Client identifier
   * @param {number} now - Current timestamp
   * @returns {Promise<Object>} Webhook limit result
   */
  async checkWebhookLimit(identifier, now) {
    return await this.checkSlidingWindow(
      `${this.keyPrefixes.webhook}:${identifier}`,
      this.config.webhookLimit,
      this.config.webhookWindow,
      now,
      'webhook'
    );
  }

  /**
   * Check per-user rate limit
   * @param {string} lineUserId - LINE user ID
   * @param {number} now - Current timestamp
   * @returns {Promise<Object>} User limit result
   */
  async checkUserLimit(lineUserId, now) {
    return await this.checkSlidingWindow(
      `${this.keyPrefixes.user}:${lineUserId}`,
      this.config.userLimit,
      this.config.userWindow,
      now,
      'user'
    );
  }

  /**
   * Check global rate limit
   * @param {number} now - Current timestamp
   * @returns {Promise<Object>} Global limit result
   */
  async checkGlobalLimit(now) {
    return await this.checkSlidingWindow(
      `${this.keyPrefixes.global}`,
      this.config.globalLimit,
      this.config.globalWindow,
      now,
      'global'
    );
  }

  /**
   * Implement sliding window rate limiting
   * @param {string} key - Storage key
   * @param {number} limit - Request limit
   * @param {number} window - Time window in seconds
   * @param {number} now - Current timestamp
   * @param {string} type - Limit type
   * @returns {Promise<Object>} Rate limit result
   */
  async checkSlidingWindow(key, limit, window, now, type) {
    try {
      // Get current window data
      const windowData = await this.kv.get(key, 'json') || {
        requests: [],
        count: 0
      };

      // Clean old requests outside the window
      const windowStart = now - window;
      const validRequests = windowData.requests.filter(timestamp => timestamp > windowStart);

      const currentCount = validRequests.length;

      if (currentCount >= limit) {
        // Calculate retry after time
        const oldestRequest = Math.min(...validRequests);
        const retryAfter = Math.max(1, (oldestRequest + window) - now);

        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfter,
          type,
          count: currentCount
        };
      }

      return {
        allowed: true,
        limit,
        remaining: limit - currentCount,
        retryAfter: 0,
        type,
        count: currentCount
      };

    } catch (error) {
      console.error(`Sliding window check error for ${type}:`, error);
      return {
        allowed: true,
        limit,
        remaining: limit,
        retryAfter: 0,
        type: 'error'
      };
    }
  }

  /**
   * Record a successful request
   * @param {string} identifier - Client identifier
   * @param {string} endpointType - Endpoint type
   * @param {string} lineUserId - LINE user ID
   * @param {number} now - Current timestamp
   */
  async recordRequest(identifier, endpointType, lineUserId, now) {
    try {
      const recordPromises = [];

      // Record burst protection
      if (this.config.enableBurstProtection) {
        recordPromises.push(
          this.recordInWindow(`${this.keyPrefixes.burst}:${identifier}`, now, this.config.burstWindow)
        );
      }

      // Record endpoint-specific
      if (endpointType === 'webhook') {
        recordPromises.push(
          this.recordInWindow(`${this.keyPrefixes.webhook}:${identifier}`, now, this.config.webhookWindow)
        );
      }

      // Record user-specific
      if (lineUserId) {
        recordPromises.push(
          this.recordInWindow(`${this.keyPrefixes.user}:${lineUserId}`, now, this.config.userWindow)
        );
      }

      // Record global
      recordPromises.push(
        this.recordInWindow(`${this.keyPrefixes.global}`, now, this.config.globalWindow)
      );

      await Promise.all(recordPromises);

    } catch (error) {
      console.error('Request recording error:', error);
    }
  }

  /**
   * Record request in sliding window
   * @param {string} key - Storage key
   * @param {number} timestamp - Request timestamp
   * @param {number} window - Time window in seconds
   */
  async recordInWindow(key, timestamp, window) {
    try {
      // Get current data
      const windowData = await this.kv.get(key, 'json') || {
        requests: [],
        count: 0
      };

      // Clean old requests
      const windowStart = timestamp - window;
      const validRequests = windowData.requests.filter(ts => ts > windowStart);

      // Add new request
      validRequests.push(timestamp);

      // Update storage
      const updatedData = {
        requests: validRequests,
        count: validRequests.length,
        lastUpdate: timestamp
      };

      // Set TTL to window size + buffer
      const ttl = window + 60;
      await this.kv.put(key, JSON.stringify(updatedData), { expirationTtl: ttl });

    } catch (error) {
      console.error('Window recording error:', error);
    }
  }

  /**
   * Record rate limit violation
   * @param {string} identifier - Client identifier
   * @param {string} violationType - Type of violation
   * @param {number} now - Current timestamp
   */
  async recordViolation(identifier, violationType, now) {
    if (!this.config.enableBans) return;

    try {
      const violationKey = `${this.keyPrefixes.violations}:${identifier}`;
      const violationData = await this.kv.get(violationKey, 'json') || {
        count: 0,
        violations: [],
        firstViolation: now
      };

      // Clean old violations (older than ban duration)
      const cutoffTime = now - this.config.banDuration;
      const recentViolations = violationData.violations.filter(v => v.timestamp > cutoffTime);

      // Add new violation
      recentViolations.push({
        type: violationType,
        timestamp: now
      });

      const updatedData = {
        count: recentViolations.length,
        violations: recentViolations,
        firstViolation: recentViolations[0]?.timestamp || now,
        lastViolation: now
      };

      // Check if ban threshold is reached
      if (updatedData.count >= this.config.banThreshold) {
        await this.banClient(identifier, violationType, now);
        
        // Reset violations after ban
        await this.kv.delete(violationKey);
      } else {
        // Update violations
        await this.kv.put(violationKey, JSON.stringify(updatedData), {
          expirationTtl: this.config.banDuration
        });
      }

    } catch (error) {
      console.error('Violation recording error:', error);
    }
  }

  /**
   * Ban a client
   * @param {string} identifier - Client identifier
   * @param {string} reason - Ban reason
   * @param {number} now - Current timestamp
   */
  async banClient(identifier, reason, now) {
    try {
      const banKey = `${this.keyPrefixes.ban}:${identifier}`;
      const banData = {
        identifier,
        reason,
        startTime: now,
        expires: now + this.config.banDuration,
        duration: this.config.banDuration
      };

      await this.kv.put(banKey, JSON.stringify(banData), {
        expirationTtl: this.config.banDuration + 60
      });

      console.warn('Client banned for rate limit violations', {
        identifier,
        reason,
        duration: this.config.banDuration,
        expires: banData.expires
      });

    } catch (error) {
      console.error('Ban client error:', error);
    }
  }

  /**
   * Get client identifier
   * @param {string} clientIP - Client IP address
   * @param {string} lineUserId - LINE user ID
   * @returns {string} Client identifier
   */
  getIdentifier(clientIP, lineUserId) {
    // Use LINE user ID if available (more persistent), otherwise use IP
    return lineUserId || clientIP || 'unknown';
  }

  /**
   * Determine endpoint type from URL
   * @param {string} url - Request URL
   * @returns {string} Endpoint type
   */
  getEndpointType(url) {
    const urlPath = new URL(url).pathname.toLowerCase();

    if (urlPath.includes('/webhook')) {
      return 'webhook';
    } else if (urlPath.includes('/api')) {
      return 'api';
    } else if (urlPath.includes('/health')) {
      return 'health';
    }

    return 'general';
  }

  /**
   * Get rate limiting statistics
   * @param {string} identifier - Client identifier (optional)
   * @returns {Promise<Object>} Rate limiting statistics
   */
  async getStatistics(identifier = null) {
    try {
      const stats = {
        config: this.config,
        timestamp: new Date().toISOString()
      };

      if (identifier) {
        // Get specific client stats
        const keys = [
          `${this.keyPrefixes.burst}:${identifier}`,
          `${this.keyPrefixes.webhook}:${identifier}`,
          `${this.keyPrefixes.violations}:${identifier}`,
          `${this.keyPrefixes.ban}:${identifier}`
        ];

        const results = await Promise.all(
          keys.map(key => this.kv.get(key, 'json').catch(() => null))
        );

        stats.client = {
          identifier,
          burst: results[0],
          webhook: results[1],
          violations: results[2],
          ban: results[3]
        };
      }

      // Get global stats
      const globalData = await this.kv.get(this.keyPrefixes.global, 'json');
      stats.global = globalData;

      return stats;

    } catch (error) {
      console.error('Statistics retrieval error:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reset rate limits for a client
   * @param {string} identifier - Client identifier
   * @returns {Promise<boolean>} Success status
   */
  async resetLimits(identifier) {
    try {
      const keys = [
        `${this.keyPrefixes.burst}:${identifier}`,
        `${this.keyPrefixes.webhook}:${identifier}`,
        `${this.keyPrefixes.user}:${identifier}`,
        `${this.keyPrefixes.violations}:${identifier}`,
        `${this.keyPrefixes.ban}:${identifier}`
      ];

      await Promise.all(keys.map(key => this.kv.delete(key)));

      console.info('Rate limits reset for client', { identifier });
      return true;

    } catch (error) {
      console.error('Reset limits error:', error);
      return false;
    }
  }

  /**
   * Clean up expired rate limit data
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanup() {
    try {
      // This would typically be called by a scheduled job
      // For now, we rely on KV TTL for cleanup
      
      return {
        success: true,
        message: 'Cleanup relies on KV TTL',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Cleanup error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}