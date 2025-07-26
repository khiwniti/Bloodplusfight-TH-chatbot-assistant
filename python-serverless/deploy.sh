#!/bin/bash

# LINE Healthcare Chatbot - Python Serverless Deployment Script
# Deploy to Cloudflare Workers with Python runtime

set -e

echo "🚀 Deploying LINE Healthcare Chatbot (Python Serverless) to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare:"
    wrangler login
fi

# Set secrets if provided as environment variables
if [ ! -z "$CHANNEL_ACCESS_TOKEN" ]; then
    echo "🔑 Setting CHANNEL_ACCESS_TOKEN secret..."
    echo "$CHANNEL_ACCESS_TOKEN" | wrangler secret put CHANNEL_ACCESS_TOKEN
fi

if [ ! -z "$CHANNEL_SECRET" ]; then
    echo "🔑 Setting CHANNEL_SECRET secret..."
    echo "$CHANNEL_SECRET" | wrangler secret put CHANNEL_SECRET
fi

if [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "🔑 Setting CLOUDFLARE_API_TOKEN secret..."
    echo "$CLOUDFLARE_API_TOKEN" | wrangler secret put CLOUDFLARE_API_TOKEN
fi

# Deploy to Cloudflare Workers
echo "📦 Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your chatbot is now available at:"
echo "   https://bloodplus-line-oa-server.getintheq.workers.dev"
echo ""
echo "📋 Available endpoints:"
echo "   GET  /health   - Health check"
echo "   POST /webhook  - LINE webhook (configured in LINE Developer Console)"
echo "   GET  /test     - Test interface"
echo ""
echo "🔧 To set secrets manually:"
echo "   wrangler secret put CHANNEL_ACCESS_TOKEN"
echo "   wrangler secret put CHANNEL_SECRET"
echo "   wrangler secret put CLOUDFLARE_API_TOKEN"
echo ""
echo "📊 To view logs:"
echo "   wrangler tail"
echo ""
echo "🏥 Healthcare Features:"
echo "   • HIV/AIDS information and prevention"
echo "   • PrEP (Pre-exposure prophylaxis) guidance"
echo "   • STDs/STIs information"
echo "   • Multilingual support (English/Thai)"
echo "   • AI-powered responses via Cloudflare Workers AI"
echo "   • Privacy-compliant design"