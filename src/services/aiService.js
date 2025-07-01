/**
 * Centralized AI Service
 * 
 * Integrates and manages multiple AI providers with fallback mechanisms
 * for robust production-grade response generation.
 */
const config = require('../../config/config');
const logger = require('./loggerService');
const deepSeekService = require('./deepSeekService');
const openRouterService = require('./openRouterService');
const cacheService = require('./cachedResponseService');
const fallbackResponseService = require('./fallbackResponseService');

// Track provider usage and success rates
const providerStats = {
  deepSeek: { calls: 0, success: 0, failures: 0 },
  openRouter: { calls: 0, success: 0, failures: 0 }
};

/**
 * Generate response using the appropriate AI provider with fallback mechanisms
 * @param {string} userMessage - The user's message
 * @param {Object} context - The context information for personalization
 * @param {Object} options - Additional options for the AI request
 * @returns {Promise<string>} - The AI-generated response
 */
const generateResponse = async (userMessage, context, options = {}) => {
  // Check cache first if caching is enabled
  if (config.features.enableCache) {
    const cacheKey = `ai:${context.language}:${userMessage}`;
    const cachedResponse = cacheService.get(cacheKey);
    
    if (cachedResponse) {
      logger.info('Using cached AI response', { cacheKey });
      return cachedResponse;
    }
  }
  
  // Select the primary provider based on configuration
  const primaryProvider = config.ai.primaryProvider || 'openRouter';
  
  try {
    // First attempt with primary provider
    logger.info(`Generating AI response using ${primaryProvider}`, { 
      userId: context.userId,
      messageLength: userMessage.length 
    });
    
    let response;
    
    if (primaryProvider === 'deepSeek') {
      providerStats.deepSeek.calls++;
      response = await deepSeekService.generateResponse(userMessage, context, options);
      providerStats.deepSeek.success++;
    } else {
      providerStats.openRouter.calls++;
      response = await openRouterService.generateResponse(userMessage, context, options);
      providerStats.openRouter.success++;
    }
    
    // Cache successful response if caching is enabled
    if (config.features.enableCache) {
      const cacheKey = `ai:${context.language}:${userMessage}`;
      cacheService.set(cacheKey, response);
    }
    
    return response;
  } catch (primaryError) {
    // Log the primary provider failure
    logger.error(`Primary AI provider (${primaryProvider}) failed:`, primaryError);
    
    if (primaryProvider === 'deepSeek') {
      providerStats.deepSeek.failures++;
    } else {
      providerStats.openRouter.failures++;
    }
    
    // Attempt with fallback provider
    const fallbackProvider = primaryProvider === 'deepSeek' ? 'openRouter' : 'deepSeek';
    
    try {
      logger.info(`Falling back to ${fallbackProvider} for AI response`, { 
        userId: context.userId 
      });
      
      let fallbackResponse;
      
      if (fallbackProvider === 'deepSeek') {
        providerStats.deepSeek.calls++;
        fallbackResponse = await deepSeekService.generateResponse(userMessage, context, options);
        providerStats.deepSeek.success++;
      } else {
        providerStats.openRouter.calls++;
        fallbackResponse = await openRouterService.generateResponse(userMessage, context, options);
        providerStats.openRouter.success++;
      }
      
      // Cache successful fallback response
      if (config.features.enableCache) {
        const cacheKey = `ai:${context.language}:${userMessage}`;
        cacheService.set(cacheKey, fallbackResponse);
      }
      
      return fallbackResponse;
    } catch (fallbackError) {
      // Both primary and fallback providers failed
      logger.error(`Fallback AI provider (${fallbackProvider}) also failed:`, fallbackError);
      
      if (fallbackProvider === 'deepSeek') {
        providerStats.deepSeek.failures++;
      } else {
        providerStats.openRouter.failures++;
      }
      
      // Use static fallback responses as last resort
      return fallbackResponseService.getFallbackResponse(context.language, userMessage);
    }
  }
};

/**
 * Get current AI provider statistics
 * @returns {Object} - Provider usage statistics
 */
const getProviderStats = () => {
  return {
    deepSeek: {
      ...providerStats.deepSeek,
      successRate: providerStats.deepSeek.calls > 0 
        ? (providerStats.deepSeek.success / providerStats.deepSeek.calls * 100).toFixed(2) + '%'
        : 'N/A'
    },
    openRouter: {
      ...providerStats.openRouter,
      successRate: providerStats.openRouter.calls > 0 
        ? (providerStats.openRouter.success / providerStats.openRouter.calls * 100).toFixed(2) + '%'
        : 'N/A'
    }
  };
};

/**
 * Reset provider statistics
 */
const resetProviderStats = () => {
  providerStats.deepSeek = { calls: 0, success: 0, failures: 0 };
  providerStats.openRouter = { calls: 0, success: 0, failures: 0 };
  logger.info('AI provider statistics reset');
};

module.exports = {
  generateResponse,
  getProviderStats,
  resetProviderStats
};