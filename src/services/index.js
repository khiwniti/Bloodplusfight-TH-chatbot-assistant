/**
 * Service module exports
 * Centralizes all service exports for easier imports
 */

const lineBotService = require('./lineBotService');
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

// Always use DeepSeek for AI
const aiService = deepSeekService;

module.exports = {
  lineBotService,
  conversationService,
  customerService,
  healthcareService,
  commandService,
  analyticsService,
  fallbackResponseService,
  cachedResponseService,
  deepSeekService,
  aiService,
  productService,
  researchService
};
