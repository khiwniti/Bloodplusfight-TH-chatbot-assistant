# Line Official Account Chatbot

A LINE chatbot that provides product information and uses AI to enhance user experience. Built with Node.js, Express, MongoDB (with in-memory fallback), and caching for performance. Integrates with OpenRouter API using the deepseek-r1-0528 model for intelligent responses.

## Features

- Integration with LINE Messaging API
- MongoDB database with in-memory fallback for data persistence
- Performance optimization with caching
- Product catalog browsing with RESTful API
- AI-powered responses via OpenRouter and deepseek-r1-0528 model
- Simple Q&A functionality
- Multilingual support (English and Thai)
- HIV/STDs healthcare information
- Healthcare research capability for medical queries
- Structured logging for better monitoring
- Comprehensive error handling

## Prerequisites

- Node.js (v14+)
- LINE Developer Account with a configured channel
- ngrok (installed globally for exposing your local server)
- OpenRouter API key (already configured in the app)

## Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd line-oa-chatbot
```

2. **Install dependencies**

```bash
npm install
```

3. **Install ngrok globally**

```bash
npm install -g ngrok
```

4. **Create a .env file**

Create a file named `.env` in the root directory with the following content:

```
# Line Bot Configuration
CHANNEL_ACCESS_TOKEN=YOUR_LINE_CHANNEL_ACCESS_TOKEN
CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET

# Server Configuration
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/linechatbot
USE_MONGODB=true

# OpenRouter API Configuration (pre-configured)
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=deepseek/deepseek-r1-0528:free

# Research Feature Configuration
ENABLE_RESEARCH=true
RESEARCH_MAX_RESULTS=3
RESEARCH_DEFAULT_LANG=en
RESEARCH_TIMEOUT=5000
AUTO_RESEARCH=true

# Caching Configuration
ENABLE_CACHE=true

# Admin API Configuration
ADMIN_API_KEY=your-admin-api-key

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=text
```

5. **Get LINE Credentials**

- Go to the [LINE Developers Console](https://developers.line.biz/console/)
- Create a new provider and channel (Messaging API)
- Get your Channel Secret and Channel Access Token
- Add them to your `.env` file

## Running the Application

1. **Start the server in development mode**

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts when code changes.

2. **In a separate terminal, start ngrok**

```bash
ngrok http 3000
```

3. **Configure LINE Webhook**

When ngrok starts, it will display a public URL. Use this URL to set up your webhook in the LINE Developer Console:

1. Copy the HTTPS URL that appears in the ngrok console (e.g. `https://xxxx-xxx-xxx-xxx.ngrok.io`)
2. Go to your LINE channel in the [LINE Developers Console](https://developers.line.biz/console/)
3. In the "Messaging API" tab, scroll to "Webhook settings"
4. Paste the URL and add `/webhook` at the end (e.g. `https://xxxx-xxx-xxx-xxx.ngrok.io/webhook`)
5. Click "Update"
6. Enable the webhook by turning on "Use webhook"

## Available Commands

- `help` - Show available commands
- `hi` or `hello` - Get a greeting
- `products` or `catalog` - View available products
- `history` or `purchases` - View purchase history
- `research [query]` or `ค้นคว้า [query]` - Search for healthcare information

You can also ask any question, and the chatbot will use the OpenRouter API with the deepseek-r1-0528 model to generate intelligent responses about the products.

## Development

### Project Structure

```
├── config/
│   ├── config.js      # Configuration loading
│   └── db.js          # MongoDB connection
├── src/
│   ├── routes/        # Express routes
│   │   ├── webhook.js # LINE webhook handling
│   │   └── api.js     # RESTful API endpoints
│   ├── models/        # MongoDB models
│   │   ├── Customer.js   # Customer data model
│   │   └── Product.js    # Product data model
│   ├── services/      # Business logic
│   │   ├── productService.js      # Product database operations
│   │   ├── customerService.js     # Customer database operations
│   │   ├── lineBotService.js      # LINE message handling
│   │   ├── openRouterService.js   # AI integration
│   │   ├── healthcareService.js   # HIV/STDs information
│   │   ├── researchService.js     # Web research capability
│   │   ├── cacheService.js        # Performance caching
│   │   ├── loggerService.js       # Structured logging
│   │   └── fallbackResponseService.js # Fallback responses
│   ├── app.js         # Express app configuration
│   └── server.js      # Main application file
├── public/            # Static files
├── .env               # Environment variables
└── package.json       # Project metadata
```

## Healthcare Research Feature

The bot can search the web for healthcare information to answer medical queries. This provides up-to-date healthcare information beyond what's hardcoded in the bot.

### How It Works:

1. **Medical Research**: Users can type `research [query]` or `ค้นคว้า [query]` to request healthcare information on specific medical topics.

2. **Trusted Sources**: The bot prioritizes information from reputable healthcare sources like WHO, CDC, NIH, Mayo Clinic, and other medical institutions.

3. **Medical Disclaimer**: All healthcare information includes a disclaimer to consult healthcare professionals for medical advice.

### Configuration:

Edit the following variables in your `.env` file to customize the research feature:

- `ENABLE_RESEARCH` - Set to "true" to enable the healthcare research capability (default: true)
- `RESEARCH_MAX_RESULTS` - Maximum number of search results to return (default: 3)
- `RESEARCH_DEFAULT_LANG` - Default language for searches when not detected (default: en)
- `RESEARCH_TIMEOUT` - Timeout in milliseconds for search requests (default: 5000)
- `AUTO_RESEARCH` - Set to "true" to automatically enhance AI responses with research (default: true)

### Example Usage:

```
User: research HIV prevention methods
Bot: Researching healthcare information...
Bot: Healthcare Information:

1. 🏥 HIV Prevention Methods and Strategies
This comprehensive resource covers various methods to prevent HIV transmission, including safe sex practices, PrEP, PEP, and regular testing recommendations for teenagers and young adults.
https://www.cdc.gov/hiv/prevention

2. 🏥 HIV Prevention for Young People
Information about HIV prevention specifically tailored for teenagers, including education strategies, barrier methods, and other prevention approaches.
https://www.who.int/hiv/prevention/youth

Note: This information is for educational purposes only and not intended as medical advice. Always consult a healthcare professional.
```

## API Endpoints

The application provides a RESTful API for product management:

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products` - Create a new product (admin only)
- `PUT /api/products/:id` - Update a product (admin only)
- `DELETE /api/products/:id` - Delete a product (admin only)

API endpoints require an admin API key set in the `x-api-key` header for write operations.

## Database Configuration

The application supports both MongoDB and in-memory data storage:

- Set `USE_MONGODB=true` in your `.env` file to enable MongoDB
- Configure your MongoDB connection string using `MONGODB_URI`
- The application will automatically fall back to in-memory storage if MongoDB is unavailable

## Troubleshooting

### ngrok Issues

If you encounter issues with ngrok:

1. Make sure you've installed ngrok globally: `npm install -g ngrok`
2. Ensure no other ngrok processes are running
3. If you need to authenticate ngrok: `ngrok authtoken YOUR_AUTH_TOKEN`
4. Try running on a different port if 3000 is already in use

### MongoDB Connection Issues

If you're having problems connecting to MongoDB:

1. Check that your MongoDB server is running
2. Verify that your connection string in `.env` is correct
3. The application will fall back to in-memory storage if it can't connect to MongoDB