/**
 * Enhanced AI Service for Cloudflare Workers
 * Advanced AI integration with intelligent routing, caching, and performance optimization
 */

import { DatabaseService } from './database.js';
import { Logger } from '../utils/logger.js';
import { PerformanceOptimizer } from '../utils/performance.js';

export class EnhancedAIService {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseService(env);
    this.logger = new Logger(env);
    this.performance = new PerformanceOptimizer(env);
    
    // AI Provider configurations
    this.providers = {
      deepseek: {
        endpoint: env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
        apiKey: env.DEEPSEEK_API_KEY,
        model: env.DEEPSEEK_API_MODEL || 'deepseek-chat',
        maxTokens: parseInt(env.DEEPSEEK_MAX_TOKENS || '2000'),
        temperature: 0.7,
        priority: 1,
        costPerToken: 0.00001, // Mock cost
        reliability: 0.95
      },
      openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free',
        maxTokens: parseInt(env.DEEPSEEK_MAX_TOKENS || '2000'),
        temperature: 0.7,
        priority: 2,
        costPerToken: 0,
        reliability: 0.90
      }
    };

    // Primary provider selection
    this.primaryProvider = env.PRIMARY_AI_PROVIDER || 'deepseek';
    
    // Advanced caching configuration
    this.cacheConfig = {
      enabled: env.ENABLE_CACHE === 'true',
      ttl: parseInt(env.CACHE_TTL || '3600'),
      keyStrategy: 'semantic', // 'exact', 'semantic', 'contextual'
      compressionEnabled: true,
      intelligentEviction: true
    };

    // Circuit breaker for provider health monitoring
    this.circuitBreakers = new Map();
    this.initializeCircuitBreakers();

    // Response quality metrics
    this.qualityMetrics = {
      minConfidenceThreshold: 0.7,
      maxResponseTime: parseInt(env.AI_RESPONSE_TIMEOUT || '30000'),
      enableQualityScoring: true,
      adaptiveTimeout: true
    };

    // Initialize resource pools
    this.initializeResourcePools();
  }

  /**
   * Enhanced response generation with intelligent routing
   * @param {string} lineUserId - LINE user ID
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @returns {Object} AI response with metadata
   */
  async generateResponse(lineUserId, message, context = {}) {
    const startTime = Date.now();
    const requestId = context.requestId || crypto.randomUUID();

    return await this.performance.monitor('ai_response_generation', async () => {
      try {
        // Input validation and preprocessing
        const processedInput = await this.preprocessInput(message, context);
        
        // Intelligent caching with semantic similarity
        if (this.cacheConfig.enabled) {
          const cachedResponse = await this.getSemanticCachedResponse(
            processedInput.message, 
            context
          );
          
          if (cachedResponse) {
            this.logger.debug('Semantic cache hit', {
              requestId,
              similarityScore: cachedResponse.similarityScore
            });
            
            return {
              ...cachedResponse.response,
              source: 'semantic_cache',
              processingTime: Date.now() - startTime,
              requestId
            };
          }
        }

        // Build enhanced context with user analytics
        const enhancedContext = await this.buildAdvancedContext(
          lineUserId, 
          processedInput, 
          context
        );

        // Intelligent provider selection
        const selectedProvider = await this.selectOptimalProvider(
          processedInput,
          enhancedContext
        );

        // Generate response with fallback chain
        const response = await this.generateWithFallback(
          selectedProvider,
          processedInput.message,
          enhancedContext,
          requestId
        );

        // Post-process and enhance response
        const enhancedResponse = await this.enhanceResponse(
          response,
          enhancedContext,
          requestId
        );

        // Cache successful responses with intelligent strategy
        if (this.cacheConfig.enabled && enhancedResponse.confidence > 0.8) {
          await this.cacheResponseIntelligently(
            processedInput.message,
            enhancedResponse,
            context
          );
        }

        // Update provider performance metrics
        await this.updateProviderMetrics(
          selectedProvider,
          enhancedResponse,
          Date.now() - startTime
        );

        return {
          ...enhancedResponse,
          processingTime: Date.now() - startTime,
          requestId,
          providerChain: response.providerChain || [selectedProvider]
        };

      } catch (error) {
        this.logger.error('AI response generation failed', {
          requestId,
          error: error.message,
          stack: error.stack,
          processingTime: Date.now() - startTime
        });

        // Return intelligent fallback
        return await this.getIntelligentFallback(
          message,
          context,
          error,
          requestId
        );
      }
    });
  }

  /**
   * Preprocess input with NLP enhancements
   * @param {string} message - Raw user message
   * @param {Object} context - Request context
   * @returns {Object} Processed input data
   */
  async preprocessInput(message, context) {
    // Input sanitization
    const sanitized = message.trim().replace(/[\\x00-\\x1f\\x7f-\\x9f]/g, '');
    
    // Length validation
    const maxLength = parseInt(this.env.MAX_MESSAGE_LENGTH || '2000');
    const processed = sanitized.length > maxLength 
      ? sanitized.substring(0, maxLength) + '...'
      : sanitized;

    // Language detection with confidence
    const language = this.detectLanguageAdvanced(processed);
    
    // Intent classification
    const intent = await this.classifyIntent(processed, language.code);
    
    // Sentiment analysis
    const sentiment = this.analyzeSentiment(processed, language.code);
    
    // Entity extraction
    const entities = this.extractEntities(processed, language.code);

    return {
      message: processed,
      original: message,
      metadata: {
        language,
        intent,
        sentiment,
        entities,
        length: processed.length,
        complexity: this.calculateMessageComplexity(processed)
      }
    };
  }

  /**
   * Build advanced context with user behavior analysis
   * @param {string} lineUserId - User ID
   * @param {Object} processedInput - Processed input data
   * @param {Object} baseContext - Base context
   * @returns {Object} Enhanced context
   */
  async buildAdvancedContext(lineUserId, processedInput, baseContext) {
    try {
      // Get user data and conversation history
      const [customer, conversationHistory, userBehavior] = await Promise.all([
        this.database.getCustomer(lineUserId),
        this.database.getConversationHistory(lineUserId, 10),
        this.analyzeUserBehavior(lineUserId)
      ]);

      // Build conversation context with relevance scoring
      const contextualHistory = this.scoreConversationRelevance(
        conversationHistory,
        processedInput.metadata.intent
      );

      // Generate dynamic system prompt
      const systemPrompt = this.generateDynamicSystemPrompt({
        customer,
        userBehavior,
        messageMetadata: processedInput.metadata,
        conversationPattern: this.analyzeConversationPattern(contextualHistory)
      });

      return {
        ...baseContext,
        customer: customer ? {
          id: customer.lineUserId,
          preferences: customer.preferences || [],
          language: customer.language || 'en',
          analytics: customer.analytics || {},
          behaviorProfile: userBehavior
        } : null,
        conversation: {
          history: contextualHistory,
          sessionLength: contextualHistory.length,
          averageResponseTime: this.calculateAverageResponseTime(contextualHistory),
          topicContinuity: this.calculateTopicContinuity(contextualHistory)
        },
        message: processedInput.metadata,
        systemPrompt,
        timestamp: new Date().toISOString(),
        requestMetadata: {
          complexityScore: this.calculateContextComplexity(processedInput, conversationHistory),
          priorityLevel: this.determinePriorityLevel(customer, processedInput),
          expectedResponseType: this.predictResponseType(processedInput, contextualHistory)
        }
      };

    } catch (error) {
      this.logger.error('Failed to build advanced context', {
        error: error.message,
        lineUserId: this.maskUserId(lineUserId)
      });

      // Return simplified context on error
      return {
        ...baseContext,
        customer: null,
        conversation: { history: [], sessionLength: 0 },
        message: processedInput.metadata,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Intelligent provider selection based on context and performance
   * @param {Object} processedInput - Processed input
   * @param {Object} context - Enhanced context
   * @returns {string} Selected provider name
   */
  async selectOptimalProvider(processedInput, context) {
    const selectionFactors = {
      messageComplexity: processedInput.metadata.complexity,
      conversationLength: context.conversation?.sessionLength || 0,
      userPriority: context.requestMetadata?.priorityLevel || 'normal',
      providerHealth: await this.getProviderHealthScores(),
      costConstraints: this.getCostConstraints(),
      responseTimeRequirement: this.getResponseTimeRequirement(context)
    };

    // Score each available provider
    const providerScores = {};
    
    for (const [providerName, config] of Object.entries(this.providers)) {
      if (!config.apiKey) continue;
      
      const circuitBreaker = this.circuitBreakers.get(providerName);
      if (circuitBreaker?.state === 'open') continue;

      providerScores[providerName] = this.calculateProviderScore(
        providerName,
        config,
        selectionFactors
      );
    }

    // Select provider with highest score
    const selectedProvider = Object.entries(providerScores)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || this.primaryProvider;

    this.logger.debug('Provider selected', {
      selectedProvider,
      scores: providerScores,
      factors: selectionFactors
    });

    return selectedProvider;
  }

  /**
   * Generate response with intelligent fallback chain
   * @param {string} primaryProvider - Primary provider to try
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @param {string} requestId - Request ID
   * @returns {Object} AI response
   */
  async generateWithFallback(primaryProvider, message, context, requestId) {
    const providerChain = [primaryProvider];
    const fallbackProviders = Object.keys(this.providers)
      .filter(p => p !== primaryProvider && this.providers[p].apiKey)
      .sort((a, b) => this.providers[a].priority - this.providers[b].priority);

    providerChain.push(...fallbackProviders);

    for (const provider of providerChain) {
      try {
        const circuitBreaker = this.circuitBreakers.get(provider);
        
        // Skip if circuit breaker is open
        if (circuitBreaker?.state === 'open') {
          continue;
        }

        this.logger.debug(`Attempting ${provider} provider`, { requestId });

        const response = await this.performance.adaptiveTimeout(
          (signal) => this.callProvider(provider, message, context, signal),
          {
            initialTimeout: this.getAdaptiveTimeout(provider, context),
            maxRetries: provider === primaryProvider ? 2 : 1
          }
        );

        if (response && this.validateResponse(response, context)) {
          // Record successful call
          circuitBreaker?.recordSuccess();
          
          return {
            ...response,
            provider,
            providerChain: [provider],
            fallbackUsed: provider !== primaryProvider
          };
        }

      } catch (error) {
        this.logger.warn(`${provider} provider failed`, {
          requestId,
          error: error.message
        });

        // Record failure in circuit breaker
        this.circuitBreakers.get(provider)?.recordFailure();
        
        // Continue to next provider
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  /**
   * Call specific AI provider with optimized requests
   * @param {string} provider - Provider name
   * @param {string} message - User message
   * @param {Object} context - Enhanced context
   * @param {AbortSignal} signal - Abort signal
   * @returns {Object} Provider response
   */
  async callProvider(provider, message, context, signal) {
    const config = this.providers[provider];
    const messages = this.buildOptimizedMessages(message, context, provider);
    const headers = this.buildProviderHeaders(provider, config);
    
    const requestBody = {
      model: config.model,
      messages,
      max_tokens: this.calculateOptimalTokens(context, config),
      temperature: this.calculateOptimalTemperature(context, provider),
      stream: false,
      ...this.getProviderSpecificParams(provider, context)
    };

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.choices?.[0]?.message?.content) {
      throw new Error(`Invalid ${provider} response structure`);
    }

    const aiResponse = data.choices[0].message.content.trim();
    
    return {
      response: aiResponse,
      tokensUsed: data.usage?.total_tokens || 0,
      model: config.model,
      finishReason: data.choices[0].finish_reason,
      confidence: this.calculateResponseConfidence(data, provider, context),
      quality: this.assessResponseQuality(aiResponse, context),
      rawData: this.env.ENVIRONMENT === 'development' ? data : undefined
    };
  }

  /**
   * Enhance response with post-processing
   * @param {Object} response - Raw AI response
   * @param {Object} context - Enhanced context
   * @param {string} requestId - Request ID
   * @returns {Object} Enhanced response
   */
  async enhanceResponse(response, context, requestId) {
    try {
      // Intent alignment check
      const intentAlignment = this.checkIntentAlignment(
        response.response,
        context.message.intent
      );

      // Language consistency check
      const languageConsistent = this.checkLanguageConsistency(
        response.response,
        context.customer?.language || context.message.language?.code
      );

      // Content safety check
      const safetyCheck = await this.checkContentSafety(response.response);

      // Response personalization
      const personalizedResponse = this.personalizeResponse(
        response.response,
        context.customer,
        context.message
      );

      // Extract actionable items
      const actionItems = this.extractActionItems(personalizedResponse);

      return {
        response: personalizedResponse,
        provider: response.provider,
        tokensUsed: response.tokensUsed,
        confidence: this.calculateFinalConfidence(response, {
          intentAlignment,
          languageConsistent,
          safetyCheck
        }),
        intent: context.message.intent.predicted,
        sentiment: this.analyzeSentiment(personalizedResponse),
        quality: {
          ...response.quality,
          intentAlignment,
          languageConsistent,
          safetyCheck,
          personalizationApplied: personalizedResponse !== response.response
        },
        metadata: {
          actionItems,
          recommendedFollowUp: this.generateFollowUpSuggestions(context),
          estimatedReadTime: Math.ceil(personalizedResponse.length / 200), // words per minute
          responseCategory: this.categorizeResponse(personalizedResponse, context)
        },
        model: response.model,
        finishReason: response.finishReason
      };

    } catch (error) {
      this.logger.error('Response enhancement failed', {
        requestId,
        error: error.message
      });

      // Return basic enhanced response
      return {
        ...response,
        confidence: response.confidence || 0.7,
        intent: context.message?.intent?.predicted || 'general_inquiry',
        sentiment: 'neutral',
        quality: { basic: true }
      };
    }
  }

  // Advanced helper methods
  detectLanguageAdvanced(text) {
    const patterns = {
      th: /[\u0E00-\u0E7F]/,
      en: /[a-zA-Z]/,
      zh: /[\u4e00-\u9fff]/,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/
    };

    const scores = {};
    let totalChars = text.length;

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(new RegExp(pattern.source, 'g')) || [];
      scores[lang] = matches.length / totalChars;
    }

    const detected = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      code: detected?.[0] || 'en',
      confidence: detected?.[1] || 0.5,
      fallback: 'en'
    };
  }

  async classifyIntent(message, language) {
    const patterns = {
      product_inquiry: {
        en: ['product', 'buy', 'purchase', 'price', 'cost', 'order', 'catalog', 'item'],
        th: ['สินค้า', 'ซื้อ', 'ราคา', 'ค่าใช้จ่าย', 'สั่ง', 'แคตตาล็อก', 'รายการ']
      },
      health_inquiry: {
        en: ['health', 'medical', 'doctor', 'symptom', 'pain', 'medicine', 'treatment'],
        th: ['สุขภาพ', 'แพทย์', 'หมอ', 'อาการ', 'ปวด', 'ยา', 'การรักษา']
      },
      support_request: {
        en: ['help', 'support', 'assist', 'problem', 'issue', 'trouble'],
        th: ['ช่วย', 'สนับสนุน', 'ช่วยเหลือ', 'ปัญหา', 'เรื่อง', 'ลำบาก']
      },
      greeting: {
        en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'greetings'],
        th: ['สวัสดี', 'หวัดดี', 'ดีครับ', 'ดีค่ะ', 'สวัสดีตอนเช้า']
      }
    };

    const lowerMessage = message.toLowerCase();
    const scores = {};

    for (const [intent, langPatterns] of Object.entries(patterns)) {
      const relevantPatterns = langPatterns[language] || langPatterns.en;
      const matches = relevantPatterns.filter(pattern => 
        lowerMessage.includes(pattern.toLowerCase())
      ).length;
      
      scores[intent] = matches / relevantPatterns.length;
    }

    const predicted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      predicted: predicted?.[0] || 'general_inquiry',
      confidence: predicted?.[1] || 0.1,
      allScores: scores
    };
  }

  initializeCircuitBreakers() {
    for (const provider of Object.keys(this.providers)) {
      this.circuitBreakers.set(provider, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000
      }));
    }
  }

  initializeResourcePools() {
    // Create connection pools for AI providers
    this.performance.createResourcePool('ai_connections', async () => {
      return {
        id: crypto.randomUUID(),
        created: Date.now(),
        connections: new Map()
      };
    }, {
      maxSize: 5,
      minSize: 1,
      idleTimeout: 300000
    });
  }

  maskUserId(userId) {
    if (!userId || userId.length < 8) return 'unknown';
    return userId.substring(0, 5) + '***' + userId.substring(userId.length - 3);
  }

  // ... Additional helper methods would be implemented here
  // (Due to length constraints, showing key methods only)
}

/**
 * Circuit Breaker implementation for provider health monitoring
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 300000;
    
    this.state = 'closed'; // closed, open, half-open
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  recordSuccess() {
    this.failures = 0;
    this.successCount++;
    
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  canExecute() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // half-open
  }
}

export default EnhancedAIService;