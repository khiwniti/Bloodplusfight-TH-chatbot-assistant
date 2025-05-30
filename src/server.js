const app = require('./app');
const config = require('../config/config');

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, async () => {
  console.log(`Server Configuration:`, {
    port: PORT,
    researchEnabled: config.research.enabled
  });
  
  console.log(`LINE Bot Configuration:`, {
    hasChannelSecret: !!config.line.channelSecret,
    hasChannelAccessToken: !!config.line.channelAccessToken
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log(`Running in development mode with mock LINE client`);
    console.log(`Skipping LINE client configuration test in development mode`);
  }
  
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  if (!isProduction) {
    console.log(`Local URL: http://${HOST}:${PORT}`);
  } else {
    console.log(`Deployed on Render`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep the server running despite uncaught exceptions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the server running despite unhandled rejections
});