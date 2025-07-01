const config = require('../../config/config');
const logger = require('./loggerService');

// Default cache settings
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const DEFAULT_MAX_SIZE = 100; // Maximum number of items in cache
const CACHE_ENABLED = process.env.ENABLE_CACHE !== 'false'; // Enable by default

// In-memory cache store
const cacheStore = new Map();
const cacheMetadata = new Map(); // Store TTL and other metadata

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found/expired
 */
const get = (key) => {
  if (!CACHE_ENABLED) {return null;}
  
  try {
    // Check if key exists and not expired
    if (cacheStore.has(key)) {
      const metadata = cacheMetadata.get(key);
      
      // Check if item has expired
      if (metadata && metadata.expiresAt && metadata.expiresAt < Date.now()) {
        // Item expired, remove it
        del(key);
        return null;
      }
      
      // Update access metadata
      metadata.lastAccessed = Date.now();
      metadata.accessCount = (metadata.accessCount || 0) + 1;
      cacheMetadata.set(key, metadata);
      
      logger.debug('Cache hit', { key });
      return cacheStore.get(key);
    }
    
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Cache get error', error, { key });
    return null;
  }
};

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in milliseconds
 * @returns {boolean} Success status
 */
const set = (key, value, options = {}) => {
  if (!CACHE_ENABLED) {return false;}
  
  try {
    // Ensure we don't exceed max cache size
    if (cacheStore.size >= DEFAULT_MAX_SIZE && !cacheStore.has(key)) {
      // Evict least recently used item
      evictLRU();
    }
    
    // Set the value in cache
    cacheStore.set(key, value);
    
    // Set metadata with TTL if provided
    const ttl = options.ttl || DEFAULT_TTL;
    cacheMetadata.set(key, {
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      expiresAt: Date.now() + ttl
    });
    
    logger.debug('Cache set', { key, ttl });
    return true;
  } catch (error) {
    logger.error('Cache set error', error, { key });
    return false;
  }
};

/**
 * Delete item from cache
 * @param {string} key - Cache key
 * @returns {boolean} Success status
 */
const del = (key) => {
  if (!CACHE_ENABLED) {return false;}
  
  try {
    const deleted = cacheStore.delete(key);
    if (deleted) {
      cacheMetadata.delete(key);
      logger.debug('Cache delete', { key });
    }
    return deleted;
  } catch (error) {
    logger.error('Cache delete error', error, { key });
    return false;
  }
};

/**
 * Clear entire cache
 * @returns {boolean} Success status
 */
const clear = () => {
  if (!CACHE_ENABLED) {return false;}
  
  try {
    cacheStore.clear();
    cacheMetadata.clear();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error', error);
    return false;
  }
};

/**
 * Evict least recently used item from cache
 * @private
 */
const evictLRU = () => {
  let oldest = Infinity;
  let oldestKey = null;
  
  // Find the least recently accessed item
  for (const [key, metadata] of cacheMetadata.entries()) {
    if (metadata.lastAccessed < oldest) {
      oldest = metadata.lastAccessed;
      oldestKey = key;
    }
  }
  
  // Remove the oldest item
  if (oldestKey) {
    del(oldestKey);
    logger.debug('Cache LRU eviction', { key: oldestKey });
  }
};

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
const getStats = () => {
  return {
    enabled: CACHE_ENABLED,
    size: cacheStore.size,
    maxSize: DEFAULT_MAX_SIZE,
    defaultTTL: DEFAULT_TTL,
    keys: Array.from(cacheStore.keys())
  };
};

/**
 * Express middleware to cache API responses
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = DEFAULT_TTL) => {
  return (req, res, next) => {
    if (!CACHE_ENABLED) {return next();}
    
    // Only cache GET requests
    if (req.method !== 'GET') {return next();}
    
    // Create a cache key from the URL and query parameters
    const cacheKey = `api:${req.originalUrl || req.url}`;
    
    // Try to get from cache
    const cachedResponse = get(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(cacheKey, body, { ttl });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Create a cached function
 * @param {Function} fn - Function to cache
 * @param {Function} keyFn - Function to generate cache key from arguments
 * @param {Object} options - Cache options
 * @returns {Function} Cached function
 */
const cachedFunction = (fn, keyFn, options = {}) => {
  return async (...args) => {
    if (!CACHE_ENABLED) {return fn(...args);}
    
    // Generate cache key
    const cacheKey = keyFn ? keyFn(...args) : `fn:${fn.name}:${JSON.stringify(args)}`;
    
    // Try to get from cache
    const cachedResult = get(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    set(cacheKey, result, options);
    return result;
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  getStats,
  cacheMiddleware,
  cachedFunction
};