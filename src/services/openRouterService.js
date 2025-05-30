const axios = require('axios');
const config = require('../../config/config');
const cachedResponseService = require('./cachedResponseService');

// Create default config object if not available
const defaultConfig = {
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'deepseek/deepseek-r1-0528:free',
    retryCount: process.env.OPENROUTER_RETRY_COUNT || 3,
    retryDelay: process.env.OPENROUTER_RETRY_DELAY || 3000,
    timeout: process.env.OPENROUTER_TIMEOUT || 20000,
    alternativeModel: process.env.OPENROUTER_ALTERNATIVE_MODEL || 'google/gemini-pro:free',
    enableModelFallback: process.env.OPENROUTER_ENABLE_MODEL_FALLBACK === 'true'
  }
};

const openRouterConfig = config?.openRouter || defaultConfig.openRouter;

/**
 * Generate a response using OpenRouter AI
 * @param {string} userMessage - The user's message
 * @param {Object} context - The context for the conversation
 * @returns {Promise<string>} - The AI-generated response
 */
const generateResponse = async (userMessage, context) => {
  console.log('Generating response for:', userMessage);
  
  // Check for cached responses first
  if (process.env.USE_CACHED_RESPONSES === 'true') {
    const cachedResponse = cachedResponseService.getCachedResponse(userMessage, context.language);
    if (cachedResponse) {
      console.log('Using cached response for query:', userMessage);
      return cachedResponse;
    }
  }
  
  // Skip OpenRouter API call if configured to do so
  if (process.env.SKIP_OPENROUTER_CALLS === 'true') {
    console.log('Skipping OpenRouter API call as configured');
    
    // Return a generic response based on the language
    const language = context.language || 'th';
    
    // Check for cached fallback first
    if (userMessage.toLowerCase().includes('hiv') || 
        userMessage.toLowerCase().includes('เอชไอวี') || 
        userMessage.toLowerCase().includes('เอดส์')) {
      // Return generic HIV response
      return language === 'en' 
        ? "HIV (Human Immunodeficiency Virus) is a virus that attacks the body's immune system. With proper medical treatment, people with HIV can live long, healthy lives. Please consult a healthcare professional for specific advice."
        : "เอชไอวี (HIV) คือไวรัสที่โจมตีระบบภูมิคุ้มกันของร่างกาย ด้วยการรักษาทางการแพทย์ที่เหมาะสม ผู้มีเชื้อเอชไอวีสามารถมีชีวิตที่ยืนยาวและมีสุขภาพดีได้ โปรดปรึกษาบุคลากรทางการแพทย์สำหรับคำแนะนำเฉพาะ";
    }
    
    return language === 'en'
      ? "Thank you for your question. I'm currently experiencing technical limitations. Please try again later or rephrase your question."
      : "ขอบคุณสำหรับคำถามของคุณ ขณะนี้ระบบกำลังประสบข้อจำกัดทางเทคนิค โปรดลองอีกครั้งในภายหลังหรือถามคำถามในรูปแบบอื่น";
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
          content: message.content,
          timestamp: message.timestamp
        });
      }
    }
  }
  
  // Add current user message
  messages.push({ role: 'user', content: userMessage });
  
  // Make API request with retries
  const retryCount = parseInt(openRouterConfig.retryCount) || 3;
  const retryDelay = parseInt(openRouterConfig.retryDelay) || 3000;
  
  let useFallbackModel = false;
  let finalError = null;
  
  // Try primary model first
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const model = useFallbackModel ? openRouterConfig.alternativeModel : openRouterConfig.model;
      console.log(`OpenRouter API request attempt ${attempt}/${retryCount} using model: ${model}`);
      
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterConfig.apiKey}`,
        },
        timeout: parseInt(openRouterConfig.timeout) || 20000
      });
      
      console.log('OpenRouter API response received successfully');
      return response.data.choices[0].message.content;
    } catch (error) {
      finalError = error;
      
      if (error.response && error.response.status === 429) {
        console.error(`OpenRouter API error (attempt ${attempt}/${retryCount}): Request failed with status code 429`);
        
        // If we've tried all attempts with the primary model and model fallback is enabled, try the alternative model
        if (attempt === retryCount && !useFallbackModel && openRouterConfig.enableModelFallback === true) {
          console.log('Switching to alternative model after rate limit on primary model');
          useFallbackModel = true;
          attempt = 0; // Reset attempt counter for the alternative model
          continue;
        }
        
        // Wait before retrying
        if (attempt < retryCount || (useFallbackModel && attempt < retryCount)) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } else {
        // For other errors, log and continue retrying
        console.error(`OpenRouter API error (attempt ${attempt}/${retryCount}):`, error.message);
        
        if (attempt < retryCount) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }
  
  // If all attempts failed, use cached response as fallback
  console.error('All OpenRouter API attempts failed, using fallback response');
  
  // Try to find a cached response first
  const cachedResponse = cachedResponseService.getCachedResponse(userMessage, context.language);
  if (cachedResponse) {
    console.log('Using cached response as fallback');
    return cachedResponse;
  }
  
  // If no cached response, return a generic fallback
  return context.language === 'en'
    ? "I'm sorry, but I'm currently experiencing technical difficulties. For HIV-related questions, please consult a healthcare professional for accurate information."
    : "ขออภัย ขณะนี้ระบบกำลังประสบปัญหาทางเทคนิค สำหรับคำถามเกี่ยวกับเอชไอวี โปรดปรึกษาบุคลากรทางการแพทย์เพื่อข้อมูลที่ถูกต้อง";
};

module.exports = {
  generateResponse
};