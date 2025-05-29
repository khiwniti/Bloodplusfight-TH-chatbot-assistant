const { Client } = require('@line/bot-sdk');
const productService = require('./productService');
const openRouterService = require('./openRouterService');
const healthcareService = require('./healthcareService');
const researchService = require('./researchService');
const config = require('../../config/config');
const customerService = require('./customerService');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create a LINE SDK client or a mock client for development
let client;

if (isDevelopment) {
  console.log('Running in development mode with mock LINE client');
  // Create a mock client with fake methods for development
  client = {
    // Mock LINE client methods with dummy implementations
    pushMessage: async () => console.log('Mock: Push message called'),
    replyMessage: async () => console.log('Mock: Reply message called'),
    getProfile: async (userId) => ({
      displayName: 'Test User',
      userId: userId || 'test-user-id',
      language: 'en',
      pictureUrl: 'https://example.com/profile.jpg'
    }),
    // Add other LINE client methods as needed
  };
} else {
  // Use real LINE client in production
  try {
    console.log('Creating LINE client with credentials');
    client = new Client(config.line);
    // Validate the token early
    if (!config.line.channelAccessToken || !config.line.channelSecret) {
      console.error('LINE credentials missing - using fallback client');
      throw new Error('Missing LINE credentials');
    }
  } catch (error) {
    console.error('Error creating LINE client, using fallback client:', error.message);
    // Fallback to mock client in case of error
    client = {
      pushMessage: async () => console.warn('WARN: Using fallback LINE client - pushMessage called with invalid credentials'),
      replyMessage: async () => console.warn('WARN: Using fallback LINE client - replyMessage called with invalid credentials'),
      getProfile: async (userId) => {
        console.warn('WARN: Using fallback LINE client - getProfile called with invalid credentials');
        return {
          displayName: 'Unknown User',
          userId: userId || 'unknown-user',
          language: 'en',
          pictureUrl: 'https://example.com/default.jpg'
        };
      }
    };
  }
}

// Add a wrapper for handling 403 errors gracefully
const safeLineAPI = {
  getProfile: async (userId) => {
    try {
      return await client.getProfile(userId);
    } catch (error) {
      console.warn(`Error getting profile for ${userId}: ${error.message}`);
      return {
        displayName: 'Unknown User',
        userId: userId,
        language: 'en'
      };
    }
  },
  replyMessage: async (token, message) => {
    try {
      return await client.replyMessage(token, message);
    } catch (error) {
      console.warn(`Error sending reply message: ${error.message}`);
      return null;
    }
  },
  pushMessage: async (to, message) => {
    try {
      return await client.pushMessage(to, message);
    } catch (error) {
      console.warn(`Error sending push message: ${error.message}`);
      return null;
    }
  }
};

// Log configuration (without sensitive data)
console.log('LINE Bot Configuration:', {
  hasChannelSecret: !!config.line.channelSecret,
  hasChannelAccessToken: !!config.line.channelAccessToken
});

