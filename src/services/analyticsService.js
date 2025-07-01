/**
 * Analytics Service
 * Provides functions to log and analyze bot usage
 */

const fs = require('fs');
const path = require('path');
const config = require('../../config/config');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Directory for logs
const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log bot activity for analytics
 * @param {string} userId - User ID
 * @param {string} text - User message
 * @param {string} response - Bot response
 * @param {boolean} isAI - Whether the response was from AI
 */
const logBotActivity = (userId, text, response, isAI = true) => {
  const now = new Date();
  const logEntry = {
    timestamp: now.toISOString(),
    userId: userId,
    userMessage: text,
    botResponse: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
    responseType: isAI ? 'AI' : 'Fallback',
    responseLength: response.length
  };
  
  console.log('Bot Activity:', JSON.stringify(logEntry));
  
  // Write to log file
  if (isDevelopment || config.logging.saveToFile) {
    const logFile = path.join(LOG_DIR, `bot-activity-${now.toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
  
  // Here you could add MongoDB logging or external service logging
  // if database connection is available
};

/**
 * Log failed API calls for analysis
 * @param {string} userId - User ID
 * @param {string} query - User's message
 * @param {Error} error - Error object
 */
const logFailedApiCall = (userId, query, error) => {
  const now = new Date();
  const logEntry = {
    timestamp: now.toISOString(),
    userId: userId,
    query: query,
    error: error.message,
    stack: isDevelopment ? error.stack : null
  };
  
  console.error('API Failure:', JSON.stringify(logEntry));
  
  // Write to log file
  if (isDevelopment || config.logging.saveToFile) {
    const logFile = path.join(LOG_DIR, `api-errors-${now.toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
};

/**
 * Get usage statistics for a specific period
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} - Usage statistics
 */
const getUsageStatistics = (startDate = new Date(0), endDate = new Date()) => {
  // This would typically query a database
  // For now, we'll return dummy data
  return {
    totalMessages: 150,
    aiResponses: 120,
    fallbackResponses: 30,
    uniqueUsers: 45,
    averageResponseTime: 2.3, // seconds
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  };
};

module.exports = {
  logBotActivity,
  logFailedApiCall,
  getUsageStatistics
};