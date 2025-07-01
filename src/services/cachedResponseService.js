/**
 * Cached Response Service
 * 
 * Provides tiered caching with memory and persistent storage options
 * for improved performance and reliability in production environments.
 */
const NodeCache = require('node-cache');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/config');
const logger = require('./loggerService');

// Memory cache with configurable TTL (default: 1 hour)
const memoryCache = new NodeCache({
  stdTTL: config.cache?.memoryTTL || 3600,
  checkperiod: 120,
  useClones: false
});

// Cache directory for persistent storage
const CACHE_DIR = path.join(__dirname, '../../.cache');

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create cache directory:', error);
  }
};

// Initialize cache on startup
(async () => {
  if (config.features.enableCache) {
    await ensureCacheDir();
    logger.info('Cache service initialized', {
      memoryTTL: config.cache?.memoryTTL || 3600,
      persistentCache: config.cache?.enablePersistence || false
    });
  }
})();

/**
 * Generate cache key with namespacing
 * @param {string} key - The base key
 * @param {string} namespace - Optional namespace for the key
 * @returns {string} - The namespaced cache key
 */
const generateKey = (key, namespace = 'default') => {
  return `${namespace}:${key}`;
};

/**
 * Get value from cache
 * @param {string} key - The cache key
 * @param {string} namespace - Optional namespace for the key
 * @returns {any} - The cached value or undefined
 */
const get = (key, namespace = 'default') => {
  if (!config.features.enableCache) {
    return undefined;
  }

  const cacheKey = generateKey(key, namespace);
  
  // Try memory cache first
  const memoryValue = memoryCache.get(cacheKey);
  if (memoryValue !== undefined) {
    logger.debug('Cache hit (memory)', { key: cacheKey });
    return memoryValue;
  }
  
  // If persistent cache is enabled, try to get from disk
  if (config.cache?.enablePersistence) {
    try {
      const cacheFile = path.join(CACHE_DIR, `${cacheKey.replace(/:/g, '_')}.json`);
      // Check if file exists synchronously to avoid unnecessary async operations
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf8');
        const { value, expiry } = JSON.parse(data);
        
        // Check if cache has expired
        if (expiry > Date.now()) {
          // Set in memory cache for faster access next time
          memoryCache.set(cacheKey, value);
          logger.debug('Cache hit (persistent)', { key: cacheKey });
          return value;
        }
        
        // Remove expired cache file
        fs.unlink(cacheFile).catch(err => {
          logger.error('Failed to delete expired cache file:', err);
        });
      }
    } catch (error) {
      logger.error('Error reading from persistent cache:', error);
    }
  }
  
  logger.debug('Cache miss', { key: cacheKey });
  return undefined;
};

/**
 * Set value in cache
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @param {string} namespace - Optional namespace for the key
 * @returns {boolean} - Success status
 */
const set = async (key, value, ttl = undefined, namespace = 'default') => {
  if (!config.features.enableCache) {
    return false;
  }

  const cacheKey = generateKey(key, namespace);
  
  // Set in memory cache
  const ttlValue = ttl || config.cache?.memoryTTL || 3600;
  memoryCache.set(cacheKey, value, ttlValue);
  
  // If persistent cache is enabled, save to disk
  if (config.cache?.enablePersistence) {
    try {
      await ensureCacheDir();
      
      const cacheFile = path.join(CACHE_DIR, `${cacheKey.replace(/:/g, '_')}.json`);
      const cacheData = {
        value,
        expiry: Date.now() + (ttlValue * 1000)
      };
      
      await fs.writeFile(cacheFile, JSON.stringify(cacheData), 'utf8');
      logger.debug('Saved to persistent cache', { key: cacheKey });
    } catch (error) {
      logger.error('Error writing to persistent cache:', error);
      return false;
    }
  }
  
  return true;
};

/**
 * Delete value from cache
 * @param {string} key - The cache key
 * @param {string} namespace - Optional namespace for the key
 * @returns {boolean} - Success status
 */
const del = async (key, namespace = 'default') => {
  if (!config.features.enableCache) {
    return false;
  }

  const cacheKey = generateKey(key, namespace);
  
  // Delete from memory cache
  memoryCache.del(cacheKey);
  
  // If persistent cache is enabled, delete from disk
  if (config.cache?.enablePersistence) {
    try {
      const cacheFile = path.join(CACHE_DIR, `${cacheKey.replace(/:/g, '_')}.json`);
      await fs.unlink(cacheFile);
    } catch (error) {
      // Ignore file not found errors
      if (error.code !== 'ENOENT') {
        logger.error('Error deleting from persistent cache:', error);
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Clear all cache (both memory and persistent)
 * @returns {boolean} - Success status
 */
const clear = async () => {
  if (!config.features.enableCache) {
    return false;
  }

  // Clear memory cache
  memoryCache.flushAll();
  
  // Clear persistent cache if enabled
  if (config.cache?.enablePersistence) {
    try {
      const files = await fs.readdir(CACHE_DIR);
      
      // Delete all cache files
      await Promise.all(
        files.map(file => {
          if (file.endsWith('.json')) {
            return fs.unlink(path.join(CACHE_DIR, file));
          }
        })
      );
      
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing persistent cache:', error);
      return false;
    }
  }
  
  return true;
};

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
const getStats = () => {
  if (!config.features.enableCache) {
    return { enabled: false };
  }

  const stats = memoryCache.getStats();
  
  return {
    enabled: true,
    persistent: config.cache?.enablePersistence || false,
    memory: {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      ksize: stats.ksize,
      vsize: stats.vsize
    }
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  getStats
};