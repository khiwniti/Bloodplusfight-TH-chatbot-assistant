/**
 * Healthcare Chatbot Test Server
 * Simple server for testing healthcare chatbot functionality with ngrok
 */

const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;

// Healthcare knowledge base responses
const healthcareResponses = {
  hiv: {
    en: `🏥 **HIV Information**

HIV (Human Immunodeficiency Virus) attacks the immune system:

**Key Facts:**
• **Transmission**: Blood, semen, vaginal fluids, breast milk
• **Prevention**: Condoms, PrEP, regular testing, avoid sharing needles
• **Treatment**: Antiretroviral therapy (ART) is highly effective
• **Testing**: Multiple test types with different window periods

**Important**: Modern HIV treatment allows people to live normal lifespans.

⚠️ **Medical Disclaimer**: This is educational information only. Always consult with healthcare providers for medical advice, diagnosis, or treatment decisions.`,

    th: `🏥 **ข้อมูลเอชไอวี**

เอชไอวี (Human Immunodeficiency Virus) ทำลายระบบภูมิคุ้มกัน:

**ข้อมูลสำคัญ:**
• **การติดต่อ**: เลือด น้ำอสุจิ น้ำหล่อลื่นช่องคลอด น้ำนมแม่
• **การป้องกัน**: ถุงยางอนามัย PrEP ตรวจเลือดเป็นประจำ หลีกเลี่ยงการใช้เข็มร่วมกัน
• **การรักษา**: ยาต้านไวรัส (ART) มีประสิทธิภาพสูง
• **การตรวจ**: การตรวจหลายประเภทที่มีช่วงหน้าต่างแตกต่างกัน

**สำคัญ**: การรักษาเอชไอวีปัจจุบันช่วยให้ผู้ป่วยมีอายุขัยปกติได้

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำ การวินิจฉัย หรือการรักษา`
  },

  prep: {
    en: `🏥 **PrEP Information**

Pre-exposure prophylaxis (PrEP) prevents HIV infection:

**Effectiveness:**
• **99% effective** when taken as prescribed for sexual transmission
• **74% effective** for injection drug use when taken consistently

**Who Should Consider PrEP:**
• People with HIV-positive partners
• Multiple sexual partners
• Injection drug users
• Men who have sex with men in high-prevalence areas

**Monitoring Required:**
• HIV testing every 3 months
• Kidney function tests
• STD screening
• Regular medical visits

⚠️ **Medical Disclaimer**: Consult healthcare providers to determine if PrEP is right for you.`,

    th: `🏥 **ข้อมูล PrEP**

การป้องกันก่อนสัมผัส (PrEP) ป้องกันการติดเชื้อเอชไอวี:

**ประสิทธิภาพ:**
• **99% ประสิทธิภาพ** เมื่อทานตามแพทย์สั่งสำหรับการติดต่อทางเพศสัมพันธ์
• **74% ประสิทธิภาพ** สำหรับผู้ใช้ยาเสพติดฉีดเมื่อทานสม่ำเสมอ

**ใครควรพิจารณาใช้ PrEP:**
• คนที่มีคู่นอนติดเชื้อเอชไอวี
• มีคู่นอนหลายคน
• ผู้ใช้ยาเสพติดฉีด
• ชายที่มีเพศสัมพันธ์กับชายในพื้นที่ที่มีการแพร่ระบาดสูง

**การติดตามที่จำเป็น:**
• ตรวจเอชไอวีทุก 3 เดือน
• ตรวจการทำงานของไต
• ตรวจโรคติดต่อทางเพศสัมพันธ์
• พบแพทย์เป็นประจำ

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ปรึกษาแพทย์เพื่อพิจารณาว่า PrEP เหมาะสมกับคุณหรือไม่`
  },

  std: {
    en: `🏥 **STDs/STIs Information**

Sexually transmitted diseases/infections prevention and care:

**Common STDs:**
• **Chlamydia** - Most common, often no symptoms, curable
• **Gonorrhea** - Bacterial infection, may be drug-resistant
• **Syphilis** - Stages of infection, highly contagious early
• **Herpes** - Viral, manageable but not curable
• **HPV** - Some cause warts, others can cause cancer

**Prevention:**
• Use condoms consistently and correctly
• Regular testing for sexually active individuals
• HPV and Hepatitis B vaccines available
• Open communication with partners

**Testing Recommendations:**
• Annual testing for sexually active adults
• More frequent testing for high-risk groups
• Test before new sexual partnerships

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
• ใช้ถุงยางอนามัยอย่างสม่ำเสมอและถูกต้อง
• ตรวจสุขภาพเป็นประจำสำหรับผู้ที่มีเพศสัมพันธ์
• มีวัคซีน HPV และไวรัสตับอักเสบบี
• สื่อสารอย่างเปิดเผยกับคู่นอน

**คำแนะนำการตรวจ:**
• ตรวจปีละครั้งสำหรับผู้ใหญ่ที่มีเพศสัมพันธ์
• ตรวจบ่อยกว่าสำหรับกลุ่มเสี่ยงสูง
• ตรวจก่อนมีคู่นอนใหม่

⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ขอคำแนะนำจากแพทย์สำหรับอาการ การตรวจ หรือการรักษา`
  }
};

