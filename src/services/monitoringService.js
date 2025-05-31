/**
 * Monitoring Service
 * 
 * Provides production-grade monitoring, metrics collection, 
 * and alerting capabilities for the Line OA Chatbot.
 */
const os = require('os');
const process = require('process');
const logger = require('./loggerService');
const NodeCache = require('node-cache');
const axios = require('axios');
const config = require('../../config/config');

// Internal metrics store with 1-minute retention
const metricsCache = new NodeCache({ stdTTL: 60 });

// Error tracking with deduplication
const errorTracker = new NodeCache({ stdTTL: 3600 }); // 1-hour retention for error deduplication

// Constants
const METRICS_INTERVAL = 60000; // 1 minute
const ALERT_THRESHOLD = 5; // Number of errors before alerting
const MAX_RESOURCE_HISTORY = 60; // Keep 60 data points (1 hour at 1-minute intervals)

// Resource usage history
const resourceHistory = {
  cpu: [],
  memory: [],
  uptime: [],
  timestamp: []
};

// Initialize metrics
const initializeMetrics = () => {
  metricsCache.set('requests', 0);
  metricsCache.set('errors', 0);
  metricsCache.set('api_calls', 0);
  metricsCache.set('response_times', []);
  metricsCache.set('ai_calls', 0);
  metricsCache.set('ai_errors', 0);
  metricsCache.set('ai_response_times', []);
  
  // Start resource monitoring
  startResourceMonitoring();
  
  logger.info('Monitoring service initialized');
};

// Start resource monitoring
const startResourceMonitoring = () => {
  // Initial collection
  collectResourceMetrics();
  
  // Set up interval
  setInterval(collectResourceMetrics, METRICS_INTERVAL);
};

// Collect resource metrics
const collectResourceMetrics = () => {
  try {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    // Calculate CPU usage percentage (user + system time)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    // Calculate memory usage percentage
    const memoryPercent = (memoryUsage.rss / os.totalmem()) * 100;
    
    // Get current timestamp
    const now = Date.now();
    
    // Store metrics
    resourceHistory.cpu.push(cpuPercent);
    resourceHistory.memory.push(memoryPercent);
    resourceHistory.uptime.push(process.uptime());
    resourceHistory.timestamp.push(now);
    
    // Maintain history size
    if (resourceHistory.cpu.length > MAX_RESOURCE_HISTORY) {
      resourceHistory.cpu.shift();
      resourceHistory.memory.shift();
      resourceHistory.uptime.shift();
      resourceHistory.timestamp.shift();
    }
    
    // Check for resource issues
    checkResourceIssues(cpuPercent, memoryPercent);
  } catch (error) {
    logger.error('Error collecting resource metrics:', error);
  }
};

// Check for resource issues
const checkResourceIssues = (cpuPercent, memoryPercent) => {
  // CPU alert threshold (80%)
  if (cpuPercent > 80) {
    logAlert('HIGH_CPU', `High CPU usage detected: ${cpuPercent.toFixed(2)}%`);
  }
  
  // Memory alert threshold (85%)
  if (memoryPercent > 85) {
    logAlert('HIGH_MEMORY', `High memory usage detected: ${memoryPercent.toFixed(2)}%`);
  }
};

// Track API request
const trackRequest = (path, method = 'GET') => {
  const requests = metricsCache.get('requests') || 0;
  metricsCache.set('requests', requests + 1);
  
  return {
    start: Date.now(),
    path,
    method
  };
};

// Track API response
const trackResponse = (tracker, status, error = null) => {
  if (!tracker || !tracker.start) return;
  
  const duration = Date.now() - tracker.start;
  
  // Store response time
  const responseTimes = metricsCache.get('response_times') || [];
  responseTimes.push(duration);
  
  // Keep only the latest 1000 response times
  if (responseTimes.length > 1000) {
    responseTimes.shift();
  }
  
  metricsCache.set('response_times', responseTimes);
  
  // Track errors
  if (error || status >= 400) {
    const errors = metricsCache.get('errors') || 0;
    metricsCache.set('errors', errors + 1);
    
    // Log the error
    trackError(error || new Error(`HTTP ${status}`), tracker.path);
  }
  
  return duration;
};

// Track AI API call
const trackAICall = (provider) => {
  const aiCalls = metricsCache.get('ai_calls') || 0;
  metricsCache.set('ai_calls', aiCalls + 1);
  
  return {
    start: Date.now(),
    provider
  };
};

