const express = require('express');
const cors = require('cors');
const config = require('../config/config');
const webhookRoutes = require('./routes/webhook');

// Skip MongoDB connection

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
const PORT = config.server.port;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`To connect your LINE bot, use ngrok or a similar service to expose your local server.`);
  console.log(`You can start ngrok manually with: ngrok http ${PORT}`);
  console.log(`Then set the webhook URL in LINE Developer Console to: https://YOUR-NGROK-URL/webhook`);
  
  // We're not using the built-in ngrok integration anymore
  // as it's causing connection issues
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 