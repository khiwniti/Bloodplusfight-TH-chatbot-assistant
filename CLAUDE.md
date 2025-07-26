# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with nodemon (auto-restart on changes)
- `npm start` - Start production server
- `npm run start:prod` - Start with NODE_ENV=production

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with automatic fixes

### Docker Development
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container with environment file

### Database
- `npm run db:seed` - Seed database with initial data (requires script)

## Architecture Overview

### Application Structure
This is a LINE Official Account chatbot with AI-powered responses, built using a modular service-oriented architecture:

**Entry Points:**
- `src/server.js` - Main server entry point, handles graceful shutdown
- `src/app.js` - Express application configuration with security middleware
- `api/index.js` - Vercel deployment entry point

**Core Services Architecture:**
The application uses a centralized service pattern located in `src/services/` with these key services:

1. **lineBotService.js** - Main LINE webhook handler and message processing
2. **conversationService.js** - Conversation state management with MongoDB/in-memory fallback
3. **aiService.js** - Currently aliased to deepSeekService (configured in services/index.js)
4. **deepSeekService.js** - Primary AI provider implementation (OpenRouter also available)
5. **researchService.js** - Web research capabilities for healthcare queries
6. **healthcareService.js** - Healthcare information and query detection
7. **customerService.js** - Customer data management
8. **productService.js** - Product catalog operations
9. **analyticsService.js** - Usage analytics and tracking
10. **cachedResponseService.js** - Response caching for performance
11. **fallbackResponseService.js** - Fallback responses when AI is unavailable
12. **loggerService.js** - Structured logging system
13. **monitoringService.js** - Application metrics and monitoring

### Request Flow
1. LINE webhook → `webhookRoutes` → `lineBotService.handleEvent()`
2. Message processing includes language detection, user profile retrieval, and conversation context
3. AI response generation through `aiService` with provider fallback
4. Response caching and conversation history storage
5. LINE API response with error handling and retry logic

### Database Strategy
- **Primary**: MongoDB with Mongoose ODM
- **Fallback**: In-memory storage when MongoDB unavailable
- **Models**: Customer, Product, Conversation with automatic fallback handling

### AI Integration
- **Primary Provider**: Currently configured as DeepSeek (see services/index.js line 19)
- **Available Providers**: DeepSeek and OpenRouter services
- **Fallback Chain**: Primary AI → Cached responses → Static fallback responses
- **Features**: Conversation context, healthcare specialization, multilingual support (EN/TH)

### Deployment Configurations

**Vercel (serverless):**
- Entry: `api/index.js`
- Config: `vercel.json` with environment variables
- MongoDB disabled for serverless compatibility

**Docker (containerized):**
- Multi-stage build with Node.js 18-slim
- Health checks and production optimizations
- Full MongoDB support

**Environment-based:**
- Development: Full features with mock LINE client
- Production: Full validation and security hardening

## Key Configuration

### Environment Variables (see .env.example)
**Required for Production:**
- `CHANNEL_ACCESS_TOKEN` - LINE channel access token
- `CHANNEL_SECRET` - LINE channel secret
- `OPENROUTER_API_KEY` or `DEEPSEEK_API_KEY` - AI provider credentials

**Database:**
- `USE_MONGODB` - Enable/disable MongoDB (defaults to true)
- `MONGODB_URI` - MongoDB connection string

**AI Configuration:**
- `PRIMARY_AI_PROVIDER` - "deepSeek" or "openRouter"
- `AI_RESPONSE_TIMEOUT` - Timeout for AI responses (default: 30000ms)

**Features:**
- `ENABLE_RESEARCH` - Enable web research capability
- `ENABLE_CACHE` - Enable response caching
- `ENABLE_ANALYTICS` - Enable usage analytics

### Service Dependencies
- Services are auto-wired through `src/services/index.js`
- Each service has built-in error handling and fallback mechanisms
- Database operations automatically fall back to in-memory storage
- AI services have automatic provider switching on failure

## Development Guidelines

### Adding New AI Providers
1. Create new service file in `src/services/` following the pattern of `deepSeekService.js`
2. Implement `generateResponse(userMessage, context, options)` method
3. Update the aiService alias in `src/services/index.js` (line 19)
4. Update configuration in `config/config.js`

### Service Integration
- All services should handle both MongoDB and in-memory storage
- Implement proper error logging using `loggerService`
- Follow the established async/await pattern with try-catch blocks
- Use the centralized configuration from `config/config.js`

### Testing Strategy
- Jest configuration includes coverage reporting with 10-second timeout
- Test files located in `src/services/__tests__/`
- Mock LINE API calls in development environment using `jest.setup.js`
- Use `supertest` for HTTP endpoint testing

### LINE Bot Development
- Webhook validation handled automatically in `webhookRoutes`
- Use `safeLineAPI` wrappers for all LINE API calls (handles 401/403 errors gracefully)
- Message processing supports both reply tokens and push messages
- Automatic language detection (EN/TH) with conversation persistence

### Performance Considerations
- Response caching enabled by default with configurable TTL
- Conversation history limited to 50 messages per conversation
- Request tracking and rate limiting implemented
- Parallel operations used where possible (profile retrieval, DB operations)

## Microservices Migration

The codebase includes a comprehensive microservices migration plan in the `microservices/` directory:

- **Services**: ai-conversation, customer-management, line-bot-gateway, product-catalog
- **Infrastructure**: API Gateway with nginx, Docker Compose orchestration
- **Documentation**: API contracts, CI/CD pipeline, monitoring strategy

When working on microservices features, refer to the migration documentation for service boundaries and communication patterns.

## Cloudflare Workers Integration

The project includes a separate Cloudflare Workers implementation in the `cloudflare-workers/` directory:

- **Entry Point**: `src/index.js` and specialized `src/index-healthcare.js`
- **Healthcare Analytics**: Advanced healthcare query processing with `src/services/healthcare-analytics.js`
- **Medical Research**: Enhanced medical research capabilities via `src/services/medical-research.js`
- **Testing**: Comprehensive test suite with Vitest configuration
- **Database**: SQL-based with healthcare schema migrations

### Key Commands for Cloudflare Workers:
- `cd cloudflare-workers && npm test` - Run healthcare-focused tests
- `./quick-test.sh` - Quick healthcare functionality validation
- `./deploy.sh` - Deploy to Cloudflare Workers

## Key Architectural Patterns

### Service Centralization
- All services are exported through `src/services/index.js` for consistent imports
- The aiService is currently aliased to deepSeekService (line 19) - modify this line to switch AI providers
- Services follow a consistent async/await pattern with comprehensive error handling

### Database Abstraction
- MongoDB operations automatically fall back to in-memory storage
- All database models handle both MongoDB and fallback scenarios
- Connection status available via `db.isMongoDBConnected()`

### Security & Performance
- Rate limiting configured per-endpoint with webhook exemptions (app.js:34-38)
- CORS, Helmet, and compression middleware applied globally
- Request tracking and monitoring through `monitoringService`
- Admin API endpoints protected with x-api-key header validation