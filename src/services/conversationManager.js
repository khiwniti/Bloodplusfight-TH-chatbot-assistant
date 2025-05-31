/**
 * Conversation Manager Service
 * 
 * Provides robust conversation state management with context retention,
 * history tracking, and enhanced natural language understanding
 * for improved chatbot intelligence.
 */
const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('./loggerService');
const cachedResponseService = require('./cachedResponseService');
const db = require('../../config/db');

// In-memory conversation store as fallback when MongoDB is unavailable
const conversationStore = new Map();

// Maximum conversation age before creating a new session (24 hours in ms)
const MAX_CONVERSATION_AGE = 24 * 60 * 60 * 1000;

// Maximum number of messages to keep in memory per conversation
const MAX_MESSAGES_PER_CONVERSATION = 50;

// Conversation schema definition (will be used when MongoDB is available)
const ConversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: String,
  language: {
    type: String,
    default: 'en'
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }],
  context: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Create Conversation model (will be used when MongoDB is available)
let Conversation;
try {
  Conversation = mongoose.model('Conversation');
} catch (error) {
  Conversation = mongoose.model('Conversation', ConversationSchema);
}

/**
 * Generate a unique conversation ID
 * @param {string} userId - The user's LINE ID
 * @returns {string} - A unique conversation ID
 */
