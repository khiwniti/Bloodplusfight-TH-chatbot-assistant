// In-memory conversation store for when database is not available
const inMemoryConversations = new Map();
const logger = require('./loggerService');

/**
 * Get active conversation for a user
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} Conversation object
 */
const getActiveConversation = async (lineUserId, displayName = 'User') => {
  try {
    return getInMemoryConversation(lineUserId, displayName);
  } catch (error) {
    logger.error('Error getting active conversation', error, { lineUserId });
    return getInMemoryConversation(lineUserId, displayName);
  }
};

/**
 * Get in-memory conversation for a user
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Object} Conversation object
 */
const getInMemoryConversation = (lineUserId, displayName = 'User') => {
  if (!inMemoryConversations.has(lineUserId)) {
    inMemoryConversations.set(lineUserId, {
      lineUserId,
      displayName,
      status: 'active',
      language: 'en',
      messages: [],
      sessionStart: new Date(),
      lastActivity: new Date(),
      metadata: new Map(),
      sentiment: 'unknown',
      topics: [],
      intents: []
    });
  }
  
  const conversation = inMemoryConversations.get(lineUserId);
  
  // Update display name if provided
  if (displayName && displayName !== 'User' && conversation.displayName !== displayName) {
    conversation.displayName = displayName;
  }
  
  return conversation;
};

/**
 * Add message to conversation
 * @param {Object} conversation - Conversation object
 * @param {string} role - Message role ('user', 'assistant', 'system')
 * @param {string} content - Message content
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Updated conversation
 */
const addMessage = async (conversation, role, content, metadata = {}) => {
  try {
    if (!conversation.messages) {
      conversation.messages = [];
    }
    
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata
    });
    
    conversation.lastActivity = new Date();
    return conversation;
  } catch (error) {
    logger.error('Error adding message to conversation', error, { 
      lineUserId: conversation.lineUserId,
      role
    });
    // Fallback to in-memory if error
    const inMemoryConversation = getInMemoryConversation(conversation.lineUserId, conversation.displayName);
    inMemoryConversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata
    });
    inMemoryConversation.lastActivity = new Date();
    return inMemoryConversation;
  }
};

/**
 * Get conversation history for a user
 * @param {string} lineUserId - LINE user ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} Conversation history
 */
const getConversationHistory = async (lineUserId, limit = 10) => {
  try {
    const conversation = inMemoryConversations.get(lineUserId);
    if (!conversation) return [];
    return conversation.messages
      .slice(-limit)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
  } catch (error) {
    logger.error('Error getting conversation history', error, { lineUserId });
    return [];
  }
};

/**
 * Update conversation language
 * @param {Object} conversation - Conversation object
 * @param {string} language - Language code ('en' or 'th')
 * @returns {Promise<Object>} Updated conversation
 */
const updateLanguage = async (conversation, language) => {
  try {
    conversation.language = language;
    return conversation;
  } catch (error) {
    logger.error('Error updating conversation language', error, { 
      lineUserId: conversation.lineUserId 
    });
    return conversation;
  }
};

/**
 * Close conversation
 * @param {Object} conversation - Conversation object
 * @returns {Promise<Object>} Updated conversation
 */
const closeConversation = async (conversation) => {
  try {
    conversation.status = 'ended';
    return conversation;
  } catch (error) {
    logger.error('Error closing conversation', error, { 
      lineUserId: conversation.lineUserId 
    });
    return conversation;
  }
};

/**
 * Archive old conversations (no-op for in-memory)
 * @param {number} daysOld - Days to consider a conversation old
 * @returns {Promise<number>} Number of archived conversations
 */
const archiveOldConversations = async (daysOld = 7) => {
  // No-op for in-memory
  return 0;
};

module.exports = {
  getActiveConversation,
  getInMemoryConversation,
  addMessage,
  getConversationHistory,
  updateLanguage,
  closeConversation,
  archiveOldConversations
};