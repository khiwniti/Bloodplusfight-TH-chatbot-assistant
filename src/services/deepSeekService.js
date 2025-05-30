/**
 * DeepSeek API Service
 * 
 * Handles communication with the DeepSeek API for generating AI responses
 */
const axios = require('axios');
const config = require('../../config/config');
const logger = require('./loggerService');
const cachedResponseService = require('./cachedResponseService');

/**
 * Generate a response using DeepSeek AI
 * @param {string} userMessage - The user's message
 * @param {Object} context - The context for the conversation
 * @returns {Promise<string>} - The AI-generated response
 */
const generateResponse = async (userMessage, context) => {
  // Check if we should use cached responses first
  if (process.env.USE_CACHED_RESPONSES === 'true') {
    const cachedResponse = cachedResponseService.getCachedResponse(userMessage, context.language);
    if (cachedResponse) {
      logger.info('Using cached response for query:', userMessage);
      return cachedResponse;
    }
  }
  
  // Prepare conversation history for context
  const messages = [];
  
  // Add system message with appropriate context
  let systemContent = '';
  if (context.healthcareContext && context.healthcareContext.isHealthcareQuery) {
    systemContent = context.language === 'en'
      ? `You are a friendly and helpful healthcare assistant, specializing in information about HIV, STDs, and sexual health. Maintain a professional but accessible tone. Provide accurate, non-judgmental information. Provide evidence-based medical information and clearly indicate when something is your opinion versus accepted medical fact. Keep responses concise (under 2000 characters) but comprehensive. For health questions, prioritize accuracy and evidence-based information. Recommend consulting healthcare professionals for personalized advice.

Health context: ${JSON.stringify(context.healthcareContext)}`
      : `คุณเป็นผู้ช่วยด้านสุขภาพที่เป็นมิตรและมีประโยชน์ เชี่ยวชาญด้านข้อมูลเกี่ยวกับเอชไอวี โรคติดต่อทางเพศสัมพันธ์ และสุขภาพทางเพศ รักษาโทนที่เป็นมืออาชีพแต่เข้าถึงได้ ให้ข้อมูลที่ถูกต้องและไม่ตัดสิน ให้ข้อมูลที่มีหลักฐานทางการแพทย์รองรับและระบุให้ชัดเจนเมื่อสิ่งใดเป็นความเห็นของคุณเทียบกับข้อเท็จจริงทางการแพทย์ที่ยอมรับกัน รักษาการตอบให้กระชับ (ไม่เกิน 2000 ตัวอักษร) แต่ให้ข้อมูลครบถ้วน สำหรับคำถามด้านสุขภาพ ให้ความสำคัญกับความถูกต้องและข้อมูลที่มีหลักฐานรองรับ แนะนำให้ปรึกษาบุคลากรทางการแพทย์สำหรับคำแนะนำส่วนบุคคล

บริบทด้านสุขภาพ: ${JSON.stringify(context.healthcareContext)}`;
  } else {
    systemContent = context.language === 'en'
      ? `You are a helpful assistant. Provide accurate and relevant information in response to user queries. Be concise but comprehensive in your answers.`
      : `คุณเป็นผู้ช่วยที่มีประโยชน์ ให้ข้อมูลที่ถูกต้องและเกี่ยวข้องในการตอบคำถามของผู้ใช้ ตอบแบบกระชับแต่ครอบคลุม`;
  }
  
  messages.push({ role: 'system', content: systemContent });
  
  // Add conversation history if available
  if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
    // Add up to 5 recent messages from history
    for (let i = Math.max(0, context.conversationHistory.length - 5); i < context.conversationHistory.length; i++) {
      const message = context.conversationHistory[i];
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
  
  // Make API request with retries
  const retryCount = parseInt(process.env.OPENROUTER_RETRY_COUNT) || 3;
  const retryDelay = parseInt(process.env.OPENROUTER_RETRY_DELAY) || 3000;
  const timeout = parseInt(process.env.OPENROUTER_TIMEOUT) || 20000;
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      logger.info(`DeepSeek API request attempt ${attempt}/${retryCount}`);
      
      const response = await axios.post(process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions', {
        model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 2000,
        top_p: 0.9,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        timeout: timeout
      });
      
      logger.info('DeepSeek API response received successfully');
      return response.data.choices[0].message.content;
    } catch (error) {
      const statusCode = error.response?.status;
      logger.error(`DeepSeek API error (attempt ${attempt}/${retryCount}):`, { 
        message: error.message, 
        statusCode: statusCode,
        data: error.response?.data
      });
      
      // Handle rate limiting (429) specifically
      if (statusCode === 429) {
        if (attempt < retryCount) {
          const currentDelay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.info(`Rate limited, retrying in ${currentDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          continue;
        } else if (process.env.RATE_LIMIT_FALLBACK_ENABLED === 'true') {
          // Use cached response after all retries failed due to rate limiting
          const cachedResponse = cachedResponseService.getCachedResponse(userMessage, context.language);
          if (cachedResponse) {
            logger.info('Using cached response after rate limit');
            return cachedResponse;
          }
        }
      } else if (attempt < retryCount) {
        // For other errors, retry with regular delay
        logger.info(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // If we've exhausted all retries or it's not a retriable error
      if (attempt === retryCount) {
        logger.error('All DeepSeek API attempts failed');
        
        // Try to use cached response as fallback
        const cachedResponse = cachedResponseService.getCachedResponse(userMessage, context.language);
        if (cachedResponse) {
          logger.info('Using cached response as fallback after API failure');
          return cachedResponse;
        }
        
        // If no cached response, return a generic fallback based on language
        return context.language === 'en'
          ? "I'm sorry, but I'm currently experiencing technical difficulties. Please try again later or rephrase your question."
          : "ขออภัย ขณะนี้ระบบกำลังประสบปัญหาทางเทคนิค โปรดลองอีกครั้งในภายหลังหรือถามคำถามในรูปแบบอื่น";
      }
    }
  }
};

module.exports = {
  generateResponse
};
