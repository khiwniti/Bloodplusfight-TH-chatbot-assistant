# 🔧 Troubleshooting Build and 401 Unauthorized Errors

## ✅ Build Issue Fixed

The build error (`cp: cannot stat '.env': No such file or directory`) has been resolved by updating the build script in `package.json`. The build should now complete successfully.

## 🔧 Fixing the 401 Unauthorized Error

You're getting a 401 Unauthorized error from your LINE webhook. Here's how to diagnose and fix it:

## 🔍 Step 1: Check Environment Variables

First, verify your environment variables are correctly set in Vercel:

1. **Go to Vercel Dashboard**:
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project: `bloodplusfight-th-chatbot-assistant`
   - Go to Settings → Environment Variables

2. **Verify These Variables Exist**:
   ```
   CHANNEL_ACCESS_TOKEN=RAIyX3TIdsgZ16cz+j+M//43UFk6yDXfnIwOHH7fQveMi+lZTtG8eJYi0SJlbzqi7fEGvmbLgRKKYHdwuamiBqN3VYYkeCTDT3U9FwipGyVO84ZF+MzxOuuueCo9MCKNkoulnpTC1IKE9BPbYzf4zAdB04t89/1O/w1cDnyilFU=
   CHANNEL_SECRET=97231fa1f022e21c03450365db388e21
   NODE_ENV=production
   ```

3. **Important Notes**:
   - Make sure there are NO extra spaces before/after the values
   - Environment variables are case-sensitive
   - After adding/changing variables, you must redeploy

## 🧪 Step 2: Test Configuration

Visit these diagnostic endpoints to check your configuration:

1. **Configuration Test**: 
   `https://bloodplusfight-th-chatbot-assistant-atoqqsq2c.vercel.app/webhook/test`
   
   **Expected Response**:
   ```json
   {
     "status": "ok",
     "config": {
       "hasChannelSecret": true,
       "hasChannelAccessToken": true,
       "environment": "production",
       "channelSecretLength": 32,
       "channelTokenLength": 172
     }
   }
   ```

2. **Health Check**: 
   `https://bloodplusfight-th-chatbot-assistant-atoqqsq2c.vercel.app/health`

## 🔧 Step 3: Fix Common Issues

### Issue 1: Environment Variables Not Set
**Symptoms**: `hasChannelSecret: false` or `hasChannelAccessToken: false`

**Solution**:
1. Add missing environment variables in Vercel dashboard
2. Redeploy the application
3. Test the `/webhook/test` endpoint again

### Issue 2: Incorrect Channel Secret
**Symptoms**: `channelSecretLength` is not 32 characters

**Solution**:
1. Double-check your Channel Secret in LINE Developer Console
2. Update the `CHANNEL_SECRET` environment variable in Vercel
3. Redeploy

### Issue 3: Incorrect Channel Access Token
**Symptoms**: `channelTokenLength` is not around 172 characters

**Solution**:
1. Verify your Channel Access Token in LINE Developer Console
2. Update the `CHANNEL_ACCESS_TOKEN` environment variable in Vercel
3. Redeploy

## 🚀 Step 4: Redeploy After Changes

After making any changes to environment variables:

1. **Trigger Redeploy**:
   - Go to Vercel dashboard → Deployments tab
   - Click "Redeploy" on the latest deployment
   - OR push a new commit to trigger automatic deployment

2. **Wait for Deployment**: 
   - Wait for the deployment to complete
   - The status should show "Ready"

## 🔄 Step 5: Re-verify LINE Webhook

After fixing the configuration:

1. **Go to LINE Developer Console**:
   - Visit [developers.line.biz](https://developers.line.biz/)
   - Select your channel
   - Go to "Messaging API" settings

2. **Update Webhook URL**:
   - Set: `https://bloodplusfight-th-chatbot-assistant-atoqqsq2c.vercel.app/webhook`
   - Click "Verify" - should return "Success"

3. **Enable Webhook**:
   - Toggle "Use webhook" to ON
   - Save settings

## 🐛 Step 6: Debug Mode (If Still Failing)

If you're still getting 401 errors, I've added a debug endpoint that bypasses signature validation:

**Test URL**: `https://bloodplusfight-th-chatbot-assistant-atoqqsq2c.vercel.app/webhook/debug`

Use this to test if your application is receiving requests properly. You can send a POST request with any JSON data to see if the basic functionality works.

## 📋 Quick Checklist

- [ ] Environment variables are set in Vercel dashboard
- [ ] No extra spaces in environment variable values
- [ ] Channel Secret is exactly 32 characters
- [ ] Channel Access Token is around 172 characters
- [ ] Application has been redeployed after env var changes
- [ ] `/webhook/test` endpoint shows all values as `true`
- [ ] LINE webhook verification passes
- [ ] Webhook is enabled in LINE Developer Console

## 🆘 Still Having Issues?

If you're still getting 401 errors after following these steps:

1. **Check Vercel Logs**:
   - Go to Vercel dashboard → Functions tab
   - Look for error logs in the webhook function

2. **Verify LINE Configuration**:
   - Make sure you're using the correct Channel ID and Channel Secret
   - Check if the webhook signature validation is working

3. **Contact Support**:
   - Share the results from `/webhook/test` endpoint
   - Include any error logs from Vercel dashboard

---

**Next**: Once the 401 error is resolved, test sending a message to your LINE bot to verify full functionality!
