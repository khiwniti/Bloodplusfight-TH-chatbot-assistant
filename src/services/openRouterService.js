const axios = require('axios');
const config = require('../../config/config');
const researchService = require('./researchService');
const healthcareService = require('./healthcareService');

/**
 * Generate response using OpenRouter API with context
 * @param {string} userMessage - User message
 * @param {object} context - Context (customer data, language, etc.)
 * @returns {Promise<string>} - AI-generated response
 */
const generateResponse = async (userMessage, context = {}) => {
  try {
    const language = context.language || 'en';
    
    console.log(`Generating response with OpenRouter for "${userMessage}" (${language})`);
    console.log('Context keys:', Object.keys(context));
    
    // Build system message with context
    let systemMessage = 'You are a helpful LINE bot assistant for a healthcare organization. ';
    systemMessage += 'Provide accurate, friendly, conversational responses that sound natural, not robotic. ';
    systemMessage += 'Maintain conversation continuity by referencing previous messages when appropriate. ';
    
    // Add language instructions
    if (language === 'th') {
      systemMessage += `\nPlease respond in formal, official Thai language (ภาษาไทยแบบทางการ) with proper grammar and natural conversational style.
Use คะ/ครับ appropriately for formal communication. Avoid casual language, slang, or overly informal expressions.
For medical and healthcare topics, use precise medical terminology where appropriate, but explain complex terms.
Format your responses with proper spacing and paragraph breaks according to Thai language rules.
When discussing healthcare information, maintain a professional, trustworthy tone appropriate for official healthcare communication.
If this is a follow-up question, reference the previous conversation for continuity.`;
    } else {
      systemMessage += `\nPlease respond in conversational English with a friendly, professional tone.
Avoid overly formal language and make your responses sound natural and personalized.
If this is a follow-up question, reference the previous conversation for continuity.`;
    }
    
    // Add healthcare context if available
    if (context.healthcareContext) {
      systemMessage += `\n\nThis is a healthcare-related query that requires professional medical information. 
You must provide accurate healthcare information using official medical terminology with clear explanations.
Maintain formal tone appropriate for medical advice while being accessible and understandable.
Always remind users to consult healthcare professionals for personalized medical advice.`;
    }
    
    // Prepare customer context
    const customerContext = {
      name: context.customerName || 'Customer',
      preferences: context.preferences || [],
      purchaseHistory: context.purchaseHistory || []
    };
    
    // Prepare messages for the API call
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Customer name: ${customerContext.name}\nLanguage: ${language}\nMessage: ${userMessage}` }
    ];
    
    // Add conversation history when available
    if (context.conversationHistory) {
      console.log('Adding conversation history to context');
      
      // If this is a continuation, insert conversation history for context
      messages.splice(1, 0, { 
        role: 'assistant',
        content: `Previous topic: We were discussing healthcare topics. Your previous query was about "${context.conversationHistory.lastQuery}". I'll continue our conversation about healthcare information.`
      });
      
      if (context.healthcareContext?.isContinuation) {
        messages.push({ 
          role: 'user',
          content: `This is a follow-up question to my previous question about "${context.conversationHistory.lastQuery}". Please maintain continuity in your response.`
        });
      }
    }
    
    // Add healthcare research if available
    if (context.healthcareResearch) {
      messages.push({ 
        role: 'assistant',
        content: `I've found this healthcare information for you: ${context.healthcareResearch}`
      });
      messages.push({ 
        role: 'user',
        content: `Based on this healthcare information, please provide a comprehensive, accurate and professional response to my question: "${userMessage}"`
      });
    }
    
    // Add healthcare data when available for better context
    if (context.healthcareContext && context.healthcareContext.healthcareData) {
      // Convert the healthcare data object to a string
      const healthcareDataString = JSON.stringify(context.healthcareContext.healthcareData);
      
      messages.push({ 
        role: 'assistant',
        content: `I have access to verified healthcare information to help answer your query accurately.`
      });
    }
    
    // Make OpenRouter API call
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.openRouter.model,
        messages: messages,
        temperature: 0.8,  // Slightly higher for more varied responses
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'HTTP-Referer': config.openRouter.httpReferer || 'https://line-bot-app.com',
          'X-Title': config.openRouter.xTitle || 'LINE Bot Healthcare',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract and return the response content
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message && 
        response.data.choices[0].message.content) {
      
      const rawResponse = response.data.choices[0].message.content.trim();
      return processAIResponse(rawResponse);
    }
    
    throw new Error('Invalid response format from OpenRouter API');
  } catch (error) {
    console.error('Error in OpenRouter generation:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get relevant healthcare context based on the query
 * @param {string} query - User query
 * @param {string} lang - Language code
 * @returns {string} - Healthcare context for the AI
 */
const getHealthcareContext = (query, lang) => {
  const lowerQuery = query.toLowerCase();
  const knowledge = healthcareService.healthcareKnowledge[lang] || healthcareService.healthcareKnowledge.en;
  let context = '';
  
  // Extract relevant sections based on query content
  if (lowerQuery.includes('hiv') || lowerQuery.includes('เอชไอวี')) {
    context += knowledge.understanding.hiv + '\n\n';
    
    // If query asks about prevention
    if (lowerQuery.includes('prevent') || 
        lowerQuery.includes('protect') || 
        lowerQuery.includes('ป้องกัน')) {
      context += knowledge.prevention.condoms + '\n' + knowledge.prevention.prep + '\n\n';
    }
    
    // If query asks about treatment
    if (lowerQuery.includes('treat') || 
        lowerQuery.includes('cure') || 
        lowerQuery.includes('รักษา')) {
      context += knowledge.treatment.hiv + '\n\n';
    }
  }
  
  // Add general STD information if mentioned
  if (lowerQuery.includes('std') || 
      lowerQuery.includes('sti') || 
      lowerQuery.includes('โรคติดต่อทางเพศสัมพันธ์')) {
    context += knowledge.understanding.stds + '\n\n';
  }
  
  // Add information about testing if mentioned
  if (lowerQuery.includes('test') || 
      lowerQuery.includes('check') || 
      lowerQuery.includes('ตรวจ')) {
    context += knowledge.testing.locations + '\n' + knowledge.testing.process + '\n\n';
  }
  
  // If not enough specific context, add general information
  if (context.length < 100) {
    if (lowerQuery.includes('prevent') || lowerQuery.includes('ป้องกัน')) {
      context += knowledge.prevention.condoms + '\n' + knowledge.prevention.testing + '\n\n';
    } else if (lowerQuery.includes('symptom') || lowerQuery.includes('อาการ')) {
      context += knowledge.understanding.symptoms + '\n\n';
    }
  }
  
  // Always add the disclaimer
  context += knowledge.disclaimer;
  
  return context;
};

/**
 * Generate a response with a custom system prompt
 * @param {string} query - User query
 * @param {string} contentContext - Additional context from research
 * @param {string} customSystemPrompt - Custom system prompt
 * @returns {Promise<string>} - AI-generated response
 */
const generateCustomResponse = async (query, contentContext, customSystemPrompt) => {
  try {
    console.log('Generating custom response with OpenRouter');
    
    // Determine language
    const language = detectLanguage(query);
    
    // Prepare the messages
    const messages = [
      { role: 'system', content: customSystemPrompt },
      { role: 'user', content: `Query: ${query}\n\nContent: ${contentContext}` }
    ];
    
    // Make the OpenRouter API call
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.openRouter.model,
        messages: messages,
        temperature: 0.5, // Lower temperature for more factual, consistent responses
        max_tokens: 600
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'HTTP-Referer': config.openRouter.httpReferer || 'https://line-bot-app.com',
          'X-Title': config.openRouter.xTitle || 'LINE Bot Healthcare',
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract and return the response content
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message && 
        response.data.choices[0].message.content) {
      
      const rawResponse = response.data.choices[0].message.content.trim();
      return processAIResponse(rawResponse);
    }
    
    throw new Error('Invalid response format from OpenRouter API');
  } catch (error) {
    console.error('Error in OpenRouter custom response generation:', error.response?.data || error.message);
    throw error;
  }
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
 * Process AI response to remove any system instructions
 * @param {string} response - AI response text
 * @returns {string} - Processed response
 */
const processAIResponse = (response) => {
  if (!response) return '';
  
  // Check for some common system instruction patterns in the full response
  const fullCleaningPatterns = [
    // Match patterns like "I'll provide information about X" at the beginning of the text
    /^(I'll|Let me|I will|I am|I'm going to).+?(provide|explain|respond|answer|address).+?\n\n/is,
    
    // Match patterns like "Here is information about X" at the beginning of the text
    /^(Here is|Here's|Following is).+?(information|response|answer).+?\n\n/is,
  ];
  
  // Try cleaning the full response first
  for (const pattern of fullCleaningPatterns) {
    if (pattern.test(response)) {
      response = response.replace(pattern, '');
      console.log('Removed system instructions from response beginning');
    }
  }
  
  // Split the response into paragraphs
  const paragraphs = response.split('\n\n');
  if (paragraphs.length <= 1) {
    return response; // Not enough paragraphs to process
  }
  
  // Check if first paragraphs look like system instructions
  const firstParagraph = paragraphs[0].toLowerCase();
  
  const instructionWords = [
    'i\'ll', 'i will', 'let me', 'remember', 'as requested', 'i can', 'i\'m going to',
    'here is', 'here\'s', 'responding to', 'regarding your', 'to answer',
    'you asked', 'for your query', 'in response', 'looking at', 'please find',
    'about hiv', 'about your question', 'based on your', 'following your', 
    'key points', 'points to cover', 'topics to cover'
  ];
  
  // Check if the first paragraph contains instruction words
  if (instructionWords.some(word => firstParagraph.includes(word))) {
    // Remove the first paragraph if it looks like instruction
    console.log('Removed introductory system instruction paragraph');
    return paragraphs.slice(1).join('\n\n').trim();
  }
  
  // Check if first two paragraphs are both short and look like instructions
  if (paragraphs.length > 2 && 
      paragraphs[0].length < 150 && 
      paragraphs[1].length < 200 &&
      instructionWords.some(word => (paragraphs[0] + paragraphs[1]).toLowerCase().includes(word))) {
    console.log('Removed first two paragraphs that appear to be system instructions');
    return paragraphs.slice(2).join('\n\n').trim();
  }
  
  return response.trim();
};

module.exports = {
  generateResponse,
  generateCustomResponse
}; 