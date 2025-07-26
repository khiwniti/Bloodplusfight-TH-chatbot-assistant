/**
 * LINE Webhook Handler for Cloudflare Workers
 * Processes LINE Bot API events with edge-optimized performance
 */

import { AIService } from '../services/ai.js';
import { DatabaseService } from '../services/database.js';
import { Logger } from '../utils/logger.js';

export class WebhookHandler {
  constructor(env, requestId) {
    this.env = env;
    this.requestId = requestId;
    this.database = new DatabaseService(env);
    this.aiService = new AIService(env);
    this.logger = new Logger(env);
    
    this.lineConfig = {
      channelAccessToken: env.CHANNEL_ACCESS_TOKEN,
      channelSecret: env.CHANNEL_SECRET,
      replyEndpoint: 'https://api.line.me/v2/bot/message/reply',
      profileEndpoint: 'https://api.line.me/v2/bot/profile'
    };

    // Response templates
    this.templates = {
      welcome: {
        en: 'Hello! Welcome to our chatbot service 🎉\n\nI can help you with:\n• Product information\n• Health advice\n• General questions\n\nHow can I assist you today?',
        th: 'สวัสดีครับ! ยินดีต้อนรับสู่บริการแชทบอทของเรา 🎉\n\nผมสามารถช่วยเหลือคุณเรื่อง:\n• ข้อมูลสินค้า\n• คำแนะนำด้านสุขภาพ\n• คำถามทั่วไป\n\nมีอะไรให้ช่วยไหมครับ?'
      },
      unsupported: {
        en: 'Sorry, I can only process text messages at the moment. Please send me a text message and I\'ll be happy to help!',
        th: 'ขออภัยครับ ตอนนี้ผมสามารถประมวลผลข้อความแบบข้อความเท่านั้น กรุณาส่งข้อความมาแล้วผมจะช่วยเหลือคุณครับ!'
      },
      error: {
        en: 'I apologize, but I\'m experiencing some difficulties right now. Please try again in a moment.',
        th: 'ขออภัยครับ ขณะนี้ผมมีปัญหาทางเทคนิค กรุณาลองใหม่อีกครั้งในอีกสักครู่ครับ'
      }
    };
  }

