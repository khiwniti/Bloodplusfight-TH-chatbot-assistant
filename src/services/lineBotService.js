const { Client } = require('@line/bot-sdk');
const productService = require('./productService');
const healthcareService = require('./healthcareService');
const researchService = require('./researchService');
const customerService = require('./customerService');
const fallbackResponseService = require('./fallbackResponseService');
const conversationService = require('./conversationService');
const config = require('../../config/config');
const analyticsService = require('./analyticsService');
const deepSeekService = require('./deepSeekService');

// Always use DeepSeek for AI
const aiService = deepSeekService;

// Create a simple logger if the logger service is not available
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  logLineEvent: (event, data) => console.log('Line event:', event.type, data),
  logApiCall: (service, endpoint, status, data) => {
    console.log(`API Call: ${service} - ${endpoint} - Status: ${status}`, data ? JSON.stringify(data).substring(0, 200) + '...' : '');
  }
};

// Create a safe wrapper for analytics functions
const safeAnalytics = {
  logBotActivity: (userId, userMessage, botResponse, isAiGenerated) => {
    try {
      if (analyticsService && typeof analyticsService.logBotActivity === 'function') {
        analyticsService.logBotActivity(userId, userMessage, botResponse, isAiGenerated);
      } else {
        logger.logApiCall('Analytics', 'logBotActivity', 'skipped', { userId });
      }
    } catch (error) {
      logger.error('Error calling analyticsService.logBotActivity:', error);
    }
  },
  
  logApiCall: (service, endpoint, status, data) => {
    try {
      // First log to our standard logger
      logger.logApiCall(service, endpoint, status, data);
      
      // Then try to use the analytics service if it exists
      if (analyticsService && typeof analyticsService.logApiCall === 'function') {
        analyticsService.logApiCall(service, endpoint, status, data);
      }
    } catch (error) {
      logger.error('Error calling analyticsService.logApiCall:', error);
    }
  },
  
  logFailedApiCall: (userId, userMessage, error) => {
    try {
      if (analyticsService && typeof analyticsService.logFailedApiCall === 'function') {
        analyticsService.logFailedApiCall(userId, userMessage, error);
      } else {
        logger.logApiCall('Analytics', 'logFailedApiCall', 'skipped', { 
          userId,
          errorMessage: error.message
        });
      }
    } catch (error) {
      logger.error('Error calling analyticsService.logFailedApiCall:', error);
    }
  }
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create a LINE SDK client or a mock client for development
let client;

try {
  // Initialize the real LINE client with credentials
  client = new Client({
    channelAccessToken: config.line.channelAccessToken,
    channelSecret: config.line.channelSecret
  });
  
  // Test the client by making a simple API call
  client.getProfile('test')
    .catch(error => {
      if (error.statusCode === 404) {
        // This is expected for a test user ID
        console.log('LINE client initialized successfully');
      } else if (error.statusCode === 401) {
        // Authentication error - likely invalid credentials
        console.error('LINE authentication failed. Check your channel access token and secret.');
        initializeMockClient();
      } else {
        console.error('LINE client test failed:', error.message);
      }
    });
} catch (error) {
  console.error('Failed to initialize LINE client:', error.message);
  initializeMockClient();
}

/**
 * Initialize a mock LINE client for development or when credentials are invalid
 */
function initializeMockClient() {
  console.log('Using mock LINE client for development or due to invalid credentials');
  client = {
    // Mock LINE client methods with dummy implementations
    getProfile: async (userId) => {
      console.log(`Mock: Get profile for user ${userId}`);
      return { displayName: 'Test User', userId };
    },
    replyMessage: async (replyToken, message) => {
      console.log('Mock: Reply message called', { replyToken, message });
      return { success: true };
    },
    pushMessage: async (userId, message) => {
      console.log('Mock: Push message called', { userId, message });
      return { success: true };
    }
  };
}

/**
 * Safe wrapper for LINE API calls to handle 403 errors gracefully
 * @param {Function} apiCall - LINE API function to call
 * @param {Array} args - Arguments for the API call
 * @returns {Promise<any>} API call result
 */
const safeLineAPI = async (apiCall, ...args) => {
  try {
    return await apiCall(...args);
  } catch (error) {
    if (error.statusCode === 400) {
      logger.warn('LINE API returned 400 Bad Request. Check API call parameters and token validity.', {
        errorMessage: error.message,
        responseData: error.response?.data,
        args: args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)) // Log arguments safely
      });
      return null; // Suppress error to prevent crash, indicates message likely not sent
    } else if (error.statusCode === 401) {
      logger.warn('LINE API returned 401 Unauthorized. Check Channel Access Token.', {
        errorMessage: error.message,
        args: args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
      });
      return null; // Suppress error
    } else if (error.statusCode === 403) {
      logger.warn('LINE API returned 403 Forbidden. Check permissions or IP whitelisting.', {
        errorMessage: error.message,
        args: args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
      });
      return null; // Suppress error
    }
    // For other errors, rethrow to be caught by higher-level error handlers
    logger.error('Unhandled LINE API error in safeLineAPI:', { errorMessage: error.message, statusCode: error.statusCode });
    throw error;
  }
};

