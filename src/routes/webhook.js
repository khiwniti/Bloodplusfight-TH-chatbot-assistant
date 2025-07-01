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
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: lineConfig
  });
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
