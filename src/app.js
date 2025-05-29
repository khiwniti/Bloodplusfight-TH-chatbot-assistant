const express = require('express');
const bodyParser = require('body-parser');
const config = require('../config/config');
const webhookRouter = require('./routes/webhook');

// Create Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint
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
      'Multilingual responses'
    ]
  });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`LINE Bot server is running on port ${config.server.port}`);
  console.log('Server features:');
  console.log('- LINE messaging integration');
  console.log('- OpenRouter AI integration');
  console.log('- Product catalog');
  console.log('- Customer data management');
  console.log('- Thai language support (ภาษาไทย)');
  console.log('- Automatic language detection');
  console.log('\nUse ngrok to expose your local server:');
  console.log(`ngrok http ${config.server.port}`);
});

module.exports = app; 