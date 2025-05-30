const mongoose = require('mongoose');
const config = require('./config');

// Maximum number of connection attempts
const MAX_RETRIES = 3;
// Delay between retries in milliseconds
const RETRY_DELAY = 5000;
// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 15000;

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise} Mongoose connection
 */
const connectDB = async (retryCount = 0) => {
  try {
    // Use environment variable for MongoDB URI, with fallback
    const mongoURI = process.env.MONGODB_URI || config.mongodb.uri;
    
    console.log(`Connecting to MongoDB (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
    
    // Connect with modern options and timeout
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT,
      connectTimeoutMS: CONNECTION_TIMEOUT
    });
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    console.log('MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error(`MongoDB connection error (Attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    } else {
      console.error(`Failed to connect to MongoDB after ${MAX_RETRIES + 1} attempts.`);
      console.log('The application will work with limited functionality (no user data persistence)');
      // Don't throw error, let the application continue without DB
      return null;
    }
  }
};

module.exports = connectDB;