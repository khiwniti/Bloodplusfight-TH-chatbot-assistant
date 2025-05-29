const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    // Use environment variable for MongoDB URI, with fallback
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linechatbot';
    
    // Connect with modern options
    await mongoose.connect(mongoURI, {
      // Connection options are automatically set in newer mongoose versions
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Don't exit process on connection failure in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB; 