// Language messages for multilingual support
const messages = {
  en: {
    greeting: (name) => `Hello ${name}! How can I assist you today? You can ask about our products, your purchase history, or get help with our services.`,
    noPurchaseHistory: 'You have no purchase history yet. Check out our products by typing "products"!',
    purchaseHistory: 'Your recent purchases:',
    productsList: 'Here are our available products:',
    help: 'Here are commands you can use:\n- "hi" or "hello": Get a greeting\n- "history" or "purchases": See your purchase history\n- "products" or "catalog": See our product list\n- "help": See this help message\nYou can also ask me any questions about our products or services!',
    welcome: (name) => `Welcome ${name}! Thank you for adding me as a friend. I can help you with product information and more. Type "help" to see what I can do!`,
    errorProcessing: 'Sorry, I encountered an error processing your request.',
    errorPurchaseHistory: 'Sorry, I could not retrieve your purchase history at the moment.',
    errorProductList: 'Sorry, I could not retrieve our product list at the moment.',
    errorHelp: 'Sorry, I encountered an error while providing help information.',
    errorAI: 'I\'m having trouble understanding that right now. Can you try asking in a different way?',
    textMessagesOnly: 'Sorry, I can only handle text messages right now.',
    research: 'Researching healthcare information...',
    errorResearch: 'Sorry, I could not find healthcare information on this topic at this time. Please try again later or consult a healthcare professional.',
    researchHelp: 'You can use the healthcare research feature by typing "research" followed by your health question. For example: "research HIV prevention" or "research diabetes symptoms"',
  },
  th: {
    greeting: (name) => `สวัสดีคุณ ${name}! ฉันช่วยอะไรคุณได้บ้าง? คุณสามารถถามเกี่ยวกับสินค้า ประวัติการซื้อ หรือขอความช่วยเหลือเกี่ยวกับบริการของเราได้`,
    noPurchaseHistory: 'คุณยังไม่มีประวัติการซื้อ ลองดูสินค้าของเราโดยพิมพ์ "สินค้า"!',
    purchaseHistory: 'การซื้อล่าสุดของคุณ:',
    productsList: 'นี่คือสินค้าที่มีจำหน่าย:',
    help: 'นี่คือคำสั่งที่คุณสามารถใช้ได้:\n- "สวัสดี" หรือ "หวัดดี": ทักทาย\n- "ประวัติ" หรือ "การซื้อ": ดูประวัติการซื้อของคุณ\n- "สินค้า" หรือ "รายการสินค้า": ดูรายการสินค้า\n- "ช่วยเหลือ": ดูข้อความช่วยเหลือนี้\nคุณยังสามารถถามคำถามใดๆ เกี่ยวกับสินค้าหรือบริการของเราได้!',
    welcome: (name) => `ยินดีต้อนรับคุณ ${name}! ขอบคุณที่เพิ่มฉันเป็นเพื่อน ฉันสามารถช่วยคุณเกี่ยวกับข้อมูลสินค้าและอื่นๆ พิมพ์ "ช่วยเหลือ" เพื่อดูว่าฉันสามารถทำอะไรได้บ้าง!`,
    errorProcessing: 'ขออภัย ฉันพบข้อผิดพลาดในการประมวลผลคำขอของคุณ',
    errorPurchaseHistory: 'ขออภัย ฉันไม่สามารถดึงข้อมูลประวัติการซื้อของคุณได้ในขณะนี้',
    errorProductList: 'ขออภัย ฉันไม่สามารถดึงข้อมูลรายการสินค้าของเราได้ในขณะนี้',
    errorHelp: 'ขออภัย ฉันพบข้อผิดพลาดในการให้ข้อมูลช่วยเหลือ',
    errorAI: 'ฉันมีปัญหาในการเข้าใจสิ่งนั้นในขณะนี้ คุณลองถามด้วยวิธีอื่นได้ไหม?',
    textMessagesOnly: 'ขออภัย ฉันสามารถรับข้อความตัวอักษรเท่านั้นในขณะนี้',
    research: 'กำลังค้นคว้าข้อมูลทางการแพทย์...',
    errorResearch: 'ขออภัย ฉันไม่สามารถค้นหาข้อมูลทางการแพทย์ในหัวข้อนี้ได้ในขณะนี้ กรุณาลองอีกครั้งในภายหลัง หรือปรึกษาบุคลากรทางการแพทย์',
    researchHelp: 'คุณสามารถใช้ฟีเจอร์การค้นคว้าข้อมูลทางการแพทย์ได้โดยพิมพ์ "ค้นคว้า" ตามด้วยคำถามด้านสุขภาพของคุณ เช่น: "ค้นคว้า การป้องกัน HIV" หรือ "ค้นคว้า อาการของโรคเบาหวาน"',
  }
};

// Define greeting patterns for each language
const greetingPatterns = {
  en: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy'],
  th: ['สวัสดี', 'หวัดดี', 'ดีจ้า', 'สวัสดีครับ', 'สวัสดีค่ะ', 'หวัดดีครับ', 'หวัดดีค่ะ']
};

// Add a simple in-memory context store to maintain conversation threads
const conversationContexts = {};

/**
 * Store conversation context for a user
 * @param {string} userId - User ID
 * @param {object} context - Context object
 */