// Safe wrappers for LINE API methods
const safeGetProfile = async (userId) => safeLineAPI(client.getProfile.bind(client), userId);
const safeReplyMessage = async (replyToken, message) => safeLineAPI(client.replyMessage.bind(client), replyToken, message);
const safePushMessage = async (userId, message) => safeLineAPI(client.pushMessage.bind(client), userId, message);

// Multilingual message definitions
const messages = {
  en: {
    greeting: 'Hello! How may I assist you today?',
    welcome: 'Welcome to our service! How can I help you?',
    fallback: 'I apologize, but I\'m having trouble understanding. Could you please rephrase your question?',
    error: 'I\'m sorry, but I encountered an error. Please try again later.',
    research: 'Let me research that for you...',
    researchComplete: 'Based on my research:',
    noResearchResults: 'I couldn\'t find specific information about that. Let me try to answer based on what I know.',
    productNotFound: 'I couldn\'t find that product. Please try another one.',
    askForPreferences: 'To serve you better, could you tell me what health topics you\'re interested in?',
    preferencesUpdated: 'Thank you! I\'ve updated your preferences.',
    healthcareIntro: 'I can provide information about HIV, STDs, prevention methods, testing, and treatment options. What would you like to know?',
    commandHelp: 'Available commands:\n/help - Show this help message\n/reset - Reset conversation\n/language [en|th] - Change language\n/feedback [message] - Send feedback',
    resetConfirmation: 'Your conversation has been reset.',
    languageChanged: 'Language changed to English.',
    feedbackThanks: 'Thank you for your feedback!',
    unknownCommand: 'Unknown command. Type /help to see available commands.',
    limitExceeded: 'You have exceeded your daily usage limit. Please try again tomorrow.'
  },
  th: {
    greeting: 'สวัสดีครับ/ค่ะ มีอะไรให้ช่วยไหมครับ/คะ?',
    welcome: 'ยินดีต้อนรับสู่บริการของเรา! มีอะไรให้ช่วยไหมครับ/คะ?',
    fallback: 'ขออภัยครับ/ค่ะ ฉันไม่เข้าใจคำถามของคุณ กรุณาถามใหม่อีกครั้งได้ไหมครับ/คะ?',
    error: 'ขออภัยครับ/ค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งในภายหลัง',
    research: 'กำลังค้นหาข้อมูลให้คุณ...',
    researchComplete: 'จากการค้นคว้าของฉัน:',
    noResearchResults: 'ฉันไม่พบข้อมูลเฉพาะเกี่ยวกับเรื่องนี้ ฉันจะพยายามตอบตามความรู้ที่มี',
    productNotFound: 'ฉันไม่พบสินค้านั้น กรุณาลองสินค้าอื่น',
    askForPreferences: 'เพื่อให้บริการคุณได้ดีขึ้น คุณสนใจเรื่องสุขภาพด้านใดบ้างคะ/ครับ?',
    preferencesUpdated: 'ขอบคุณค่ะ/ครับ! ฉันได้อัปเดตความสนใจของคุณแล้ว',
    healthcareIntro: 'ฉันสามารถให้ข้อมูลเกี่ยวกับเอชไอวี โรคติดต่อทางเพศสัมพันธ์ วิธีการป้องกัน การตรวจ และทางเลือกในการรักษา คุณต้องการทราบเรื่องใดคะ/ครับ?',
    commandHelp: 'คำสั่งที่ใช้ได้:\n/help - แสดงข้อความช่วยเหลือนี้\n/reset - รีเซ็ตการสนทนา\n/language [en|th] - เปลี่ยนภาษา\n/feedback [ข้อความ] - ส่งความคิดเห็น',
    resetConfirmation: 'การสนทนาของคุณได้รับการรีเซ็ตแล้ว',
    languageChanged: 'เปลี่ยนภาษาเป็นภาษาไทยแล้ว',
    feedbackThanks: 'ขอบคุณสำหรับความคิดเห็นของคุณ!',
    unknownCommand: 'ไม่รู้จักคำสั่ง พิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้',
    limitExceeded: 'คุณได้เกินขีดจำกัดการใช้งานประจำวันแล้ว โปรดลองอีกครั้งในวันพรุ่งนี้'
  }
};

