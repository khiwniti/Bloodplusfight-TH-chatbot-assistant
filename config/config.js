require('dotenv').config();

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Validate LINE config
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.CHANNEL_SECRET || '';

// Validate required environment variables
const validateEnvVariables = () => {
  const missingVars = [];
  
  // Only enforce in production mode
  if (!isDevelopment) {
    if (!channelAccessToken) missingVars.push('CHANNEL_ACCESS_TOKEN');
    if (!channelSecret) missingVars.push('CHANNEL_SECRET');
    if (!process.env.OPENROUTER_API_KEY) missingVars.push('OPENROUTER_API_KEY');
    if (!process.env.MONGODB_URI) missingVars.push('MONGODB_URI');
  }
  
  if (missingVars.length > 0) {
    console.error(`⚠️ WARNING: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please set these variables in the .env file');
  }
};

// Run validation
validateEnvVariables();

// Export configuration
const config = {
  line: {
    channelAccessToken,
    channelSecret,
  },
  server: {
    port: process.env.PORT || 3000,
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/linechatbot',
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '5', 10),
    retryWrites: true
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free',
    httpReferer: process.env.OPENROUTER_HTTP_REFERER || 'https://line-bot-app.com',
    xTitle: process.env.OPENROUTER_X_TITLE || 'LINE Bot Healthcare',
  },
  research: {
    enabled: process.env.ENABLE_RESEARCH !== 'false', // Defaults to true, false if 'false'
    maxResults: parseInt(process.env.RESEARCH_MAX_RESULTS || '3', 10),
    defaultLang: process.env.RESEARCH_DEFAULT_LANG || 'en',
    searchTimeout: parseInt(process.env.RESEARCH_TIMEOUT || '5000', 10),
    autoResearch: process.env.AUTO_RESEARCH !== 'false', // Defaults to true, false if 'false'
  },
  limits: {
    dailyUserLimit: parseInt(process.env.DAILY_USER_LIMIT || '50', 10),
    messageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '2000', 10),
    contextSize: parseInt(process.env.MAX_CONTEXT_SIZE || '7', 10)
  },
  features: {
    commandPrefix: process.env.COMMAND_PREFIX || '/',
    enableUsageLimits: process.env.ENABLE_USAGE_LIMITS === 'true' || false,
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true' || true,
    forceLimitsInDev: process.env.FORCE_LIMITS_IN_DEV === 'true' || false
  },
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || 'text',
    saveToFile: process.env.LOG_TO_FILE === 'true' || isDevelopment
  }
};

// Log configuration (without sensitive data)
console.log('Server Configuration:', {
  port: config.server.port,
  researchEnabled: config.research.enabled,
  environment: isDevelopment ? 'development' : 'production'
});

// Only log LINE configuration validation, not the actual tokens
console.log('LINE Bot Configuration:', {
  hasChannelSecret: !!config.line.channelSecret,
  hasChannelAccessToken: !!config.line.channelAccessToken
});

module.exports = config;
