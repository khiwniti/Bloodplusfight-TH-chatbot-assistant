const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');
const logger = require('./loggerService');

// In-memory conversation store for when database is not available
const inMemoryConversations = new Map();

// Timeout for MongoDB operations in milliseconds
const MONGODB_OPERATION_TIMEOUT = 5000;

/**
 * Check if MongoDB is connected
 * @returns {boolean} Connection status
 */
const isMongoDBConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Execute MongoDB operation with timeout protection
 * @param {Function} operation - MongoDB operation to execute
 * @param {Function} fallback - Fallback function if operation fails
 * @returns {Promise<any>} Operation result or fallback result
 */
const executeWithTimeout = async (operation, fallback) => {
  if (!isMongoDBConnected()) {
    logger.debug('MongoDB not connected, using fallback for conversation operation');
    return fallback();
  }

  try {
    // Create a timeout promise that rejects after specified time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MongoDB operation timed out')), MONGODB_OPERATION_TIMEOUT);
    });

    // Race the operation against the timeout
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    logger.error('MongoDB conversation operation failed:', error);
    return fallback();
  }
};

/**
 * Get active conversation for a user
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} Conversation object
 */
const getActiveConversation = async (lineUserId, displayName = 'User') => {
  try {
    return await executeWithTimeout(
      async () => {
        let conversation = await Conversation.getActiveConversation(lineUserId);
        
        // Update display name if provided
        if (displayName && displayName !== 'User' && conversation.displayName !== displayName) {
          conversation.displayName = displayName;
        }
        
        return conversation;
      },
      () => getInMemoryConversation(lineUserId, displayName)
    );
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
    if (isMongoDBConnected() && conversation instanceof mongoose.Model) {
      // MongoDB conversation
      conversation.addMessage(role, content, metadata);
      await conversation.save();
      return conversation;
    } else {
      // In-memory conversation
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
    }
  } catch (error) {
    logger.error('Error adding message to conversation', error, { 
      lineUserId: conversation.lineUserId,
      role
    });
    
    // Fallback to in-memory if MongoDB operation failed
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
    return await executeWithTimeout(
      async () => {
        const conversation = await Conversation.findOne({ 
          lineUserId, 
          status: 'active' 
        }).sort({ lastActivity: -1 }).lean();
        
        if (!conversation) return [];
        
        // Return the most recent messages, up to the limit
        return conversation.messages
          .slice(-limit)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }));
      },
      () => {
        const conversation = inMemoryConversations.get(lineUserId);
        if (!conversation) return [];
        
        return conversation.messages
          .slice(-limit)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }));
      }
    );
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
    if (isMongoDBConnected() && conversation instanceof mongoose.Model) {
      conversation.language = language;
      await conversation.save();
      return conversation;
    } else {
      conversation.language = language;
      return conversation;
    }
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
    if (isMongoDBConnected() && conversation instanceof mongoose.Model) {
      conversation.status = 'ended';
      await conversation.save();
      return conversation;
    } else {
      conversation.status = 'ended';
      return conversation;
    }
  } catch (error) {
    logger.error('Error closing conversation', error, { 
      lineUserId: conversation.lineUserId 
    });
    return conversation;
  }
};

/**
 * Archive old conversations
 * @param {number} daysOld - Days to consider a conversation old
 * @returns {Promise<number>} Number of archived conversations
 */
const archiveOldConversations = async (daysOld = 7) => {
  try {
    if (!isMongoDBConnected()) {
      logger.info('MongoDB not connected, skipping conversation archiving');
      return 0;
    }
    
    const result = await Conversation.archiveOldConversations(daysOld);
    logger.info(`Archived ${result.modifiedCount} old conversations`);
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error archiving old conversations', error);
    return 0;
  }
};

module.exports = {
  getActiveConversation,
  addMessage,
  getConversationHistory,
  updateLanguage,
  closeConversation,
  archiveOldConversations
};