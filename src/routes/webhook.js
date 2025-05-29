const express = require('express');
const { middleware } = require('@line/bot-sdk');
const config = require('../../config/config');
const lineBotService = require('../services/lineBotService');

const router = express.Router();

// LINE middleware for signature verification
// We need to use the raw body parser for LINE webhook validation
router.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Configure LINE middleware with proper settings
router.post('/', middleware({
  channelSecret: config.line.channelSecret,
  channelAccessToken: config.line.channelAccessToken
}), async (req, res) => {
  try {
    // Debug log
    console.log('Webhook received event:', JSON.stringify(req.body, null, 2));
    
    const events = req.body.events;
    
    if (!events || events.length === 0) {
      console.log('No events in the request');
      return res.status(200).end();
    }
    
    // Process all events asynchronously
    await Promise.all(events.map(async (event) => {
      console.log('Processing event:', JSON.stringify(event, null, 2));
      try {
        await lineBotService.handleEvent(event);
        console.log('Event processed successfully');
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }));
    
    // Respond with 200 OK to LINE platform
    res.status(200).end();
  } catch (err) {
    console.error('Error handling webhook events:', err);
    res.status(500).end();
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Webhook route is working', 
    config: {
      hasChannelSecret: !!config.line.channelSecret,
      hasChannelAccessToken: !!config.line.channelAccessToken
    }
  });
});

module.exports = router; 