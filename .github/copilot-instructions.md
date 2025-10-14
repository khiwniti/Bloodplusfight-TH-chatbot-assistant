# GitHub Copilot – Repository Instructions

This repository is a LINE Official Account chatbot with AI-powered responses for healthcare information, built with Node.js, Express, and MongoDB.

## Project Overview

This is a LINE chatbot providing:
- Healthcare information (HIV/STDs prevention and treatment)
- AI-powered responses via DeepSeek/OpenRouter
- Web research capabilities for medical queries
- Product catalog management
- Multilingual support (English and Thai)
- Conversation history and context management

## Architecture

### Key Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with in-memory fallback
- **AI Providers**: DeepSeek (primary), OpenRouter (fallback)
- **LINE Integration**: @line/bot-sdk v7.5.0
- **Testing**: Jest with 90%+ coverage target
- **Logging**: Winston for structured logging

### Entry Points
- `src/server.js` - Main server with graceful shutdown
- `src/app.js` - Express app configuration
- `api/index.js` - Vercel serverless deployment
- `cloudflare-workers/src/index-healthcare.js` - Cloudflare Workers deployment

### Service Architecture
All services are in `src/services/` with centralized exports via `src/services/index.js`:
- `lineBotService.js` - LINE webhook handler
- `aiService.js` - AI response generation (aliased to deepSeekService)
- `conversationService.js` - Conversation state management
- `healthcareService.js` - Healthcare query detection and information
- `researchService.js` - Web research for medical queries
- `loggerService.js` - Structured logging
- `monitoringService.js` - Application metrics
- `cachedResponseService.js` - Response caching
- `fallbackResponseService.js` - Fallback responses

## Development Commands

### Core Development
- `npm run dev` - Start development server with auto-restart
- `npm start` - Start production server
- `npm run start:prod` - Start with NODE_ENV=production

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- **Minimum Coverage**: 90% for new code

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

### Deployment
- `npm run build` - Build for Vercel (handled automatically)
- `npm run deploy:workers` - Deploy to Cloudflare Workers
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run in Docker container

## Code Style and Linting

### JavaScript Style
- Follow rules from `.eslintrc.js`
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Equality**: Use strict equality (`===`, `!==`)
- **Braces**: Always use braces for control structures
- **Async/Await**: Prefer async/await over promises
- **Error Handling**: Always use try-catch blocks for async operations

### File Naming
- Service files: camelCase with `Service` suffix (e.g., `lineBotService.js`)
- Model files: PascalCase (e.g., `Customer.js`, `Product.js`)
- Test files: Match source file name with `.test.js` or `.spec.js` suffix
- Route files: lowercase (e.g., `webhook.js`, `api.js`)

### Module Structure
```javascript
// 1. External dependencies
const express = require('express');
const axios = require('axios');

// 2. Internal dependencies
const { loggerService } = require('./services');
const config = require('../config/config');

// 3. Module-level variables
const router = express.Router();

// 4. Functions and logic

// 5. Exports
module.exports = { functionName };
```

## Testing Guidelines

### Test Structure
- Place tests in `src/services/__tests__/` directory
- Use Jest for all testing
- Mock external services (LINE API, AI providers, MongoDB)
- Test files should mirror source structure

### Test Requirements
- **Unit Tests**: All service functions must have unit tests
- **Integration Tests**: Test API endpoints with supertest
- **Coverage**: Minimum 90% for new code
- **Timeout**: 10 seconds max per test
- **Mocking**: Use `jest.mock()` for external dependencies

### Test Example
```javascript
const { serviceName } = require('../serviceName');

describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform expected action', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await serviceName.method(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

## Security Best Practices

### Environment Variables
- **Never** commit secrets or API keys to the repository
- Use `.env` for local development (gitignored)
- Reference `.env.example` for required variables
- Validate all required environment variables on startup

### API Security
- Use `helmet` middleware for security headers
- Implement rate limiting via `express-rate-limit`
- Validate LINE webhook signatures using `CHANNEL_SECRET`
- Protect admin endpoints with `x-api-key` header validation

### Data Protection
- **Healthcare Data**: Anonymize user IDs in analytics
- **Conversation History**: Limit to 50 messages per conversation
- **Caching**: Use TTL for sensitive data
- **Logging**: Never log sensitive information (tokens, secrets, user IDs)

### Input Validation
```javascript
// Always validate external input
if (!userMessage || typeof userMessage !== 'string') {
  throw new Error('Invalid input');
}

// Sanitize user input before database operations
const sanitized = userMessage.trim().slice(0, 1000);
```

## Internal Libraries and Services

### Logging
- **Use**: `loggerService` instead of `console.log`
- **Levels**: error, warn, info, debug
- **Format**: Include context (service name, userId, etc.)

```javascript
const { loggerService } = require('./services');

loggerService.info('Message processed', { 
  userId: 'U123', 
  messageType: 'text' 
});
```

### AI Service
- **Primary Provider**: DeepSeek (configured in `services/index.js` line 19)
- **Fallback**: OpenRouter
- **Timeout**: 30 seconds (configurable via `AI_RESPONSE_TIMEOUT`)
- **Context**: Always pass conversation context for better responses

```javascript
const response = await aiService.generateResponse(
  userMessage,
  conversationContext,
  { intent: 'healthcare', language: 'en' }
);
```

### Database Operations
- **Use**: Service layer (customerService, productService)
- **Fallback**: Automatic fallback to in-memory storage if MongoDB unavailable
- **Models**: Use Mongoose models (Customer, Product, Conversation)

```javascript
const { customerService } = require('./services');

