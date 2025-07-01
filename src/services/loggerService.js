const config = require('../../config/config');

// Log levels with numeric values for comparison
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

// Get current log level from config
const currentLogLevel = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;

// Format helper to standardize log output
const formatLogMessage = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Add timestamp and level to context
  const enrichedContext = {
    timestamp,
    level,
    ...context
  };
  
  // In development, make logs more readable
  if (!isProduction && config.logging.format !== 'json') {
    const contextString = Object.keys(context).length > 0 
      ? ` ${JSON.stringify(context)}`
      : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextString}`;
  }
  
  // In production, use structured JSON format for better log processing
  return JSON.stringify({
    message,
    ...enrichedContext
  });
};

// Check if we should log at the given level
const shouldLog = (level) => {
  return LOG_LEVELS[level] >= currentLogLevel;
};

// Logger functions for different levels
const debug = (message, context = {}) => {
  if (!shouldLog('debug')) {return;}
  console.log(formatLogMessage('debug', message, context));
};

const info = (message, context = {}) => {
  if (!shouldLog('info')) {return;}
  console.log(formatLogMessage('info', message, context));
};

const warn = (message, context = {}) => {
  if (!shouldLog('warn')) {return;}
  console.warn(formatLogMessage('warn', message, context));
};

const error = (message, error = null, context = {}) => {
  if (!shouldLog('error')) {return;}
  
  // Add error details to context if provided
  const errorContext = error ? {
    ...context,
    errorMessage: error.message,
    stack: error.stack,
    code: error.code
  } : context;
  
  console.error(formatLogMessage('error', message, errorContext));
};

// Request logger for HTTP requests
const logRequest = (req, res, next) => {
  if (!shouldLog('info')) {
    if (next) {next();}
    return;
  }
  
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  // Log when request starts
  info(`Request started: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers
  });
  
  // Log when request completes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Determine appropriate log level based on status code
    const level = res.statusCode >= 500 ? 'error' : 
      res.statusCode >= 400 ? 'warn' : 'info';
    
    const logContext = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };
    
    // Log using the appropriate level
    if (level === 'error') {
      error(`Request failed: ${req.method} ${req.originalUrl}`, null, logContext);
    } else if (level === 'warn') {
      warn(`Request completed with warning: ${req.method} ${req.originalUrl}`, logContext);
    } else {
      info(`Request completed: ${req.method} ${req.originalUrl}`, logContext);
    }
  });
  
  if (next) {next();}
};

// LINE bot event logger
const logLineEvent = (event, result) => {
  if (!shouldLog('info')) {return;}
  
  // Extract useful information but sanitize sensitive data
  const sanitizedEvent = {
    type: event.type,
    timestamp: event.timestamp,
    source: {
      type: event.source?.type,
      // Only include partial userId for privacy
      userId: event.source?.userId ? `${event.source.userId.substring(0, 5)}...` : undefined
    },
    replyToken: event.replyToken ? '[PRESENT]' : undefined,
    message: event.message ? {
      type: event.message.type,
      // Only include message type, not content for privacy
      hasContent: !!event.message.text
    } : undefined
  };
  
  info('LINE event processed', {
    event: sanitizedEvent,
    success: !!result,
    resultType: result ? typeof result : 'undefined'
  });
};

// Health logger for monitoring service health
const logHealth = (status = 'ok', details = {}) => {
  info('Health check', {
    status,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().heapUsed,
    ...details
  });
};

module.exports = {
  debug,
  info,
  warn,
  error,
  logRequest,
  logLineEvent,
  logHealth,
  LOG_LEVELS
};