const storeConversationContext = (userId, context) => {
  // Store only essential context data, not the full context
  conversationContexts[userId] = {
    lastQuery: context.healthcareContext?.query || '',
    lastTopic: context.healthcareContext?.topic || '',
    language: context.language,
    timestamp: new Date().getTime()
  };
  
  console.log(`Stored conversation context for ${userId}:`, conversationContexts[userId]);
};

/**
 * Get stored conversation context for a user
 * @param {string} userId - User ID
 * @returns {object|null} - Context object or null
 */
const getConversationContext = (userId) => {
  const context = conversationContexts[userId];
  
  // Check if context exists and is not too old (10 minutes)
  if (context && (new Date().getTime() - context.timestamp) < 600000) {
    console.log(`Retrieved conversation context for ${userId}:`, context);
    return context;
  }
  
  return null;
};

/**
 * Detect language from text
 * @param {string} text - Input text
 * @returns {string} - 'th' for Thai, 'en' for English/others
 */
const detectLanguage = (text) => {
  // Simple Thai language detection - if there are Thai characters in the text
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
};

/**
 * Get message in the appropriate language
 * @param {string} key - Message key
 * @param {string} lang - Language code
 * @param {any} params - Optional parameters for message template
 * @returns {string} - Localized message
 */
const getMessage = (key, lang, params) => {
  const langData = messages[lang] || messages.en;
  const message = langData[key] || messages.en[key];
  
  if (typeof message === 'function') {
    return message(params);
  }
  
  return message;
};

/**
 * Process and potentially truncate message to fit LINE's limits
 * @param {string} message - The message to process
 * @param {string} lang - Language code
 * @returns {string} - Processed message
 */
const processMessageForLineLength = (message, lang = 'en') => {
  const LINE_MAX_LENGTH = 5000; // LINE's character limit
  
  if (!message || message.length <= LINE_MAX_LENGTH) {
    return message;
  }
  
  console.log(`Message exceeds LINE's character limit (${message.length}), truncating...`);
  
  // Truncate to slightly less than the limit to add the truncation notice
  const truncatedMessage = message.substring(0, LINE_MAX_LENGTH - 200);
  
  // Add truncation notice
  const truncationNotice = lang === 'th'
    ? '\n\n[ข้อความถูกตัดทอนเนื่องจากข้อจำกัดของ LINE กรุณาถามคำถามเฉพาะเจาะจงสำหรับข้อมูลเพิ่มเติม]'
    : '\n\n[Message truncated due to LINE limitations. Please ask specific questions for more information.]';
  
  return truncatedMessage + truncationNotice;
};

