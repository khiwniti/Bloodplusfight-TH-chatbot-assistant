# Bloodplusfight LINE Healthcare Chatbot

A comprehensive LINE chatbot deployed on Cloudflare Workers, specializing in HIV/STDs healthcare information with advanced medical research capabilities, privacy compliance, and multilingual support (English/Thai).

## 🏥 Healthcare Features

### Core Medical Services
- **HIV Information**: Comprehensive HIV/AIDS information, testing, treatment, and prevention
- **STDs Information**: Complete sexually transmitted diseases information and prevention
- **PrEP Guidance**: Pre-exposure prophylaxis information and eligibility
- **Medical Research**: Real-time web scraping from trusted medical sources (WHO, CDC, NIH, Mayo Clinic)
- **Multilingual Support**: Full English and Thai language support

### Advanced Capabilities
- **AI-Powered Responses**: Intelligent medical query classification and response generation
- **Privacy-Compliant Analytics**: HIPAA-style anonymized healthcare interaction tracking
- **Research Integration**: Automatic enhancement of responses with latest medical research
- **Content Moderation**: Medical content validation and quality assessment
- **Source Reliability**: Weighted responses based on medical source credibility

## 🔒 Privacy & Security

### Healthcare Privacy Compliance
- **User Consent Management**: Required consent for healthcare data processing
- **Data Anonymization**: All user data anonymized with consistent hashing
- **Automatic Data Expiry**: Healthcare data automatically deleted after 30 days
- **No PII Storage**: Personal identifiable information never stored
- **Privacy Levels**: Configurable privacy modes (strict, moderate, minimal)

### Security Features
- **End-to-End Encryption**: Secure data transmission and storage
- **Access Controls**: Admin API key protection for sensitive operations
- **Rate Limiting**: Protection against abuse and spam
- **Content Validation**: Medical content quality and safety validation
- **Audit Logging**: Comprehensive audit trail for healthcare interactions

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- Cloudflare Workers account
- LINE Messaging API account
- Wrangler CLI installed

### Quick Start

1. **Clone and Install**
```bash
git clone https://github.com/khiwniti/Bloodplusfight-TH-chatbot-assistant.git
cd Bloodplusfight-TH-chatbot-assistant/cloudflare-workers
npm install
```

2. **Environment Setup**
```bash
# Copy environment template
cp wrangler.toml.example wrangler.toml

# Setup secrets
npm run setup:secrets

# Required secrets:
# - CHANNEL_ACCESS_TOKEN: LINE Channel Access Token
# - CHANNEL_SECRET: LINE Channel Secret
# - DEEPSEEK_API_KEY: DeepSeek AI API Key
# - OPENROUTER_API_KEY: OpenRouter API Key
# - ADMIN_API_KEY: Admin API Key
# - WEBHOOK_SECRET: Webhook verification secret
# - ANALYTICS_SALT: Analytics anonymization salt
# - ANONYMIZATION_SALT: User ID anonymization salt
```

3. **Database Setup**
```bash
# Run database migrations
npm run db:migrate
```

4. **Deploy**
```bash
# Development deployment
npm run dev

# Production deployment
npm run deploy:production
```

### Enhanced Deployment Script

The project includes a comprehensive deployment script with healthcare-specific features:

```bash
# Deploy with full validation and migration
./deploy.sh --migrate --test production

# Validate healthcare configuration
./deploy.sh --validate-healthcare

# Setup secrets for environment
./deploy.sh --setup-secrets production

# Dry run deployment
./deploy.sh --dry-run production
```

## 🛠 Development

### Project Structure
```
cloudflare-workers/
├── src/
│   ├── index.js                     # Main Worker entry point
│   ├── handlers/
│   │   ├── webhook.js               # LINE webhook handler
│   │   └── admin.js                 # Admin API handler
│   ├── services/
│   │   ├── enhanced-healthcare.js   # Core healthcare service
│   │   ├── medical-research.js      # Medical research & web scraping
│   │   ├── healthcare-analytics.js  # Privacy-compliant analytics
│   │   ├── enhanced-ai.js           # AI service with provider routing
│   │   └── database.js              # Database service
│   └── utils/
│       ├── performance.js           # Performance optimization
│       └── logger.js                # Structured logging
├── migrations/
│   ├── 0001_initial_schema.sql      # Basic schema
│   ├── 0002_analytics_schema.sql    # Analytics schema
│   └── 0003_healthcare_schema.sql   # Healthcare schema
├── tests/
│   ├── setup.js                     # Test configuration
│   └── healthcare.test.js           # Healthcare service tests
├── deploy.sh                        # Enhanced deployment script
├── wrangler.toml                    # Cloudflare Workers config
└── package.json                     # Dependencies and scripts
```

### Testing

```bash
# Run all tests
npm test

# Run healthcare-specific tests
npm run test:healthcare

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Validate Wrangler configuration
npm run validate
```

