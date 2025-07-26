# 🚀 Production Deployment Guide

## 📋 Issue Resolution

**Problem**: LINE chatbot in production not responding to user messages.

**Root Cause**: The main entry point (`src/index.js`) uses generic webhook handler without healthcare functionality.

**Solution**: Updated `wrangler.toml` to use healthcare-enabled entry point (`src/index-healthcare.js`).

## ⚙️ Pre-Deployment Setup

### 1. Install Latest Wrangler
```bash
npm install --save-dev wrangler@4
```

### 2. Cloudflare Authentication
```bash
# Get API token from: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
export CLOUDFLARE_API_TOKEN="your-token-here"

# Or login interactively
npx wrangler login
```

### 3. Set Production Secrets
```bash
# LINE Bot credentials
npx wrangler secret put CHANNEL_ACCESS_TOKEN --env production
npx wrangler secret put CHANNEL_SECRET --env production

# AI service keys
npx wrangler secret put DEEPSEEK_API_KEY --env production
npx wrangler secret put OPENROUTER_API_KEY --env production

# Admin access
npx wrangler secret put ADMIN_API_KEY --env production
npx wrangler secret put WEBHOOK_SECRET --env production
```

### 4. Create Database Resources
```bash
# Create production D1 database
npx wrangler d1 create line-chatbot-prod --env production

# Create KV namespace
npx wrangler kv:namespace create "KV" --env production

# Create R2 bucket
npx wrangler r2 bucket create line-chatbot-assets-prod --env production
```

### 5. Update Database IDs in wrangler.toml
Replace placeholder IDs with actual resource IDs:
```toml
# Update these with actual IDs from step 4
database_id = "your-actual-production-d1-id"
id = "your-actual-production-kv-id"
```

## 🚀 Deployment

### Deploy to Production
```bash
npx wrangler deploy --env production
```

### Run Database Migrations
```bash
npx wrangler d1 execute line-chatbot-prod --file=./migrations/initial-schema.sql --env production
```

## 🏥 Healthcare Features Enabled

The updated deployment includes:

### ✅ Core Healthcare Features
- **HIV/AIDS Information**: Comprehensive prevention, testing, and treatment guidance
- **PrEP Guidance**: Pre-exposure prophylaxis information and candidate assessment
- **STDs/STIs Information**: Common diseases, prevention, and testing information
- **Medical Disclaimers**: Professional disclaimers in all responses

### ✅ Multilingual Support
- **English**: Full healthcare information and guidance
- **Thai**: Complete localization for Thai users
- **Auto-Detection**: Automatic language detection from user input

### ✅ Privacy & Compliance
- **User Anonymization**: Hash-based anonymization for analytics
- **Data Protection**: No PII stored or logged
- **Medical Compliance**: Professional disclaimers and guidance

### ✅ Advanced Features
- **Intent Classification**: Automatic healthcare topic classification
- **Response Generation**: Context-aware healthcare responses
- **Analytics**: Privacy-compliant usage analytics
- **Error Handling**: Graceful error responses with logging

## 🔗 Production Endpoints

After deployment, these endpoints will be available:

```
Health Check: https://line-chatbot-workers-prod.your-subdomain.workers.dev/health
LINE Webhook: https://line-chatbot-workers-prod.your-subdomain.workers.dev/webhook
Test Interface: https://line-chatbot-workers-prod.your-subdomain.workers.dev/test
```

## 📱 LINE Bot Configuration

Update your LINE Bot webhook URL to:
```
https://line-chatbot-workers-prod.your-subdomain.workers.dev/webhook
```

### LINE Developer Console Settings:
1. **Webhook URL**: Use production endpoint above
2. **Use webhook**: Enabled
3. **Auto-reply messages**: Disabled
4. **Greeting messages**: Enabled

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://line-chatbot-workers-prod.your-subdomain.workers.dev/health
```

### 2. Test Healthcare Responses
Visit the test interface:
```
https://line-chatbot-workers-prod.your-subdomain.workers.dev/test
```

### 3. LINE Bot Testing
Send messages to your LINE Bot:
- "What is HIV?" (English)
- "เอชไอวีคืออะไร" (Thai)
- "Tell me about PrEP"
- "โรคติดต่อทางเพศ"

## 📊 Monitoring

### Analytics Dashboard
```
https://line-chatbot-workers-prod.your-subdomain.workers.dev/api/analytics
```

### Prometheus Metrics
```
https://line-chatbot-workers-prod.your-subdomain.workers.dev/metrics
```

## 🔧 Troubleshooting

### Common Issues

1. **Bot Not Responding**: Check webhook URL in LINE console
2. **Authentication Errors**: Verify all secrets are set correctly
3. **Database Errors**: Ensure migrations have been run
4. **Rate Limiting**: Check rate limit configuration

### Debug Commands
```bash
# Check deployment status
npx wrangler deployments list --env production

# View logs
npx wrangler tail --env production

# Test webhook locally
npx wrangler dev --env production
```

## ✅ Expected Results

After successful deployment:

1. **LINE Bot Responds**: Users receive healthcare information responses
2. **Multilingual**: Supports both English and Thai users
3. **Healthcare Topics**: Responds to HIV, PrEP, and STD queries
4. **Privacy Compliant**: All responses include medical disclaimers
5. **Analytics Working**: Usage data collected with privacy protection

## 🎯 Next Steps

1. Deploy to production using this guide
2. Update LINE Bot webhook URL
3. Test all healthcare functionality
4. Monitor analytics and error logs
5. Set up alerting for production issues

**Status**: Ready for production deployment with healthcare functionality ✅