/**
 * Handle text message from LINE
 * @param {object} event - LINE webhook event
 * @returns {Promise} - Response
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
    
    // Process message based on type
    // First, check if the text is a greeting
    const isGreeting = greetingPatterns[lang]?.some(pattern => {
      // Only use exact matches for greetings, not partial ones
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(text);
    }) || false;
    
    // Prepare the context for AI response
    const context = {
      customerName: customerData.displayName || 'Customer',
      purchaseHistory: customerData.purchaseHistory || [],
      preferences: customerData.preferences || [],
      language: lang
    };
    
    // Check if the query is healthcare-related first
    const isHealthcare = healthcareService.isHealthcareQuery(text, lang) || 
                         researchService.isHealthcareQuery(text, lang) || 
                         /prep|pep|hiv|เอชไอวี|เอดส์|aids|std|sti|โรคติดต่อทางเพศสัมพันธ์|วัคซีน|vaccine/i.test(text);
    
    // Check for existing conversation context
    const previousContext = getConversationContext(userId);
    if (previousContext) {
      console.log('Found previous conversation context:', previousContext);
      
      // If this is a healthcare-related query or we were previously discussing healthcare,
      // maintain the conversation thread
      if (isHealthcare || 
          (previousContext.lastQuery && 
           healthcareService.isHealthcareQuery(previousContext.lastQuery, previousContext.language))) {
        
        console.log('Continuing healthcare conversation thread');
        
        // Add previous context to current context
        context.conversationHistory = previousContext;
        context.healthcareContext = {
          ...context.healthcareContext,
          query: text,
          language: lang,
          officialLanguageRequired: true,
          previousQuery: previousContext.lastQuery,
          isContinuation: true
        };
        
        // Always use AI for healthcare conversation threads
        console.log('Processing with AI healthcare continuation response');
        return await handleAIResponse(replyToken, userId, text, context);
      }
    }
    
    // If it's a healthcare query, process it accordingly
    if (isHealthcare) {
      console.log('Healthcare-related query detected');
      
      // Always use AI for healthcare queries with appropriate context
      // Enhance context with healthcare information from both services
      context.healthcareContext = {
        query: text,
        language: lang,
        officialLanguageRequired: true,  // Signal to use official, formal language
        healthcareData: healthcareService.healthcareKnowledge[lang] || healthcareService.healthcareKnowledge.en
      };
      
      // Check if this is a research query about healthcare
      if (config.research.enabled && researchService.isHealthcareQuery(text, lang)) {
        try {
          console.log('Researching healthcare topic');
          const researchResults = await researchService.researchTopic(text, lang);
          
          if (researchResults) {
            context.healthcareResearch = researchResults;
            console.log('Added healthcare research to context');
          }
        } catch (error) {
          console.error('Error in healthcare research flow:', error);
          // Fall back to normal AI response
          return handleAIResponse(event.replyToken, userId, text, context);
        }
      }
      
      // Use AI with healthcare context
      console.log('Processing with AI healthcare response');
      return handleAIResponse(event.replyToken, userId, text, context);
    }
    
    // If it's a greeting and not healthcare, send a simple greeting
    if (isGreeting) {
      console.log('Greeting detected, sending greeting response');
      return sendSimpleGreeting(replyToken, lang);
    }
    
    // For any other message, use AI with appropriate context
    console.log('Processing with AI response');
    return handleAIResponse(event.replyToken, userId, text, context);
  } catch (error) {
    console.error('Error handling text message:', error);
    return sendErrorResponse(event.replyToken, 'Sorry, something went wrong. Please try again later.');
  }
};

/**
 * Send an error response to the user
 */
const sendErrorResponse = async (replyToken, message) => {
  try {
    return await safeLineAPI.replyMessage(replyToken, {
      type: 'text',
      text: message
    });
  } catch (error) {
    console.error('Error sending error response:', error);
    // At this point, we can't do much more
  }
};

/**
 * Handle greeting messages
 */
const handleGreeting = async (replyToken, displayName, lang) => {
  try {
    const message = {
      type: 'text',
      text: getMessage('greeting', lang, displayName)
    };
    
    console.log('Sending greeting message:', JSON.stringify(message, null, 2));
    return await safeLineAPI.replyMessage(replyToken, message);
  } catch (error) {
    console.error('Error in handleGreeting:', error);
    return sendErrorResponse(replyToken, getMessage('errorProcessing', lang));
  }
};

/**
 * Handle purchase history requests
 */
const handlePurchaseHistoryRequest = async (replyToken, userId, lang) => {
  try {
    const purchaseHistory = productService.getPurchaseHistory(userId, lang);
    console.log('Purchase history:', JSON.stringify(purchaseHistory, null, 2));
    
    let message;
    if (purchaseHistory.length === 0) {
      message = {
        type: 'text',
        text: getMessage('noPurchaseHistory', lang)
      };
    } else {
      const recentPurchases = purchaseHistory
        .slice(0, 5)
        .map((purchase, index) => {
          const date = new Date(purchase.purchaseDate).toLocaleDateString();
          return `${index + 1}. ${purchase.productName} - $${purchase.price} (${date})`;
        })
        .join('\n');
      
      message = {
        type: 'text',
        text: `${getMessage('purchaseHistory', lang)}\n${recentPurchases}`
      };
    }
    
    console.log('Sending purchase history message:', JSON.stringify(message, null, 2));
    return await safeLineAPI.replyMessage(replyToken, message);
  } catch (error) {
    console.error('Error in handlePurchaseHistoryRequest:', error);
    return sendErrorResponse(replyToken, getMessage('errorPurchaseHistory', lang));
  }
};

/**
 * Handle products request
 */