  /**
   * Main webhook handler
   * @param {Request} request - HTTP request
   * @param {Object} ctx - Execution context
   * @returns {Response} HTTP response
   */
  async handle(request, ctx) {
    const startTime = Date.now();

    try {
      // Verify LINE signature
      const signature = request.headers.get('x-line-signature');
      const body = await request.text();

      this.logger.debug('Webhook request received', {
        requestId: this.requestId,
        hasSignature: !!signature,
        bodyLength: body.length
      });

      if (!this.verifySignature(body, signature)) {
        this.logger.warn('Invalid LINE signature', {
          requestId: this.requestId,
          signature: signature?.substring(0, 10) + '...'
        });

        return new Response(JSON.stringify({
          error: 'Invalid signature'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse LINE events
      let events;
      try {
        const payload = JSON.parse(body);
        events = payload.events || [];
      } catch (error) {
        this.logger.error('Invalid JSON payload', {
          requestId: this.requestId,
          error: error.message
        });

        return new Response(JSON.stringify({
          error: 'Invalid JSON payload'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Processing LINE events', {
        requestId: this.requestId,
        eventCount: events.length
      });

      // Process events in parallel for better performance
      const eventPromises = events.map(event => 
        this.handleEvent(event).catch(error => {
          this.logger.error('Event processing failed', {
            requestId: this.requestId,
            eventType: event.type,
            error: error.message
          });
          return null;
        })
      );

      // Wait for all events to process
      await Promise.all(eventPromises);

      const duration = Date.now() - startTime;
      this.logger.info('Webhook processing completed', {
        requestId: this.requestId,
        duration: `${duration}ms`,
        eventsProcessed: events.length
      });

      return new Response('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Request-ID': this.requestId,
          'X-Processing-Time': `${duration}ms`
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Webhook handler error', {
        requestId: this.requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      return new Response(JSON.stringify({
        error: 'Internal server error',
        requestId: this.requestId
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.requestId,
          'X-Processing-Time': `${duration}ms`
        }
      });
    }
  }

  /**
   * Handle individual LINE event
   * @param {Object} event - LINE event object
   */
  async handleEvent(event) {
    const eventStartTime = Date.now();

    try {
      this.logger.debug('Processing event', {
        requestId: this.requestId,
        eventType: event.type,
        timestamp: event.timestamp,
        hasReplyToken: !!event.replyToken
      });

      switch (event.type) {
        case 'message':
          await this.handleMessage(event);
          break;
        case 'follow':
          await this.handleFollow(event);
          break;
        case 'unfollow':
          await this.handleUnfollow(event);
          break;
        case 'postback':
          await this.handlePostback(event);
          break;
        default:
          this.logger.info('Unhandled event type', {
            requestId: this.requestId,
            eventType: event.type
          });
      }

      const duration = Date.now() - eventStartTime;
      this.logger.debug('Event processed successfully', {
        requestId: this.requestId,
        eventType: event.type,
        duration: `${duration}ms`
      });

    } catch (error) {
      this.logger.error('Event handling error', {
        requestId: this.requestId,
        eventType: event.type,
        error: error.message,
        stack: error.stack
      });

      // Try to send error message if we have a reply token
      if (event.replyToken) {
        try {
          await this.sendErrorMessage(event.replyToken, event.source?.userId);
        } catch (replyError) {
          this.logger.error('Failed to send error message', {
            requestId: this.requestId,
            error: replyError.message
          });
        }
      }
    }
  }

  /**
   * Handle message events
   * @param {Object} event - LINE message event
   */
  async handleMessage(event) {
    const { source, message, replyToken } = event;
    const lineUserId = source.userId;

    if (!lineUserId) {
      this.logger.warn('Message event missing user ID', {
        requestId: this.requestId,
        sourceType: source.type
      });
      return;
    }

    // Handle non-text messages
    if (message.type !== 'text') {
      const language = await this.getUserLanguage(lineUserId);
      await this.replyToLine(replyToken, {
        type: 'text',
        text: this.templates.unsupported[language] || this.templates.unsupported.en
      });
      return;
    }

    const messageText = message.text.trim();
    
    if (!messageText) {
      this.logger.warn('Empty message received', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId)
      });
      return;
    }

    this.logger.info('Processing text message', {
      requestId: this.requestId,
      lineUserId: this.maskUserId(lineUserId),
      messageLength: messageText.length,
      messageType: message.type
    });

    // Get or create customer
    let customer = await this.database.getCustomer(lineUserId);
    if (!customer) {
      const profile = await this.getLineProfile(lineUserId);
      customer = await this.database.createCustomer({
        lineUserId,
        displayName: profile?.displayName || 'Customer',
        language: this.detectLanguage(messageText, profile?.language)
      });

      this.logger.info('New customer created', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId),
        language: customer.language
      });
    }

    // Get or create conversation
    let conversation = await this.database.getActiveConversation(lineUserId);
    if (!conversation) {
      conversation = await this.database.createConversation(lineUserId, customer.language);
      
      this.logger.info('New conversation created', {
        requestId: this.requestId,
        conversationId: conversation.id,
        language: conversation.language
      });
    }

    // Add user message to conversation
    const userMessageId = await this.database.addMessage(
      conversation.id, 
      'user', 
      messageText, 
      {
        messageId: message.id,
        timestamp: event.timestamp,
        requestId: this.requestId
      }
    );

    // Generate AI response
    const aiStartTime = Date.now();
    const aiResponse = await this.aiService.generateResponse(lineUserId, messageText, {
      language: customer.language,
      conversationId: conversation.id,
      requestId: this.requestId
    });

    const aiDuration = Date.now() - aiStartTime;
    
    this.logger.info('AI response generated', {
      requestId: this.requestId,
      provider: aiResponse.provider,
      confidence: aiResponse.confidence,
      intent: aiResponse.intent,
      tokensUsed: aiResponse.tokensUsed,
      duration: `${aiDuration}ms`
    });

    // Add AI response to conversation
    await this.database.addMessage(
      conversation.id, 
      'assistant', 
      aiResponse.response, 
      {
        provider: aiResponse.provider,
        confidence: aiResponse.confidence,
        intent: aiResponse.intent,
        tokensUsed: aiResponse.tokensUsed,
        processingTime: aiDuration,
        requestId: this.requestId
      }
    );

    // Send response to LINE
    await this.replyToLine(replyToken, {
      type: 'text',
      text: aiResponse.response
    });

    // Update customer analytics asynchronously
    this.updateCustomerAnalytics(customer, aiResponse, messageText);
  }

  /**
   * Handle follow events (user adds bot as friend)
   * @param {Object} event - LINE follow event
   */
  async handleFollow(event) {
    const lineUserId = event.source.userId;

    this.logger.info('User followed bot', {
      requestId: this.requestId,
      lineUserId: this.maskUserId(lineUserId)
    });

    try {
      // Get user profile
      const profile = await this.getLineProfile(lineUserId);
      
      // Create customer record
      const customer = await this.database.createCustomer({
        lineUserId,
        displayName: profile?.displayName || 'Customer',
        language: profile?.language || 'en'
      });

      // Send welcome message
      const welcomeText = this.templates.welcome[customer.language] || this.templates.welcome.en;
      
      await this.replyToLine(event.replyToken, {
        type: 'text',
        text: welcomeText
      });

      this.logger.info('Welcome message sent', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId),
        language: customer.language
      });

    } catch (error) {
      this.logger.error('Follow event handling failed', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId),
        error: error.message
      });
    }
  }

  /**
   * Handle unfollow events (user removes bot)
   * @param {Object} event - LINE unfollow event
   */
  async handleUnfollow(event) {
    const lineUserId = event.source.userId;

    this.logger.info('User unfollowed bot', {
      requestId: this.requestId,
      lineUserId: this.maskUserId(lineUserId)
    });

    try {
      // Update customer analytics (don't delete data for potential re-follow)
      const customer = await this.database.getCustomer(lineUserId);
      if (customer) {
        await this.database.updateCustomer(lineUserId, {
          analytics: {
            ...customer.analytics,
            unfollowedAt: new Date().toISOString(),
            unfollowReason: 'user_initiated'
          }
        });

        // End active conversations
        const conversation = await this.database.getActiveConversation(lineUserId);
        if (conversation) {
          await this.database.endConversation(conversation.id);
        }
      }

    } catch (error) {
      this.logger.error('Unfollow event handling failed', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId),
        error: error.message
      });
    }
  }

  /**
   * Handle postback events (from interactive elements)
   * @param {Object} event - LINE postback event
   */
  async handlePostback(event) {
    const { source, postback, replyToken } = event;
    const lineUserId = source.userId;

    this.logger.info('Postback event received', {
      requestId: this.requestId,
      lineUserId: this.maskUserId(lineUserId),
      data: postback.data
    });

    try {
      // Parse postback data
      const postbackData = JSON.parse(postback.data);
      
      switch (postbackData.action) {
        case 'product_inquiry':
          await this.handleProductInquiry(lineUserId, postbackData.productId, replyToken);
          break;
        case 'language_change':
          await this.handleLanguageChange(lineUserId, postbackData.language, replyToken);
          break;
        default:
          this.logger.warn('Unknown postback action', {
            requestId: this.requestId,
            action: postbackData.action
          });
      }

    } catch (error) {
      this.logger.error('Postback handling failed', {
        requestId: this.requestId,
        error: error.message
      });

      await this.sendErrorMessage(replyToken, lineUserId);
    }
  }

  /**
   * Handle product inquiry postback
   * @param {string} lineUserId - LINE user ID
   * @param {string} productId - Product ID
   * @param {string} replyToken - Reply token
   */
  async handleProductInquiry(lineUserId, productId, replyToken) {
    try {
      const product = await this.database.getProduct(productId);
      
      if (!product) {
        const language = await this.getUserLanguage(lineUserId);
        const message = language === 'th' 
          ? 'ขออภัยครับ ไม่พบข้อมูลสินค้าที่คุณต้องการ'
          : 'Sorry, the requested product was not found.';
          
        await this.replyToLine(replyToken, {
          type: 'text',
          text: message
        });
        return;
      }

      const language = await this.getUserLanguage(lineUserId);
      const productInfo = this.formatProductInfo(product, language);

      await this.replyToLine(replyToken, {
        type: 'text',
        text: productInfo
      });

    } catch (error) {
      this.logger.error('Product inquiry failed', {
        requestId: this.requestId,
        productId,
        error: error.message
      });
    }
  }

  /**
   * Handle language change postback
   * @param {string} lineUserId - LINE user ID
   * @param {string} language - New language
   * @param {string} replyToken - Reply token
   */
  async handleLanguageChange(lineUserId, language, replyToken) {
    try {
      await this.database.updateCustomer(lineUserId, { language });

      const message = language === 'th' 
        ? 'ตั้งค่าภาษาเป็นภาษาไทยเรียบร้อยแล้วครับ'
        : 'Language has been set to English successfully.';

      await this.replyToLine(replyToken, {
        type: 'text',
        text: message
      });

    } catch (error) {
      this.logger.error('Language change failed', {
        requestId: this.requestId,
        language,
        error: error.message
      });
    }
  }

  /**
   * Get LINE user profile
   * @param {string} lineUserId - LINE user ID
   * @returns {Object|null} User profile
   */
  async getLineProfile(lineUserId) {
    try {
      const response = await fetch(`${this.lineConfig.profileEndpoint}/${lineUserId}`, {
        headers: {
          'Authorization': `Bearer ${this.lineConfig.channelAccessToken}`,
          'User-Agent': 'LINE-Bot-SDK-Cloudflare-Workers/1.0'
        }
      });

      if (response.ok) {
        const profile = await response.json();
        
        this.logger.debug('LINE profile retrieved', {
          requestId: this.requestId,
          lineUserId: this.maskUserId(lineUserId),
          hasDisplayName: !!profile.displayName
        });

        return profile;
      } else {
        this.logger.warn('Failed to get LINE profile', {
          requestId: this.requestId,
          lineUserId: this.maskUserId(lineUserId),
          status: response.status
        });
      }
    } catch (error) {
      this.logger.error('LINE profile request failed', {
        requestId: this.requestId,
        lineUserId: this.maskUserId(lineUserId),
        error: error.message
      });
    }

    return null;
  }

  /**
   * Send reply message to LINE
   * @param {string} replyToken - Reply token
   * @param {Object} message - Message object
   */
  async replyToLine(replyToken, message) {
    try {
      const response = await fetch(this.lineConfig.replyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.lineConfig.channelAccessToken}`,
          'User-Agent': 'LINE-Bot-SDK-Cloudflare-Workers/1.0'
        },
        body: JSON.stringify({
          replyToken,
          messages: [message]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LINE API error: ${response.status} - ${errorText}`);
      }

      this.logger.debug('Reply sent to LINE', {
        requestId: this.requestId,
        messageType: message.type,
        replyToken: replyToken.substring(0, 10) + '...'
      });

    } catch (error) {
      this.logger.error('Failed to reply to LINE', {
        requestId: this.requestId,
        error: error.message,
        replyToken: replyToken.substring(0, 10) + '...'
      });
      throw error;
    }
  }

  /**
   * Send error message to user
   * @param {string} replyToken - Reply token
   * @param {string} lineUserId - LINE user ID
   */
  async sendErrorMessage(replyToken, lineUserId) {
    try {
      const language = await this.getUserLanguage(lineUserId);
      const errorText = this.templates.error[language] || this.templates.error.en;

      await this.replyToLine(replyToken, {
        type: 'text',
        text: errorText
      });
    } catch (error) {
      this.logger.error('Failed to send error message', {
        requestId: this.requestId,
        error: error.message
      });
    }
  }

  /**
   * Verify LINE webhook signature
   * @param {string} body - Request body
   * @param {string} signature - X-Line-Signature header
   * @returns {boolean} Signature is valid
   */
  verifySignature(body, signature) {
    if (!signature || !this.lineConfig.channelSecret) {
      return false;
    }

    try {
      // Use Web Crypto API for HMAC verification
      return this.verifyHmacSignature(body, signature, this.lineConfig.channelSecret);
    } catch (error) {
      this.logger.error('Signature verification failed', {
        requestId: this.requestId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Verify HMAC signature using Web Crypto API
   * @param {string} body - Request body
   * @param {string} signature - Signature to verify
   * @param {string} secret - Channel secret
   * @returns {Promise<boolean>} Signature is valid
   */
  async verifyHmacSignature(body, signature, secret) {
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    return signature === expectedSignature;
  }

  /**
   * Get user's preferred language
   * @param {string} lineUserId - LINE user ID
   * @returns {string} Language code
   */
  async getUserLanguage(lineUserId) {
    try {
      const customer = await this.database.getCustomer(lineUserId);
      return customer?.language || 'en';
    } catch (error) {
      this.logger.error('Failed to get user language', {
        requestId: this.requestId,
        error: error.message
      });
      return 'en';
    }
  }

  /**
   * Detect language from message text
   * @param {string} text - Message text
   * @param {string} fallback - Fallback language
   * @returns {string} Detected language
   */
  detectLanguage(text, fallback = 'en') {
    // Simple Thai language detection
    const thaiPattern = /[\u0E00-\u0E7F]/;
    if (thaiPattern.test(text)) {
      return 'th';
    }
    
    return fallback || 'en';
  }

  /**
   * Format product information
   * @param {Object} product - Product data
   * @param {string} language - Display language
   * @returns {string} Formatted product info
   */
  formatProductInfo(product, language = 'en') {
    const multilingual = product.multilingual || {};
    const localized = multilingual[language] || {};
    
    const name = localized.name || product.name;
    const description = localized.description || product.description;
    const price = product.price ? `${product.price} ${product.currency || 'THB'}` : 'Price on request';
    
    if (language === 'th') {
      return `📦 **${name}**\n\n${description}\n\n💰 ราคา: ${price}\n📂 หมวดหมู่: ${product.category || 'ทั่วไป'}`;
    } else {
      return `📦 **${name}**\n\n${description}\n\n💰 Price: ${price}\n📂 Category: ${product.category || 'General'}`;
    }
  }

  /**
   * Update customer analytics
   * @param {Object} customer - Customer data
   * @param {Object} aiResponse - AI response data
   * @param {string} messageText - Original message text
   */
  async updateCustomerAnalytics(customer, aiResponse, messageText) {
    try {
      const currentAnalytics = customer.analytics || {};
      
      const updatedAnalytics = {
        ...currentAnalytics,
        totalMessages: (currentAnalytics.totalMessages || 0) + 1,
        lastActivity: new Date().toISOString(),
        aiProviderUsage: {
          ...currentAnalytics.aiProviderUsage,
          [aiResponse.provider]: (currentAnalytics.aiProviderUsage?.[aiResponse.provider] || 0) + 1
        },
        totalTokensUsed: (currentAnalytics.totalTokensUsed || 0) + (aiResponse.tokensUsed || 0),
        averageConfidence: this.calculateAverageConfidence(
          currentAnalytics.averageConfidence,
          currentAnalytics.totalMessages || 0,
          aiResponse.confidence
        ),
        intents: {
          ...currentAnalytics.intents,
          [aiResponse.intent]: (currentAnalytics.intents?.[aiResponse.intent] || 0) + 1
        },
        messageLength: {
          total: (currentAnalytics.messageLength?.total || 0) + messageText.length,
          average: Math.round(((currentAnalytics.messageLength?.total || 0) + messageText.length) / ((currentAnalytics.totalMessages || 0) + 1))
        }
      };

      await this.database.updateCustomer(customer.lineUserId, {
        analytics: updatedAnalytics
      });

    } catch (error) {
      this.logger.error('Analytics update failed', {
        requestId: this.requestId,
        error: error.message
      });
    }
  }

  /**
   * Calculate average confidence score
   * @param {number} currentAvg - Current average
   * @param {number} totalMessages - Total message count
   * @param {number} newConfidence - New confidence score
   * @returns {number} Updated average
   */
  calculateAverageConfidence(currentAvg, totalMessages, newConfidence) {
    if (totalMessages === 0) return newConfidence || 0;
    return ((currentAvg * totalMessages) + (newConfidence || 0)) / (totalMessages + 1);
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
}