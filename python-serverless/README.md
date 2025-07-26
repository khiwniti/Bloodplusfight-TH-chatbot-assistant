# LINE Healthcare Chatbot - Python Serverless

A comprehensive LINE chatbot built with Python for Cloudflare Workers, specializing in healthcare information about HIV/STDs with privacy compliance and multilingual support.

## 🏥 Features

- **Healthcare Information**: Comprehensive HIV/AIDS, PrEP, and STDs/STIs information
- **Multilingual Support**: English and Thai language support with automatic detection
- **AI-Powered Responses**: Uses Cloudflare Workers AI for intelligent responses
- **Privacy Compliant**: Designed with healthcare privacy considerations
- **Serverless Architecture**: Deployed on Cloudflare Workers for global performance
- **Medical Disclaimers**: Automatic inclusion of appropriate medical disclaimers
- **LINE Integration**: Full LINE Messaging API integration with webhook support

## 🚀 Quick Start

### Prerequisites

- Cloudflare account with Workers enabled
- LINE Developer account with configured channel
- Wrangler CLI installed (`npm install -g wrangler`)

### Deployment

1. **Clone and navigate to the Python serverless directory:**
   ```bash
   cd python-serverless
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Set your secrets:**
   ```bash
   wrangler secret put CHANNEL_ACCESS_TOKEN
   wrangler secret put CHANNEL_SECRET
   wrangler secret put CLOUDFLARE_API_TOKEN
   ```

4. **Deploy:**
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   wrangler deploy
   ```

## 🔧 Configuration

### Environment Variables

Set in `wrangler.toml`:

- `ENVIRONMENT`: Deployment environment (production/staging/development)
- `AI_MODEL`: Cloudflare AI model to use (default: @cf/meta/llama-3-8b-instruct)
- `AI_MAX_TOKENS`: Maximum tokens for AI responses (default: 2000)
- `AI_TEMPERATURE`: AI response creativity (default: 0.7)
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Secrets

Set via `wrangler secret put`:

- `CHANNEL_ACCESS_TOKEN`: LINE channel access token
- `CHANNEL_SECRET`: LINE channel secret
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token (if using REST API fallback)

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns service status and configuration information.

### LINE Webhook
```
POST /webhook
```
Receives LINE webhook events. Configure this URL in your LINE Developer Console:
```
https://bloodplus-line-oa-server.getintheq.workers.dev/webhook
```

### Test Interface
```
GET /test
```
HTML test interface for development and debugging.

## 🏥 Healthcare Information

The chatbot provides evidence-based information on:

### HIV/AIDS
- Transmission methods and prevention
- Testing recommendations and window periods
- Treatment options (ART)
- U=U (Undetectable = Untransmittable) concept
- Risk reduction strategies

### PrEP (Pre-exposure Prophylaxis)
- Effectiveness rates and usage
- Eligibility criteria
- Monitoring requirements
- Side effects and considerations

### STDs/STIs
- Common sexually transmitted infections
- Prevention strategies
- Testing recommendations
- Treatment options

## 🌐 Language Support

- **English**: Full healthcare information and AI responses
- **Thai**: Complete Thai language support with cultural considerations
- **Auto-detection**: Automatic language detection based on user input

## 🤖 AI Integration

Uses Cloudflare Workers AI for:
- Intelligent response generation
- Context-aware conversations
- Healthcare-focused prompts
- Fallback responses when knowledge base doesn't cover specific queries

## 🔒 Privacy & Security

- **Medical Disclaimers**: Automatic inclusion in all healthcare responses
- **Signature Verification**: LINE webhook signature validation
- **No Personal Data Storage**: Stateless design for privacy
- **Healthcare Resources**: Links to official healthcare providers
- **Professional Consultation**: Always recommends consulting healthcare professionals

## 📊 Monitoring

### View Logs
```bash
wrangler tail
```

### Health Check
```bash
curl https://bloodplus-line-oa-server.getintheq.workers.dev/health
```

## 🛠 Development

### Local Testing
```bash
python main.py
```

### Environment-specific Deployment
```bash
# Staging
wrangler deploy --env staging

# Development
wrangler deploy --env development
```

## 📋 LINE Developer Console Setup

1. Create a LINE channel in the LINE Developer Console
2. Set the webhook URL to: `https://bloodplus-line-oa-server.getintheq.workers.dev/webhook`
3. Enable webhook usage
4. Copy the Channel Access Token and Channel Secret to your Cloudflare Workers secrets

## 🔄 Updates and Maintenance

### Update Deployment
```bash
wrangler deploy
```

### Update Secrets
```bash
wrangler secret put SECRET_NAME
```

### View Current Deployment
```bash
wrangler status
```

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check LINE Developer Console webhook settings
2. **AI responses not working**: Verify Cloudflare AI binding and account ID
3. **Authentication errors**: Check LINE channel tokens and secrets
4. **Deployment failures**: Ensure wrangler is logged in and has proper permissions

### Debug Commands
```bash
# View logs in real-time
wrangler tail

# Check deployment status
wrangler status

# Test health endpoint
curl https://bloodplus-line-oa-server.getintheq.workers.dev/health
```

## 📞 Support

For healthcare information accuracy or medical questions, always consult qualified healthcare professionals. This chatbot provides educational information only.

## 🏷 Version

Current version: 3.0.0 (Python Serverless)

## 📄 License

This project is designed for healthcare education and awareness purposes.