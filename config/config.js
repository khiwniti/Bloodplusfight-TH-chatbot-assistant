require('dotenv').config();

// Validate LINE config
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || 'a1949cec4782b6fcc9308daf21f51720';
const channelSecret = process.env.CHANNEL_SECRET || 'iEOPs7FpkuS1KA2amgRQXsIdJvkOjrECxBwj1OhFZikwmuamNtXkjocHoPXuxMw/7fEGvmbLgRKKYHdwuamiBqN3VYYkeCTDT3U9FwipGyXKqE7v41DT57V+Q6AvgMK3DBUE954JvCaKHdIM5b3L9QdB04t89/1O/w1cDnyilFU=';

if (!channelAccessToken || channelAccessToken === 'your_line_channel_access_token_here') {
  console.error('⚠️ WARNING: CHANNEL_ACCESS_TOKEN is not set properly in .env file');
  console.error('Please set your LINE Channel Access Token in the .env file');
}

if (!channelSecret || channelSecret === 'your_line_channel_secret_here') {
  console.error('⚠️ WARNING: CHANNEL_SECRET is not set properly in .env file');
  console.error('Please set your LINE Channel Secret in the .env file');
}

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
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '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',
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free',
    httpReferer: process.env.OPENROUTER_HTTP_REFERER || 'https://line-bot-app.com',
    xTitle: process.env.OPENROUTER_X_TITLE || 'LINE Bot Healthcare',
  },
  research: {
    enabled: process.env.ENABLE_RESEARCH === 'true' || true,
    maxResults: parseInt(process.env.RESEARCH_MAX_RESULTS || '3', 10),
    defaultLang: process.env.RESEARCH_DEFAULT_LANG || 'en',
    searchTimeout: parseInt(process.env.RESEARCH_TIMEOUT || '5000', 10),
    autoResearch: process.env.AUTO_RESEARCH === 'true' || true,
  }
};

console.log('Server Configuration:', {
  port: config.server.port,
  researchEnabled: config.research.enabled
});

// Only log LINE configuration validation, not the actual tokens
console.log('LINE Bot Configuration:', {
  hasChannelSecret: !!config.line.channelSecret,
  hasChannelAccessToken: !!config.line.channelAccessToken
});

module.exports = config; 