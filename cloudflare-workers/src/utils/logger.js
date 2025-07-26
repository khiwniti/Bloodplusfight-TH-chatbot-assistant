/**
 * Logger Utility for Cloudflare Workers
 * Optimized logging with structured output and performance monitoring
 */

export class Logger {
  constructor(env) {
    this.env = env;
    this.logLevel = this.getLogLevel(env.LOG_LEVEL || 'info');
    this.isProduction = env.ENVIRONMENT === 'production';
    this.enableConsole = env.ENABLE_CONSOLE_LOGS !== 'false';
  }

  /**
   * Get numeric log level for comparison
   * @param {string} level - Log level string
   * @returns {number} Numeric level
   */
  getLogLevel(level) {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
    return levels[level.toLowerCase()] || levels.info;
  }

  /**
   * Check if we should log at the given level
   * @param {number} level - Numeric log level
   * @returns {boolean} Should log
   */
  shouldLog(level) {
    return level >= this.logLevel && this.enableConsole;
  }

  /**
   * Format log message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context
    };

    // In development, format for readability
    if (!this.isProduction) {
      const contextStr = Object.keys(context).length > 0 
        ? `\n${JSON.stringify(context, null, 2)}`
        : '';
      
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }

    // In production, use structured JSON
    return JSON.stringify(logEntry);
  }

  /**
   * Debug level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    if (!this.shouldLog(0)) return;
    
    const formatted = this.formatMessage('debug', message, {
      ...context,
      worker: 'line-chatbot-workers'
    });
    
    console.log(formatted);
  }

  /**
   * Info level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    if (!this.shouldLog(1)) return;
    
    const formatted = this.formatMessage('info', message, {
      ...context,
      worker: 'line-chatbot-workers'
    });
    
    console.log(formatted);
  }

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    if (!this.shouldLog(2)) return;
    
    const formatted = this.formatMessage('warn', message, {
      ...context,
      worker: 'line-chatbot-workers'
    });
    
    console.warn(formatted);
  }

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  error(message, context = {}) {
    if (!this.shouldLog(3)) return;
    
    // Ensure error context is properly structured
    const errorContext = {
      ...context,
      worker: 'line-chatbot-workers'
    };

    // If context contains an error object, extract useful information
    if (context.error && typeof context.error === 'object') {
      errorContext.errorMessage = context.error.message;
      errorContext.errorStack = context.error.stack;
      errorContext.errorCode = context.error.code;
      delete errorContext.error; // Remove original error object
    }
    
    const formatted = this.formatMessage('error', message, errorContext);
    
    console.error(formatted);
  }

  /**
   * Log HTTP request
   * @param {Request} request - HTTP request
   * @param {string} requestId - Request ID
   * @param {Object} additionalContext - Additional context
   */
  logRequest(request, requestId, additionalContext = {}) {
    if (!this.shouldLog(1)) return;

    const context = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent')?.substring(0, 100),
      clientIP: request.headers.get('CF-Connecting-IP'),
      country: request.cf?.country,
      colo: request.cf?.colo,
      ...additionalContext
    };