## 📊 Healthcare Analytics

### Privacy-Compliant Tracking
- **Anonymous User Tracking**: Consistent user anonymization without PII
- **Intent Classification**: Track medical query types and confidence
- **Response Quality**: Monitor healthcare response accuracy and relevance
- **Research Usage**: Track when medical research enhances responses
- **Language Distribution**: Monitor English vs Thai usage patterns

### Analytics Commands
```bash
# View analytics dashboard
npm run analytics

# Production analytics
npm run analytics:production

# Custom queries
wrangler d1 execute line-chatbot-production --command "
  SELECT intent, COUNT(*) as queries, AVG(confidence) as avg_confidence 
  FROM healthcare_analytics 
  WHERE timestamp > datetime('now', '-7 days') 
  GROUP BY intent 
  ORDER BY queries DESC
" --env production
```

## 🔍 Medical Research Integration

### Trusted Medical Sources
- **World Health Organization (WHO)**: Primary HIV/AIDS guidelines
- **Centers for Disease Control (CDC)**: US health information
- **National Institutes of Health (NIH)**: Research and clinical data
- **Mayo Clinic**: Patient education and treatment information
- **AIDSinfo (NIH)**: Specialized HIV treatment information
- **Thai Department of Disease Control**: Local Thai health information

### Research Features
- **Intelligent Query Enhancement**: Medical synonym expansion and context addition
- **Content Quality Assessment**: Automatic scoring based on medical indicators
- **Source Reliability Weighting**: Responses weighted by source credibility
- **Rate Limiting**: Respectful crawling with configurable delays
- **Caching**: Intelligent caching to reduce external requests

## 🌐 API Endpoints

### LINE Webhook
```
POST /webhook
Content-Type: application/json
X-Line-Signature: <signature>

{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "What is HIV?"
      },
      "source": {
        "type": "user",
        "userId": "U4af4980629..."
      },
      "replyToken": "0f3779fcd..."
    }
  ]
}
```

### Admin API
```bash
# Health check
GET /health
Authorization: Bearer <ADMIN_API_KEY>

# Healthcare analytics
GET /admin/analytics
Authorization: Bearer <ADMIN_API_KEY>

# User consent management
POST /admin/consent
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json
{
  "userId": "U4af4980629...",
  "action": "grant|revoke"
}
```

## 📝 Configuration

### Healthcare Configuration
```bash
# Enable medical research
ENABLE_HEALTHCARE_RESEARCH=true
HEALTHCARE_RESEARCH_TIMEOUT=15000
HEALTHCARE_MAX_RESULTS=5

# Enable analytics
ENABLE_HEALTHCARE_ANALYTICS=true
HEALTHCARE_PRIVACY_MODE=strict
HEALTHCARE_RETENTION_DAYS=30
HEALTHCARE_ANONYMIZATION=true

# Medical research settings
MEDICAL_RESEARCH_TIMEOUT=15000
MEDICAL_MAX_RESULTS=5
MEDICAL_CONCURRENT_REQUESTS=3
ENABLE_MEDICAL_CACHE=true
MEDICAL_CACHE_TTL=7200
```

### Multi-Environment Support
- **Development**: `npm run deploy` - Testing and development
- **Staging**: `npm run deploy:staging` - Pre-production validation
- **Production**: `npm run deploy:production` - Live healthcare service

## 🆘 Support

### Monitoring & Debugging
```bash
# View real-time logs
npm run logs:production

# Check healthcare configuration
npm run validate:healthcare

# Health check
npm run health-check
```

### Common Issues

**1. Healthcare Research Not Working**
- Verify `ENABLE_HEALTHCARE_RESEARCH=true`
- Check medical research timeout settings
- Ensure trusted sources are accessible

**2. Analytics Not Recording**
- Verify `ENABLE_HEALTHCARE_ANALYTICS=true`
- Check database connectivity
- Verify anonymization salts are set

**3. Privacy Consent Issues**
- Check `HEALTHCARE_PRIVACY_MODE` setting
- Verify consent database table exists
- Ensure proper consent flow implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/medical-enhancement`
3. Add comprehensive tests for healthcare features
4. Ensure privacy compliance in all changes
5. Submit a pull request with detailed medical accuracy validation

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## ⚠️ Medical Disclaimer

This chatbot provides educational health information only and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns. The information provided is based on publicly available medical sources and may not reflect the most current medical knowledge.

## 🏥 Healthcare Standards Compliance

- **HIPAA-Style Privacy**: Privacy-by-design architecture
- **Medical Information Standards**: Responses based on WHO, CDC, and NIH guidelines
- **Content Accuracy**: Multi-source verification and quality assessment
- **Cultural Sensitivity**: Appropriate medical information for Thai and international users
- **Regular Updates**: Continuous integration of latest medical research and guidelines