/**
 * Test script for conversation continuity
 */
const openRouterService = require('./services/openRouterService');

const testConversation = async () => {
  try {
    console.log('Testing conversation continuity...');
    
    // Initial context
    const userId = 'test-user-123';
    const context = {
      language: 'th',
      customerName: 'Test User',
      purchaseHistory: [],
      preferences: [],
      healthcareContext: {
        query: 'HIV รักษาหายไหม',
        language: 'th',
        officialLanguageRequired: true,
        healthcareData: {
          // Simplified healthcare data for testing
          understanding: {
            hiv: 'HIV (เอชไอวี) เป็นไวรัสที่โจมตีระบบภูมิคุ้มกัน'
          },
          treatment: {
            hiv: 'HIV จัดการด้วยยาต้านไวรัส (ART) ซึ่งกดไวรัสและป้องกันการพัฒนาไปสู่โรคเอดส์'
          }
        }
      }
    };
    
    // First query
    console.log('First query: HIV รักษาหายไหม');
    const firstResponse = await openRouterService.generateResponse('HIV รักษาหายไหม', context);
    console.log('----- First Response -----');
    console.log(firstResponse.substring(0, 200) + '...');
    console.log('--------------------------');
    
    // Store conversation context (simplified)
    const conversationContext = {
      lastQuery: context.healthcareContext.query,
      language: context.language,
      timestamp: new Date().getTime()
    };
    
    // Update context with conversation history
    const followUpContext = {
      ...context,
      conversationHistory: conversationContext,
      healthcareContext: {
        ...context.healthcareContext,
        previousQuery: conversationContext.lastQuery,
        isContinuation: true,
        query: 'วัคซีนหล่ะ มีหรือยัง'
      }
    };
    
    // Follow-up query
    console.log('Follow-up query: วัคซีนหล่ะ มีหรือยัง');
    const followUpResponse = await openRouterService.generateResponse('วัคซีนหล่ะ มีหรือยัง', followUpContext);
    console.log('----- Follow-up Response -----');
    console.log(followUpResponse.substring(0, 200) + '...');
    console.log('-----------------------------');
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error in conversation continuity test:', error);
  }
};

// Run the test
testConversation(); 