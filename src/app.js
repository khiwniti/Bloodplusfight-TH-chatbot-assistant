const express = require('express');
const cors = require('cors');
const config = require('../config/config');
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const logger = require('./services/loggerService');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(logger.logRequest);

// Don't use express.json() here as it's handled in the webhook route
// to preserve the raw body for LINE signature validation
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Routes - webhook routes handle their own body parsing
app.use('/webhook', webhookRoutes);

// Apply JSON parsing for API routes and use the API router
app.use('/api', express.json(), apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  logger.logHealth('ok');
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Home route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'LINE Bot API server is running', 
    version: '1.0.0',
    features: [
      'Text message handling',
      'AI response generation',
      'Customer tracking',
      'Product information',
      'Thai language support',
      'Multilingual responses',
      'MongoDB database support',
      'Product management API',
      'Healthcare research capability',
      'Enhanced error handling'
    ]
  });
});

module.exports = app;