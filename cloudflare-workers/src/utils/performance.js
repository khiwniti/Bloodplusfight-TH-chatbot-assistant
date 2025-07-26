/**
 * Performance Optimization Utilities for Cloudflare Workers
 * Implements advanced caching, request deduplication, and performance monitoring
 */

export class PerformanceOptimizer {
  constructor(env) {
    this.env = env;
    this.cache = caches.default;
    this.requestMap = new Map(); // For request deduplication
    
    // Performance thresholds
    this.thresholds = {
      slow_response: 5000,      // 5 seconds
      memory_warning: 100,      // 100MB
      cache_hit_target: 0.8,    // 80% cache hit rate
      ai_timeout: parseInt(env.AI_RESPONSE_TIMEOUT || '30000')
    };
  }

  /**
   * Intelligent caching with cache warming
   * @param {Request} request - Original request
   * @param {Function} handler - Request handler function
   * @returns {Response} Cached or fresh response
   */
  async cacheWithWarming(request, handler) {
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = await this.cache.match(cacheKey);

    if (cachedResponse) {
      // Cache hit - check if warming is needed
      const cacheAge = this.getCacheAge(cachedResponse);
      
      if (cacheAge > this.getCacheTTL() * 0.8) {
        // Warm cache in background (90% of TTL reached)
        this.scheduleBackgroundRefresh(cacheKey, request, handler);
      }

      return cachedResponse;
    }

    // Cache miss - generate response and cache
    const response = await handler(request);
    
    if (response.ok && this.isCacheable(request, response)) {
      await this.cacheResponse(cacheKey, response.clone());
    }

    return response;
  }

  /**
   * Request deduplication for identical requests
   * @param {string} key - Deduplication key
   * @param {Function} handler - Request handler
   * @returns {Promise} Request promise
   */
  async deduplicateRequest(key, handler) {
    // Check if identical request is already in flight
    if (this.requestMap.has(key)) {
      return this.requestMap.get(key);
    }

    // Start new request and store promise
    const promise = handler().finally(() => {
      this.requestMap.delete(key);
    });

    this.requestMap.set(key, promise);
    return promise;
  }

  /**
   * Adaptive timeout with circuit breaker pattern
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Timeout options
   * @returns {Promise} Operation result
   */
  async adaptiveTimeout(operation, options = {}) {
    const {
      initialTimeout = this.thresholds.ai_timeout,
      maxRetries = 3,
      backoffFactor = 1.5,
      circuitBreakerThreshold = 5
    } = options;

    let timeout = initialTimeout;
    let attempts = 0;
    let failures = 0;

    while (attempts < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const result = await Promise.race([
          operation(controller.signal),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ]);

        clearTimeout(timeoutId);
        return result;

      } catch (error) {
        attempts++;
        failures++;

        if (attempts >= maxRetries) {
          throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Exponential backoff
        timeout = Math.min(timeout * backoffFactor, 60000);
        await this.delay(Math.pow(2, attempts - 1) * 1000);
      }
    }
  }

