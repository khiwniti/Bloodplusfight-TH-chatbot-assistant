/**
 * Simple test for healthcare conversation flow
 */
const openRouterService = require('./services/openRouterService');
const lineBotService = require('./services/lineBotService');

// Mock customerService to avoid database dependencies
lineBotService.customerService = {
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

// Test conversation continuity directly with OpenRouter
const testSimpleConversation = async () => {
  try {
    console.log('Testing simple conversation continuity...');
    
    const userId = 'test-user-456';
    
    // First message context
    const firstContext = {
      language: 'th',
      customerName: 'Test User',
      healthcareContext: {
        query: 'HIV รักษาหายไหม',
        language: 'th',
        officialLanguageRequired: true
      }
    };
    
    // First query - about HIV treatment
    console.log('\n=== First Query: HIV รักษาหายไหม ===');
    const firstResponse = await openRouterService.generateResponse('HIV รักษาหายไหม', firstContext);
    console.log('\n=== Response: ===');
    console.log(firstResponse);
    
    // Store conversation context
    lineBotService.storeConversationContext(userId, firstContext);
    
    // Get previous context
    const previousContext = lineBotService.getConversationContext(userId);
    console.log('\n=== Retrieved Context: ===');
    console.log(previousContext);
    
    // Follow-up query context
    const secondContext = {
      language: 'th',
      customerName: 'Test User',
      conversationHistory: previousContext,
      healthcareContext: {
        query: 'วัคซีนหล่ะ มีหรือยัง',
        language: 'th',
        previousQuery: previousContext?.lastQuery,
        isContinuation: true,
        officialLanguageRequired: true
      }
    };
    
    // Follow-up query about vaccines
    console.log('\n=== Follow-up Query: วัคซีนหล่ะ มีหรือยัง ===');
    const secondResponse = await openRouterService.generateResponse('วัคซีนหล่ะ มีหรือยัง', secondContext);
    console.log('\n=== Response: ===');
    console.log(secondResponse);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error in simple conversation test:', error);
  }
};

// Run the test
testSimpleConversation(); 