/**
 * DeepSeek API Service
 * 
 * Handles communication with the DeepSeek API for generating AI responses
 */
const axios = require('axios');
const config = require('../../config/config');
const logger = require('./loggerService');
const cachedResponseService = require('./cachedResponseService');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 });

const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.message.includes('timeout') || error.response?.status === 429) && i < retries - 1) {
        const backoffDelay = delay * Math.pow(2, i);
        console.warn(`DeepSeek error, retrying in ${backoffDelay}ms (attempt ${i + 1}/${retries})`, { error: error.message });
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }
      throw error;
    }
  }
};

/**
 * Generate a response using DeepSeek AI
 * @param {string} userMessage - The user's message
 * @param {Object} context - The context for the conversation
 * @returns {Promise<string>} - The AI-generated response
 */
const generateResponse = async (userMessage, context) => {
  const cacheKey = `response:${context.language}:${userMessage}`;
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    console.info('Using cached DeepSeek response', { cacheKey });
    return cachedResponse;
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
  
  const response = await retryWithBackoff(() => axios.post(process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions', {
    model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 2000,
    top_p: 0.9,
    stream: false
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    timeout: config.limits.aiResponseTimeout || 15000
  }));
  
  console.info('DeepSeek API response received successfully');
  const result = response.data.choices[0].message.content;
  cache.set(cacheKey, result);
  return result;
};

module.exports = {
  generateResponse
};
