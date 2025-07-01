/**
 * OpenRouter Service Test
 * Tests the conversation continuity feature
 */
const openRouterService = require('./services/openRouterService');

// Simple in-memory conversation context store
const conversationContexts = {};

/**
 * Store conversation context
 * @param {string} userId - User ID
 * @param {object} context - Context object
 */
const storeConversationContext = (userId, context) => {
  conversationContexts[userId] = {
    lastQuery: context.healthcareContext?.query || '',
    lastTopic: context.healthcareContext?.topic || '',
    language: context.language,
    timestamp: new Date().getTime()
  };
  
  console.log(`Stored conversation context for ${userId}:`, conversationContexts[userId]);
};

/**
 * Get stored conversation context
 * @param {string} userId - User ID
 * @returns {object|null} - Stored context or null
 */
const getConversationContext = (userId) => {
  const context = conversationContexts[userId];
  if (context) {
    console.log(`Retrieved conversation context for ${userId}:`, context);
    return context;
  }
  return null;
};

const testOpenRouter = async () => {
  try {
    console.log('Testing OpenRouter conversation continuity...');
    
    const userId = 'test-user-789';
    
    // First query - about HIV treatment
    console.log('\n=== First Query: HIV รักษาหายไหม ===');
    const firstContext = {
      language: 'th',
      customerName: 'Test User',
      healthcareContext: {
        query: 'HIV รักษาหายไหม',
        language: 'th',
        officialLanguageRequired: true
      }
    };
    
    const firstResponse = await openRouterService.generateResponse('HIV รักษาหายไหม', firstContext);
    console.log('\n=== First Response: ===');
    console.log(firstResponse);
    
    // Store conversation context
    storeConversationContext(userId, firstContext);
    
    // Get previous context
    const previousContext = getConversationContext(userId);
    
    // Follow-up query about vaccines
    console.log('\n=== Follow-up Query: วัคซีนหล่ะ มีหรือยัง ===');
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
    
    const secondResponse = await openRouterService.generateResponse('วัคซีนหล่ะ มีหรือยัง', secondContext);
    console.log('\n=== Follow-up Response: ===');
    console.log(secondResponse);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error testing OpenRouter:', error);
  }
};

// Run the test
testOpenRouter(); 