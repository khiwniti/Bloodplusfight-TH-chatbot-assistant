const express = require('express');
const cors = require('cors');
const config = require('../config/config');
const connectDB = require('../config/db');
const webhookRoutes = require('./routes/webhook');

// Connect to MongoDB in production or if explicitly enabled
const shouldConnectDB = process.env.NODE_ENV === 'production' || process.env.USE_MONGODB === 'true';
if (shouldConnectDB) {
  connectDB();
} else {
  console.log('MongoDB connection skipped');
}

const app = express();

// Middleware
app.use(cors());

// Don't use express.json() here as it's handled in the webhook route
// to preserve the raw body for LINE signature validation
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Routes - webhook routes handle their own body parsing
app.use('/webhook', webhookRoutes);

// Apply JSON parsing for other routes
app.use('/api', express.json(), (req, res, next) => {
  next();
});

// Home route
app.get('/', (req, res) => {
  res.send('LINE ChatBot Server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, async () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  if (!isProduction) {
    console.log(`Local URL: http://localhost:${PORT}`);
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