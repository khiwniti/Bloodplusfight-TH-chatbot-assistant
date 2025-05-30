/**
 * Service module exports
 * Centralizes all service exports for easier imports
 */

const lineBotService = require('./lineBotService');
const openRouterService = require('./openRouterService');
const conversationService = require('./conversationService');
const customerService = require('./customerService');
const healthcareService = require('./healthcareService');
const commandService = require('./commandService');
const analyticsService = require('./analyticsService');
const fallbackResponseService = require('./fallbackResponseService');
const cachedResponseService = require('./cachedResponseService');
const deepSeekService = require('./deepSeekService');
const productService = require('./productService');
const researchService = require('./researchService');

// Choose the AI service based on configuration
const useDeepSeekAPI = process.env.USE_DEEPSEEK_API === 'true';
const aiService = useDeepSeekAPI ? deepSeekService : openRouterService;

module.exports = {
  lineBotService,
  openRouterService,
  deepSeekService,
  conversationService,
  customerService,
  healthcareService,
  commandService,
  analyticsService,
  fallbackResponseService,
  cachedResponseService,
  productService,
  researchService,
  aiService // Export the chosen AI service
};