const handleProductsRequest = async (replyToken, lang) => {
  try {
    const products = productService.getAllProducts(lang);
    console.log('Products list:', JSON.stringify(products, null, 2));
    
    const productList = products
      .map((product, index) => {
        return `${index + 1}. ${product.name} - $${product.price}\n   ${product.description}`;
      })
      .join('\n\n');
    
    const message = {
      type: 'text',
      text: `${getMessage('productsList', lang)}\n\n${productList}`
    };
    
    console.log('Sending products message:', JSON.stringify(message, null, 2));
    return await safeLineAPI.replyMessage(replyToken, message);
  } catch (error) {
    console.error('Error in handleProductsRequest:', error);
    return sendErrorResponse(replyToken, getMessage('errorProductList', lang));
  }
};

/**
 * Handle help requests
 */
const handleHelpRequest = async (replyToken, lang) => {
  try {
    // Add healthcare and research commands to help message
    const standardHelp = getMessage('help', lang);
    const healthcareHelp = lang === 'th' 
      ? '\n\nคุณสามารถถามเกี่ยวกับเรื่องสุขภาพเพื่อรับข้อมูลเกี่ยวกับ HIV และโรคติดต่อทางเพศสัมพันธ์ต่างๆ'
      : '\n\nYou can ask about health topics to get information about HIV and STDs.';
    const researchHelp = lang === 'th'
      ? '\n\n' + getMessage('researchHelp', 'th')
      : '\n\n' + getMessage('researchHelp', 'en');
    
    const message = {
      type: 'text',
      text: standardHelp + healthcareHelp + researchHelp
    };
    
    console.log('Sending help message:', JSON.stringify(message, null, 2));
    return await safeLineAPI.replyMessage(replyToken, message);
  } catch (error) {
    console.error('Error in handleHelpRequest:', error);
    return sendErrorResponse(replyToken, getMessage('errorHelp', lang));
  }
};

/**
 * Handle AI response
 * @param {string} replyToken - LINE reply token
 * @param {string} userId - User ID
 * @param {string} text - User message
 * @param {object} context - Context object
 * @returns {Promise} - LINE API response
 */
const handleAIResponse = async (replyToken, userId, text, context) => {
  try {
    console.log(`Getting AI response for: ${text}`);
    
    // Get response from OpenRouter
    const aiResponse = await openRouterService.generateResponse(text, context);
    
    console.log('AI response received:', aiResponse.substring(0, 100) + '...');
    
    // Send AI response
    return sendTextMessage(replyToken, aiResponse, context.language || 'en');
  } catch (error) {
    console.error('Error in handleAIResponse:', error);
    return sendErrorResponse(replyToken, getMessage('errorAI', context.language || 'en'));
  } finally {
    // Before returning from handleAIResponse, store the context
    storeConversationContext(userId, context);
  }
};

/**
 * Handle research queries
 */
const handleResearchQuery = async (replyToken, query, lang) => {
  try {
    // Extract the actual query from the command
    let researchQuery;
    if (lang === 'th' && query.toLowerCase().startsWith('ค้นคว้า ')) {
      researchQuery = query.substring(8).trim();
    } else if (query.toLowerCase().startsWith('research ')) {
      researchQuery = query.substring(9).trim();
    } else {
      researchQuery = query;
    }
    
    // Check if the query is healthcare related
    if (!researchService.isHealthcareQuery(researchQuery, lang)) {
      // Not healthcare related, inform user
      return await safeLineAPI.replyMessage(replyToken, {
        type: 'text',
        text: lang === 'th' 
          ? 'ขออภัย บอทนี้ให้ข้อมูลเกี่ยวกับสุขภาพเท่านั้น โปรดถามคำถามเกี่ยวกับสุขภาพ การแพทย์ หรือโรคต่างๆ' 
          : 'Sorry, this bot only provides healthcare information. Please ask questions about health, medical topics, or diseases.'
      });
    }
    
    // First, send a "researching" message
    await safeLineAPI.replyMessage(replyToken, {
      type: 'text',
      text: getMessage('research', lang)
    });
    
    // Perform the research
    console.log(`Performing healthcare research for: ${researchQuery}`);
    const researchResults = await researchService.researchTopic(researchQuery, lang);
    
    // Send the research results in a new message
    // Note: Since we've already replied to the initial message, we need to use pushMessage instead
    return await safeLineAPI.pushMessage(getSourceId(replyToken), {
      type: 'text',
      text: researchResults
    });
  } catch (error) {
    console.error('Error in handleResearchQuery:', error);
    return safeLineAPI.pushMessage(getSourceId(replyToken), {
      type: 'text',
      text: getMessage('errorResearch', lang)
    });
  }
};

