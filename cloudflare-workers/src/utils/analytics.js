/**
 * Analytics Service for Cloudflare Workers
 * Real-time analytics with KV storage and Prometheus metrics export
 */

export class Analytics {
  constructor(env) {
    this.env = env;
    this.kv = env.KV;
    this.db = env.DB;
    this.enabled = env.ENABLE_ANALYTICS !== 'false';

    // Analytics configuration
    this.config = {
      retentionDays: parseInt(env.ANALYTICS_RETENTION_DAYS || '30'),
      batchSize: parseInt(env.ANALYTICS_BATCH_SIZE || '100'),
      flushInterval: parseInt(env.ANALYTICS_FLUSH_INTERVAL || '300'), // 5 minutes
      enableRealtime: env.ENABLE_REALTIME_ANALYTICS !== 'false',
      enableMetrics: env.ENABLE_PROMETHEUS_METRICS !== 'false'
    };

    // Key prefixes for different data types
    this.keyPrefixes = {
      requests: 'analytics:requests',
      errors: 'analytics:errors',
      performance: 'analytics:performance',
      users: 'analytics:users',
      daily: 'analytics:daily',
      hourly: 'analytics:hourly',
      metrics: 'metrics',
      counters: 'counters'
    };

    // Metric counters
    this.counters = {
      requests: 0,
      errors: 0,
      responses: {
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0
      },
      aiCalls: {
        deepseek: 0,
        openrouter: 0,
        cache_hits: 0
      },
      lineEvents: {
        message: 0,
        follow: 0,
        unfollow: 0,
        postback: 0
      }
    };
  }

  /**
   * Record HTTP request analytics
   * @param {Object} requestData - Request data
   */
  async recordRequest(requestData) {
    if (!this.enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const record = {
        ...requestData,
        timestamp,
        id: crypto.randomUUID()
      };

      // Update counters
      this.counters.requests++;
      const statusGroup = this.getStatusGroup(requestData.status);
      if (statusGroup) {
        this.counters.responses[statusGroup]++;
      }

      // Store in batch for later processing
      await this.addToBatch('requests', record);

      // Update real-time metrics if enabled
      if (this.config.enableRealtime) {
        await this.updateRealtimeMetrics('request', record);
      }

    } catch (error) {
      console.error('Analytics recording error:', error);
    }
  }

  /**
   * Record error analytics
   * @param {Object} errorData - Error data
   */
  async recordError(errorData) {
    if (!this.enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const record = {
        ...errorData,
        timestamp,
        id: crypto.randomUUID(),
        type: 'error'
      };

      // Update counters
      this.counters.errors++;

      // Store error record
      await this.addToBatch('errors', record);

      // Update real-time error metrics
      if (this.config.enableRealtime) {
        await this.updateRealtimeMetrics('error', record);
      }

    } catch (error) {
      console.error('Error analytics recording error:', error);
    }
  }

  /**
   * Record AI service call analytics
   * @param {Object} aiData - AI service data
   */
  async recordAICall(aiData) {
    if (!this.enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const record = {
        ...aiData,
        timestamp,
        id: crypto.randomUUID(),
        type: 'ai_call'
      };

      // Update AI counters
      if (aiData.provider && this.counters.aiCalls[aiData.provider] !== undefined) {
        this.counters.aiCalls[aiData.provider]++;
      }

      if (aiData.source === 'cache') {
        this.counters.aiCalls.cache_hits++;
      }

      // Store AI call record
      await this.addToBatch('ai_calls', record);

      // Update performance metrics
      if (aiData.duration) {
        await this.recordPerformanceMetric('ai_response_time', aiData.duration, {
          provider: aiData.provider
        });
      }

    } catch (error) {
      console.error('AI analytics recording error:', error);
    }
  }

  /**
   * Record LINE event analytics
   * @param {Object} eventData - LINE event data
   */
  async recordLineEvent(eventData) {
    if (!this.enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const record = {
        ...eventData,
        timestamp,
        id: crypto.randomUUID(),
        type: 'line_event'
      };

      // Update LINE event counters
      if (eventData.eventType && this.counters.lineEvents[eventData.eventType] !== undefined) {
        this.counters.lineEvents[eventData.eventType]++;
      }

      // Store LINE event record
      await this.addToBatch('line_events', record);

      // Track unique users
      if (eventData.lineUserId) {
        await this.trackUniqueUser(eventData.lineUserId);
      }

    } catch (error) {
      console.error('LINE event analytics recording error:', error);
    }
  }

