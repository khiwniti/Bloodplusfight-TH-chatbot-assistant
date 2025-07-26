# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development (Node.js)
- `npm run dev` - Start development server with nodemon (auto-restart on changes)
- `npm start` - Start production server
- `npm run start:prod` - Start with NODE_ENV=production

### Cloudflare Workers Development
- `cd cloudflare-workers && npm run dev` - Start Cloudflare Workers development server
- `cd cloudflare-workers && npm run deploy` - Deploy to Cloudflare Workers
- `cd cloudflare-workers && npm run test:healthcare` - Run healthcare-focused tests
- `cd cloudflare-workers && ./quick-test.sh` - Quick healthcare functionality validation

### Python Serverless (Alternative Implementation)
- `cd python-serverless && python -m uvicorn api.main:app --reload` - Run Python FastAPI server locally
- `cd python-serverless && python -m pytest` - Run Python test suite with coverage
- `cd python-serverless && python -m pytest -m "not slow"` - Run fast tests only
- `cd python-serverless && python -m pytest -m integration` - Run integration tests
- `cd python-serverless && ./deploy.sh` - Deploy Python serverless implementation

### Build Commands
- `npm run build:workers` - Build Cloudflare Workers version
- `npm run deploy:workers` - Deploy Cloudflare Workers from root

### Testing
- `npm test` - Run Node.js tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with automatic fixes

### Docker Development
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container with environment file

### Database Operations
- `npm run db:seed` - Seed database with initial data (requires script)
- `cd cloudflare-workers && npm run db:migrate` - Run healthcare schema migrations

## Architecture Overview

This is a LINE Official Account healthcare chatbot with multiple deployment architectures supporting different environments and scaling requirements.

### Multi-Architecture Implementation

**1. Node.js Express (Traditional) - `/src`**
- Entry: `src/server.js` (main) and `api/index.js` (Vercel serverless)
- Centralized services pattern in `src/services/`
- MongoDB with in-memory fallback
- Full-featured development and production deployment

**2. Cloudflare Workers (Serverless) - `/cloudflare-workers`**
- Entry: `src/index-healthcare.js` (healthcare-optimized) or `worker-single-file.js` (consolidated)
- Cloudflare Workers AI integration with 5 models (Llama-3, Mistral, Gemma, CodeLlama, Phi-2)
- D1 database with KV storage for conversation context
- Global edge deployment with sub-100ms response times

**3. Python Serverless (Alternative) - `/python-serverless`**
- Entry: `api/main.py` with FastAPI/Starlette framework
- PydanticAI-based agents for conversation, crisis detection, and cultural adaptation
- Advanced healthcare analytics and medical research tools
- Cloudflare Workers Python runtime compatibility

### Core Services Architecture (Node.js)
The application uses a centralized service pattern in `src/services/` with key services:

1. **lineBotService.js** - Main LINE webhook handler and message processing
2. **conversationManager.js** - Conversation state management with MongoDB/in-memory fallback  
3. **aiService.js** - Currently aliased to advancedHealthcareAI (line 34 in services/index.js)
4. **deepSeekService.js** - Primary AI provider (OpenRouter also available)
5. **healthcareService.js** - Healthcare information and query detection
6. **researchService.js** - Web research capabilities for healthcare queries
7. **analyticsService.js** - Usage analytics and tracking
8. **cachedResponseService.js** - Response caching for performance
9. **fallbackResponseService.js** - Fallback responses when AI is unavailable
10. **advancedHealthcareAI.js** - Advanced healthcare AI with medical knowledge integration
11. **medicalKnowledgeGraph.js** - Medical knowledge graph and inference engine
12. **medicalResearchService.js** - PubMed and medical research integration
13. **hipaaComplianceService.js** - HIPAA compliance and privacy controls

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

### AI Integration Strategy

**Node.js Implementation:**
- Primary Provider: advancedHealthcareAI (configured in services/index.js line 34)
- Available Providers: DeepSeek, OpenRouter, and advanced healthcare AI services
- Fallback Chain: Advanced AI → DeepSeek/OpenRouter → Cached responses → Static fallback responses

