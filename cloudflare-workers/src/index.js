/**
 * LINE Chatbot Cloudflare Workers Entry Point
 * Optimized for edge computing with global distribution
 */

import { WebhookHandler } from './handlers/webhook.js';
import { AdminHandler } from './handlers/admin.js';
import { Router } from './utils/router.js';
import { Logger } from './utils/logger.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { Analytics } from './utils/analytics.js';

export default {
  /**
   * Main request handler for Cloudflare Workers
   * @param {Request} request - Incoming HTTP request
   * @param {Object} env - Environment variables and bindings
   * @param {Object} ctx - Execution context
   * @returns {Response} HTTP response
   */
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const logger = new Logger(env);
    const analytics = new Analytics(env);
    
    try {
      // Initialize request context
      const requestId = crypto.randomUUID();
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      const country = request.cf?.country || 'unknown';
      const colo = request.cf?.colo || 'unknown';
      
      // Log request
      logger.info('Request received', {
        requestId,
        method: request.method,
        url: request.url,
        clientIP,
        country,
        colo,
        userAgent: userAgent.substring(0, 100)
      });
      
      // Rate limiting
      const rateLimiter = new RateLimiter(env);
      const rateLimitResult = await rateLimiter.checkLimit(clientIP, request.url);
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded', {
          requestId,
          clientIP,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining
        });
        
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-Request-ID': requestId
          }
        });
      }
      
      // Initialize router
      const router = new Router();
      
      // Health check endpoint
      router.get('/health', () => this.handleHealthCheck(request, env, requestId));
      
      // LINE webhook endpoints
      router.post('/webhook', (req) => this.handleWebhook(req, env, ctx, requestId));
      router.get('/webhook/health', () => this.handleWebhookHealth(env, requestId));
      router.post('/webhook/debug', (req) => this.handleWebhookDebug(req, env, requestId));
      
      // Admin API endpoints
      router.get('/api/products', (req) => this.handleAdminAPI(req, env, 'products', 'get', requestId));
      router.get('/api/products/:id', (req) => this.handleAdminAPI(req, env, 'products', 'get', requestId));
      router.post('/api/products', (req) => this.handleAdminAPI(req, env, 'products', 'post', requestId));
      router.put('/api/products/:id', (req) => this.handleAdminAPI(req, env, 'products', 'put', requestId));
      router.delete('/api/products/:id', (req) => this.handleAdminAPI(req, env, 'products', 'delete', requestId));
      
      // Analytics endpoint
      router.get('/api/analytics', (req) => this.handleAnalytics(req, env, requestId));
      
      // Metrics endpoint (protected)
      router.get('/metrics', (req) => this.handleMetrics(req, env, requestId));
      
      // Handle request
      const response = await router.handle(request);
      
      // Add response headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Edge-Location', colo);
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      
      // Log response
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        requestId,
        status: response.status,
        duration,
        cacheStatus: response.headers.get('CF-Cache-Status') || 'unknown'
      });
      
      // Record analytics
      ctx.waitUntil(analytics.recordRequest({
        requestId,
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        clientIP,
        country,
        colo,
        userAgent
      }));
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        duration
      });
      
      // Record error analytics
      ctx.waitUntil(analytics.recordError({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        duration
      }));
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: env.ENVIRONMENT === 'production' ? 
          'An unexpected error occurred' : error.message,
        requestId: crypto.randomUUID()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`
        }
      });
    }
  },
  
  /**
   * Health check handler
   */
  async handleHealthCheck(request, env, requestId) {
    const startTime = Date.now();
    
    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = 0;
    
    try {
      const dbStartTime = Date.now();
      await env.DB.prepare('SELECT 1 as test').first();
      dbStatus = 'healthy';
      dbLatency = Date.now() - dbStartTime;
    } catch (error) {
      dbStatus = 'unhealthy';
      dbLatency = Date.now() - startTime;
    }
    
    // Check KV store
    let kvStatus = 'unknown';
    let kvLatency = 0;
    
    try {
      const kvStartTime = Date.now();
      await env.KV.get('health-check');
      kvStatus = 'healthy';
      kvLatency = Date.now() - kvStartTime;
    } catch (error) {
      kvStatus = 'unhealthy';
      kvLatency = Date.now() - kvStartTime;
    }
    
    const health = {
      status: dbStatus === 'healthy' && kvStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: env.ENVIRONMENT || 'unknown',
      edge: {
        colo: request.cf?.colo || 'unknown',
        country: request.cf?.country || 'unknown',
        region: request.cf?.region || 'unknown'
      },
      services: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`,
          type: 'D1 SQLite'
        },
        cache: {
          status: kvStatus,
          latency: `${kvLatency}ms`,
          type: 'Workers KV'
        }
      },
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
        memory: 'N/A (Workers Runtime)',
        uptime: 'N/A (Stateless)'
      },
      features: [
        'LINE Bot Webhook Processing',
        'AI Response Generation (DeepSeek + OpenRouter)',
        'Product Catalog Management',
        'Customer Analytics',
        'Edge Caching',
        'Rate Limiting',
        'Global Distribution'
      ]
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return new Response(JSON.stringify(health, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Request-ID': requestId
      }
    });
  },
  
  /**
   * LINE webhook handler
   */
  async handleWebhook(request, env, ctx, requestId) {
    const webhookHandler = new WebhookHandler(env, requestId);
    return await webhookHandler.handle(request, ctx);
  },
  
  /**
   * Webhook health check
   */
  async handleWebhookHealth(env, requestId) {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'line-webhook',
      version: '2.0.0',
      requestId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
    });
  },
  
  /**
   * Webhook debug handler
   */
  async handleWebhookDebug(request, env, requestId) {
    if (env.ENVIRONMENT === 'production') {
      return new Response(JSON.stringify({
        error: 'Debug endpoint disabled in production'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json().catch(() => ({}));
    
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      debug: {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        cf: request.cf,
        requestId
      }
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
    });
  },
  
  /**
   * Admin API handler
   */
  async handleAdminAPI(request, env, resource, method, requestId) {
    const adminHandler = new AdminHandler(env, requestId);
    return await adminHandler.handle(request, resource, method);
  },
  
  /**
   * Analytics handler
   */
  async handleAnalytics(request, env, requestId) {
    // Verify API key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const analytics = new Analytics(env);
    const data = await analytics.getAnalytics();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
    });
  },
  
  /**
   * Metrics handler (Prometheus format)
   */
  async handleMetrics(request, env, requestId) {
    // Verify API key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const analytics = new Analytics(env);
    const metrics = await analytics.getPrometheusMetrics();
    
    return new Response(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'X-Request-ID': requestId
      }
    });
  }
};

