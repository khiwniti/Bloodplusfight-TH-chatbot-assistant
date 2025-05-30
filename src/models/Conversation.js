const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
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
});

const ConversationSchema = new mongoose.Schema({
  lineUserId: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'archived'],
    default: 'active'
  },
  language: {
    type: String,
    enum: ['en', 'th'],
    default: 'en'
  },
  messages: [MessageSchema],
  sessionStart: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'unknown'],
    default: 'unknown'
  },
  topics: [{
    type: String
  }],
  intents: [{
    name: String,
    confidence: Number
  }]
});

// Index for efficient queries
ConversationSchema.index({ lineUserId: 1, sessionStart: -1 });
ConversationSchema.index({ lastActivity: -1 });

// Method to add a message to the conversation
ConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  this.lastActivity = new Date();
  return this;
};

// Static method to get active conversation for a user
ConversationSchema.statics.getActiveConversation = async function(lineUserId) {
  // Find active conversation or create a new one
  let conversation = await this.findOne({
    lineUserId,
    status: 'active',
    lastActivity: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Active in last 24 hours
  }).sort({ lastActivity: -1 });
  
  if (!conversation) {
    conversation = new this({
      lineUserId,
      messages: []
    });
  }
  
  return conversation;
};

// Archive old conversations method
ConversationSchema.statics.archiveOldConversations = async function(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    { 
      status: 'active',
      lastActivity: { $lt: cutoffDate }
    },
    {
      $set: { status: 'archived' }
    }
  );
};

module.exports = mongoose.model('Conversation', ConversationSchema);