const generateConversationId = (userId) => {
  return `conv_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Create a new conversation
 * @param {string} userId - The user's LINE ID
 * @param {string} displayName - The user's display name
 * @param {string} language - The detected language code
 * @returns {Promise<Object>} - The created conversation
 */
const createConversation = async (userId, displayName = 'User', language = 'en') => {
  const conversationId = generateConversationId(userId);
  const now = new Date();
  
  const newConversation = {
    userId,
    conversationId,
    displayName,
    language,
    messages: [],
    context: {},
    createdAt: now,
    updatedAt: now,
    active: true
  };
  
  // Try to save to MongoDB if available
  if (db.isMongoDBConnected()) {
    try {
      const conversation = new Conversation(newConversation);
      await conversation.save();
      logger.info('Created new conversation in MongoDB', { userId, conversationId });
      return conversation.toObject();
    } catch (error) {
      logger.error('Failed to create conversation in MongoDB, using in-memory store', error);
    }
  }
  
  // Fallback to in-memory store
  conversationStore.set(conversationId, newConversation);
  logger.info('Created new conversation in memory', { userId, conversationId });
  
  return newConversation;
};

/**
 * Get active conversation for a user or create a new one
 * @param {string} userId - The user's LINE ID
 * @param {string} displayName - The user's display name (optional)
 * @returns {Promise<Object>} - The active conversation
 */
const getActiveConversation = async (userId, displayName = null) => {
  try {
    let conversation;
    
    // Try MongoDB first if available
    if (db.isMongoDBConnected()) {
      conversation = await Conversation.findOne({ 
        userId, 
        active: true,
        updatedAt: { $gt: new Date(Date.now() - MAX_CONVERSATION_AGE) } 
      }).sort({ updatedAt: -1 });
      
      if (conversation) {
        return conversation.toObject();
      }
    }
    
    // Check in-memory store if not found in MongoDB
    for (const [, conv] of conversationStore) {
      if (conv.userId === userId && 
          conv.active && 
          (Date.now() - new Date(conv.updatedAt).getTime()) < MAX_CONVERSATION_AGE) {
        return conv;
      }
    }
    
    // No active conversation found, create a new one
    return await createConversation(userId, displayName || 'User');
  } catch (error) {
    logger.error('Error getting active conversation', error);
    // Fallback to creating a new conversation
    return await createConversation(userId, displayName || 'User');
  }
};

/**
 * Add a message to a conversation
 * @param {Object} conversation - The conversation object
 * @param {string} role - The message role ('user', 'assistant', or 'system')
 * @param {string} content - The message content
 * @param {Object} metadata - Optional metadata for the message
 * @returns {Promise<Object>} - The updated conversation
 */
const addMessage = async (conversation, role, content, metadata = {}) => {
  try {
    const now = new Date();
    const message = {
      role,
      content,
      timestamp: now,
      metadata
    };
    
    // Update the conversation
    conversation.messages.push(message);
    conversation.updatedAt = now;
    
    // Limit the number of messages in memory
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }
    
    // Try to update in MongoDB if available
    if (db.isMongoDBConnected()) {
      try {
        await Conversation.updateOne(
          { conversationId: conversation.conversationId },
          {
            $push: { 
              messages: {
                $each: [message],
                $slice: -MAX_MESSAGES_PER_CONVERSATION 
              }
            },
            $set: { updatedAt: now }
          }
        );
        logger.debug('Updated conversation in MongoDB', { conversationId: conversation.conversationId });
      } catch (error) {
        logger.error('Failed to update conversation in MongoDB', error);
      }
    }
    
    // Update in-memory store
    conversationStore.set(conversation.conversationId, conversation);
    
    return conversation;
  } catch (error) {
    logger.error('Error adding message to conversation', error);
    return conversation;
  }
};

/**
 * Update the language of a conversation
 * @param {Object} conversation - The conversation object
 * @param {string} language - The language code
 * @param {boolean} suppressSystemMessage - Whether to suppress adding a system message
 * @returns {Promise<Object>} - The updated conversation
 */
const updateLanguage = async (conversation, language, suppressSystemMessage = false) => {
  try {
    if (conversation.language === language) {
      return conversation;
    }
    
    conversation.language = language;
    conversation.updatedAt = new Date();
    
    // Add a system message about language change if not suppressed
    if (!suppressSystemMessage) {
      const message = {
        role: 'system',
        content: `Language switched to ${language}`,
        timestamp: new Date()
      };
      
      conversation.messages.push(message);
    }
    
    // Try to update in MongoDB if available
    if (db.isMongoDBConnected()) {
      try {
        await Conversation.updateOne(
          { conversationId: conversation.conversationId },
          { 
            $set: { 
              language, 
              updatedAt: conversation.updatedAt 
            },
            ...(suppressSystemMessage ? {} : {
              $push: { 
                messages: {
                  $each: [{
                    role: 'system',
                    content: `Language switched to ${language}`,
                    timestamp: new Date()
                  }],
                  $slice: -MAX_MESSAGES_PER_CONVERSATION 
                }
              }
            })
          }
        );
        logger.debug('Updated conversation language in MongoDB', { 
          conversationId: conversation.conversationId,
          language
        });
      } catch (error) {
        logger.error('Failed to update conversation language in MongoDB', error);
      }
    }
    
    // Update in-memory store
    conversationStore.set(conversation.conversationId, conversation);
    
    return conversation;
  } catch (error) {
    logger.error('Error updating conversation language', error);
    return conversation;
  }
};

/**
 * Get conversation history for a user
 * @param {string} userId - The user's LINE ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} - Array of message objects
 */
const getConversationHistory = async (userId, limit = 10) => {
  try {
    let conversation;
    
    // Try MongoDB first if available
    if (db.isMongoDBConnected()) {
      conversation = await Conversation.findOne({ 
        userId, 
        active: true 
      }).sort({ updatedAt: -1 });
      
      if (conversation) {
        return conversation.messages.slice(-limit);
      }
    }
    
    // Check in-memory store if not found in MongoDB
    for (const [, conv] of conversationStore) {
      if (conv.userId === userId && conv.active) {
        return conv.messages.slice(-limit);
      }
    }
    
    return [];
  } catch (error) {
    logger.error('Error getting conversation history', error);
    return [];
  }
};

/**
 * Update conversation context
 * @param {Object} conversation - The conversation object
 * @param {Object} contextData - The context data to update
 * @returns {Promise<Object>} - The updated conversation
 */
const updateContext = async (conversation, contextData) => {
  try {
    // Merge new context with existing context
    conversation.context = {
      ...conversation.context,
      ...contextData
    };
    
    conversation.updatedAt = new Date();
    
    // Try to update in MongoDB if available
    if (db.isMongoDBConnected()) {
      try {
        await Conversation.updateOne(
          { conversationId: conversation.conversationId },
          { 
            $set: { 
              context: conversation.context,
              updatedAt: conversation.updatedAt 
            }
          }
        );
        logger.debug('Updated conversation context in MongoDB', { 
          conversationId: conversation.conversationId 
        });
      } catch (error) {
        logger.error('Failed to update conversation context in MongoDB', error);
      }
    }
    
    // Update in-memory store
    conversationStore.set(conversation.conversationId, conversation);
    
    return conversation;
  } catch (error) {
    logger.error('Error updating conversation context', error);
    return conversation;
  }
};

/**
 * End a conversation (mark as inactive)
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<boolean>} - Success status
 */
const endConversation = async (conversationId) => {
  try {
    // Try to update in MongoDB if available
    if (db.isMongoDBConnected()) {
      try {
        await Conversation.updateOne(
          { conversationId },
          { $set: { active: false, updatedAt: new Date() } }
        );
        logger.info('Ended conversation in MongoDB', { conversationId });
      } catch (error) {
        logger.error('Failed to end conversation in MongoDB', error);
      }
    }
    
    // Update in-memory store
    const conversation = conversationStore.get(conversationId);
    if (conversation) {
      conversation.active = false;
      conversation.updatedAt = new Date();
      conversationStore.set(conversationId, conversation);
    }
    
    return true;
  } catch (error) {
    logger.error('Error ending conversation', error);
    return false;
  }
};

/**
 * Clean up old conversations
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {Promise<number>} - Number of conversations cleaned up
 */
const cleanupOldConversations = async (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => {
  let count = 0;
  const cutoffDate = new Date(Date.now() - maxAgeMs);
  
  try {
    // Clean up in MongoDB if available
    if (db.isMongoDBConnected()) {
      try {
        const result = await Conversation.updateMany(
          { updatedAt: { $lt: cutoffDate }, active: true },
          { $set: { active: false } }
        );
        count += result.nModified || 0;
        logger.info('Cleaned up old conversations in MongoDB', { count });
      } catch (error) {
        logger.error('Failed to clean up old conversations in MongoDB', error);
      }
    }
    
    // Clean up in-memory store
    for (const [id, conv] of conversationStore) {
      if (new Date(conv.updatedAt) < cutoffDate && conv.active) {
        conv.active = false;
        conversationStore.set(id, conv);
        count++;
      }
    }
    
    return count;
  } catch (error) {
    logger.error('Error cleaning up old conversations', error);
    return count;
  }
};

module.exports = {
  getActiveConversation,
  createConversation,
  addMessage,
  updateLanguage,
  getConversationHistory,
  updateContext,
  endConversation,
  cleanupOldConversations
};