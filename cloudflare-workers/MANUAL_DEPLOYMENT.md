# Manual Deployment Guide for Cloudflare Workers AI

## ✅ Workers AI is Already Connected!

From your screenshot, I can see that Workers AI is successfully bound to your `bloodplus-line-oa-server` worker with the binding name `WORKER_AI`.

## 🚀 Manual Deployment via Dashboard

Since wrangler authentication is having issues, here's how to deploy manually:

### Step 1: Go to Your Worker
1. Visit: https://dash.cloudflare.com/5adf62efd6cf179a8939c211b155e229/workers-and-pages/view/bloodplus-line-oa-server
2. Click **"Quick Edit"** or **"Edit Code"**

### Step 2: Replace the Code
Copy the entire content from `src/index-healthcare.js` and paste it to replace the current worker code.

### Step 3: Save and Deploy
1. Click **"Save and Deploy"**
2. The worker will now use Cloudflare Workers AI!

## 🔧 Code is Ready

The code has been updated to:
- ✅ Use the `WORKER_AI` binding (matches your dashboard)
- ✅ Support all 5 AI models (Llama-3, Mistral, Gemma, etc.)
- ✅ Include healthcare-focused prompts
- ✅ Add medical disclaimers automatically
- ✅ Handle conversation context
- ✅ Support English and Thai languages

## 📊 Test After Deployment

### Health Check
```bash
curl https://bloodplus-line-oa-server.kiw-brw.workers.dev/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "ai": {
    "provider": "cloudflare-workers-ai",
    "status": "healthy",
    "model": "@cf/meta/llama-3-8b-instruct",
    "available_models": 5
  },
  "features": {
    "ai_powered": true,
    "healthcare": true,
    "multilingual": true
  }
}
```

### Test AI Response
Send a message to your LINE bot:
- **English**: "What is HIV prevention?"
- **Thai**: "การป้องกันเอชไอวีคืออะไร"

## 🎯 What Changed

### Before (External AI)
```javascript
// Used OpenRouter/DeepSeek API calls
const response = await fetch('https://api.openrouter.ai/...')
```

### After (Cloudflare Workers AI)
```javascript
// Uses native Workers AI binding
const response = await env.WORKER_AI.run('@cf/meta/llama-3-8b-instruct', {
  messages: [...],
  max_tokens: 2000
})
```

## 💡 Benefits

### Cost & Performance
- **No External API Costs**: AI runs on Cloudflare's network
- **Lower Latency**: No external API calls
- **Better Rate Limits**: Native Workers AI integration

### Enhanced Features  
- **5 AI Models**: Choose optimal model for each query
- **Conversation Memory**: Maintains context across messages
- **Healthcare Focus**: Specialized medical information prompts
- **Automatic Disclaimers**: Compliant medical information

## 🔄 Alternative: Deploy via Git

If you prefer automated deployment:

1. **Push to GitHub**: Commit all the changes
2. **Connect via Dashboard**: Link your GitHub repo to Cloudflare Pages/Workers
3. **Auto-Deploy**: Changes will deploy automatically

## 🎉 You're Ready!

Your Cloudflare Workers AI integration is complete and ready to deploy. The Workers AI binding is already configured in your dashboard, so you just need to update the worker code manually through the Quick Edit interface.

After deployment, your LINE chatbot will use Cloudflare's AI models for intelligent healthcare responses!