  /**
   * Record performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} labels - Additional labels
   */
  async recordPerformanceMetric(metric, value, labels = {}) {
    if (!this.enabled) return;

    try {
      const timestamp = new Date().toISOString();
      const record = {
        metric,
        value,
        labels,
        timestamp,
        id: crypto.randomUUID(),
        type: 'performance'
      };

      await this.addToBatch('performance', record);

      // Update real-time performance metrics
      if (this.config.enableRealtime) {
        await this.updatePerformanceAggregates(metric, value, labels);
      }

    } catch (error) {
      console.error('Performance metric recording error:', error);
    }
  }

  /**
   * Add record to batch for processing
   * @param {string} type - Record type
   * @param {Object} record - Record data
   */
  async addToBatch(type, record) {
    try {
      const batchKey = `${this.keyPrefixes[type]}:batch:${this.getCurrentHour()}`;
      
      // Get current batch
      const batch = await this.kv.get(batchKey, 'json') || [];
      
      // Add new record
      batch.push(record);

      // If batch is full, process it
      if (batch.length >= this.config.batchSize) {
        await this.processBatch(type, batch);
        await this.kv.delete(batchKey);
      } else {
        // Update batch with TTL
        await this.kv.put(batchKey, JSON.stringify(batch), {
          expirationTtl: 3600 // 1 hour
        });
      }

    } catch (error) {
      console.error('Batch addition error:', error);
    }
  }