// Track AI API response
const trackAIResponse = (tracker, success, error = null) => {
  if (!tracker || !tracker.start) return;
  
  const duration = Date.now() - tracker.start;
  
  // Store response time
  const aiResponseTimes = metricsCache.get('ai_response_times') || [];
  aiResponseTimes.push({
    provider: tracker.provider,
    duration,
    success
  });
  
  // Keep only the latest 100 AI response times
  if (aiResponseTimes.length > 100) {
    aiResponseTimes.shift();
  }
  
  metricsCache.set('ai_response_times', aiResponseTimes);
  
  // Track errors
  if (!success || error) {
    const aiErrors = metricsCache.get('ai_errors') || 0;
    metricsCache.set('ai_errors', aiErrors + 1);
    
    // Log the error
    trackError(error || new Error(`AI API failure for ${tracker.provider}`), 'AI_API');
  }
  
  return duration;
};

// Track error with deduplication
const trackError = (error, context = '') => {
  try {
    // Create error signature for deduplication
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || '';
    const errorSignature = `${context}:${errorMessage}:${errorStack.split('\n')[1] || ''}`;
    
    // Check if this error has been seen recently
    const existingError = errorTracker.get(errorSignature);
    if (existingError) {
      // Increment count for existing error
      errorTracker.set(errorSignature, {
        ...existingError,
        count: existingError.count + 1,
        lastSeen: Date.now()
      });
      
      // Alert if threshold is reached
      if (existingError.count + 1 === ALERT_THRESHOLD) {
        logAlert('ERROR_THRESHOLD', `Error threshold reached: ${errorMessage}`, {
          context,
          count: existingError.count + 1,
          error: errorMessage,
          stack: errorStack
        });
      }
    } else {
      // Track new error
      errorTracker.set(errorSignature, {
        message: errorMessage,
        context,
        stack: errorStack,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        count: 1
      });
    }
    
    // Log the error
    logger.error(`Error in ${context}:`, {
      message: errorMessage,
      stack: errorStack
    });
  } catch (trackingError) {
    // Fallback if error tracking itself fails
    logger.error('Error in error tracking:', trackingError);
  }
};

// Log an alert
const logAlert = (type, message, details = {}) => {
  logger.error(`ALERT [${type}]: ${message}`, details);
  
  // Send alert if webhook configured
  if (config.monitoring?.alertWebhook) {
    sendAlertWebhook(type, message, details);
  }
};

// Send alert to webhook
const sendAlertWebhook = async (type, message, details) => {
  try {
    await axios.post(config.monitoring.alertWebhook, {
      type,
      message,
      details,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      service: 'line-oa-chatbot'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5-second timeout
    });
  } catch (error) {
    logger.error('Failed to send alert webhook:', error);
  }
};

// Get metrics for dashboard/API
const getMetrics = () => {
  const responseTimes = metricsCache.get('response_times') || [];
  const aiResponseTimes = metricsCache.get('ai_response_times') || [];
  
  // Calculate response time percentiles
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const p50Index = Math.floor(sortedResponseTimes.length * 0.5);
  const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
  const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
  
  return {
    uptime: process.uptime(),
    timestamp: Date.now(),
    requests: {
      total: metricsCache.get('requests') || 0,
      errors: metricsCache.get('errors') || 0,
      error_rate: metricsCache.get('requests') 
        ? (metricsCache.get('errors') / metricsCache.get('requests') * 100).toFixed(2) + '%'
        : '0%'
    },
    response_times: {
      avg: responseTimes.length 
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0,
      p50: sortedResponseTimes[p50Index] || 0,
      p95: sortedResponseTimes[p95Index] || 0,
      p99: sortedResponseTimes[p99Index] || 0
    },
    ai_api: {
      total: metricsCache.get('ai_calls') || 0,
      errors: metricsCache.get('ai_errors') || 0,
      providers: aiResponseTimes.reduce((acc, item) => {
        if (!acc[item.provider]) {
          acc[item.provider] = { count: 0, success: 0, errors: 0, avg_duration: 0, total_duration: 0 };
        }
        acc[item.provider].count++;
        if (item.success) acc[item.provider].success++;
        else acc[item.provider].errors++;
        acc[item.provider].total_duration += item.duration;
        acc[item.provider].avg_duration = Math.round(acc[item.provider].total_duration / acc[item.provider].count);
        return acc;
      }, {})
    },
    resources: {
      cpu: resourceHistory.cpu.length ? resourceHistory.cpu[resourceHistory.cpu.length - 1].toFixed(2) + '%' : '0%',
      memory: resourceHistory.memory.length ? resourceHistory.memory[resourceHistory.memory.length - 1].toFixed(2) + '%' : '0%',
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      history: {
        cpu: resourceHistory.cpu,
        memory: resourceHistory.memory,
        timestamp: resourceHistory.timestamp
      }
    }
  };
};

// Reset metrics (for testing)
const resetMetrics = () => {
  metricsCache.flushAll();
  initializeMetrics();
};

// Initialize on module load
initializeMetrics();

module.exports = {
  trackRequest,
  trackResponse,
  trackAICall,
  trackAIResponse,
  trackError,
  logAlert,
  getMetrics,
  resetMetrics
};