const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const logger = require('./services/loggerService');
const monitoringService = require('./services/monitoringService');
const db = require('../config/db');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors?.allowedOrigins || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.limits?.rateLimit || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for webhook endpoint (LINE API)
    return req.path.startsWith('/webhook');
  }
});
app.use(limiter);

// Performance middleware
app.use(compression());

// Logging middleware
app.use(logger.logRequest);

// Request tracking middleware
app.use((req, res, next) => {
  const tracker = monitoringService.trackRequest(req.path, req.method);
  
  // Track response after completion
  res.on('finish', () => {
    monitoringService.trackResponse(tracker, res.statusCode);
  });
  
  next();
});

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
  
  // Check database connection
  const dbStatus = db.isMongoDBConnected() ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.1.0',
    database: dbStatus,
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
  });
});

// Metrics endpoint (protected with API key)
app.get('/metrics', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== config.admin?.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const metrics = monitoringService.getMetrics();
  res.status(200).json(metrics);
});

// Home route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'LINE Bot API server is running', 
    version: '1.1.0',
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
      'Enhanced error handling',
      'Performance optimization',
      'Advanced monitoring',
      'Security hardening',
      'Production-ready infrastructure'
    ]
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error('Express error handler:', err);
  monitoringService.trackError(err, req.path);
  
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Initialize database connection
if (config.mongodb?.enabled) {
  db.connectToMongoDB().catch(err => {
    logger.error('Database connection error:', err);
  });
}

module.exports = app;