/**
 * Durable Object for stateful operations
 */
export class ChatbotDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }
  
  async fetch(request) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }
    
    switch (request.method) {
      case 'GET':
        return this.getSession(sessionId);
      case 'POST':
        return this.updateSession(sessionId, await request.json());
      case 'DELETE':
        return this.deleteSession(sessionId);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }
  
  async getSession(sessionId) {
    const session = this.sessions.get(sessionId) || await this.state.storage.get(sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async updateSession(sessionId, data) {
    const session = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    this.sessions.set(sessionId, session);
    await this.state.storage.put(sessionId, session);
    
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    await this.state.storage.delete(sessionId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Scheduled event handler for background tasks
 */
export async function scheduled(event, env, ctx) {
  const logger = new Logger(env);
  
  switch (event.cron) {
    case '0 */6 * * *': // Every 6 hours
      ctx.waitUntil(cleanupOldSessions(env, logger));
      break;
    case '0 0 * * *': // Daily at midnight
      ctx.waitUntil(generateDailyAnalytics(env, logger));
      break;
    case '*/5 * * * *': // Every 5 minutes
      ctx.waitUntil(healthCheck(env, logger));
      break;
  }
}

/**
 * Background task: Cleanup old sessions
 */
async function cleanupOldSessions(env, logger) {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const result = await env.DB.prepare(`
      DELETE FROM conversations 
      WHERE status = 'ended' AND last_activity < ?
    `).bind(cutoffDate.toISOString()).run();
    
    logger.info('Cleanup completed', {
      deletedConversations: result.changes,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
  }
}

/**
 * Background task: Generate daily analytics
 */
async function generateDailyAnalytics(env, logger) {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
    
    // Get daily statistics
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT c.line_user_id) as active_users,
        COUNT(m.id) as total_messages,
        AVG(m.confidence) as avg_confidence
      FROM conversations c
      JOIN messages m ON c.id = m.conversation_id
      WHERE m.timestamp BETWEEN ? AND ?
    `).bind(startOfDay, endOfDay).first();
    
    // Store in KV for quick access
    await env.KV.put(`daily-stats:${yesterday.toISOString().split('T')[0]}`, 
      JSON.stringify(stats), { expirationTtl: 86400 * 30 }); // 30 days
    
    logger.info('Daily analytics generated', {
      date: yesterday.toISOString().split('T')[0],
      stats
    });
  } catch (error) {
    logger.error('Analytics generation failed', { error: error.message });
  }
}

/**
 * Background task: Health check
 */
async function healthCheck(env, logger) {
  try {
    // Simple database ping
    await env.DB.prepare('SELECT 1').first();
    
    // Update health status in KV
    await env.KV.put('system-health', JSON.stringify({
      status: 'healthy',
      lastCheck: new Date().toISOString()
    }), { expirationTtl: 300 }); // 5 minutes
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    await env.KV.put('system-health', JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString()
    }), { expirationTtl: 300 });
  }
}