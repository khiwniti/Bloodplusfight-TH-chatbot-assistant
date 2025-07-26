# LINE Healthcare Chatbot - Python Serverless Setup Guide

## 🎯 Overview

This guide will help you deploy the LINE Healthcare Chatbot using Python on Cloudflare Workers. The chatbot is already configured to work with your existing webhook URL: `https://bloodplus-line-oa-server.getintheq.workers.dev/webhook`

## ✅ Current Status

- ✅ Python serverless implementation completed
- ✅ Healthcare knowledge base integrated
- ✅ Multilingual support (English/Thai)
- ✅ Cloudflare Workers AI integration
- ✅ LINE webhook configured in Developer Console
- ✅ All tests passing

## 🚀 Quick Deployment

### Step 1: Navigate to Python Serverless Directory
```bash
cd python-serverless
```

### Step 2: Install Wrangler CLI (if not already installed)
```bash
npm install -g wrangler
```

### Step 3: Login to Cloudflare
```bash
wrangler login
```

### Step 4: Set Your LINE Channel Secrets
You need to set these secrets from your LINE Developer Console:

```bash
# Set your LINE Channel Access Token
wrangler secret put CHANNEL_ACCESS_TOKEN

# Set your LINE Channel Secret
wrangler secret put CHANNEL_SECRET

# Set your Cloudflare API Token (optional, for AI fallback)
wrangler secret put CLOUDFLARE_API_TOKEN
```

### Step 5: Deploy
```bash
./deploy.sh
```

Or manually:
```bash
wrangler deploy
```

## 🔧 Configuration Details

### LINE Developer Console Settings

Your webhook URL is already configured as:
```
https://bloodplus-line-oa-server.getintheq.workers.dev/webhook
```

Make sure in your LINE Developer Console:
1. ✅ Webhook usage is enabled
2. ✅ Webhook URL is set to the above URL
3. ✅ Channel Access Token and Channel Secret are copied to Cloudflare secrets

### Cloudflare Workers Configuration

The `wrangler.toml` is configured with:
- **Worker Name**: `bloodplus-line-oa-server` (matches your existing deployment)
- **AI Model**: `@cf/meta/llama-3-8b-instruct`
- **Runtime**: Python with Cloudflare Workers AI integration

## 🏥 Healthcare Features

The chatbot provides comprehensive information on:

### HIV/AIDS Information
- Transmission methods and prevention
- U=U (Undetectable = Untransmittable) concept
- Testing recommendations
- Treatment options (ART)

### PrEP (Pre-exposure Prophylaxis)
- 99% effectiveness when taken as prescribed
- Eligibility criteria
- Monitoring requirements
- Side effects information

### STDs/STIs
- Common sexually transmitted infections
- Prevention strategies
- Testing recommendations
- Treatment options

## 🌐 Language Support

- **English**: Complete healthcare information
- **Thai**: Full Thai language support with cultural considerations
- **Auto-detection**: Automatically detects user language

## 🤖 AI Integration

- Uses Cloudflare Workers AI for intelligent responses
- Healthcare-focused prompts and context
- Fallback to knowledge base for specific topics
- Medical disclaimers automatically added

## 📊 Testing Your Deployment

### 1. Health Check
```bash
curl https://bloodplus-line-oa-server.getintheq.workers.dev/health
```

### 2. Test Interface
Visit: https://bloodplus-line-oa-server.getintheq.workers.dev/test

### 3. LINE Integration Test
Send a message to your LINE bot with:
- "What is HIV?" (English)
- "เอชไอวีคืออะไร" (Thai)
- "Tell me about PrEP"
- "โรคติดต่อทางเพศสัมพันธ์"

### 4. View Logs
```bash
wrangler tail
```

## 🔒 Security & Privacy

- ✅ LINE webhook signature verification
- ✅ Medical disclaimers on all responses
- ✅ No personal data storage (stateless)
- ✅ Healthcare resource links included
- ✅ Professional consultation recommendations

## 🛠 Maintenance Commands

### Update Deployment
```bash
wrangler deploy
```

### Update Secrets
```bash
wrangler secret put SECRET_NAME
```

### View Current Status
```bash
wrangler status
```

### Monitor Logs
```bash
wrangler tail
```

## 🆘 Troubleshooting

### Common Issues

1. **"Worker not found" error**
   - Make sure you're logged into the correct Cloudflare account
   - Verify the worker name matches in wrangler.toml

2. **LINE webhook not responding**
   - Check that secrets are set correctly
   - Verify webhook URL in LINE Developer Console
   - Check logs with `wrangler tail`

3. **AI responses not working**
   - Verify Cloudflare account has Workers AI enabled
   - Check the CLOUDFLARE_ACCOUNT_ID in wrangler.toml

4. **Signature verification failing**
   - Ensure CHANNEL_SECRET is set correctly
   - Check that the secret matches your LINE channel

### Debug Steps

1. **Check deployment status:**
   ```bash
   wrangler status
   ```

2. **View real-time logs:**
   ```bash
   wrangler tail
   ```

3. **Test health endpoint:**
   ```bash
   curl https://bloodplus-line-oa-server.getintheq.workers.dev/health
   ```

4. **Verify secrets are set:**
   ```bash
   wrangler secret list
   ```

## 📈 Performance & Scaling

- **Global Edge Deployment**: Deployed on Cloudflare's global network
- **Serverless Architecture**: Automatic scaling based on demand
- **AI Integration**: Powered by Cloudflare Workers AI
- **Low Latency**: Edge computing for fast responses

## 🔄 Updates & Maintenance

### Regular Updates
1. Monitor logs for any errors
2. Update healthcare information as needed
3. Test functionality periodically
4. Keep Wrangler CLI updated

### Healthcare Information Updates
The knowledge base can be updated by modifying the healthcare response methods in `main.py` and redeploying.

## 📞 Support Resources

### Healthcare Information
- Department of Disease Control, Thailand
- ACCESS Foundation
- Local healthcare providers

### Technical Support
- Cloudflare Workers Documentation
- LINE Messaging API Documentation
- Wrangler CLI Documentation

## ✨ Next Steps

1. **Deploy the chatbot** using the steps above
2. **Test thoroughly** with various healthcare queries
3. **Monitor usage** through Cloudflare analytics
4. **Update content** as needed for accuracy
5. **Scale** based on user feedback and usage patterns

Your LINE Healthcare Chatbot is now ready for production use with comprehensive healthcare information, AI-powered responses, and privacy-compliant design! 🏥🤖