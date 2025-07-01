const express = require('express');
const router = express.Router();
const { middleware } = require('@line/bot-sdk');
const config = require('../../config/config');
const { handleEvent } = require('../services/lineBotService');

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
    environment: process.env.NODE_ENV || 'development',
    channelSecretLength: config.line.channelSecret ? config.line.channelSecret.length : 0,
    channelTokenLength: config.line.channelAccessToken ? config.line.channelAccessToken.length : 0
  };
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: lineConfig
  });
});

// Debug endpoint to test webhook without signature validation
router.post('/debug', express.json(), async (req, res) => {
  try {
    console.log('Debug webhook called:', {
      headers: req.headers,
      body: req.body,
      hasChannelSecret: !!config.line.channelSecret,
      hasChannelAccessToken: !!config.line.channelAccessToken
    });
    
    res.status(200).json({
      message: 'Debug webhook received',
      timestamp: new Date().toISOString(),
      receivedData: req.body
    });
  } catch (error) {
    console.error('Debug webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', middleware(config.line), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).end();
  }
});

module.exports = router;