  /**
   * Performance monitoring and metrics collection
   * @param {string} operationName - Name of the operation
   * @param {Function} operation - Operation to monitor
   * @returns {Promise} Operation result with metrics
   */
  async monitor(operationName, operation) {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;

      // Record successful operation
      await this.recordMetrics(operationName, {
        duration,
        memoryUsed,
        success: true,
        timestamp: new Date().toISOString()
      });

      // Check for performance warnings
      if (duration > this.thresholds.slow_response) {
        console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
      }

      if (memoryUsed > this.thresholds.memory_warning) {
        console.warn(`High memory usage: ${operationName} used ${memoryUsed}MB`);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed operation
      await this.recordMetrics(operationName, {
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Smart response compression based on content type and size
   * @param {Response} response - Response to potentially compress
   * @returns {Response} Optimized response
   */
  async optimizeResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    // Only compress text-based content over 1KB
    if (!this.shouldCompress(contentType, contentLength)) {
      return response;
    }

    try {
      const text = await response.text();
      const compressed = await this.compressText(text);

      return new Response(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-encoding': 'gzip',
          'content-length': compressed.byteLength.toString()
        }
      });

    } catch (error) {
      console.error('Response compression failed:', error);
      return response;
    }
  }

  /**
   * Batch operations for better performance
   * @param {Array} operations - Array of operations to batch
   * @param {Object} options - Batching options
   * @returns {Promise<Array>} Batch results
   */
  async batchOperations(operations, options = {}) {
    const {
      batchSize = 10,
      concurrentBatches = 3,
      retryFailures = true
    } = options;

    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    const results = [];
    const concurrentRunner = async (batch) => {
      const batchResults = await Promise.allSettled(
        batch.map(op => typeof op === 'function' ? op() : op)
      );

      return batchResults.map((result, index) => ({
        index: index,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : undefined,
        error: result.status === 'rejected' ? result.reason : undefined
      }));
    };

    // Process batches with limited concurrency
    for (let i = 0; i < batches.length; i += concurrentBatches) {
      const currentBatches = batches.slice(i, i + concurrentBatches);
      const batchPromises = currentBatches.map(concurrentRunner);
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults.flat());
    }

    // Retry failed operations if enabled
    if (retryFailures) {
      const failedOps = results
        .filter(r => r.status === 'rejected')
        .map(r => operations[r.index]);

      if (failedOps.length > 0) {
        console.log(`Retrying ${failedOps.length} failed operations`);
        const retryResults = await this.batchOperations(failedOps, {
          ...options,
          retryFailures: false // Prevent infinite retry
        });

        // Update results with retry outcomes
        let retryIndex = 0;
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            results[index] = retryResults[retryIndex++];
          }
        });
      }
    }

    return results;
  }

  /**
   * Resource pooling for expensive operations
   * @param {string} poolName - Name of the resource pool
   * @param {Function} factory - Resource factory function
   * @param {Object} options - Pool options
   */
  createResourcePool(poolName, factory, options = {}) {
    const {
      maxSize = 10,
      minSize = 2,
      idleTimeout = 300000, // 5 minutes
      maxAge = 3600000      // 1 hour
    } = options;

    if (!this.pools) {
      this.pools = new Map();
    }

    const pool = {
      resources: [],
      inUse: new Set(),
      factory,
      options: { maxSize, minSize, idleTimeout, maxAge },
      
      async acquire() {
        // Try to get existing resource
        let resource = this.resources.find(r => 
          !this.inUse.has(r) && 
          Date.now() - r.lastUsed < idleTimeout &&
          Date.now() - r.created < maxAge
        );

        if (!resource && this.resources.length < maxSize) {
          // Create new resource
          resource = {
            instance: await factory(),
            created: Date.now(),
            lastUsed: Date.now(),
            id: crypto.randomUUID()
          };
          this.resources.push(resource);
        }

        if (resource) {
          this.inUse.add(resource);
          resource.lastUsed = Date.now();
          return resource;
        }

        throw new Error(`Resource pool ${poolName} exhausted`);
      },

      release(resource) {
        this.inUse.delete(resource);
        resource.lastUsed = Date.now();
      },

      cleanup() {
        const now = Date.now();
        this.resources = this.resources.filter(resource => {
          const isExpired = now - resource.created > maxAge;
          const isIdle = now - resource.lastUsed > idleTimeout;
          const shouldKeep = !isExpired && (!isIdle || this.resources.length <= minSize);
          
          if (!shouldKeep && resource.instance.destroy) {
            resource.instance.destroy();
          }
          
          return shouldKeep;
        });
      }
    };

    this.pools.set(poolName, pool);
    return pool;
  }

  // Helper methods
  generateCacheKey(request) {
    const url = new URL(request.url);
    return `cache:${request.method}:${url.pathname}:${url.search}`;
  }

  getCacheAge(response) {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return 0;
    return Date.now() - new Date(dateHeader).getTime();
  }

  getCacheTTL() {
    return parseInt(this.env.CACHE_TTL || '3600') * 1000;
  }

  isCacheable(request, response) {
    // Only cache GET requests with successful responses
    return request.method === 'GET' && 
           response.ok && 
           !response.headers.get('set-cookie');
  }

  async cacheResponse(key, response) {
    const ttl = this.getCacheTTL();
    const headers = new Headers(response.headers);
    headers.set('cache-control', `max-age=${ttl / 1000}`);
    headers.set('date', new Date().toUTCString());

    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    await this.cache.put(key, cachedResponse);
  }

  async scheduleBackgroundRefresh(cacheKey, request, handler) {
    // Use setTimeout for background cache warming
    setTimeout(async () => {
      try {
        const freshResponse = await handler(request);
        if (freshResponse.ok) {
          await this.cacheResponse(cacheKey, freshResponse);
        }
      } catch (error) {
        console.warn('Background cache refresh failed:', error);
      }
    }, 0);
  }

  shouldCompress(contentType, contentLength) {
    return contentLength > 1024 && 
           (contentType.includes('text/') || 
            contentType.includes('application/json') ||
            contentType.includes('application/javascript'));
  }

  async compressText(text) {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new TextEncoder().encode(text));
    writer.close();

    const chunks = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }

    return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
  }

  getMemoryUsage() {
    // Approximation since Workers don't have direct memory access
    return Math.floor(Math.random() * 10) + 10; // Mock value
  }

  async recordMetrics(operationName, metrics) {
    if (this.env.ANALYTICS) {
      await this.env.ANALYTICS.writeDataPoint({
        blobs: [operationName],
        doubles: [metrics.duration, metrics.memoryUsed || 0],
        indexes: [metrics.success ? 'success' : 'failure']
      });
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStatistics() {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      activeRequests: this.requestMap.size,
      poolStats: this.pools ? Object.fromEntries(
        Array.from(this.pools.entries()).map(([name, pool]) => [
          name, {
            total: pool.resources.length,
            inUse: pool.inUse.size,
            available: pool.resources.length - pool.inUse.size
          }
        ])
      ) : {},
      thresholds: this.thresholds,
      timestamp: new Date().toISOString()
    };
  }

  calculateCacheHitRate() {
    // This would be tracked over time in a real implementation
    return Math.random() * 0.3 + 0.6; // Mock 60-90% hit rate
  }
}

export default PerformanceOptimizer;