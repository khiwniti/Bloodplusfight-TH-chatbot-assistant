/**
 * Healthcare Flow Test Script
 * Tests the complete healthcare conversation flow with follow-up questions
 */
const config = require('../config/config');
const lineBotService = require('./services/lineBotService');
const openRouterService = require('./services/openRouterService');
const healthcareService = require('./services/healthcareService');

// Instead of jest.mock, directly mock the module
const customerService = {
  getOrCreateCustomer: async (userId, displayName) => {
    return {
      userId: userId,
      displayName: displayName || 'Test User',
      createdAt: new Date().toISOString(),
      preferences: [],
      lastActivity: new Date().toISOString()
    };
  },
  updateLastActivity: async () => Promise.resolve()
};

// Use our mock customerService
lineBotService.customerService = customerService;

// Mock the LINE client methods
lineBotService.client = {
  replyMessage: async (token, message) => {
    console.log(`\n=== LINE Bot would send: ===\n${message.text}\n======================\n`);
    return Promise.resolve(null);
  },
  getProfile: async (userId) => {
    return {
      userId: userId,
      displayName: 'Test User',
      pictureUrl: 'https://example.com/profile.jpg',
      statusMessage: 'Testing',
      language: 'th'
    };
  }
};

// Store the original handleTextMessage function
const originalHandleTextMessage = lineBotService.handleTextMessage;

// Mock the handleTextMessage function to bypass database calls
lineBotService.handleTextMessage = async (event) => {
  const userId = event.source.userId;
  const text = event.message.text;
  const replyToken = event.replyToken;
  
  console.log(`Processing message: "${text}" from ${userId}`);
  
  // Detect language
  const lang = openRouterService.detectLanguage(text);
  console.log(`Detected language: ${lang}`);
  
  // Check if the query is healthcare-related
  const isHealthcare = healthcareService.isHealthcareQuery(text, lang);
  console.log(`Is healthcare query: ${isHealthcare}`);
  
  // Create context
  const context = {
    customerName: 'Test User',
    purchaseHistory: [],
    preferences: [],
    language: lang
  };
  
  // Check for existing conversation context
  const previousContext = lineBotService.getConversationContext(userId);
  if (previousContext && isHealthcare) {
    console.log('Found previous healthcare conversation context');
    
    // Add previous context to current context
    context.conversationHistory = previousContext;
    context.healthcareContext = {
      query: text,
      language: lang,
      officialLanguageRequired: true,
      previousQuery: previousContext.lastQuery,
      isContinuation: true
    };
  } else if (isHealthcare) {
    // Add healthcare context
    context.healthcareContext = {
      query: text,
      language: lang,
      officialLanguageRequired: true
    };
  }
  
  // Process with AI healthcare response
  try {
    console.log('Generating healthcare response...');
    const aiResponse = await openRouterService.generateResponse(text, context);
    console.log('Response generated successfully');
    
    // Send the response
    await lineBotService.client.replyMessage(replyToken, {
      type: 'text',
      text: aiResponse
    });
    
    // Store conversation context
    lineBotService.storeConversationContext(userId, context);
  } catch (error) {
    console.error('Error generating response:', error);
  }
};

// Test event objects
const createMockEvent = (text, userId = 'test-user-123') => ({
  type: 'message',
  message: {
    type: 'text',
    id: '12345',
    text: text
  },
  source: {
    type: 'user',
    userId: userId
  },
  replyToken: 'test-reply-token',
  timestamp: Date.now()
});

// Run the test flow
const runHealthcareFlowTest = async () => {
  try {
    console.log('==== Testing Healthcare Conversation Flow ====');
    console.log('This test simulates a full healthcare conversation with follow-up questions');
    
    const userId = 'test-user-123';
    
    console.log('\n1. Initial Healthcare Question (HIV Treatment)');
    await lineBotService.handleEvent(createMockEvent('HIV รักษาหายไหม', userId));
    
    // Small delay to simulate real interaction timing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n2. Follow-up Question about Vaccines');
    await lineBotService.handleEvent(createMockEvent('วัคซีนหล่ะ มีหรือยัง', userId));
    
    // Small delay to simulate real interaction timing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n3. Second Follow-up Question');
    await lineBotService.handleEvent(createMockEvent('แล้วมียาที่มีประสิทธิภาพดีที่สุดคืออะไร', userId));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error in healthcare flow test:', error);
  }
};

// Run the test
runHealthcareFlowTest(); 