// Common greeting patterns for language detection
const greetingPatterns = {
  en: [
    /^hi$/i, /^hello$/i, /^hey$/i, /^good morning$/i, /^good afternoon$/i, 
    /^good evening$/i, /^howdy$/i, /^greetings$/i, /^yo$/i
  ],
  th: [
    /^สวัสดี/, /^หวัดดี/, /^ดีจ้า/, /^ดีครับ/, /^ดีค่ะ/, /^ดีคับ/,
    /^ดีคะ/, /^ดี$/, /^ดีๆ/, /^อรุณสวัสดิ์/, /^สวัสดีตอนเช้า/,
    /^สวัสดีตอนบ่าย/, /^สวัสดีตอนเย็น/, /^สวัสดีตอนค่ำ/
  ]
};

// Conversation contexts are now managed by conversationService

// User API call tracking
const userCalls = {};
const USER_DAILY_LIMIT = 50; // You can adjust this value

/**
 * Track user API calls and enforce daily limits
 * @param {string} userId - User ID
 * @returns {boolean} - True if under limit, false if over limit
 */
const trackCalls = (userId) => {
  // Skip tracking in development mode
  if (isDevelopment && !config.features.forceLimitsInDev) {
    return true;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // First time user
  if (!userCalls[userId]) {
    userCalls[userId] = {
      lastReset: today,
      count: 1
    };
    return true;
  } else {
    // Check if need to reset (new day)
    if (now > new Date(userCalls[userId].lastReset.getTime() + 24 * 60 * 60 * 1000)) {
      userCalls[userId] = {
        lastReset: today,
        count: 1
      };
    } else {
      // Increment count
      userCalls[userId].count++;
    }
    
    // Check if over limit
    return userCalls[userId].count <= config.limits.dailyUserLimit;
  }
};

/**
 * Handle LINE webhook event
 * @param {Object} event - LINE webhook event
 * @returns {Promise<void>}
 */
const handleEvent = async (event) => {
  try {
    logger.info('Received event:', { eventType: event.type });
    
    // Only handle text messages for now
    if (event.type !== 'message' || event.message.type !== 'text') {
      logger.info(`Ignoring non-text message event: ${event.type}`);
      return;
    }
    
    const { replyToken, source } = event;
    const { userId } = source;
    const userMessage = event.message.text.trim();
    
    // Track request start time for monitoring response time
    const requestStartTime = Date.now();
    
    // Detect language early for use throughout the function
    const detectedLang = detectLanguage(userMessage);
    
    // First, store the user message in the conversation history regardless of what happens next
    try {
      const conversation = await conversationService.getActiveConversation(userId);
      if (conversation) {
        await conversationService.addMessage(conversation, 'user', userMessage);
      }
    } catch (dbError) {
      logger.error('Error storing user message in database:', dbError);
      // Continue processing even if DB storage fails
    }
    
    // Send research notification if enabled, but don't stop processing
    let researchNotificationSent = false;
    if (config.research.enabled && config.research.autoResearch) {
      try {
        // Send the research notification
        const sendResult = await safeReplyMessage(replyToken, { 
          type: 'text', 
          text: messages[detectedLang].research 
        });
        
        // Log the result
        if (sendResult) {
          logger.info('Sent research notification', { 
            userId, 
            responseTime: Date.now() - requestStartTime + 'ms'
          });
          
          researchNotificationSent = true;
          
          // Store the research notification in the conversation history
          try {
            const conversation = await conversationService.getActiveConversation(userId);
            if (conversation) {
              await conversationService.addMessage(
                conversation, 
                'assistant', 
                messages[detectedLang].research
              );
            }
          } catch (dbError) {
            logger.error('Error storing research notification in database:', dbError);
          }
          
          // Track API call for analytics if enabled
          if (config.features.enableAnalytics) {
            safeAnalytics.logApiCall('LINE', 'replyMessage', 'success', {
              userId,
              messageType: 'research_notification'
            });
          }
        } else {
          logger.warn('Failed to send research notification', { 
            userId,
            responseTime: Date.now() - requestStartTime + 'ms'
          });
          
          // If we couldn't send the reply, try with a push message
          try {
            const pushResult = await safePushMessage(userId, { 
              type: 'text', 
              text: messages[detectedLang].research 
            });
            
            if (pushResult) {
              logger.info('Recovered research notification with push message', { userId });
              researchNotificationSent = true;
            }
          } catch (pushError) {
            logger.error('Failed to recover research notification with push message', { 
              error: pushError.message,
              userId
            });
          }
        }
      } catch (error) {
        logger.error('Error in research notification flow:', error);
        // Continue processing even if notification fails
      }
    }
    
    // Check if we're in research-only mode (send notification but don't generate AI response)
    const researchOnlyMode = config.research.enabled && 
                            config.research.autoResearch && 
                            config.research.stopAtNotification === true;
    
    if (researchOnlyMode && researchNotificationSent) {
      logger.info('Research-only mode active, stopping after notification', { userId });
      return;
    }
    
    // If reply token was used for research notification, we'll need push message for the actual response
    const needsPushMessage = researchNotificationSent;
    const effectiveReplyToken = needsPushMessage ? null : replyToken;
    
    // Continue with normal processing - send acknowledgment if fast response is enabled
    // and we haven't already sent a research notification
    if (config.features.enableFastResponse && !researchNotificationSent) {
      const quickAcknowledgment = "Received your message. Processing...";
      try {
        await safeReplyMessage(replyToken, { type: 'text', text: quickAcknowledgment });
        // Now we'll need to use pushMessage for the actual response
      } catch (ackError) {
        logger.warn('Failed to send acknowledgment', { error: ackError.message });
        // Continue with normal flow if acknowledgment fails
      }
    }
    
    // Get user profile
    let profile;
    try {
      // Make this a non-blocking operation 
      profile = await Promise.race([
        safeGetProfile(userId),
        new Promise(resolve => setTimeout(() => resolve({ displayName: 'Customer', userId }), 500))
      ]);
      logger.info('User profile retrieved', { userId });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      profile = { displayName: 'Customer', userId };
    }
    
    // Get or create customer record
    const customerPromise = customerService.getOrCreateCustomer(userId, profile?.displayName);
    
    // Get active conversation or create new one in parallel with other operations
    const conversationPromise = conversationService.getActiveConversation(userId, profile?.displayName);
    
    // Check if this is a healthcare-related query early to prepare context
    const isHealthcareRelated = healthcareService.isHealthcareQuery(userMessage, detectedLang);
    
    // Wait for parallel operations to complete
    const [customer, conversation] = await Promise.all([customerPromise, conversationPromise]);
    
    // Update conversation language if needed, but don't generate a reply
    if (conversation.language !== detectedLang) {
      await conversationService.updateLanguage(conversation, detectedLang, true); // Added parameter to suppress response
    }
    
    // For command handling, we need to check if we should completely skip responses
    if (config.research.enabled && config.research.autoResearch && config.research.stopAtNotification === true) {
      // Skip all further processing - we've already sent the research notification
      return;
    }
    
    // Handle command if message starts with the command prefix
    if (config.features.commandPrefix && userMessage.startsWith(config.features.commandPrefix)) {
      const isHandled = await handleCommand(
        userMessage, 
        userId, 
        // If we sent an early acknowledgment or research notification, we'll need to use pushMessage instead
        needsPushMessage ? null : replyToken, 
        detectedLang, 
        conversation
      );
      
      if (isHandled) {
        return; // Command was handled, no need to continue
      }
    }
    
    // Handle greeting patterns with simple response - fast path for common interactions
    if (isGreeting(userMessage, detectedLang)) {
      const greeting = messages[detectedLang].greeting;
      
      // If we already sent a notification or acknowledgment, use push message instead
      if (needsPushMessage || config.features.enableFastResponse) {
        await safePushMessage(userId, { type: 'text', text: greeting });
      } else {
        await safeReplyMessage(replyToken, { type: 'text', text: greeting });
      }
      
      // Add bot response to conversation
      await conversationService.addMessage(conversation, 'assistant', greeting);
      
      // Log activity if analytics is enabled
      if (config.features.enableAnalytics) {
        safeAnalytics.logBotActivity(userId, userMessage, greeting, false);
      }
      
      return;
    }
    
    // Check API call limits
    if (!trackCalls(userId)) {
      const limitMessage = messages[detectedLang].limitExceeded + ' ' + messages[detectedLang].fallback;
      
      // If we already sent a notification or acknowledgment, use push message instead
      if (needsPushMessage || config.features.enableFastResponse) {
        await safePushMessage(userId, { type: 'text', text: limitMessage });
      } else {
        await safeReplyMessage(replyToken, { type: 'text', text: limitMessage });
      }
      return;
    }
    
    // Get recent conversation history - run in parallel with other operations
    const conversationHistory = await conversationService.getConversationHistory(userId, 10);
    
    // Prepare customer context for AI
    const customerContext = {
      userId,
      displayName: profile?.displayName || customer?.displayName || 'Customer',
      preferences: customer?.preferences || [],
      purchaseHistory: customer?.purchaseHistory || [],
      language: detectedLang,
      conversationHistory: conversationHistory // Last 10 messages for context
    };
    
    // If the healthcare query is detected, add healthcare context
    if (isHealthcareRelated) {
      customerContext.healthcareContext = {
        isHealthcareQuery: true,
        topics: healthcareService.detectHealthcareTopics(userMessage, detectedLang)
      };
    }
    
    // Generate AI response
    logger.info('Generating AI response with context:', { 
      userId,
      language: customerContext.language,
      isHealthcare: !!customerContext.healthcareContext,
      messageType: 'healthcare_query'
    });
    
    let aiResponse;
    let responseSuccess = false;
    
    try {
      // Set timeout for AI response to prevent excessive waiting
      aiResponse = await Promise.race([
        aiService.generateResponse(userMessage, customerContext),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI response timeout')), 
          config.limits.aiResponseTimeout || 15000)
        )
      ]);
      logger.info('DeepSeek API response received successfully');
    } catch (error) {
      logger.error('Error generating AI response:', error);
      aiResponse = await fallbackResponseService.getFallbackResponse(detectedLang, userMessage);
    }
    
    // Add AI response to conversation
    try {
      await conversationService.addMessage(conversation, 'assistant', aiResponse);
    } catch (dbError) {
      logger.error('Error saving AI response to conversation:', dbError);
      // Continue processing - storing in DB is not critical for sending reply
    }
    
    // Send response to user
    try {
      // If we already sent a notification or acknowledgment, use pushMessage instead
      if (needsPushMessage || config.features.enableFastResponse) {
        responseSuccess = await safePushMessage(userId, { type: 'text', text: aiResponse });
      } else {
        responseSuccess = await safeReplyMessage(replyToken, { type: 'text', text: aiResponse });
      }
      
      if (responseSuccess) {
        logger.info('Successfully sent reply to user', { 
          userId, 
          responseTime: Date.now() - requestStartTime + 'ms',
          responseType: needsPushMessage ? 'push' : 'reply'
        });
        logger.logLineEvent(event, { success: true });
      } else {
        logger.warn('Received null response from LINE API when sending message', { userId });
        throw new Error('LINE API returned null response');
      }
    } catch (error) {
      logger.error('Error sending reply:', error);
      // If reply fails and we haven't tried push yet, try to push message instead
      try {
        if (!needsPushMessage && !config.features.enableFastResponse) {
          // Only try push if we didn't already try it
          const pushSuccess = await safePushMessage(userId, { type: 'text', text: aiResponse });
          if (pushSuccess) {
            logger.info('Successfully recovered with push message after reply failure', { userId });
          } else {
            logger.error('Push message recovery returned null', { userId });
          }
        } else {
          logger.error('Both reply and push methods failed', { userId });
        }
      } catch (pushError) {
        logger.error('Error pushing message:', pushError);
      }
    }
  } catch (error) {
    console.error('Error handling event:', error);
    try {
      // Try to send error message if possible
      if (event && event.replyToken) {
        const errorMessage = isDevelopment ? 
          `Error: ${error.message}` : 
          messages.en.error;
        const errorSuccess = await safeReplyMessage(event.replyToken, { type: 'text', text: errorMessage });
        
        if (errorSuccess) {
          logger.info('Sent error message to user', { userId: event.source?.userId });
        } else {
          logger.error('Failed to send error message to user', { userId: event.source?.userId });
        }
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
};

/**
 * Detect language from user message
 * @param {string} text - User message
 * @returns {string} Language code ('en' or 'th')
 */
const detectLanguage = (text) => {
  // Simple Thai detection - if there are Thai characters in the text
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
};

/**
 * Check if message is a greeting
 * @param {string} text - User message
 * @param {string} lang - Detected language
 * @returns {boolean} True if message is a greeting
 */
const isGreeting = (text, lang) => {
  const patterns = greetingPatterns[lang] || greetingPatterns.en;
  return patterns.some(pattern => pattern.test(text));
};

/**
 * Handle text message event
 * @param {Object} event - LINE webhook event
 * @returns {Promise<void>}
 */
const handleTextMessage = async (event) => {
  try {
    const userId = event.source.userId;
    const text = event.message.text;
    const replyToken = event.replyToken;
    
    console.log(`Received text message from ${userId}: ${text}`);
    
    // Get user language
    let lang = 'en'; // Default language
    try {
      const userProfile = await safeLineAPI.getProfile(userId);
      console.log('User profile:', userProfile);
      lang = userProfile.language || detectLanguage(text);
    } catch (error) {
      console.warn('Error getting user profile, using detected language', error);
      lang = detectLanguage(text);
    }
    
    console.log(`Detected language: ${lang}`);
    
    // Get or create customer data
    let customerData = { userId, displayName: 'Customer' };
    try {
      const userProfile = await safeLineAPI.getProfile(userId);
      customerData = await customerService.getOrCreateCustomer(userId, userProfile.displayName);
      console.log('Customer data:', customerData);
    } catch (error) {
      console.warn('Error getting customer data', error);
    }
    
    // Handle slash command_
    if (config.features.commandPrefix && text.startsWith(config.features.commandPrefix)) {
      // Check usage limits if enabled
      if (config.features.enableUsageLimits && !trackCalls(userId)) {
        const limitMessage = lang === 'th' 
          ? 'คุณได้เกินขีดจำกัดการใช้งานประจำวันแล้ว โปรดลองอีกครั้งในวันพรุ่งนี้'
          : 'You have exceeded your daily usage limit. Please try again tomorrow.';
        
        // Send the limit message
        await safeReplyMessage(replyToken, { type: 'text', text: limitMessage });
        return; // Stop further processing for this event
      } // Closes inner if (config.features.enableUsageLimits && !trackCalls(userId))
      
      // Placeholder for actual command handling logic
      const commandReceivedMessage = lang === 'th' 
        ? `ได้รับคำสั่งแล้ว: ${text}. การประมวลผลยังไม่ถูกสร้าง.`
        : `Command received: ${text}. Processing not yet implemented.`;
      await safeReplyMessage(replyToken, { type: 'text', text: commandReceivedMessage });
      return; // Stop further processing as command logic is not implemented
    } // Closes outer if (config.features.commandPrefix && text.startsWith(config.features.commandPrefix))

    // If it's not a command, this function currently doesn't do more.
    // The main logic is expected to be in handleEvent.
    // If handleTextMessage was intended for more, that logic is missing from the provided snippet.

  } catch (error) {
    logger.error('Error in handleTextMessage:', { message: error.message, userId, text });
    // Attempt to send a generic error message to the user if a replyToken is available
    if (replyToken) {
      try {
        const errorMessageText = (messages[lang] && messages[lang].error) ? messages[lang].error : messages.en.error;
        await safeReplyMessage(replyToken, { type: 'text', text: errorMessageText });
      } catch (e) {
        logger.error('Failed to send error reply in handleTextMessage:', { message: e.message });
      }
    }
  }
}; // Closes handleTextMessage function

/**
 * Handle command with the configured prefix
 * @param {string} text - Command text including prefix
 * @param {string} userId - User ID
 * @param {string} replyToken - Reply token
 * @param {string} language - User language
 * @param {Object} conversation - User conversation object
 * @returns {Promise<boolean>} - True if handled as command, false otherwise
 */
const handleCommand = async (text, userId, replyToken, language, conversation) => {
  // Verify this is actually a command
  if (!config.features.commandPrefix || !text.startsWith(config.features.commandPrefix)) {
    return false;
  }
  
  // Remove prefix and split into command and arguments
  const commandText = text.substring(config.features.commandPrefix.length).trim();
  const [command, ...args] = commandText.split(' ');
  
  // Log the command usage
  logger.info(`Command received: ${command}`, { userId, args });
  
  // Track analytics for command usage if enabled
  if (config.features.enableAnalytics) {
    safeAnalytics.logBotActivity(userId, text, `Command: ${command}`, false);
  }
  
  let responseText;
  
  switch (command.toLowerCase()) {
    case 'help':
      responseText = messages[language].commandHelp;
      break;
      
    case 'reset':
      // Close current conversation and create new one
      await conversationService.closeConversation(conversation);
      const newConversation = await conversationService.getActiveConversation(userId);
      await conversationService.addMessage(newConversation, 'system', 'Conversation reset');
      responseText = messages[language].resetConfirmation;
      break;
      
    case 'language':
      if (args.length > 0 && (args[0] === 'en' || args[0] === 'th')) {
        const newLang = args[0];
        await conversationService.updateLanguage(conversation, newLang);
        responseText = newLang === 'en' ? messages.en.languageChanged : messages.th.languageChanged;
      } else {
        responseText = language === 'th' 
          ? 'กรุณาระบุภาษา (en หรือ th)' 
          : 'Please specify a language (en or th)';
      }
      break;
      
    case 'feedback':
      const feedback = args.join(' ').trim();
      if (feedback) {
        logger.info(`Feedback received from user`, { userId, feedback });
        // Store feedback in conversation metadata
        if (conversation) {
          conversation.metadata = conversation.metadata || {};
          conversation.metadata.feedback = conversation.metadata.feedback || [];
          conversation.metadata.feedback.push({
            text: feedback,
            timestamp: new Date()
          });
          
          // Add to conversation history
          await conversationService.addMessage(conversation, 'system', `Feedback: ${feedback}`);
        }
        
        responseText = messages[language].feedbackThanks;
      } else {
        responseText = language === 'th' 
          ? 'กรุณาระบุข้อเสนอแนะของคุณ เช่น /feedback ข้อความของคุณ' 
          : 'Please provide your feedback, e.g., /feedback your message';
      }
      break;
      
    default:
      responseText = messages[language].unknownCommand;
  }
  
  // Send response
  await safeReplyMessage(replyToken, { type: 'text', text: responseText });
  
  // Add bot response to conversation
  if (conversation) {
    await conversationService.addMessage(conversation, 'assistant', responseText);
  }
  
  return true;
};

// Export the main event handler and any other public functions
module.exports = {
  handleEvent,
  detectLanguage,
  isGreeting,
  handleCommand,
  safeReplyMessage,
  safePushMessage,
  safeGetProfile
};