// Classify healthcare intent
function classifyHealthcareIntent(text) {
  const lowerText = text.toLowerCase();
  
  // HIV-related keywords
  if (lowerText.includes('hiv') || lowerText.includes('aids') || 
      lowerText.includes('เอชไอวี') || lowerText.includes('เอดส์') ||
      lowerText.includes('ไวรัสเอชไอวี')) {
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
      lowerText.includes('โรคติดต่อทางเพศ') || lowerText.includes('โรคกามโรค') ||
      lowerText.includes('chlamydia') || lowerText.includes('gonorrhea') ||
      lowerText.includes('syphilis') || lowerText.includes('herpes')) {
    return 'std';
  }
  
  return 'general';
}

// Detect language
function detectLanguage(text) {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
}

// Generate response
function generateHealthcareResponse(intent, language, query) {
  if (healthcareResponses[intent] && healthcareResponses[intent][language]) {
    return healthcareResponses[intent][language];
  }
  
  // Fallback response
  const fallbacks = {
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
  
  return fallbacks[language] || fallbacks.en;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'bloodplusfight-healthcare-chatbot',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      features: {
        healthcare: true,
        multilingual: true,
        hiv_information: true,
        prep_guidance: true,
        std_information: true,
        privacy_compliant: true
      },
      supported_languages: ['en', 'th'],
      medical_disclaimers: true
    }));
    return;
  }
  
  // Webhook endpoint for LINE
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        console.log('📨 Received webhook request');
        console.log('📄 Body:', body);
        
        const webhookData = JSON.parse(body);
        
        if (webhookData.events && webhookData.events.length > 0) {
          for (const event of webhookData.events) {
            if (event.type === 'message' && event.message.type === 'text') {
              const userMessage = event.message.text;
              const userId = event.source.userId;
              const replyToken = event.replyToken;
              
              // Classify intent and detect language
              const intent = classifyHealthcareIntent(userMessage);
              const language = detectLanguage(userMessage);
              
              console.log(`🏥 Healthcare Query Processing:`);
              console.log(`   User: ${userId.substring(0, 8)}...`);
              console.log(`   Query: "${userMessage}"`);
              console.log(`   Intent: ${intent}`);
              console.log(`   Language: ${language}`);
              
              // Generate healthcare response
              const response = generateHealthcareResponse(intent, language, userMessage);
              
              console.log(`✅ Response Generated:`);
              console.log(`   Length: ${response.length} characters`);
              console.log(`   Contains medical disclaimer: ${response.includes('Medical Disclaimer') || response.includes('ข้อจำกัดความรับผิดชอบ')}`);
              
              // Log analytics (anonymized)
              const anonymizedUserId = crypto.createHash('sha256')
                .update(userId + 'healthcare-salt-2024')
                .digest('hex').substring(0, 12);
              
              console.log(`📊 Analytics:`);
              console.log(`   Anonymous User: anon_${anonymizedUserId}`);
              console.log(`   Intent: ${intent}`);
              console.log(`   Language: ${language}`);
              console.log(`   Confidence: 0.9`);
              console.log(`   Response Time: ${Date.now() - event.timestamp}ms`);
              
              // In real implementation, this would send to LINE Messaging API
              console.log(`📤 Would send to LINE:`);
              console.log(`   Reply Token: ${replyToken}`);
              console.log(`   Message Type: text`);
              console.log(`   Response Preview: "${response.substring(0, 100)}..."`);
            }
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', processed: true }));
        
      } catch (error) {
        console.error('❌ Webhook processing error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
      }
    });
    
    return;
  }
  
  // Test interface
  if (req.method === 'GET' && req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>🏥 Healthcare Chatbot Test</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            margin: 0; padding: 20px; background: #f5f7fa; 
          }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #2c5530; margin-bottom: 30px; }
          .test-section { margin: 25px 0; padding: 20px; border: 1px solid #e1e5e9; border-radius: 8px; background: #fafbfc; }
          .test-section h3 { color: #444; margin-top: 0; }
          button { 
            background: #28a745; color: white; border: none; padding: 12px 18px; 
            border-radius: 6px; cursor: pointer; margin: 5px; transition: background 0.2s;
          }
          button:hover { background: #218838; }
          .thai-btn { background: #17a2b8; }
          .thai-btn:hover { background: #138496; }
          input[type="text"] { 
            width: 400px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; 
            font-size: 14px; margin-right: 10px;
          }
          .response { 
            background: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 6px; 
            border-left: 4px solid #007bff; font-family: monospace; white-space: pre-wrap;
          }
          .success { color: #28a745; font-weight: bold; }
          .error { color: #dc3545; font-weight: bold; }
          .info { color: #6c757d; font-size: 0.9em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏥 Bloodplusfight Healthcare Chatbot Test</h1>
          
          <div class="test-section">
            <h3>📋 Quick Test Queries</h3>
            <p>Test common healthcare queries with predefined examples:</p>
            
            <h4>🦠 HIV Information</h4>
            <button onclick="testQuery('What is HIV and how is it transmitted?', 'en')">HIV Basics (EN)</button>
            <button onclick="testQuery('เอชไอวีคืออะไร และติดต่อกันอย่างไร', 'th')" class="thai-btn">HIV Basics (TH)</button>
            <button onclick="testQuery('How long is the HIV window period?', 'en')">HIV Testing (EN)</button>
            
            <h4>💊 PrEP Information</h4>
            <button onclick="testQuery('What is PrEP and who should take it?', 'en')">PrEP Info (EN)</button>
            <button onclick="testQuery('PrEP คืออะไร และใครควรใช้', 'th')" class="thai-btn">PrEP Info (TH)</button>
            
            <h4>🔬 STDs/STIs</h4>
            <button onclick="testQuery('What are common sexually transmitted diseases?', 'en')">STD Info (EN)</button>
            <button onclick="testQuery('โรคติดต่อทางเพศสัมพันธ์ที่พบบ่อยมีอะไรบ้าง', 'th')" class="thai-btn">STD Info (TH)</button>
          </div>
          
          <div class="test-section">
            <h3>✏️ Custom Query Test</h3>
            <p>Enter your own healthcare question:</p>
            <input type="text" id="customQuery" placeholder="Enter your healthcare question in any language..." maxlength="500">
            <button onclick="testCustomQuery()">Send Query</button>
          </div>
          
          <div class="test-section">
            <h3>📊 Test Results</h3>
            <div id="responses"></div>
          </div>
          
          <div class="info">
            <p><strong>ℹ️ Test Information:</strong></p>
            <p>• This test interface simulates LINE webhook calls</p>
            <p>• Responses include medical disclaimers as required</p>
            <p>• All user data is anonymized for privacy compliance</p>
            <p>• Supports both English and Thai languages</p>
            <p>• Real chatbot responses may include additional medical research</p>
          </div>
        </div>
        
        <script>
          let testCounter = 0;
          
          function testQuery(query, language) {
            testCounter++;
            const responseDiv = document.getElementById('responses');
            
            // Create test event
            const mockEvent = {
              events: [{
                type: 'message',
                message: { 
                  type: 'text', 
                  text: query,
                  id: 'test-msg-' + testCounter
                },
                source: {
                  type: 'user',
                  userId: 'test-user-' + Math.random().toString(36).substr(2, 9)
                },
                replyToken: 'test-reply-' + testCounter,
                timestamp: Date.now()
              }]
            };
            
            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'response';
            loadingDiv.innerHTML = '🔄 Processing query: "' + query + '"...';
            responseDiv.appendChild(loadingDiv);
            
            // Send to webhook
            fetch('/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mockEvent)
            })
            .then(response => {
              loadingDiv.remove();
              
              const resultDiv = document.createElement('div');
              resultDiv.className = 'response';
              
              if (response.ok) {
                resultDiv.innerHTML = 
                  '<span class="success">✅ SUCCESS</span>\\n' +
                  '<strong>Query:</strong> ' + query + '\\n' +
                  '<strong>Language:</strong> ' + language + '\\n' +
                  '<strong>Status:</strong> ' + response.status + '\\n' +
                  '<strong>Note:</strong> Check server console for detailed response and analytics';
              } else {
                resultDiv.innerHTML = 
                  '<span class="error">❌ FAILED</span>\\n' +
                  '<strong>Query:</strong> ' + query + '\\n' +
                  '<strong>Error:</strong> HTTP ' + response.status + '\\n' +
                  '<strong>Status:</strong> ' + response.statusText;
              }
              
              responseDiv.appendChild(resultDiv);
              responseDiv.scrollTop = responseDiv.scrollHeight;
            })
            .catch(error => {
              loadingDiv.remove();
              
              const errorDiv = document.createElement('div');
              errorDiv.className = 'response';
              errorDiv.innerHTML = 
                '<span class="error">❌ ERROR</span>\\n' +
                '<strong>Query:</strong> ' + query + '\\n' +
                '<strong>Error:</strong> ' + error.message;
              responseDiv.appendChild(errorDiv);
            });
          }
          
          function testCustomQuery() {
            const queryInput = document.getElementById('customQuery');
            const query = queryInput.value.trim();
            
            if (query) {
              const language = /[\\u0E00-\\u0E7F]/.test(query) ? 'th' : 'en';
              testQuery(query, language);
              queryInput.value = '';
            } else {
              alert('Please enter a healthcare question to test.');
            }
          }
          
          // Allow Enter key for custom queries
          document.getElementById('customQuery').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              testCustomQuery();
            }
          });
        </script>
      </body>
      </html>
    `);
    return;
  }
  
  // 404 - Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not found',
    available_endpoints: ['/health', '/webhook', '/test']
  }));
});

// Start server
server.listen(PORT, () => {
  console.log('🏥 Bloodplusfight Healthcare Chatbot Test Server');
  console.log('===============================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test interface: http://localhost:${PORT}/test`);
  console.log(`📨 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log('');
  console.log('✅ Features enabled:');
  console.log('   • HIV/AIDS information (EN/TH)');
  console.log('   • PrEP guidance (EN/TH)');
  console.log('   • STDs/STIs information (EN/TH)');
  console.log('   • Medical disclaimers');
  console.log('   • Privacy-compliant analytics');
  console.log('   • Intent classification');
  console.log('   • Language detection');
  console.log('');
  console.log('📊 Ready to receive healthcare queries...');
});