**Cloudflare Workers Implementation:**
- Cloudflare Workers AI with 5 models: `@cf/meta/llama-3-8b-instruct` (default), Mistral, Gemma, CodeLlama, Phi-2
- Native Workers AI binding (`WORKER_AI`) for optimal performance
- Healthcare-focused system prompts with automatic medical disclaimers
- Conversation context management with KV/D1 storage

**Python Implementation:**
- PydanticAI-based multi-agent system
- Specialized agents: ConversationAgent, CrisisAgent, CulturalAgent, ResearchAgent
- Advanced healthcare analytics and PubMed integration
- Multi-provider AI support with Anthropic/OpenAI compatibility

### Deployment Configurations

**Vercel (Node.js serverless):**
- Entry: `api/index.js`
- Config: `vercel.json` with environment variables
- MongoDB disabled for serverless compatibility

**Cloudflare Workers (Edge serverless):**
- Entry: `worker-single-file.js` (752-line consolidated version) or `src/index-healthcare.js`
- Manual deployment via dashboard or wrangler CLI
- Workers AI binding pre-configured, webhook: `bloodplus-line-oa-server.getintheq.workers.dev/webhook`

**Docker (Node.js containerized):**
- Multi-stage build with Node.js 18-slim
- Health checks and production optimizations
- Full MongoDB support

**Python Serverless:**
- FastAPI-based with PydanticAI agents
- Cloudflare Workers Python runtime or standalone deployment
- Advanced testing with pytest and comprehensive fixtures

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

### Working Directory Context
The project is currently in `python-serverless/` subdirectory. When working across implementations:
- **Node.js commands**: Run from project root `/home/coder/Bloodplusfight-TH-chatbot-assistant/`
- **Python commands**: Run from `/home/coder/Bloodplusfight-TH-chatbot-assistant/python-serverless/`
- **Cloudflare Workers**: Run from `/home/coder/Bloodplusfight-TH-chatbot-assistant/cloudflare-workers/`

## Development Guidelines

### Architecture Selection Guide
**Choose Node.js Express** for:
- Full-featured development with MongoDB
- Traditional server deployments
- Complex business logic and integrations

**Choose Cloudflare Workers** for: 
- Global edge deployment with minimal latency
- Healthcare chatbot with AI-powered responses
- Cost-effective serverless scaling
- Integration with Cloudflare's AI models

**Choose Python Serverless** for:
- Advanced AI agent orchestration
- Complex healthcare analytics and research
- Multi-agent conversation systems

### AI Provider Integration

**Node.js (Traditional):**
1. Create service file in `src/services/` following `deepSeekService.js` pattern
2. Implement `generateResponse(userMessage, context, options)` method
3. Update aiService alias in `src/services/index.js` (line 34)
4. Update configuration in `config/config.js`

**Cloudflare Workers:**
1. Modify `CloudflareAIService` class in `worker-single-file.js` or `src/services/cloudflare-ai.js`
2. Add new model to `this.models` object
3. Update system prompts in `buildMessages()` method
4. Test with `curl` against `/health` endpoint

**Python Serverless:**
1. Create new agent in `python-serverless/agents/`
2. Implement agent interface following existing patterns
3. Register agent in conversation orchestrator
4. Add tests in `tests/test_agents/`

### Testing Strategy

**Node.js:**
- Jest with 10-second timeout for async operations
- Mock LINE API calls using `jest.setup.js`
- Tests in `src/services/__tests__/`

**Cloudflare Workers:**
- Vitest configuration for ES modules
- Healthcare-specific tests in `tests/healthcare.test.js`
- Quick validation with `./quick-test.sh`

**Python:**
- pytest with comprehensive fixtures and 85% coverage requirement
- Test markers: `slow`, `integration`, `medical`, `thai`, `crisis`, `api`
- Agent-specific tests in `tests/test_agents/`
- Integration tests in `tests/test_integration/`
- Medical accuracy validation with `pytest -m medical`
- Thai language processing tests with `pytest -m thai`

### LINE Bot Development
- Webhook validation handled automatically in respective frameworks
- Use framework-specific LINE API wrappers with error handling
- Message processing supports reply tokens and push messages
- Automatic language detection (EN/TH) with conversation persistence
- Medical disclaimers automatically added to healthcare responses

