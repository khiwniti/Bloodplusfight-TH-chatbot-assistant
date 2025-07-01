const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../src/services/loggerService');

// In-memory data stores as fallback
const inMemoryData = {
  customers: new Map(),
  products: new Map(),
  conversations: new Map()
};

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 */
const connectToMongoDB = async () => {
  if (!config.mongodb.enabled) {
    logger.info('MongoDB disabled, using in-memory data storage');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`Failed to connect to MongoDB after ${MAX_RECONNECT_ATTEMPTS} attempts, falling back to in-memory storage`);
      return false;
    }

    connectionAttempts++;
    
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('Connected to MongoDB successfully');
    isConnected = true;
    connectionAttempts = 0;
    
    // Add connection event listeners for monitoring
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
      // Don't attempt reconnect here, let the application handle it
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
      // Don't attempt reconnect here, let the application handle it
    });
    
    return true;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    isConnected = false;
    
    // Schedule reconnect attempt
    setTimeout(() => {
      if (!isConnected) {
        logger.info(`Attempting to reconnect to MongoDB (attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        connectToMongoDB();
      }
    }, RECONNECT_INTERVAL);
    
    return false;
  }
};

/**
 * Check MongoDB connection status
 */
const isMongoDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Get in-memory data store for a specific collection
 */
const getInMemoryStore = (collection) => {
  if (!inMemoryData[collection]) {
    inMemoryData[collection] = new Map();
  }
  return inMemoryData[collection];
};

/**
 * Close MongoDB connection
 */
const closeConnection = async () => {
  if (isConnected) {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      isConnected = false;
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }
};

module.exports = {
  connectToMongoDB,
  isMongoDBConnected,
  getInMemoryStore,
  closeConnection
};