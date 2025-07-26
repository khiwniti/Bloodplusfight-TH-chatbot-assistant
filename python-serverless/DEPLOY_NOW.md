# 🚀 Deploy Your LINE Healthcare Chatbot NOW

## ✅ Pre-configured Setup

Your Cloudflare Workers environment is already configured with:
- ✅ **Worker Name**: `bloodplus-line-oa-server`
- ✅ **Workers AI Binding**: `WORKER_AI` (matches your dashboard)
- ✅ **Webhook URL**: `https://bloodplus-line-oa-server.getintheq.workers.dev/webhook`
- ✅ **LINE Developer Console**: Webhook already configured

## 🎯 Quick Deployment (3 Steps)

### Step 1: Navigate to Python Directory
```bash
cd python-serverless
```

### Step 2: Set Your LINE Secrets
You need these from your LINE Developer Console:

```bash
# Set your LINE Channel Access Token
wrangler secret put CHANNEL_ACCESS_TOKEN

# Set your LINE Channel Secret  
wrangler secret put CHANNEL_SECRET
```

### Step 3: Deploy
```bash
wrangler deploy
```

That's it! Your chatbot will be live at:
**`https://bloodplus-line-oa-server.getintheq.workers.dev`**

## 🧪 Test Your Deployment

### 1. Health Check
```bash
curl https://bloodplus-line-oa-server.getintheq.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "bloodplusfight-healthcare-chatbot-python",
  "version": "3.0.0",
  "runtime": "python",
  "ai": {
    "provider": "cloudflare-workers-ai",
    "model": "@cf/meta/llama-3-8b-instruct"
  },
  "features": {
    "healthcare": true,
    "multilingual": true,
    "hiv_information": true,
    "prep_guidance": true,
    "std_information": true,
    "privacy_compliant": true,
    "ai_powered": true
  }
}
```

### 2. Test Interface
Visit: https://bloodplus-line-oa-server.getintheq.workers.dev/test

### 3. LINE Bot Test
Send these messages to your LINE bot:

**English Tests:**
- "What is HIV?"
- "Tell me about PrEP"
- "STD information"

**Thai Tests:**
- "เอชไอวีคืออะไร"
- "PrEP คืออะไร"
- "โรคติดต่อทางเพศสัมพันธ์"

## 📊 Monitor Your Bot

### View Real-time Logs
```bash
wrangler tail
```

### Check Deployment Status
```bash
wrangler status
```

## 🏥 What Your Bot Can Do

### Healthcare Information
- **HIV/AIDS**: Prevention, testing, treatment, U=U concept
- **PrEP**: Pre-exposure prophylaxis guidance and eligibility
- **STDs/STIs**: Common infections, prevention, testing

### AI Features
- **Intelligent Responses**: Powered by Cloudflare Workers AI
- **Language Detection**: Automatic English/Thai detection
- **Medical Disclaimers**: Automatically added to all responses
- **Healthcare Resources**: Links to Thai healthcare providers

### Privacy & Security
- **No Data Storage**: Stateless design for privacy
- **Medical Disclaimers**: On every healthcare response
- **Professional Consultation**: Always recommended
- **Signature Verification**: LINE webhook security

## 🔧 Configuration Details

Your `wrangler.toml` is configured with:
```toml
name = "bloodplus-line-oa-server"
main = "main.py"

# Workers AI binding (matches your dashboard)
[[ai]]
binding = "WORKER_AI"

# Environment variables
[vars]
ENVIRONMENT = "production"
AI_MODEL = "@cf/meta/llama-3-8b-instruct"
AI_MAX_TOKENS = "2000"
AI_TEMPERATURE = "0.7"
CLOUDFLARE_ACCOUNT_ID = "5adf62efd6cf179a8939c211b155e229"
```

## 🆘 Troubleshooting

### If deployment fails:
1. **Check login**: `wrangler whoami`
2. **Re-login if needed**: `wrangler login`
3. **Verify account**: Make sure you're in the right Cloudflare account

### If LINE bot doesn't respond:
1. **Check secrets**: `wrangler secret list`
2. **View logs**: `wrangler tail`
3. **Test health**: `curl https://bloodplus-line-oa-server.getintheq.workers.dev/health`

### If AI responses don't work:
- Your Workers AI binding is already configured correctly
- The bot will fall back to knowledge base responses
- Check logs for any AI-related errors

## 🎉 Success Indicators

After deployment, you should see:
- ✅ Health endpoint returns 200 status
- ✅ Test interface loads properly
- ✅ LINE bot responds to messages
- ✅ Both English and Thai work
- ✅ Medical disclaimers appear in responses
- ✅ Healthcare resources are included

## 📞 Ready to Go!

Your LINE Healthcare Chatbot is production-ready with:
- 🏥 Comprehensive healthcare information
- 🤖 AI-powered intelligent responses
- 🌐 Multilingual support (English/Thai)
- 🔒 Privacy-compliant design
- 📱 Full LINE integration
- 🌍 Global edge deployment

**Deploy now and start helping users with healthcare information!** 🚀