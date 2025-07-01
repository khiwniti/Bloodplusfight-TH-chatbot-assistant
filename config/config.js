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
    if (!channelAccessToken) {missingVars.push('CHANNEL_ACCESS_TOKEN');}
    if (!channelSecret) {missingVars.push('CHANNEL_SECRET');}
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
    enabled: process.env.USE_MONGODB === 'true' || true,
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/linechatbot'
  },
  ai: {
    provider: process.env.PRIMARY_AI_PROVIDER || 'deepSeek',
    deepSeek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      endpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
      model: process.env.DEEPSEEK_API_MODEL || 'deepseek-chat',
      maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000', 10)
    },
    openRouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free'
    }
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*']
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY || 'change-this-in-production'
  },
  research: {
    enabled: process.env.ENABLE_RESEARCH !== 'false',
    maxResults: parseInt(process.env.RESEARCH_MAX_RESULTS || '3', 10),
    defaultLang: process.env.RESEARCH_DEFAULT_LANG || 'en',
    searchTimeout: parseInt(process.env.RESEARCH_TIMEOUT || '5000', 10),
    autoResearch: process.env.AUTO_RESEARCH !== 'false'
  },
  limits: {
    dailyUserLimit: parseInt(process.env.DAILY_USER_LIMIT || '50', 10),
    messageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '2000', 10),
    contextSize: parseInt(process.env.MAX_CONTEXT_SIZE || '7', 10),
    aiResponseTimeout: parseInt(process.env.AI_RESPONSE_TIMEOUT || '30000', 10),
    rateLimit: parseInt(process.env.RATE_LIMIT || '100', 10)
  },
  features: {
    commandPrefix: process.env.COMMAND_PREFIX || '/',
    enableUsageLimits: process.env.ENABLE_USAGE_LIMITS === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    forceLimitsInDev: process.env.FORCE_LIMITS_IN_DEV === 'true',
    enableFastResponse: process.env.ENABLE_FAST_RESPONSE !== 'false'
  },
  cache: {
    enabled: process.env.ENABLE_CACHE !== 'false',
    ttl: parseInt(process.env.MEMORY_CACHE_TTL || '3600', 10),
    persistentCache: process.env.ENABLE_PERSISTENT_CACHE === 'true'
  },
  monitoring: {
    enabled: process.env.ENABLE_MONITORING !== 'false',
    alertWebhook: process.env.ALERT_WEBHOOK_URL || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || 'text',
    saveToFile: process.env.LOG_TO_FILE !== 'false'
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
