/**
 * AI Service for Cloudflare Workers
 * Manages DeepSeek and OpenRouter API integrations with intelligent fallback
 */

import { DatabaseService } from './database.js';
import { Logger } from '../utils/logger.js';

export class AIService {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseService(env);
    this.logger = new Logger(env);
    
    // API configurations
    this.deepseekConfig = {
      endpoint: env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
      apiKey: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_API_MODEL || 'deepseek-chat',
      maxTokens: parseInt(env.DEEPSEEK_MAX_TOKENS || '2000'),
      temperature: 0.7,
      timeout: parseInt(env.AI_RESPONSE_TIMEOUT || '30000')
    };

    this.openrouterConfig = {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free',
      maxTokens: parseInt(env.DEEPSEEK_MAX_TOKENS || '2000'),
      temperature: 0.7,
      timeout: parseInt(env.AI_RESPONSE_TIMEOUT || '30000')
    };

    // Primary provider selection
    this.primaryProvider = env.PRIMARY_AI_PROVIDER || 'deepseek';
    
    // Cache settings
    this.cacheEnabled = env.ENABLE_CACHE === 'true';
    this.cacheTTL = parseInt(env.MEMORY_CACHE_TTL || '3600');

    // Response templates for fallback scenarios
    this.fallbackResponses = {
      en: [
        "I'm having trouble processing your request right now. Please try again in a moment.",
        "Sorry, I'm experiencing some technical difficulties. Could you please rephrase your question?",
        "I apologize for the inconvenience. My systems are temporarily unavailable. Please try again later."
      ],
      th: [
        "ขออภัยครับ ขณะนี้ผมมีปัญหาในการประมวลผลคำขอของคุณ กรุณาลองใหม่อีกครั้งครับ",
        "ขออภัยครับ ผมกำลังประสบปัญหาทางเทคนิค กรุณาถามใหม่อีกครั้งครับ",
        "ขออภัยสำหรับความไม่สะดวกครับ ระบบของผมไม่สามารถใช้งานได้ชั่วคราว กรุณาลองใหม่ภายหลังครับ"
      ]
    };
  }

  /**
   * Generate AI response with fallback strategy
   * @param {string} lineUserId - LINE user ID
   * @param {string} message - User message
   * @param {Object} context - Additional context
   * @returns {Object} AI response data
   */
  async generateResponse(lineUserId, message, context = {}) {
    const startTime = Date.now();
    const requestId = context.requestId || crypto.randomUUID();

    try {
      // Input validation
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message input');
      }

      // Check message length limits
      const maxLength = parseInt(this.env.MAX_MESSAGE_LENGTH || '2000');
      if (message.length > maxLength) {
        message = message.substring(0, maxLength) + '...';
      }

      this.logger.debug('Generating AI response', {
        requestId,
        lineUserId: this.maskUserId(lineUserId),
        messageLength: message.length,
        primaryProvider: this.primaryProvider,
        language: context.language || 'en'
      });

      // Generate cache key
      const cacheKey = this.generateCacheKey(message, context);
      
      // Try cache first if enabled
      if (this.cacheEnabled) {
        const cached = await this.database.getCachedResponse(cacheKey);
        if (cached) {
          this.logger.debug('Cache hit for AI response', {
            requestId,
            cacheKey: cacheKey.substring(0, 20) + '...'
          });

          return {
            ...cached,
            source: 'cache',
            processingTime: Date.now() - startTime
          };
        }
      }

      // Get user context
      const enhancedContext = await this.buildEnhancedContext(lineUserId, context);

      // Try primary provider first
      let response;
      if (this.primaryProvider === 'deepseek' && this.deepseekConfig.apiKey) {
        response = await this.tryProvider('deepseek', message, enhancedContext, requestId);
      } else if (this.primaryProvider === 'openrouter' && this.openrouterConfig.apiKey) {
        response = await this.tryProvider('openrouter', message, enhancedContext, requestId);
      } else {
        throw new Error(`Primary provider ${this.primaryProvider} not configured`);
      }

      // If primary failed, try fallback
      if (!response) {
        const fallbackProvider = this.primaryProvider === 'deepseek' ? 'openrouter' : 'deepseek';
        this.logger.warn('Primary provider failed, trying fallback', {
          requestId,
          primaryProvider: this.primaryProvider,
          fallbackProvider
        });

        response = await this.tryProvider(fallbackProvider, message, enhancedContext, requestId);
      }

      // If both providers failed, use static fallback
      if (!response) {
        response = this.getStaticFallback(enhancedContext.language || 'en');
      }

      // Cache successful response
      if (this.cacheEnabled && response && response.provider !== 'fallback') {
        const cacheResponse = { ...response };
        delete cacheResponse.processingTime;
        delete cacheResponse.requestId;
        
        await this.database.setCachedResponse(cacheKey, cacheResponse, this.cacheTTL);
      }

      const totalTime = Date.now() - startTime;
      
      this.logger.info('AI response generated', {
        requestId,
        provider: response.provider,
        confidence: response.confidence,
        intent: response.intent,
        tokensUsed: response.tokensUsed,
        processingTime: `${totalTime}ms`,
        cached: response.source === 'cache'
      });

      return {
        ...response,
        processingTime: totalTime,
        requestId
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      this.logger.error('AI response generation failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        processingTime: `${totalTime}ms`
      });

      // Return static fallback on complete failure
      return {
        ...this.getStaticFallback(context.language || 'en'),
        processingTime: totalTime,
        requestId,
        error: error.message
      };
    }
  }

  /**
   * Try specific AI provider
   * @param {string} provider - Provider name ('deepseek' or 'openrouter')
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @param {string} requestId - Request ID
   * @returns {Object|null} AI response or null if failed
   */
  async tryProvider(provider, message, context, requestId) {
    try {
      const config = provider === 'deepseek' ? this.deepseekConfig : this.openrouterConfig;
      
      if (!config.apiKey) {
        this.logger.warn(`${provider} API key not configured`, { requestId });
        return null;
      }

      this.logger.debug(`Calling ${provider} API`, {
        requestId,
        model: config.model,
        maxTokens: config.maxTokens
      });

      const response = await this.callProvider(provider, message, context, config);
      
      if (response) {
        return {
          ...response,
          provider,
          requestId
        };
      }

      return null;

    } catch (error) {
      this.logger.error(`${provider} provider failed`, {
        requestId,
        provider,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Call AI provider API
   * @param {string} provider - Provider name
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @param {Object} config - Provider configuration
   * @returns {Object} AI response
   */
  async callProvider(provider, message, context, config) {
    const messages = this.buildMessages(message, context);
    const headers = this.buildHeaders(provider, config);
    
    const requestBody = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: false
    };

    // Add provider-specific parameters
    if (provider === 'openrouter') {
      requestBody.transforms = ['middle-out'];
      requestBody.models = [config.model];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`Invalid ${provider} response structure`);
      }

      const aiResponse = data.choices[0].message.content;
      
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error(`Empty or invalid ${provider} response`);
      }

      // Extract additional metadata
      const intent = this.extractIntent(message, context.language);
      const sentiment = this.extractSentiment(message);
      const confidence = this.calculateConfidence(data, provider);

      return {
        response: aiResponse.trim(),
        tokensUsed: data.usage?.total_tokens || 0,
        confidence,
        intent,
        sentiment,
        model: config.model,
        finishReason: data.choices[0].finish_reason
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Build message array for AI API
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @returns {Array} Messages array
   */
  buildMessages(message, context) {
    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context)
      }
    ];

    // Add conversation history
    if (context.history && context.history.length > 0) {
      const historyLimit = parseInt(this.env.MAX_CONTEXT_SIZE || '7');
      const recentHistory = context.history.slice(-historyLimit);
      
      messages.push(...recentHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })));
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Build system prompt with context
   * @param {Object} context - Enhanced context
   * @returns {string} System prompt
   */
  buildSystemPrompt(context) {
    const basePrompt = context.language === 'th' 
      ? 'คุณเป็นผู้ช่วยที่มีประโยชน์สำหรับแชทบอท LINE ที่ให้การสนับสนุนลูกค้า ข้อมูลผลิตภัณฑ์ และคำแนะนำด้านสุขภาพ'
      : 'You are a helpful assistant for a LINE chatbot that provides customer support, product information, and healthcare guidance.';

    let prompt = basePrompt;

    // Add customer context
    if (context.customer) {
      const langPreference = context.language === 'th' 
        ? `ผู้ใช้ต้องการใช้ภาษา${context.customer.language === 'th' ? 'ไทย' : 'อังกฤษ'}`
        : `The user prefers ${context.customer.language === 'th' ? 'Thai' : 'English'} language.`;
      
      prompt += ` ${langPreference}`;

      if (context.customer.preferences && context.customer.preferences.length > 0) {
        const interests = context.language === 'th' 
          ? `ความสนใจของเขารวมถึง: ${context.customer.preferences.join(', ')}`
          : `Their interests include: ${context.customer.preferences.join(', ')}.`;
        prompt += ` ${interests}`;
      }
    }

    // Add behavioral guidelines
    const guidelines = context.language === 'th' 
      ? ' ตอบกลับด้วยท่าทีที่เป็นมิตรและเป็นประโยชน์เสมอ รักษาการตอบสนองให้กระชับแต่ให้ข้อมูล หากไม่แน่ใจเกี่ยวกับข้อมูลทางการแพทย์ ให้แนะนำให้ปรึกษาผู้เชี่ยวชาญ'
      : ' Always respond in a helpful, friendly manner. Keep responses concise but informative. If uncertain about medical information, recommend consulting a healthcare professional.';

    prompt += guidelines;

    return prompt;
  }

  /**
   * Build headers for API request
   * @param {string} provider - Provider name
   * @param {Object} config - Provider configuration
   * @returns {Object} Headers object
   */
  buildHeaders(provider, config) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'User-Agent': 'LINE-Bot-Cloudflare-Workers/1.0'
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://line-chatbot.workers.dev';
      headers['X-Title'] = 'LINE Chatbot';
    }

    return headers;
  }

  /**
   * Build enhanced context for AI generation
   * @param {string} lineUserId - LINE user ID
   * @param {Object} baseContext - Base context
   * @returns {Object} Enhanced context
   */
  async buildEnhancedContext(lineUserId, baseContext) {
    try {
      const customer = await this.database.getCustomer(lineUserId);
      const conversationHistory = await this.database.getConversationHistory(lineUserId, 5);

      return {
        ...baseContext,
        customer: customer ? {
          preferences: customer.preferences || [],
          language: customer.language || 'en',
          analytics: customer.analytics || {}
        } : null,
        history: conversationHistory || [],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to build enhanced context', {
        error: error.message,
        lineUserId: this.maskUserId(lineUserId)
      });

      return {
        ...baseContext,
        customer: null,
        history: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract intent from message
   * @param {string} message - User message
   * @param {string} language - Message language
   * @returns {string} Detected intent
   */
  extractIntent(message, language = 'en') {
    const lowerMessage = message.toLowerCase();

    // Define intent patterns for both languages
    const intentPatterns = {
      product_inquiry: {
        en: ['product', 'buy', 'purchase', 'price', 'cost', 'order', 'catalog'],
        th: ['สินค้า', 'ซื้อ', 'ราคา', 'ค่าใช้จ่าย', 'สั่ง', 'แคตตาล็อก']
      },
      health_inquiry: {
        en: ['health', 'medical', 'doctor', 'symptom', 'pain', 'medicine'],
        th: ['สุขภาพ', 'แพทย์', 'หมอ', 'อาการ', 'ปวด', 'ยา']
      },
      greeting: {
        en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        th: ['สวัสดี', 'หวัดดี', 'ดีครับ', 'ดีค่ะ']
      },
      help_request: {
        en: ['help', 'support', 'assist', 'problem', 'issue'],
        th: ['ช่วย', 'สนับสนุน', 'ช่วยเหลือ', 'ปัญหา', 'เรื่อง']
      }
    };

    // Check each intent
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const relevantPatterns = patterns[language] || patterns.en;
      
      if (relevantPatterns.some(pattern => lowerMessage.includes(pattern))) {
        return intent;
      }
    }

    return 'general_inquiry';
  }

  /**
   * Extract sentiment from message
   * @param {string} message - User message
   * @returns {string} Detected sentiment
   */
  extractSentiment(message) {
    const lowerMessage = message.toLowerCase();

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'thank', 'ดี', 'เยี่ยม', 'ขอบคุณ'];
    const negativeWords = ['bad', 'terrible', 'problem', 'issue', 'angry', 'แย่', 'ปัญหา', 'โกรธ'];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate confidence score
   * @param {Object} apiResponse - API response data
   * @param {string} provider - Provider name
   * @returns {number} Confidence score
   */
  calculateConfidence(apiResponse, provider) {
    let baseConfidence = provider === 'deepseek' ? 0.9 : 0.8;

    // Adjust based on finish reason
    if (apiResponse.choices?.[0]?.finish_reason === 'length') {
      baseConfidence -= 0.1;
    } else if (apiResponse.choices?.[0]?.finish_reason === 'stop') {
      baseConfidence += 0.05;
    }

    // Adjust based on response length
    const responseText = apiResponse.choices?.[0]?.message?.content || '';
    if (responseText.length < 10) {
      baseConfidence -= 0.2;
    } else if (responseText.length > 500) {
      baseConfidence += 0.05;
    }

    return Math.max(0.1, Math.min(1.0, baseConfidence));
  }

  /**
   * Generate cache key for response
   * @param {string} message - User message
   * @param {Object} context - Request context
   * @returns {string} Cache key
   */
  generateCacheKey(message, context) {
    const keyComponents = [
      'ai',
      context.language || 'en',
      this.primaryProvider,
      this.hashMessage(message)
    ];

    return keyComponents.join(':');
  }

  /**
   * Hash message for caching
   * @param {string} message - Message to hash
   * @returns {string} Message hash
   */
  hashMessage(message) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get static fallback response
   * @param {string} language - Response language
   * @returns {Object} Fallback response
   */
  getStaticFallback(language = 'en') {
    const responses = this.fallbackResponses[language] || this.fallbackResponses.en;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      response: randomResponse,
      provider: 'fallback',
      confidence: 0.1,
      intent: 'error_fallback',
      sentiment: 'neutral',
      tokensUsed: 0,
      finishReason: 'fallback'
    };
  }

  /**
   * Mask user ID for privacy in logs
   * @param {string} userId - User ID
   * @returns {string} Masked user ID
   */
  maskUserId(userId) {
    if (!userId || userId.length < 8) return 'unknown';
    return userId.substring(0, 5) + '***' + userId.substring(userId.length - 3);
  }

  /**
   * Get AI service statistics
   * @returns {Object} Service statistics
   */
  getStatistics() {
    return {
      primaryProvider: this.primaryProvider,
      cacheEnabled: this.cacheEnabled,
      providers: {
        deepseek: {
          configured: !!this.deepseekConfig.apiKey,
          model: this.deepseekConfig.model,
          maxTokens: this.deepseekConfig.maxTokens
        },
        openrouter: {
          configured: !!this.openrouterConfig.apiKey,
          model: this.openrouterConfig.model,
          maxTokens: this.openrouterConfig.maxTokens
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}