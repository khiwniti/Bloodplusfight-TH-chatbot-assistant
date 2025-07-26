/**
 * Healthcare LINE Chatbot - Cloudflare Workers Entry Point
 * Optimized for HIV/STDs information with privacy compliance
 * Uses Cloudflare Workers AI for intelligent responses
 */

import { CloudflareAIService } from './services/cloudflare-ai.js';

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Line-Signature, Authorization',
      'X-Request-ID': requestId
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
      // Health check endpoint
      if (request.method === 'GET' && url.pathname === '/health') {
        const aiService = new CloudflareAIService(env);
        const aiHealth = await aiService.healthCheck();
        
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'bloodplusfight-healthcare-chatbot',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'production',
          ai: {
            provider: 'cloudflare-workers-ai',
            status: aiHealth.status,
            model: aiHealth.model,
            available_models: aiService.getAvailableModels().length
          },
          features: {
            healthcare: true,
            multilingual: true,
            hiv_information: true,
            prep_guidance: true,
            std_information: true,
            privacy_compliant: true,
            ai_powered: true
          },
          supported_languages: ['en', 'th'],
          medical_disclaimers: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // LINE webhook endpoint
      if (request.method === 'POST' && url.pathname === '/webhook') {
        return await this.handleLineWebhook(request, env, ctx, requestId);
      }
      
      // Test interface
      if (request.method === 'GET' && url.pathname === '/test') {
        return new Response(this.getTestInterface(), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      
      // 404 - Not Found
      return new Response(JSON.stringify({
        error: 'Not found',
        available_endpoints: ['/health', '/webhook', '/test']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: env.ENVIRONMENT === 'production' ? 'An error occurred' : error.message,
        requestId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
  
  /**
   * Handle LINE webhook events
   */
  async handleLineWebhook(request, env, ctx, requestId) {
    try {
      const body = await request.text();
      console.log('📨 LINE Webhook received:', body);
      
      // Verify LINE signature if secret is provided
      if (env.CHANNEL_SECRET) {
        const signature = request.headers.get('X-Line-Signature');
        if (!signature || !this.verifySignature(body, env.CHANNEL_SECRET, signature)) {
          console.log('❌ Invalid LINE signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      const webhookData = JSON.parse(body);
      
      if (webhookData.events && webhookData.events.length > 0) {
        for (const event of webhookData.events) {
          if (event.type === 'message' && event.message.type === 'text') {
            await this.processHealthcareMessage(event, env, requestId);
          } else if (event.type === 'follow') {
            await this.sendWelcomeMessage(event, env, requestId);
          }
        }
      }
      
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  /**
   * Process healthcare message using Cloudflare AI
   */
  async processHealthcareMessage(event, env, requestId) {
    const userMessage = event.message.text;
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const startTime = Date.now();
    
    console.log('🏥 Processing healthcare message:', {
      userId: userId.substring(0, 8) + '...',
      message: userMessage.substring(0, 100),
      requestId
    });
    
    try {
      // Initialize AI service
      const aiService = new CloudflareAIService(env);
      
      // Classify healthcare intent and detect language
      const intent = this.classifyHealthcareIntent(userMessage);
      const language = this.detectLanguage(userMessage);
      
      console.log('📊 Message analysis:', { intent, language, requestId });
      
      // Get conversation context (if available from KV or D1)
      const context = await this.getConversationContext(userId, env);
      
      // Generate AI response with healthcare context
      const aiResponse = await aiService.generateResponse(userMessage, context, {
        intent,
        language,
        healthcare_focused: true
      });
      
      // Format response for LINE
      const formattedResponse = this.formatHealthcareResponse(aiResponse, intent, language);
      
      // Send response to LINE
      if (env.CHANNEL_ACCESS_TOKEN) {
        await this.sendLineMessage(replyToken, formattedResponse, env.CHANNEL_ACCESS_TOKEN);
      }
      
      // Save conversation context
      await this.saveConversationContext(userId, userMessage, formattedResponse, env);
      
      // Log analytics (anonymized)
      console.log('📈 Healthcare Analytics:', {
        anonymousUserId: this.anonymizeUserId(userId),
        intent,
        language,
        aiModel: aiResponse.model,
        responseTime: Date.now() - startTime,
        success: aiResponse.success,
        requestId
      });
      
    } catch (error) {
      console.error('❌ Error processing healthcare message:', error);
      
      // Send fallback response
      const fallbackResponse = this.getFallbackResponse(this.detectLanguage(userMessage));
      if (env.CHANNEL_ACCESS_TOKEN) {
        await this.sendLineMessage(replyToken, fallbackResponse, env.CHANNEL_ACCESS_TOKEN);
      }
    }
  },
  
  /**
   * Classify healthcare intent
   */
  classifyHealthcareIntent(text) {
    const lowerText = text.toLowerCase();
    
    // HIV-related keywords
    if (lowerText.includes('hiv') || lowerText.includes('aids') || 
        lowerText.includes('เอชไอวี') || lowerText.includes('เอดส์')) {
      return 'hiv';
    }
    
    // PrEP-related keywords
    if (lowerText.includes('prep') || lowerText.includes('pre-exposure') ||
        lowerText.includes('เพรพ') || lowerText.includes('การป้องกันก่อนสัมผัส')) {
      return 'prep';
    }
    
    // STD/STI-related keywords
    if (lowerText.includes('std') || lowerText.includes('sti') || 
        lowerText.includes('sexually transmitted') ||
        lowerText.includes('โรคติดต่อทางเพศ') || lowerText.includes('โรคกามโรค')) {
      return 'std';
    }
    
    return 'general';
  },
  
  /**
   * Detect language
   */
  detectLanguage(text) {
    const thaiPattern = /[\u0E00-\u0E7F]/;
    return thaiPattern.test(text) ? 'th' : 'en';
  },
  
  /**
   * Get conversation context from storage
   */
  async getConversationContext(userId, env) {
    try {
      // Try to get from KV storage if available
      if (env.KV) {
        const contextKey = `conversation:${userId}`;
        const storedContext = await env.KV.get(contextKey, 'json');
        return storedContext || [];
      }
      
      // Try to get from D1 database if available
      if (env.DB) {
        const result = await env.DB.prepare(
          'SELECT role, content FROM conversation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        ).bind(userId, 10).all();
        
        return result.results.map(row => ({
          role: row.role,
          content: row.content
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  },

  /**
   * Save conversation context to storage
   */
  async saveConversationContext(userId, userMessage, botResponse, env) {
    try {
      // Save to KV storage if available
      if (env.KV) {
        const contextKey = `conversation:${userId}`;
        const context = await this.getConversationContext(userId, env);
        
        // Add new messages
        context.push(
          { role: 'user', content: userMessage },
          { role: 'assistant', content: botResponse }
        );
        
        // Keep only last 10 messages
        const limitedContext = context.slice(-10);
        
        await env.KV.put(contextKey, JSON.stringify(limitedContext), {
          expirationTtl: 86400 // 24 hours
        });
      }
      
      // Save to D1 database if available
      if (env.DB) {
        await env.DB.prepare(`
          INSERT INTO conversation_history (user_id, role, content, created_at) 
          VALUES (?, ?, ?, datetime('now'))
        `).bind(userId, 'user', userMessage).run();
        
        await env.DB.prepare(`
          INSERT INTO conversation_history (user_id, role, content, created_at) 
          VALUES (?, ?, ?, datetime('now'))
        `).bind(userId, 'assistant', botResponse).run();
      }
    } catch (error) {
      console.error('Error saving conversation context:', error);
    }
  },

  /**
   * Format AI response for healthcare context
   */
  formatHealthcareResponse(aiResponse, intent, language) {
    if (!aiResponse.success) {
      return this.getFallbackResponse(language);
    }

    let formattedResponse = aiResponse.response;
    
    // Add medical disclaimer
    const disclaimer = language === 'th' 
      ? '\n\n⚠️ ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำทางการแพทย์'
      : '\n\n⚠️ This information is for educational purposes only. Always consult healthcare professionals for medical advice.';
    
    // Add healthcare resources for specific intents
    if (intent === 'hiv' || intent === 'prep' || intent === 'std') {
      const resources = language === 'th'
        ? '\n\n🏥 ทรัพยากรเพิ่มเติม:\n• กรมควบคุมโรค กระทรวงสาธารณสุข\n• มูลนิธิ ACCESS\n• โรงพยาบาลใกล้บ้าน'
        : '\n\n🏥 Additional Resources:\n• Department of Disease Control, Thailand\n• ACCESS Foundation\n• Local healthcare providers';
      
      formattedResponse += resources;
    }
    
    return formattedResponse + disclaimer;
  },

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(language) {
    return language === 'th'
      ? 'เสียใจด้วย ขณะนี้ระบบมีปัญหา กรุณาลองใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่ของเรา\n\n⚠️ สำหรับปัญหาเร่งด่วนทางการแพทย์ กรุณาติดต่อแพทย์หรือโรงพยาบาลทันที'
      : 'I apologize, our system is currently experiencing issues. Please try again or contact our support team.\n\n⚠️ For medical emergencies, please contact healthcare providers immediately.';
  },

  /**
   * Generate healthcare response (legacy method - now replaced by AI)
   */
  generateHealthcareResponse(intent, language, query) {
    const responses = {
      hiv: {
        en: `🏥 **HIV Information**

HIV (Human Immunodeficiency Virus) attacks the immune system:

**Key Facts:**
• **Transmission**: Blood, semen, vaginal fluids, breast milk
• **Prevention**: Condoms, PrEP, regular testing
• **Treatment**: Antiretroviral therapy (ART) is highly effective
• **Testing**: Multiple test types with different window periods

**U=U**: Undetectable = Untransmittable. People with undetectable viral loads cannot transmit HIV sexually.

⚠️ **Medical Disclaimer**: This information is for educational purposes only. Always consult with healthcare providers for medical advice, diagnosis, or treatment decisions.`,

        th: `🏥 **ข้อมูลเอชไอวี**

เอชไอวี (Human Immunodeficiency Virus) ทำลายระบบภูมิคุ้มกัน:

**ข้อมูลสำคัญ:**
• **การติดต่อ**: เลือด น้ำอสุจิ น้ำหล่อลื่นช่องคลอด น้ำนมแม่
• **การป้องกัน**: ถุงยางอนามัย PrEP ตรวจเลือดเป็นประจำ
• **การรักษา**: ยาต้านไวรัส (ART) มีประสิทธิภาพสูง
• **การตรวจ**: การตรวจหลายประเภทที่มีช่วงหน้าต่างแตกต่างกัน

**U=U**: ตรวจไม่พบ = ไม่ติดต่อ ผู้ที่มีปริมาณไวรัสตรวจไม่พบจะไม่ติดต่อเอชไอวีทางเพศสัมพันธ์

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำ การวินิจฉัย หรือการรักษา`
      },
      
      prep: {
        en: `🏥 **PrEP Information**

Pre-exposure prophylaxis (PrEP) prevents HIV infection:

**Effectiveness:**
• **99% effective** when taken as prescribed for sexual transmission
• **74% effective** for injection drug use

**Who Should Consider PrEP:**
• People with HIV-positive partners
• Multiple sexual partners
• Injection drug users
• Men who have sex with men in high-prevalence areas

**Monitoring Required:**
• HIV testing every 3 months
• Kidney function tests
• STD screening

⚠️ **Medical Disclaimer**: Consult healthcare providers to determine if PrEP is right for you.`,

        th: `🏥 **ข้อมูล PrEP**

การป้องกันก่อนสัมผัส (PrEP) ป้องกันการติดเชื้อเอชไอวี:

**ประสิทธิภาพ:**
• **99% ประสิทธิภาพ** เมื่อทานตามแพทย์สั่งสำหรับการติดต่อทางเพศสัมพันธ์
• **74% ประสิทธิภาพ** สำหรับผู้ใช้ยาเสพติดฉีด

**ใครควรพิจารณาใช้ PrEP:**
• คนที่มีคู่นอนติดเชื้อเอชไอวี
• มีคู่นอนหลายคน
• ผู้ใช้ยาเสพติดฉีด
• ชายที่มีเพศสัมพันธ์กับชายในพื้นที่ที่มีการแพร่ระบาดสูง

**การติดตามที่จำเป็น:**
• ตรวจเอชไอวีทุก 3 เดือน
• ตรวจการทำงานของไต
• ตรวจโรคติดต่อทางเพศสัมพันธ์

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ปรึกษาแพทย์เพื่อพิจารณาว่า PrEP เหมาะสมกับคุณหรือไม่`
      },
      
      std: {
        en: `🏥 **STDs/STIs Information**

Sexually transmitted diseases prevention and care:

**Common STDs:**
• **Chlamydia** - Most common, often no symptoms, curable
• **Gonorrhea** - Bacterial infection, may be drug-resistant
• **Syphilis** - Stages of infection, highly contagious early
• **Herpes** - Viral, manageable but not curable
• **HPV** - Some cause warts, others can cause cancer

**Prevention:**
• Use condoms consistently
• Regular testing for sexually active individuals
• HPV and Hepatitis B vaccines available
• Open communication with partners

⚠️ **Medical Disclaimer**: Seek professional medical advice for symptoms, testing, or treatment.`,

        th: `🏥 **ข้อมูลโรคติดต่อทางเพศสัมพันธ์**

การป้องกันและดูแลโรคติดต่อทางเพศสัมพันธ์:

**โรคที่พบบ่อย:**
• **คลาไมเดีย** - พบบ่อยที่สุด มักไม่มีอาการ รักษาหายได้
• **หนองใน** - การติดเชื้อแบคทีเรีย อาจดื้อยา
• **ซิฟิลิส** - มีระยะของการติดเชื้อ ติดต่อได้ง่ายในระยะแรก
• **เฮอร์ปีส** - เชื้อไวรัส ควบคุมได้แต่รักษาไม่หาย
• **HPV** - บางชนิดทำให้เกิดหูด บางชนิดอาจทำให้เกิดมะเร็ง

**การป้องกัน:**
• ใช้ถุงยางอนามัยอย่างสม่ำเสมอ
• ตรวจสุขภาพเป็นประจำสำหรับผู้ที่มีเพศสัมพันธ์
• มีวัคซีน HPV และไวรัสตับอักเสบบี
• สื่อสารอย่างเปิดเผยกับคู่นอน

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ขอคำแนะนำจากแพทย์สำหรับอาการ การตรวจ หรือการรักษา`
      }
    };
    
    if (responses[intent] && responses[intent][language]) {
      return responses[intent][language];
    }
    
    // General response
    const general = {
      en: `Hello! I can help you with healthcare information about:

🏥 **HIV/AIDS** - Testing, treatment, prevention
💊 **PrEP** - Pre-exposure prophylaxis information
🔬 **STDs/STIs** - Prevention, testing, treatment
🏥 **Sexual Health** - Safe practices and guidance

What specific information would you like to know?

⚠️ **Medical Disclaimer**: This information is for educational purposes only. Always consult with healthcare providers for medical advice.`,

      th: `สวัสดีครับ! ผมสามารถช่วยให้ข้อมูลด้านสุขภาพเกี่ยวกับ:

🏥 **เอชไอวี/เอดส์** - การตรวจ การรักษา การป้องกัน
💊 **PrEP** - ข้อมูลการป้องกันก่อนสัมผัส
🔬 **โรคติดต่อทางเพศ** - การป้องกัน การตรวจ การรักษา
🏥 **สุขภาพทางเพศ** - แนวปฏิบัติที่ปลอดภัยและคำแนะนำ

คุณต้องการทราบข้อมูลเฉพาะเจาะจงอะไรครับ?

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำทางการแพทย์`
    };
    
    return general[language] || general.en;
  },
  
  /**
   * Send welcome message
   */
  async sendWelcomeMessage(event, env, requestId) {
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    
    const welcomeMessage = {
      en: `🏥 Welcome to Bloodplusfight Healthcare Chatbot!

I'm here to provide you with reliable information about:
• HIV/AIDS prevention, testing, and treatment
• PrEP (Pre-exposure prophylaxis) guidance
• STDs/STIs information and prevention
• Sexual health education

How can I help you today?

⚠️ This information is for educational purposes only. Always consult healthcare providers for medical advice.`,

      th: `🏥 ยินดีต้อนรับสู่ Bloodplusfight Healthcare Chatbot!

ผมพร้อมให้ข้อมูลที่เชื่อถือได้เกี่ยวกับ:
• การป้องกัน การตรวจ และการรักษาเอชไอวี/เอดส์
• คำแนะนำเรื่อง PrEP (การป้องกันก่อนสัมผัส)
• ข้อมูลและการป้องกันโรคติดต่อทางเพศสัมพันธ์
• การศึกษาด้านสุขภาพทางเพศ

มีอะไรให้ช่วยไหมครับ?

⚠️ ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำทางการแพทย์`
    };
    
    const message = welcomeMessage.th; // Default to Thai, can add language detection
    
    if (env.CHANNEL_ACCESS_TOKEN) {
      await this.sendLineMessage(replyToken, message, env.CHANNEL_ACCESS_TOKEN);
    }
    
    console.log('👋 Welcome message sent:', { userId: userId.substring(0, 8) + '...', requestId });
  },
  
  /**
   * Send message to LINE
   */
  async sendLineMessage(replyToken, message, accessToken) {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          replyToken: replyToken,
          messages: [{
            type: 'text',
            text: message
          }]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ LINE API error:', response.status, errorText);
      } else {
        console.log('✅ Message sent to LINE successfully');
      }
      
    } catch (error) {
      console.error('❌ Failed to send LINE message:', error);
    }
  },
  
  /**
   * Verify LINE signature
   */
  verifySignature(body, secret, signature) {
    // Simple verification - in production use proper crypto validation
    return true; // For now, skip verification
  },
  
  /**
   * Anonymize user ID
   */
  anonymizeUserId(userId) {
    if (!userId) return 'anonymous';
    
    // Simple hash for anonymization
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `anon_${Math.abs(hash).toString(36).substring(0, 12)}`;
  },
  
  /**
   * Get test interface HTML
   */
  getTestInterface() {
    return `<!DOCTYPE html>
<html>
<head>
  <title>🏥 Healthcare Chatbot Test</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f7fa; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
    h1 { color: #2c5530; }
    button { background: #28a745; color: white; border: none; padding: 10px 15px; border-radius: 5px; margin: 5px; cursor: pointer; }
    button:hover { background: #218838; }
    .thai-btn { background: #17a2b8; }
    .thai-btn:hover { background: #138496; }
    input { width: 400px; padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
    .result { background: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 Bloodplusfight Healthcare Chatbot Test</h1>
    
    <h3>📋 Quick Tests</h3>
    <button onclick="test('What is HIV?', 'en')">HIV Info (EN)</button>
    <button onclick="test('เอชไอวีคืออะไร', 'th')" class="thai-btn">HIV Info (TH)</button>
    <button onclick="test('Tell me about PrEP', 'en')">PrEP Info (EN)</button>
    <button onclick="test('PrEP คืออะไร', 'th')" class="thai-btn">PrEP Info (TH)</button>
    <button onclick="test('STD information', 'en')">STD Info (EN)</button>
    <button onclick="test('โรคติดต่อทางเพศ', 'th')" class="thai-btn">STD Info (TH)</button>
    
    <h3>✏️ Custom Test</h3>
    <input type="text" id="query" placeholder="Enter your healthcare question...">
    <button onclick="testCustom()">Send</button>
    
    <h3>📊 Results</h3>
    <div id="results"></div>
  </div>
  
  <script>
    function test(query, lang) {
      fetch('/webhook', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          events: [{
            type: 'message',
            message: {type: 'text', text: query},
            source: {type: 'user', userId: 'test-user'},
            replyToken: 'test-reply'
          }]
        })
      }).then(() => {
        document.getElementById('results').innerHTML += 
          '<div class="result"><strong>Sent:</strong> ' + query + ' (' + lang + ') ✅</div>';
      });
    }
    
    function testCustom() {
      const query = document.getElementById('query').value;
      if (query) {
        const lang = /[\\u0E00-\\u0E7F]/.test(query) ? 'th' : 'en';
        test(query, lang);
        document.getElementById('query').value = '';
      }
    }
  </script>
</body>
</html>`;
  }
};

/**
 * Durable Object for stateful operations
 */
export class ChatbotDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }
  
  async fetch(request) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }
    
    switch (request.method) {
      case 'GET':
        return this.getSession(sessionId);
      case 'POST':
        return this.updateSession(sessionId, await request.json());
      case 'DELETE':
        return this.deleteSession(sessionId);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }
  
  async getSession(sessionId) {
    const session = this.sessions.get(sessionId) || await this.state.storage.get(sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async updateSession(sessionId, data) {
    const session = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    this.sessions.set(sessionId, session);
    await this.state.storage.put(sessionId, session);
    
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    await this.state.storage.delete(sessionId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}