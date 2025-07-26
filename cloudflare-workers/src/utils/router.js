/**
 * Simple HTTP router for Cloudflare Workers
 * Optimized for edge computing with minimal overhead
 */

export class Router {
  constructor() {
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
      PATCH: [],
      OPTIONS: []
    };
  }
  
  /**
   * Add GET route
   * @param {string} pattern - URL pattern (supports :param syntax)
   * @param {Function} handler - Route handler function
   */
  get(pattern, handler) {
    this.addRoute('GET', pattern, handler);
  }
  
  /**
   * Add POST route
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  post(pattern, handler) {
    this.addRoute('POST', pattern, handler);
  }
  
  /**
   * Add PUT route
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  put(pattern, handler) {
    this.addRoute('PUT', pattern, handler);
  }
  
  /**
   * Add DELETE route
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  delete(pattern, handler) {
    this.addRoute('DELETE', pattern, handler);
  }
  
  /**
   * Add PATCH route
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  patch(pattern, handler) {
    this.addRoute('PATCH', pattern, handler);
  }
  
  /**
   * Add OPTIONS route (for CORS)
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  options(pattern, handler) {
    this.addRoute('OPTIONS', pattern, handler);
  }
  
  /**
   * Add route to internal storage
   * @param {string} method - HTTP method
   * @param {string} pattern - URL pattern
   * @param {Function} handler - Route handler function
   */
  addRoute(method, pattern, handler) {
    const route = {
      pattern,
      handler,
      regex: this.patternToRegex(pattern),
      paramNames: this.extractParamNames(pattern)
    };
    
    this.routes[method].push(route);
  }
  
  /**
   * Handle incoming request
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async handle(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;
    
    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return this.handleCorsOptions(request);
    }
    
    // Find matching route
    const routes = this.routes[method] || [];
    
    for (const route of routes) {
      const match = pathname.match(route.regex);
      
      if (match) {
        // Extract parameters
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        // Create enhanced request object
        const enhancedRequest = this.enhanceRequest(request, params, url);
        
        try {
          const response = await route.handler(enhancedRequest);
          
          // Add CORS headers to response
          return this.addCorsHeaders(response, request);
          
        } catch (error) {
          console.error('Route handler error:', error);
          
          return this.createErrorResponse(500, 'Internal Server Error', {
            error: error.message,
            stack: error.stack
          });
        }
      }
    }
    
    // No route found
    return this.createErrorResponse(404, 'Not Found', {
      error: 'Route not found',
      method,
      path: pathname
    });
  }
  
  /**
   * Convert URL pattern to regex
   * @param {string} pattern - URL pattern like '/users/:id'
   * @returns {RegExp} Compiled regex
   */
  patternToRegex(pattern) {
    // Escape special regex characters except :param
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace :param with capture groups
    const withCaptures = escaped.replace(/\\:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');
    
    // Ensure exact match
    return new RegExp(`^${withCaptures}$`);
  }
  
  /**
   * Extract parameter names from pattern
   * @param {string} pattern - URL pattern
   * @returns {string[]} Parameter names
   */
  extractParamNames(pattern) {
    const matches = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    return matches ? matches.map(match => match.slice(1)) : [];
  }
  
  /**
   * Enhance request object with additional properties
   * @param {Request} request - Original request
   * @param {Object} params - Route parameters
   * @param {URL} url - Parsed URL
   * @returns {Object} Enhanced request object
   */
  enhanceRequest(request, params, url) {
    return {
      ...request,
      params,
      query: Object.fromEntries(url.searchParams.entries()),
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      
      // Helper methods
      json: () => request.json(),
      text: () => request.text(),
      formData: () => request.formData(),
      arrayBuffer: () => request.arrayBuffer(),
      
      // Get specific header
      header: (name) => request.headers.get(name),
      
      // Check if request accepts certain content type
      accepts: (contentType) => {
        const accept = request.headers.get('Accept') || '';
        return accept.includes(contentType);
      }
    };
  }
  
  /**
   * Handle CORS preflight OPTIONS requests
   * @param {Request} request - HTTP request
   * @returns {Response} CORS preflight response
   */
  handleCorsOptions(request) {
    const origin = request.headers.get('Origin');
    const method = request.headers.get('Access-Control-Request-Method');
    const headers = request.headers.get('Access-Control-Request-Headers');
    
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': method || 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': headers || 'Content-Type, Authorization, X-API-Key, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24 hours
        'Vary': 'Origin'
      }
    });
  }
  
  /**
   * Add CORS headers to response
   * @param {Response} response - Original response
   * @param {Request} request - Original request
   * @returns {Response} Response with CORS headers
   */
  addCorsHeaders(response, request) {
    const origin = request.headers.get('Origin');
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);
    
    newResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    newResponse.headers.set('Vary', 'Origin');
    
    return newResponse;
  }
  
  /**
   * Create standardized error response
   * @param {number} status - HTTP status code
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {Response} Error response
   */
  createErrorResponse(status, message, details = {}) {
    const errorResponse = {
      error: true,
      status,
      message,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    return new Response(JSON.stringify(errorResponse, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
  
  /**
   * Create middleware function
   * @param {Function} middleware - Middleware function
   * @returns {Function} Wrapped handler
   */
  use(middleware) {
    return (handler) => {
      return async (request) => {
        return await middleware(request, handler);
      };
    };
  }
  
  /**
   * Group routes with common prefix
   * @param {string} prefix - Common path prefix
   * @param {Function} callback - Function to define routes
   */
  group(prefix, callback) {
    const originalMethods = {};
    
    // Store original methods
    ['get', 'post', 'put', 'delete', 'patch', 'options'].forEach(method => {
      originalMethods[method] = this[method].bind(this);
    });
    
    // Override methods to add prefix
    ['get', 'post', 'put', 'delete', 'patch', 'options'].forEach(method => {
      this[method] = (pattern, handler) => {
        const fullPattern = prefix + pattern;
        originalMethods[method](fullPattern, handler);
      };
    });
    
    // Execute callback with prefixed methods
    callback();
    
    // Restore original methods
    Object.assign(this, originalMethods);
  }
  
  /**
   * Add catch-all route (must be added last)
   * @param {Function} handler - Catch-all handler
   */
  all(handler) {
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
      this.addRoute(method, '.*', handler);
    });
  }
  
  /**
   * Get route information for debugging
   * @returns {Object} Routes information
   */
  getRoutes() {
    const routeInfo = {};
    
    Object.entries(this.routes).forEach(([method, routes]) => {
      routeInfo[method] = routes.map(route => ({
        pattern: route.pattern,
        params: route.paramNames,
        regex: route.regex.source
      }));
    });
    
    return routeInfo;
  }
}