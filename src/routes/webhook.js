const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const lineBotService = require('../services/lineBotService');
const config = require('../../config/config');

// Create LINE middleware.
// This middleware will verify the signature and parse the JSON body.
const lineMiddleware = line.middleware({
  channelSecret: config.line.channelSecret
  // Note: channelAccessToken is not needed for the middleware itself,
  // but for the client making API calls later.
});

// Main webhook endpoint
// The lineMiddleware handles signature verification and JSON parsing.
router.post('/', lineMiddleware, async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body));
    
    // Check if the request body is valid
    if (!req.body || !req.body.events) {
      console.error('Invalid webhook request body');
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    // Process each event in the webhook
    const events = req.body.events;
    const results = await Promise.all(
      events.map(async (event) => {
        try {
          // Process the event
          return await lineBotService.handleEvent(event);
        } catch (error) {
          console.error(`Error processing event ${event.type}:`, error);
          return { error: error.message };
        }
      })
    );
    
    // Return a 200 response to LINE
    res.status(200).json({ results });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'line-webhook',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Test endpoint for verifying configuration
router.get('/test', (req, res) => {
  const lineConfig = {
    hasChannelSecret: !!config.line.channelSecret,
    hasChannelAccessToken: !!config.line.channelAccessToken,
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: lineConfig
  });
});

module.exports = router;