/**
 * Extract source ID from a reply token
 * This is a workaround since we can't directly get the userId from a replyToken
 * In a real implementation, you would store the userId when receiving the initial message
 */
const getSourceId = (replyToken) => {
  // This is a mock implementation
  // In a real scenario, you would need to maintain a mapping of replyTokens to userIds
  return 'U' + replyToken.substring(0, 32);
};

/**
 * Process LINE webhook events
 */
const handleEvent = async (event) => {
  console.log('Handling event:', JSON.stringify(event, null, 2));
  
  // Default language is English, will be detected for text messages
  let lang = 'en';
  
  // Handle different event types
  switch (event.type) {
    case 'message':
      if (event.message.type === 'text') {
        // Detect language from message for text messages
        lang = detectLanguage(event.message.text);
        return await handleTextMessage(event);
      } else {
        console.log(`Unhandled message type: ${event.message.type}`);
        return sendErrorResponse(
          event.replyToken, 
          getMessage('textMessagesOnly', lang)
        );
      }
    
    case 'follow':
      // Handle when a user adds the bot as a friend
      return await handleFollowEvent(event);
      
    case 'unfollow':
      // Handle when a user blocks the bot
      console.log(`User ${event.source.userId} unfollowed the bot`);
      return Promise.resolve(null);
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
      return Promise.resolve(null);
  }
};

/**
 * Handle follow events (when a user adds the bot as a friend)
 */
const handleFollowEvent = async (event) => {
  try {
    const { userId } = event.source;
    
    // Get user profile
    const profile = await safeLineAPI.getProfile(userId);
    
    // Default to English for welcome message, can be changed later
    const lang = 'en';
    
    // Welcome message
    const message = {
      type: 'text',
      text: getMessage('welcome', lang, profile.displayName)
    };
    
    console.log('Sending welcome message:', JSON.stringify(message, null, 2));
    return await safeLineAPI.replyMessage(event.replyToken, message);
  } catch (error) {
    console.error('Error in handleFollowEvent:', error);
    return sendErrorResponse(event.replyToken, 'Welcome! Type "help" to see what I can do!');
  }
};

/**
 * Send a text message reply
 * @param {string} token - Reply token
 * @param {string} text - Message text
 * @param {string} language - Language code
 * @returns {Promise} - LINE API response
 */
const sendTextMessage = (token, text, language = 'en') => {
  // Process message to fit LINE's limits
  const processedText = processMessageForLineLength(text, language);
  
  return safeLineAPI.replyMessage(token, {
    type: 'text',
    text: processedText
  });
};

/**
 * Send a simple greeting message
 * @param {string} replyToken - LINE reply token
 * @param {string} language - Language code
 * @returns {Promise} - LINE API response
 */
const sendSimpleGreeting = (replyToken, language = 'en') => {
  const greeting = language === 'th' 
    ? 'สวัสดีค่ะ/ครับ ยินดีต้อนรับสู่บริการให้ข้อมูลสุขภาพของเรา คุณสามารถถามคำถามเกี่ยวกับสุขภาพหรือโรคติดต่อทางเพศสัมพันธ์ได้เลยค่ะ/ครับ' 
    : 'Hello! Welcome to our healthcare information service. Feel free to ask any questions about health or sexually transmitted infections.';
  
  return sendTextMessage(replyToken, greeting, language);
};

// Test the line configuration
if (isDevelopment) {
  console.log('Skipping LINE client configuration test in development mode');
} else {
  safeLineAPI.getProfile('test')
    .then(() => console.log('LINE client configuration test: OK'))
    .catch(error => {
      if (error.statusCode === 404) {
        console.log('LINE client configuration seems valid (404 is expected for test user)');
      } else {
        console.error('LINE client configuration test failed:', error.message);
      }
    });
}

module.exports = {
  handleEvent,
  client: safeLineAPI,
  storeConversationContext,
  getConversationContext
}; 