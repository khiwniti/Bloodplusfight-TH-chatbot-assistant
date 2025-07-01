/**
 * OpenRouter Service
 * 
 * Integrates with OpenRouter API to access multiple AI models
 * for enhanced intelligence and fallback capabilities
 */
const axios = require('axios');
const config = require('../../config/config');
const logger = require('./loggerService');
const NodeCache = require('node-cache');

// Initialize cache with TTL of 1 hour (3600 seconds)
const responseCache = new NodeCache({ stdTTL: 3600 });

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, retries = 3, initialDelay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Only retry on timeout or rate limiting errors
      if ((error.message.includes('timeout') || error.response?.status === 429) && i < retries - 1) {
        const backoffDelay = initialDelay * Math.pow(2, i);
        logger.warn(`OpenRouter API error, retrying in ${backoffDelay}ms (attempt ${i + 1}/${retries})`, {
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }
      throw error;
    }
  }
};

/**
 * Generate a response using OpenRouter API
 * @param {string} userMessage - The user's message
 * @param {Object} context - Conversation context and user information
 * @param {Object} options - Additional options (model override, temperature, etc)
 * @returns {Promise<string>} - The AI-generated response
 */
const generateResponse = async (userMessage, context, options = {}) => {
  // Create a cache key based on the input
  const cacheKey = `or:${options.model || config.openRouter.model}:${context.language}:${userMessage}`;
  
  // Check cache first
  const cachedResponse = responseCache.get(cacheKey);
  if (cachedResponse && !options.skipCache) {
    logger.info('Using cached OpenRouter response', { cacheKey });
    return cachedResponse;
  }
  
  // Prepare messages array with system prompt
  const messages = [];
  
  // Add system message with appropriate context
  let systemContent = generateSystemPrompt(context);
  messages.push({ role: 'system', content: systemContent });
  
  // Add conversation history if available (up to 5 recent messages)
  if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
    const recentHistory = context.conversationHistory.slice(-5);
    for (const message of recentHistory) {
      if (message.role === 'user' || message.role === 'assistant') {
        messages.push({
          role: message.role,
          content: message.content
        });
      }
    }
  }
  
  // Add current user message
  messages.push({ role: 'user', content: userMessage });
  
  try {
    // Make the API call with retry logic
    const response = await retryWithBackoff(() => axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: options.model || config.openRouter.model || 'deepseek/deepseek-r1-0528:free',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || config.openRouter.maxTokens || 1500,
        top_p: options.topP || 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://linechatbot.app',
          'X-Title': 'Line OA Chatbot'
        },
        timeout: config.limits.aiResponseTimeout || 15000
      }
    ));
    
    logger.info('OpenRouter API response received successfully', {
      model: response.data.model,
      usage: response.data.usage
    });
    
    const result = response.data.choices[0].message.content;
    
    // Cache the response for future use
    responseCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    logger.error('OpenRouter API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
};

/**
 * Generate an appropriate system prompt based on the context
 * @param {Object} context - The conversation context
 * @returns {string} - The system prompt
 */
const generateSystemPrompt = (context) => {
  const { language, healthcareContext } = context;
  
  // Use different prompts based on context and language
  if (healthcareContext && healthcareContext.isHealthcareQuery) {
    return language === 'th'
      ? `คุณเป็นผู้ช่วยด้านสุขภาพที่เป็นมิตรและมีประโยชน์ เชี่ยวชาญด้านข้อมูลเกี่ยวกับเอชไอวี โรคติดต่อทางเพศสัมพันธ์ และสุขภาพทางเพศ รักษาโทนที่เป็นมืออาชีพแต่เข้าถึงได้ ให้ข้อมูลที่ถูกต้องและไม่ตัดสิน ให้ข้อมูลที่มีหลักฐานทางการแพทย์รองรับและระบุให้ชัดเจนเมื่อสิ่งใดเป็นความเห็นของคุณเทียบกับข้อเท็จจริงทางการแพทย์ที่ยอมรับกัน รักษาการตอบให้กระชับ (ไม่เกิน 1500 ตัวอักษร) แต่ให้ข้อมูลครบถ้วน สำหรับคำถามด้านสุขภาพ ให้ความสำคัญกับความถูกต้องและข้อมูลที่มีหลักฐานรองรับ แนะนำให้ปรึกษาบุคลากรทางการแพทย์สำหรับคำแนะนำส่วนบุคคล

บริบทด้านสุขภาพ: ${JSON.stringify(healthcareContext)}`
      : `You are a friendly and helpful healthcare assistant, specializing in information about HIV, STDs, and sexual health. Maintain a professional but accessible tone. Provide accurate, non-judgmental information. Provide evidence-based medical information and clearly indicate when something is your opinion versus accepted medical fact. Keep responses concise (under 1500 characters) but comprehensive. For health questions, prioritize accuracy and evidence-based information. Recommend consulting healthcare professionals for personalized advice.

Health context: ${JSON.stringify(healthcareContext)}`;
  } else {
    return language === 'th'
      ? 'คุณเป็นผู้ช่วยที่มีประโยชน์ให้กับลูกค้าของ Line OA Chatbot ให้ข้อมูลที่ถูกต้องและเกี่ยวข้องในการตอบคำถาม ตอบแบบกระชับแต่ครอบคลุม (ไม่เกิน 1500 ตัวอักษร) ด้วยโทนที่เป็นมิตรและเป็นมืออาชีพ ใช้ภาษาที่เข้าใจง่าย แต่ถูกต้องตามหลักวิชาการเมื่อจำเป็น สำหรับคำถามทางเทคนิคหรือที่ต้องการความเชี่ยวชาญเฉพาะ ให้ระบุว่าลูกค้าควรติดต่อผู้เชี่ยวชาญโดยตรง'
      : 'You are a helpful assistant for Line OA Chatbot customers. Provide accurate and relevant information in response to queries. Be concise but comprehensive in your answers (under 1500 characters), with a friendly and professional tone. Use plain language but be technically accurate when necessary. For technical questions or those requiring specialized expertise, indicate when the customer should contact an expert directly.';
  }
};

/**
 * List available models from OpenRouter
 * @returns {Promise<Array>} - List of available models
 */
const listAvailableModels = async () => {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });
    
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching OpenRouter models:', error);
    throw new Error('Failed to fetch available models');
  }
};

/**
 * Clear the response cache
 */
const clearCache = () => {
  responseCache.flushAll();
  logger.info('OpenRouter response cache cleared');
};

module.exports = {
  generateResponse,
  listAvailableModels,
  clearCache
};