const customer = await customerService.findByLineId(userId);
```

### LINE Bot Integration
- **Use**: `lineBotService` for all LINE API operations
- **Safe API Calls**: Use `safeLineAPI` wrappers for error handling
- **Reply vs Push**: Prefer reply tokens when available
- **Error Handling**: Gracefully handle 401/403 LINE API errors

## Healthcare-Specific Guidelines

### Medical Information
- **Always** include medical disclaimer
- **Sources**: Prioritize WHO, CDC, NIH, Mayo Clinic
- **Language**: Clear, accessible medical terminology
- **Privacy**: Never store specific medical conditions

### Research Service
- **Use**: For up-to-date healthcare information
- **Timeout**: 5 seconds for research requests
- **Max Results**: 3-5 results per query
- **Cache**: Enable caching for common queries (TTL: 2 hours)

### Healthcare Queries
```javascript
// Detect healthcare intent
const isHealthcareQuery = healthcareService.isHealthcareQuery(message);

// Get healthcare information
if (isHealthcareQuery) {
  const info = await researchService.searchHealthcare(query, {
    language: 'en',
    maxResults: 3
  });
}
```

## Documentation Requirements

### Code Documentation
- **Functions**: Document all exported functions with JSDoc
- **Parameters**: Describe type and purpose
- **Returns**: Document return type and possible values
- **Throws**: Document possible errors

```javascript
/**
 * Generate AI response for user message
 * @param {string} userMessage - The user's message
 * @param {Object} context - Conversation context
 * @param {Object} options - Additional options
 * @param {string} options.intent - Detected intent (healthcare, general)
 * @param {string} options.language - Response language (en, th)
 * @returns {Promise<Object>} Response object with text and metadata
 * @throws {Error} If AI service is unavailable
 */
async function generateResponse(userMessage, context, options) {
  // Implementation
}
```

### README Updates
- Update README.md when adding new features
- Document environment variables in `.env.example`
- Include deployment instructions for new services
- Add troubleshooting steps for common issues

## Deployment Configurations

### Vercel (Serverless)
- Entry point: `api/index.js`
- Config: `vercel.json`
- MongoDB: Disabled for serverless compatibility
- Build command: `npm install`

### Cloudflare Workers
- Entry point: `cloudflare-workers/src/index-healthcare.js`
- Config: `wrangler.toml`
- Database: D1 (SQLite-based)
- Deploy: `npm run deploy:workers`

### Docker
- Multi-stage build with Node.js 18-slim
- Health checks enabled
- Full MongoDB support
- Build: `npm run docker:build`

### Environment-Specific Behavior
- **Development**: Mock LINE client, verbose logging
- **Production**: Full validation, security hardening, minimal logging

## Common Patterns

### Error Handling
```javascript
try {
  const result = await externalService.call();
  return result;
} catch (error) {
  loggerService.error('Service call failed', { 
    error: error.message,
    service: 'serviceName'
  });
  // Return fallback or rethrow
  return fallbackValue;
}
```

### Async Operations
```javascript
// Prefer async/await
const result = await asyncFunction();

// Use Promise.all for parallel operations
const [profile, history] = await Promise.all([
  getProfile(userId),
  getHistory(userId)
]);
```

### Configuration Access
```javascript
// Use centralized config
const config = require('../config/config');

const timeout = config.ai.responseTimeout;
const enableCache = config.cache.enabled;
```

## Performance Considerations

### Caching
- Enable response caching via `cachedResponseService`
- Default TTL: 3600 seconds
- Cache key: Include language and query type

### Rate Limiting
- Webhook endpoints: Exempted from rate limiting
- API endpoints: 100 requests per 15 minutes per IP
- Admin endpoints: 10 requests per minute

### Database Queries
- Use indexes for frequent queries
- Limit conversation history to 50 messages
- Implement pagination for large result sets

### Parallel Operations
- Fetch user profile and conversation history in parallel
- Use `Promise.all` for independent async operations
- Avoid sequential awaits when possible

## Dependencies

### Required Production Dependencies
- `@line/bot-sdk` - LINE integration
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `axios` - HTTP client
- `winston` - Logging
- `helmet` - Security
- `express-rate-limit` - Rate limiting

### Development Dependencies
- `jest` - Testing framework
- `eslint` - Code linting
- `nodemon` - Development auto-restart
- `supertest` - HTTP endpoint testing

### Adding New Dependencies
- Use `npm install --save` for production dependencies
- Use `npm install --save-dev` for development dependencies
- Document new dependencies in README if significant
- Keep dependencies up to date for security

## Troubleshooting

### MongoDB Connection Issues
- App falls back to in-memory storage automatically
- Check `USE_MONGODB` environment variable
- Verify `MONGODB_URI` connection string

### LINE API Errors
- 401/403: Check `CHANNEL_ACCESS_TOKEN` and `CHANNEL_SECRET`
- Webhook validation: Verify signature calculation
- Use `safeLineAPI` wrappers for graceful error handling

### AI Service Failures
- Automatic fallback: DeepSeek → OpenRouter → Cached → Fallback responses
- Check API keys: `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`
- Verify timeout settings: `AI_RESPONSE_TIMEOUT`

## Additional Resources

- Full architecture documentation: `CLAUDE.md`
- Deployment guide: `VERCEL_DEPLOYMENT.md`
- Cloudflare Workers: `cloudflare-workers/README.md`
- Microservices migration: `MICROSERVICES_MIGRATION_PLAN.md`
