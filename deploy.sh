#!/bin/bash

# Vercel Deployment Script for LINE Chatbot
# This script helps you deploy your LINE chatbot to Vercel

echo "🚀 LINE Chatbot - Vercel Deployment Script"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if this is a git repository
if [ ! -d ".git" ]; then
    echo "⚠️  This is not a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✅ vercel.json configuration file created"
echo "✅ api/index.js serverless handler created"
echo "✅ .env.production template created"
echo "✅ VERCEL_DEPLOYMENT.md guide created"

echo ""
echo "📝 Before deploying, make sure you have:"
echo "1. Pushed your code to GitHub"
echo "2. Created a Vercel account at https://vercel.com"
echo "3. Your LINE Channel Access Token and Secret"
echo "4. An AI provider API key (OpenRouter or DeepSeek)"

echo ""
echo "🔧 Deployment options:"
echo "1. Deploy via Vercel Dashboard (Recommended for first time)"
echo "2. Deploy via Vercel CLI"

read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Deploying via Vercel Dashboard:"
        echo "1. Go to https://vercel.com/dashboard"
        echo "2. Click 'New Project'"
        echo "3. Import your GitHub repository"
        echo "4. Configure environment variables (see .env.production)"
        echo "5. Deploy!"
        echo ""
        echo "📖 Full guide available in VERCEL_DEPLOYMENT.md"
        ;;
    2)
        echo ""
        echo "⚡ Deploying via Vercel CLI:"
        echo "Make sure you're logged in to Vercel CLI:"
        vercel login
        
        echo ""
        echo "Deploying to Vercel..."
        vercel --prod
        
        echo ""
        echo "🎉 Deployment complete!"
        echo "Don't forget to:"
        echo "1. Add environment variables in Vercel dashboard"
        echo "2. Update LINE webhook URL"
        echo "3. Test your bot"
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 Next steps:"
echo "1. Configure environment variables in Vercel dashboard"
echo "2. Update LINE Developer Console webhook URL"
echo "3. Test your deployment at https://your-app.vercel.app/health"
echo "4. Send a test message to your LINE bot"

echo ""
echo "🔗 Useful links:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- LINE Developer Console: https://developers.line.biz/"
echo "- MongoDB Atlas: https://www.mongodb.com/cloud/atlas"

echo ""
echo "✨ Happy chatting!"