  /**
   * Process batch of records
   * @param {string} type - Record type
   * @param {Array} batch - Batch of records
   */
  async processBatch(type, batch) {
    try {
      // Store processed batch
      const batchId = crypto.randomUUID();
      const processedKey = `${this.keyPrefixes[type]}:processed:${batchId}`;
      
      await this.kv.put(processedKey, JSON.stringify({
        batchId,
        type,
        records: batch,
        processedAt: new Date().toISOString(),
        count: batch.length
      }), {
        expirationTtl: this.config.retentionDays * 24 * 3600
      });

      // Update aggregates
      await this.updateAggregates(type, batch);

    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }

  /**
   * Update aggregate statistics
   * @param {string} type - Record type
   * @param {Array} batch - Batch of records
   */
  async updateAggregates(type, batch) {
    try {
      const now = new Date();
      const hourKey = `${this.keyPrefixes.hourly}:${this.getHourKey(now)}`;
      const dayKey = `${this.keyPrefixes.daily}:${this.getDayKey(now)}`;

      // Get current aggregates
      const hourlyData = await this.kv.get(hourKey, 'json') || this.createEmptyAggregate();
      const dailyData = await this.kv.get(dayKey, 'json') || this.createEmptyAggregate();

      // Update aggregates with batch data
      for (const record of batch) {
        this.updateAggregateWithRecord(hourlyData, record);
        this.updateAggregateWithRecord(dailyData, record);
      }

      // Save updated aggregates
      await Promise.all([
        this.kv.put(hourKey, JSON.stringify(hourlyData), {
          expirationTtl: 7 * 24 * 3600 // 7 days
        }),
        this.kv.put(dayKey, JSON.stringify(dailyData), {
          expirationTtl: this.config.retentionDays * 24 * 3600
        })
      ]);

    } catch (error) {
      console.error('Aggregate update error:', error);
    }
  }

  /**
   * Update real-time metrics
   * @param {string} type - Metric type
   * @param {Object} record - Record data
   */
  async updateRealtimeMetrics(type, record) {
    try {
      const metricsKey = `${this.keyPrefixes.metrics}:realtime`;
      const metrics = await this.kv.get(metricsKey, 'json') || this.createEmptyMetrics();

      // Update metrics based on record type
      switch (type) {
        case 'request':
          metrics.requests.total++;
          metrics.requests.status[this.getStatusGroup(record.status)]++;
          if (record.country) {
            metrics.geography[record.country] = (metrics.geography[record.country] || 0) + 1;
          }
          break;

        case 'error':
          metrics.errors.total++;
          metrics.errors.types[record.type || 'unknown'] = (metrics.errors.types[record.type || 'unknown'] || 0) + 1;
          break;

        case 'ai_call':
          metrics.ai.calls++;
          metrics.ai.providers[record.provider] = (metrics.ai.providers[record.provider] || 0) + 1;
          if (record.tokensUsed) {
            metrics.ai.totalTokens += record.tokensUsed;
          }
          break;
      }

      metrics.lastUpdated = new Date().toISOString();

      // Save updated metrics
      await this.kv.put(metricsKey, JSON.stringify(metrics), {
        expirationTtl: 3600 // 1 hour
      });

    } catch (error) {
      console.error('Real-time metrics update error:', error);
    }
  }

  /**
   * Track unique user
   * @param {string} lineUserId - LINE user ID
   */
  async trackUniqueUser(lineUserId) {
    try {
      const today = this.getDayKey(new Date());
      const userKey = `${this.keyPrefixes.users}:${today}`;
      
      // Get today's users set
      const usersData = await this.kv.get(userKey, 'json') || { users: [], count: 0 };
      
      // Add user if not already tracked today
      if (!usersData.users.includes(lineUserId)) {
        usersData.users.push(lineUserId);
        usersData.count = usersData.users.length;
        usersData.lastUpdated = new Date().toISOString();

        // Limit stored user IDs to prevent excessive memory usage
        if (usersData.users.length > 10000) {
          usersData.users = usersData.users.slice(-10000);
        }

        await this.kv.put(userKey, JSON.stringify(usersData), {
          expirationTtl: 48 * 3600 // 48 hours
        });
      }

    } catch (error) {
      console.error('Unique user tracking error:', error);
    }
  }

  /**
   * Get analytics data
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(options = {}) {
    try {
      const {
        startDate,
        endDate,
        granularity = 'daily',
        metrics = ['requests', 'errors', 'performance', 'users']
      } = options;

      const result = {
        summary: await this.getSummaryMetrics(),
        realtime: this.config.enableRealtime ? await this.getRealtimeMetrics() : null,
        timestamp: new Date().toISOString()
      };

      // Add time-series data if requested
      if (startDate && endDate) {
        result.timeSeries = await this.getTimeSeriesData(startDate, endDate, granularity, metrics);
      }

      // Add current counters
      result.counters = { ...this.counters };

      return result;

    } catch (error) {
      console.error('Analytics retrieval error:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Prometheus metrics
   * @returns {Promise<string>} Prometheus format metrics
   */
  async getPrometheusMetrics() {
    if (!this.config.enableMetrics) {
      return '# Metrics disabled\n';
    }

    try {
      const metrics = [];
      const timestamp = Date.now();

      // Add help and type information
      metrics.push('# HELP line_chatbot_requests_total Total number of HTTP requests');
      metrics.push('# TYPE line_chatbot_requests_total counter');
      metrics.push(`line_chatbot_requests_total ${this.counters.requests} ${timestamp}`);

      metrics.push('# HELP line_chatbot_errors_total Total number of errors');
      metrics.push('# TYPE line_chatbot_errors_total counter');
      metrics.push(`line_chatbot_errors_total ${this.counters.errors} ${timestamp}`);

      // HTTP response status codes
      for (const [status, count] of Object.entries(this.counters.responses)) {
        metrics.push(`line_chatbot_http_responses_total{status="${status}"} ${count} ${timestamp}`);
      }

      // AI provider metrics
      for (const [provider, count] of Object.entries(this.counters.aiCalls)) {
        metrics.push(`line_chatbot_ai_calls_total{provider="${provider}"} ${count} ${timestamp}`);
      }

      // LINE event metrics
      for (const [eventType, count] of Object.entries(this.counters.lineEvents)) {
        metrics.push(`line_chatbot_line_events_total{type="${eventType}"} ${count} ${timestamp}`);
      }

      // Get real-time metrics if available
      if (this.config.enableRealtime) {
        const realtimeMetrics = await this.getRealtimeMetrics();
        if (realtimeMetrics) {
          // Add real-time response time metrics
          if (realtimeMetrics.performance?.averageResponseTime) {
            metrics.push(`line_chatbot_response_time_seconds ${realtimeMetrics.performance.averageResponseTime / 1000} ${timestamp}`);
          }

          // Add unique users metric
          if (realtimeMetrics.users?.daily) {
            metrics.push(`line_chatbot_unique_users_daily ${realtimeMetrics.users.daily} ${timestamp}`);
          }
        }
      }

      return metrics.join('\n') + '\n';

    } catch (error) {
      console.error('Prometheus metrics generation error:', error);
      return `# Error generating metrics: ${error.message}\n`;
    }
  }

  /**
   * Get summary metrics
   * @returns {Promise<Object>} Summary metrics
   */
  async getSummaryMetrics() {
    try {
      const today = this.getDayKey(new Date());
      const yesterday = this.getDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

      const [todayData, yesterdayData] = await Promise.all([
        this.kv.get(`${this.keyPrefixes.daily}:${today}`, 'json'),
        this.kv.get(`${this.keyPrefixes.daily}:${yesterday}`, 'json')
      ]);

      return {
        today: todayData || this.createEmptyAggregate(),
        yesterday: yesterdayData || this.createEmptyAggregate(),
        growth: this.calculateGrowth(todayData, yesterdayData)
      };

    } catch (error) {
      console.error('Summary metrics error:', error);
      return null;
    }
  }

  /**
   * Get real-time metrics
   * @returns {Promise<Object>} Real-time metrics
   */
  async getRealtimeMetrics() {
    try {
      const metricsKey = `${this.keyPrefixes.metrics}:realtime`;
      return await this.kv.get(metricsKey, 'json');
    } catch (error) {
      console.error('Real-time metrics error:', error);
      return null;
    }
  }

  /**
   * Get time series data
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} granularity - Time granularity (hourly/daily)
   * @param {Array} metrics - Metrics to include
   * @returns {Promise<Array>} Time series data
   */
  async getTimeSeriesData(startDate, endDate, granularity, metrics) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const data = [];

      const keyPrefix = granularity === 'hourly' ? this.keyPrefixes.hourly : this.keyPrefixes.daily;
      
      // Generate time points
      const timePoints = this.generateTimePoints(start, end, granularity);
      
      // Fetch data for each time point
      for (const timePoint of timePoints) {
        const key = granularity === 'hourly' ? 
          this.getHourKey(timePoint) : 
          this.getDayKey(timePoint);
          
        const pointData = await this.kv.get(`${keyPrefix}:${key}`, 'json');
        
        data.push({
          timestamp: timePoint.toISOString(),
          ...pointData || this.createEmptyAggregate()
        });
      }

      return data;

    } catch (error) {
      console.error('Time series data error:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */

  getCurrentHour() {
    return Math.floor(Date.now() / (1000 * 60 * 60));
  }

  getHourKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
  }

  getDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getStatusGroup(status) {
    if (status >= 200 && status < 300) return '2xx';
    if (status >= 300 && status < 400) return '3xx';
    if (status >= 400 && status < 500) return '4xx';
    if (status >= 500) return '5xx';
    return null;
  }

  createEmptyAggregate() {
    return {
      requests: { total: 0, status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } },
      errors: { total: 0, types: {} },
      ai: { calls: 0, providers: {}, totalTokens: 0 },
      performance: { totalResponseTime: 0, count: 0, averageResponseTime: 0 },
      users: { unique: 0 },
      geography: {},
      createdAt: new Date().toISOString()
    };
  }