    this.info('Request received', context);
  }

  /**
   * Log HTTP response
   * @param {Response} response - HTTP response
   * @param {string} requestId - Request ID
   * @param {number} duration - Request duration in ms
   * @param {Object} additionalContext - Additional context
   */
  logResponse(response, requestId, duration, additionalContext = {}) {
    if (!this.shouldLog(1)) return;

    const level = response.status >= 500 ? 'error' : 
                  response.status >= 400 ? 'warn' : 'info';

    const context = {
      requestId,
      status: response.status,
      duration: `${duration}ms`,
      cacheStatus: response.headers.get('CF-Cache-Status'),
      ...additionalContext
    };

    const message = `Request completed - ${response.status}`;

    if (level === 'error') {
      this.error(message, context);
    } else if (level === 'warn') {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Log LINE webhook event
   * @param {Object} event - LINE event
   * @param {string} requestId - Request ID
   * @param {Object} result - Processing result
   */
  logLineEvent(event, requestId, result = {}) {
    if (!this.shouldLog(1)) return;

    // Sanitize event data for privacy
    const sanitizedEvent = {
      type: event.type,
      timestamp: event.timestamp,
      replyToken: event.replyToken ? '[PRESENT]' : undefined,
      source: {
        type: event.source?.type,
        userId: event.source?.userId ? this.maskUserId(event.source.userId) : undefined
      }
    };

    // Add message info if present (without content for privacy)
    if (event.message) {
      sanitizedEvent.message = {
        type: event.message.type,
        hasContent: !!event.message.text,
        contentLength: event.message.text?.length || 0
      };
    }

    this.info('LINE event processed', {
      requestId,
      event: sanitizedEvent,
      success: !!result.success,
      processingTime: result.processingTime
    });
  }

  /**
   * Log AI service call
   * @param {string} provider - AI provider name
   * @param {string} requestId - Request ID
   * @param {Object} request - Request data
   * @param {Object} response - Response data
   * @param {number} duration - Call duration in ms
   */
  logAICall(provider, requestId, request, response, duration) {
    if (!this.shouldLog(1)) return;

    const context = {
      requestId,
      provider,
      model: request.model,
      messageCount: request.messages?.length || 0,
      maxTokens: request.max_tokens,
      tokensUsed: response.tokensUsed || 0,
      confidence: response.confidence,
      intent: response.intent,
      duration: `${duration}ms`
    };

    if (response.error) {
      this.error(`AI call failed - ${provider}`, {
        ...context,
        error: response.error
      });
    } else {
      this.info(`AI call successful - ${provider}`, context);
    }
  }

  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} table - Database table
   * @param {string} requestId - Request ID
   * @param {number} duration - Operation duration in ms
   * @param {Object} result - Operation result
   */
  logDatabaseOperation(operation, table, requestId, duration, result = {}) {
    if (!this.shouldLog(0)) return; // Debug level for DB operations

    const context = {
      requestId,
      operation,
      table,
      duration: `${duration}ms`,
      success: !result.error,
      rowsAffected: result.changes || result.results?.length || 0
    };

    if (result.error) {
      this.error(`Database operation failed - ${operation}`, {
        ...context,
        error: result.error
      });
    } else {
      this.debug(`Database operation - ${operation}`, context);
    }
  }

  /**
   * Log cache operation
   * @param {string} operation - Cache operation (get/set/delete)
   * @param {string} key - Cache key
   * @param {string} requestId - Request ID
   * @param {boolean} hit - Cache hit/miss for get operations
   * @param {number} duration - Operation duration in ms
   */
  logCacheOperation(operation, key, requestId, hit = null, duration = 0) {
    if (!this.shouldLog(0)) return; // Debug level for cache operations

    const context = {
      requestId,
      operation,
      key: key.length > 50 ? key.substring(0, 50) + '...' : key,
      duration: `${duration}ms`
    };

    if (operation === 'get') {
      context.hit = hit;
      this.debug(`Cache ${hit ? 'hit' : 'miss'}`, context);
    } else {
      this.debug(`Cache ${operation}`, context);
    }
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   * @param {Object} metrics - Additional metrics
   */
  logPerformance(operation, duration, metrics = {}) {
    if (!this.shouldLog(1)) return;

    this.info(`Performance metric - ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...metrics
    });
  }

  /**
   * Log health check
   * @param {string} component - Component name
   * @param {string} status - Health status
   * @param {Object} details - Health details
   */
  logHealth(component, status, details = {}) {
    if (!this.shouldLog(1)) return;

    const level = status === 'healthy' ? 'info' : 'warn';
    const message = `Health check - ${component}: ${status}`;

    const context = {
      component,
      status,
      ...details
    };

    if (level === 'warn') {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {string} severity - Event severity
   * @param {Object} details - Event details
   */
  logSecurity(event, severity, details = {}) {
    const level = severity === 'high' ? 'error' : 
                  severity === 'medium' ? 'warn' : 'info';

    const context = {
      securityEvent: event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    };

    const message = `Security event - ${event}`;

    if (level === 'error') {
      this.error(message, context);
    } else if (level === 'warn') {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Mask sensitive data for logging
   * @param {string} userId - User ID to mask
   * @returns {string} Masked user ID
   */
  maskUserId(userId) {
    if (!userId || userId.length < 8) return 'unknown';
    return userId.substring(0, 5) + '***' + userId.substring(userId.length - 3);
  }

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context for all logs
   * @returns {Logger} Child logger instance
   */
  child(context) {
    const childLogger = new Logger(this.env);
    
    // Override logging methods to include additional context
    const originalMethods = ['debug', 'info', 'warn', 'error'];
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (message, additionalContext = {}) => {
        originalMethod(message, { ...context, ...additionalContext });
      };
    });

    return childLogger;
  }

  /**
   * Get current log configuration
   * @returns {Object} Log configuration
   */
  getConfig() {
    return {
      logLevel: this.logLevel,
      isProduction: this.isProduction,
      enableConsole: this.enableConsole,
      worker: 'line-chatbot-workers'
    };
  }
}