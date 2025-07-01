# Vercel Deployment Guide for LINE Chatbot

This guide will help you deploy your LINE chatbot to Vercel with seamless LINE integration.

## Prerequisites

1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **LINE Developer Account**: Access to LINE Developer Console
4. **AI Provider API Key**: OpenRouter or DeepSeek API key

## Step 1: Prepare Your Repository

The following files have been created for Vercel deployment:
- `vercel.json` - Vercel configuration
- `api/index.js` - Serverless function handler

## Step 2: Deploy to Vercel

1. **Connect to Vercel**:
   - Log in to your Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it as a Node.js project

2. **Configure Build Settings**:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm install`
   - Output Directory: Leave empty (handled by vercel.json)

## Step 3: Environment Variables

Add these environment variables in Vercel dashboard (Settings > Environment Variables):

### Required Variables
```
CHANNEL_ACCESS_TOKEN=RAIyX3TIdsgZ16cz+j+M//43UFk6yDXfnIwOHH7fQveMi+lZTtG8eJYi0SJlbzqi7fEGvmbLgRKKYHdwuamiBqN3VYYkeCTDT3U9FwipGyVO84ZF+MzxOuuueCo9MCKNkoulnpTC1IKE9BPbYzf4zAdB04t89/1O/w1cDnyilFU=
CHANNEL_SECRET=97231fa1f022e21c03450365db388e21
NODE_ENV=production
```

### Optional but Recommended Variables
```
# AI Provider (choose one)
OPENROUTER_API_KEY=your_openrouter_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
PRIMARY_AI_PROVIDER=openRouter

# MongoDB (recommended: use MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linechatbot
USE_MONGODB=true

# Performance Settings
AI_RESPONSE_TIMEOUT=25000
MAX_MESSAGE_LENGTH=2000
RATE_LIMIT=200

# Feature Flags
ENABLE_RESEARCH=true
ENABLE_CACHE=true
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true

# Security
ADMIN_API_KEY=your-secure-admin-key-here
CORS_ALLOWED_ORIGINS=*
```

## Step 4: Update LINE Webhook

After successful deployment:

1. **Get Your Vercel URL**: Copy the deployment URL (e.g., `https://your-app.vercel.app`)

2. **Update LINE Developer Console**:
   - Go to [LINE Developer Console](https://developers.line.biz/)
   - Select your channel
   - Go to "Messaging API" settings
   - Set Webhook URL to: `https://your-app.vercel.app/webhook`
   - Enable "Use webhook"
   - Verify the webhook (should return 200 OK)

## Step 5: Database Setup (Optional)

For persistent data storage, set up MongoDB Atlas:

1. **Create MongoDB Atlas Account**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a Cluster**: Choose the free tier
3. **Create Database User**: Add username/password
4. **Get Connection String**: Copy the MongoDB URI
5. **Add to Vercel**: Set `MONGODB_URI` environment variable

## Step 6: Testing

Test your deployment:

1. **Health Check**: Visit `https://your-app.vercel.app/health`
2. **Webhook Test**: Visit `https://your-app.vercel.app/webhook/test`
3. **LINE Integration**: Send a message to your LINE bot

## Troubleshooting

### Common Issues

1. **Environment Variables**:
   - Ensure all required variables are set in Vercel dashboard
   - Variables are case-sensitive
   - No spaces around the `=` sign

2. **LINE Webhook**:
   - URL must be HTTPS (Vercel provides this automatically)
   - Webhook URL should end with `/webhook`
   - Verify webhook in LINE Developer Console

3. **Function Timeout**:
   - Vercel has a 30-second timeout for serverless functions
   - AI responses should complete within this time
   - Consider reducing `AI_RESPONSE_TIMEOUT` if needed

4. **Database Connection**:
   - Use MongoDB Atlas for cloud deployment
   - Check connection string format
   - Ensure database user has proper permissions

### Logs and Monitoring

- **Vercel Logs**: Check function logs in Vercel dashboard
- **Metrics Endpoint**: `https://your-app.vercel.app/metrics` (requires API key)
- **Health Check**: `https://your-app.vercel.app/health`

## Production Considerations

1. **Database**: Use MongoDB Atlas instead of local MongoDB
2. **Monitoring**: Set up monitoring webhooks for alerts
3. **Scaling**: Vercel automatically scales based on demand
4. **Security**: Use strong API keys and enable CORS restrictions
5. **Caching**: Enable caching for better performance

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test webhook connectivity
4. Review LINE Developer Console logs