  createEmptyMetrics() {
    return {
      requests: { total: 0, status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } },
      errors: { total: 0, types: {} },
      ai: { calls: 0, providers: {}, totalTokens: 0 },
      performance: { averageResponseTime: 0, count: 0 },
      users: { daily: 0 },
      geography: {},
      createdAt: new Date().toISOString()
    };
  }

  updateAggregateWithRecord(aggregate, record) {
    switch (record.type) {
      case 'request':
        aggregate.requests.total++;
        const statusGroup = this.getStatusGroup(record.status);
        if (statusGroup) {
          aggregate.requests.status[statusGroup]++;
        }
        if (record.country) {
          aggregate.geography[record.country] = (aggregate.geography[record.country] || 0) + 1;
        }
        break;

      case 'error':
        aggregate.errors.total++;
        aggregate.errors.types[record.type || 'unknown'] = (aggregate.errors.types[record.type || 'unknown'] || 0) + 1;
        break;

      case 'ai_call':
        aggregate.ai.calls++;
        aggregate.ai.providers[record.provider] = (aggregate.ai.providers[record.provider] || 0) + 1;
        if (record.tokensUsed) {
          aggregate.ai.totalTokens += record.tokensUsed;
        }
        break;

      case 'performance':
        if (record.metric === 'response_time' && record.value) {
          aggregate.performance.totalResponseTime += record.value;
          aggregate.performance.count++;
          aggregate.performance.averageResponseTime = aggregate.performance.totalResponseTime / aggregate.performance.count;
        }
        break;
    }

    aggregate.lastUpdated = new Date().toISOString();
  }

  calculateGrowth(today, yesterday) {
    if (!today || !yesterday) return {};

    return {
      requests: this.calculatePercentageGrowth(today.requests?.total, yesterday.requests?.total),
      errors: this.calculatePercentageGrowth(today.errors?.total, yesterday.errors?.total),
      aiCalls: this.calculatePercentageGrowth(today.ai?.calls, yesterday.ai?.calls),
      users: this.calculatePercentageGrowth(today.users?.unique, yesterday.users?.unique)
    };
  }

  calculatePercentageGrowth(current, previous) {
    if (!previous || previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  generateTimePoints(start, end, granularity) {
    const points = [];
    const current = new Date(start);

    while (current <= end) {
      points.push(new Date(current));
      
      if (granularity === 'hourly') {
        current.setHours(current.getHours() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    return points;
  }

  updatePerformanceAggregates(metric, value, labels) {
    // This would update performance aggregates
    // Implementation depends on specific performance metrics needed
  }
}