## Microservices Migration

The codebase includes a comprehensive microservices migration plan in the `microservices/` directory:

- **Services**: ai-conversation, customer-management, line-bot-gateway, product-catalog
- **Infrastructure**: API Gateway with nginx, Docker Compose orchestration
- **Documentation**: API contracts, CI/CD pipeline, monitoring strategy

When working on microservices features, refer to the migration documentation for service boundaries and communication patterns.

## Implementation-Specific Details

### Cloudflare Workers Implementation
Located in `cloudflare-workers/` directory with healthcare-focused architecture:

**Key Files:**
- `worker-single-file.js` - 752-line consolidated deployment version
- `src/index-healthcare.js` - Modular healthcare-optimized entry point
- `src/services/cloudflare-ai.js` - CloudflareAIService with 5 AI models
- `tests/healthcare.test.js` - Healthcare functionality tests
- `migrations/0003_healthcare_schema.sql` - Healthcare database schema

**Healthcare Features:**
- Intent classification (HIV, PrEP, STD, general)
- Automatic medical disclaimers and healthcare resource links
- Language detection (EN/TH) with culturally appropriate responses
- Conversation context with 24-hour persistence

### Python Serverless Implementation
Located in `python-serverless/` directory with advanced agent-based architecture:

**Key Components:**
- `agents/` - PydanticAI-based agents (Conversation, Crisis, Cultural, Research)
- `tools/` - Healthcare tools (crisis detection, PubMed search, Thai NLP)
- `api/` - FastAPI endpoints with specialized healthcare routes
- `tests/` - Comprehensive test suite with fixtures and mocks

**Advanced Features:**
- Multi-agent conversation orchestration with ConversationAgent, CrisisAgent, CulturalAgent, ResearchAgent
- Crisis detection and intervention with specialized safety protocols
- Cultural adaptation for Thai healthcare context with pythainlp integration
- PubMed research integration for medical queries with structured data extraction
- FastAPI-based API with specialized endpoints: `/research`, `/cultural`, `/crisis`, `/sessions`

## Key Architectural Patterns

### Multi-Implementation Strategy
The codebase maintains three parallel implementations optimized for different deployment scenarios:
- **Node.js Express**: Traditional server with full MongoDB integration
- **Cloudflare Workers**: Edge deployment with native AI integration  
- **Python Serverless**: Advanced agent-based healthcare system

### Service Centralization (Node.js)
- All services exported through `src/services/index.js` for consistent imports
- aiService aliased to advancedHealthcareAI (line 34) - modify this line to switch AI providers
- Services follow consistent async/await pattern with comprehensive error handling

### Database Strategy by Implementation
**Node.js**: MongoDB with automatic in-memory fallback, connection status via `db.isMongoDBConnected()`
**Cloudflare Workers**: D1 SQL database with KV storage for conversation context
**Python**: SQLAlchemy ORM with healthcare-optimized schema

### Healthcare Specialization
All implementations include:
- Medical intent classification (HIV, PrEP, STD information)
- Automatic medical disclaimers and professional consultation recommendations
- Thai healthcare resource integration (Department of Disease Control, ACCESS Foundation)
- Bilingual support (EN/TH) with culturally appropriate responses

### Security & Performance
- Rate limiting with webhook exemptions across all implementations
- LINE webhook signature verification for security
- Response caching and conversation context management
- CORS, security headers, and compression middleware applied globally

## Current Branch and Deployment Status

**Active Branch**: `cloudflare-workers-deployment`
**Current Working Directory**: `/home/coder/Bloodplusfight-TH-chatbot-assistant/python-serverless`

**Deployment URLs**:
- **Cloudflare Workers**: `https://bloodplus-line-oa-server.getintheq.workers.dev/webhook`
- **GitHub Repository**: `https://github.com/khiwniti/Bloodplusfight-TH-chatbot-assistant.git`

**Recent Major Changes**:
- Complete Python Serverless implementation with PydanticAI agents
- Healthcare-focused Cloudflare Workers deployment with native AI integration
- Multi-architecture support (Node.js Express, Cloudflare Workers, Python Serverless)