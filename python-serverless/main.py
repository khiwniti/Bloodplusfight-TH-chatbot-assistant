"""
LINE Healthcare Chatbot - Python Serverless Implementation
Optimized for Cloudflare Workers with Python runtime
Provides HIV/STDs information with privacy compliance
"""

import json
import hashlib
import hmac
import base64
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

class LineHealthcareChatbot:
    def __init__(self, env: Dict[str, Any]):
        self.env = env
        self.channel_secret = env.get('CHANNEL_SECRET', '')
        self.channel_access_token = env.get('CHANNEL_ACCESS_TOKEN', '')
        self.cloudflare_account_id = env.get('CLOUDFLARE_ACCOUNT_ID', '')
        self.ai_model = env.get('AI_MODEL', '@cf/meta/llama-3-8b-instruct')
        self.max_tokens = int(env.get('AI_MAX_TOKENS', '2000'))
        self.temperature = float(env.get('AI_TEMPERATURE', '0.7'))
        
        # Healthcare knowledge base
        self.healthcare_responses = {
            'hiv': {
                'en': self._get_hiv_info_en(),
                'th': self._get_hiv_info_th()
            },
            'prep': {
                'en': self._get_prep_info_en(),
                'th': self._get_prep_info_th()
            },
            'std': {
                'en': self._get_std_info_en(),
                'th': self._get_std_info_th()
            }
        }

    async def handle_request(self, request) -> Dict[str, Any]:
        """Main request handler"""
        try:
            method = request.get('method', 'GET')
            path = request.get('path', '/')
            headers = request.get('headers', {})
            body = request.get('body', '')
            
            # CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Line-Signature, Authorization',
                'X-Request-ID': self._generate_request_id()
            }
            
            # Handle CORS preflight
            if method == 'OPTIONS':
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': ''
                }
            
            # Health check endpoint
            if method == 'GET' and path == '/health':
                return await self._handle_health_check(cors_headers)
            
            # LINE webhook endpoint
            if method == 'POST' and path == '/webhook':
                return await self._handle_webhook(body, headers, cors_headers)
            
            # Test interface
            if method == 'GET' and path == '/test':
                return {
                    'statusCode': 200,
                    'headers': {**cors_headers, 'Content-Type': 'text/html; charset=utf-8'},
                    'body': self._get_test_interface()
                }
            
            # 404 - Not Found
            return {
                'statusCode': 404,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Not found',
                    'available_endpoints': ['/health', '/webhook', '/test']
                })
            }
            
        except Exception as e:
            print(f"Error handling request: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Internal Server Error',
                    'message': str(e) if self.env.get('ENVIRONMENT') != 'production' else 'An error occurred'
                })
            }

    async def _handle_health_check(self, cors_headers: Dict[str, str]) -> Dict[str, Any]:
        """Handle health check endpoint"""
        health_data = {
            'status': 'healthy',
            'service': 'bloodplusfight-healthcare-chatbot-python',
            'version': '3.0.0',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'environment': self.env.get('ENVIRONMENT', 'production'),
            'runtime': 'python',
            'ai': {
                'provider': 'cloudflare-workers-ai',
                'model': self.ai_model,
                'max_tokens': self.max_tokens,
                'temperature': self.temperature
            },
            'features': {
                'healthcare': True,
                'multilingual': True,
                'hiv_information': True,
                'prep_guidance': True,
                'std_information': True,
                'privacy_compliant': True,
                'ai_powered': True
            },
            'supported_languages': ['en', 'th'],
            'medical_disclaimers': True
        }
        
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps(health_data)
        }

    async def _handle_webhook(self, body: str, headers: Dict[str, str], cors_headers: Dict[str, str]) -> Dict[str, Any]:
        """Handle LINE webhook events"""
        try:
            print(f"📨 LINE Webhook received: {body}")
            
            # Verify LINE signature if secret is provided
            if self.channel_secret:
                signature = headers.get('x-line-signature', '')
                if not signature or not self._verify_signature(body, signature):
                    print("❌ Invalid LINE signature")
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'Invalid signature'})
                    }
            
            webhook_data = json.loads(body)
            
            if webhook_data.get('events'):
                for event in webhook_data['events']:
                    if event.get('type') == 'message' and event.get('message', {}).get('type') == 'text':
                        await self._process_healthcare_message(event)
                    elif event.get('type') == 'follow':
                        await self._send_welcome_message(event)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'status': 'ok'})
            }
            
        except Exception as e:
            print(f"❌ Webhook error: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Webhook processing failed'})
            }

    async def _process_healthcare_message(self, event: Dict[str, Any]):
        """Process healthcare message using AI"""
        user_message = event.get('message', {}).get('text', '')
        user_id = event.get('source', {}).get('userId', '')
        reply_token = event.get('replyToken', '')
        
        print(f"🏥 Processing healthcare message: {user_message[:100]}...")
        
        try:
            # Classify healthcare intent and detect language
            intent = self._classify_healthcare_intent(user_message)
            language = self._detect_language(user_message)
            
            print(f"📊 Message analysis: intent={intent}, language={language}")
            
            # Generate AI response or use knowledge base
            if intent in self.healthcare_responses and intent != 'general':
                # Use knowledge base for specific healthcare topics
                response = self.healthcare_responses[intent][language]
            else:
                # Use AI for general queries
                response = await self._generate_ai_response(user_message, intent, language)
            
            # Format response with medical disclaimer
            formatted_response = self._format_healthcare_response(response, intent, language)
            
            # Send response to LINE
            if self.channel_access_token:
                await self._send_line_message(reply_token, formatted_response)
            
        except Exception as e:
            print(f"❌ Error processing healthcare message: {str(e)}")
            # Send fallback response
            fallback_response = self._get_fallback_response(self._detect_language(user_message))
            if self.channel_access_token:
                await self._send_line_message(reply_token, fallback_response)

    async def _generate_ai_response(self, message: str, intent: str, language: str) -> str:
        """Generate AI response using Cloudflare Workers AI"""
        try:
            # Prepare healthcare-focused prompt
            system_prompt = self._get_healthcare_system_prompt(language)
            user_prompt = f"User query: {message}\nIntent: {intent}\nLanguage: {language}"
            
            # Call Cloudflare Workers AI
            ai_response = await self._call_cloudflare_ai(system_prompt, user_prompt)
            
            if ai_response and ai_response.get('success'):
                return ai_response.get('result', {}).get('response', '')
            else:
                return self._get_fallback_response(language)
                
        except Exception as e:
            print(f"❌ AI generation error: {str(e)}")
            return self._get_fallback_response(language)

    async def _call_cloudflare_ai(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        """Call Cloudflare Workers AI API"""
        try:
            # Use Workers AI binding if available (matches your dashboard binding name)
            if hasattr(self.env, 'WORKER_AI'):
                messages = [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
                
                response = await self.env.WORKER_AI.run(self.ai_model, {
                    'messages': messages,
                    'max_tokens': self.max_tokens,
                    'temperature': self.temperature
                })
                
                return {
                    'success': True,
                    'result': {
                        'response': response.response if hasattr(response, 'response') else str(response)
                    }
                }
            
            # Fallback to REST API
            url = f"https://api.cloudflare.com/client/v4/accounts/{self.cloudflare_account_id}/ai/run/{self.ai_model}"
            
            headers = {
                'Authorization': f'Bearer {self.env.get("CLOUDFLARE_API_TOKEN", "")}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': self.max_tokens,
                'temperature': self.temperature
            }
            
            # Use fetch API available in Workers
            response = await fetch(url, {
                'method': 'POST',
                'headers': headers,
                'body': json.dumps(payload)
            })
            
            if response.status == 200:
                return await response.json()
            else:
                print(f"AI API error: {response.status}")
                return None
                        
        except Exception as e:
            print(f"Error calling Cloudflare AI: {str(e)}")
            return None

    async def _send_line_message(self, reply_token: str, message: str):
        """Send message to LINE"""
        try:
            url = 'https://api.line.me/v2/bot/message/reply'
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.channel_access_token}'
            }
            
            payload = {
                'replyToken': reply_token,
                'messages': [
                    {
                        'type': 'text',
                        'text': message
                    }
                ]
            }
            
            # Use fetch API available in Workers
            response = await fetch(url, {
                'method': 'POST',
                'headers': headers,
                'body': json.dumps(payload)
            })
            
            if response.status == 200:
                print("✅ Message sent successfully")
            else:
                print(f"❌ Failed to send message: {response.status}")
                        
        except Exception as e:
            print(f"Error sending LINE message: {str(e)}")

    async def _send_welcome_message(self, event: Dict[str, Any]):
        """Send welcome message to new followers"""
        reply_token = event.get('replyToken', '')
        
        welcome_message = """🏥 สวัสดีครับ/ค่ะ! ยินดีต้อนรับสู่ Bloodplusfight Healthcare Assistant

ฉันสามารถช่วยให้ข้อมูลเกี่ยวกับ:
• เอชไอวี (HIV) และการป้องกัน
• PrEP (การป้องกันก่อนสัมผัส)
• โรคติดต่อทางเพศสัมพันธ์ (STDs/STIs)
• คำแนะนำด้านสุขภาพทั่วไป

🌟 Hello! Welcome to Bloodplusfight Healthcare Assistant

I can help with information about:
• HIV and prevention
• PrEP (Pre-exposure prophylaxis)
• STDs/STIs
• General health guidance

⚠️ ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอ
⚠️ This information is for educational purposes only. Always consult healthcare professionals."""

        if self.channel_access_token:
            await self._send_line_message(reply_token, welcome_message)

    def _classify_healthcare_intent(self, text: str) -> str:
        """Classify healthcare intent"""
        lower_text = text.lower()
        
        # HIV-related keywords
        if any(keyword in lower_text for keyword in ['hiv', 'aids', 'เอชไอวี', 'เอดส์']):
            return 'hiv'
        
        # PrEP-related keywords
        if any(keyword in lower_text for keyword in ['prep', 'pre-exposure', 'เพรพ', 'การป้องกันก่อนสัมผัส']):
            return 'prep'
        
        # STD/STI-related keywords
        if any(keyword in lower_text for keyword in ['std', 'sti', 'sexually transmitted', 'โรคติดต่อทางเพศ', 'โรคกามโรค']):
            return 'std'
        
        return 'general'

    def _detect_language(self, text: str) -> str:
        """Detect language (Thai or English)"""
        thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
        return 'th' if thai_pattern.search(text) else 'en'

    def _format_healthcare_response(self, response: str, intent: str, language: str) -> str:
        """Format response with medical disclaimer"""
        # Add medical disclaimer
        disclaimer = (
            '\n\n⚠️ ข้อมูลนี้เพื่อการศึกษาเท่านั้น กรุณาปรึกษาแพทย์เสมอสำหรับคำแนะนำทางการแพทย์'
            if language == 'th' else
            '\n\n⚠️ This information is for educational purposes only. Always consult healthcare professionals for medical advice.'
        )
        
        # Add healthcare resources for specific intents
        if intent in ['hiv', 'prep', 'std']:
            resources = (
                '\n\n🏥 ทรัพยากรเพิ่มเติม:\n• กรมควบคุมโรค กระทรวงสาธารณสุข\n• มูลนิธิ ACCESS\n• โรงพยาบาลใกล้บ้าน'
                if language == 'th' else
                '\n\n🏥 Additional Resources:\n• Department of Disease Control, Thailand\n• ACCESS Foundation\n• Local healthcare providers'
            )
            response += resources
        
        return response + disclaimer

    def _get_fallback_response(self, language: str) -> str:
        """Get fallback response when AI fails"""
        return (
            'เสียใจด้วย ขณะนี้ระบบมีปัญหา กรุณาลองใหม่อีกครั้งหรือติดต่อเจ้าหน้าที่ของเรา\n\n⚠️ สำหรับปัญหาเร่งด่วนทางการแพทย์ กรุณาติดต่อแพทย์หรือโรงพยาบาลทันที'
            if language == 'th' else
            'I apologize, our system is currently experiencing issues. Please try again or contact our support team.\n\n⚠️ For medical emergencies, please contact healthcare providers immediately.'
        )

    def _get_healthcare_system_prompt(self, language: str) -> str:
        """Get healthcare-focused system prompt"""
        if language == 'th':
            return """คุณเป็นผู้ช่วยด้านสุขภาพที่เชี่ยวชาญเรื่องเอชไอวี โรคติดต่อทางเพศสัมพันธ์ และการป้องกัน
ให้ข้อมูลที่ถูกต้อง เป็นประโยชน์ และเข้าใจง่าย
เน้นการป้องกัน การดูแลสุขภาพ และการลดความเสี่ยง
ใช้ภาษาไทยที่เข้าใจง่าย ไม่ใช้คำศัพท์ทางการแพทย์ที่ซับซ้อนเกินไป
เสมอให้คำแนะนำให้ปรึกษาแพทย์สำหรับการวินิจฉัยและการรักษา"""
        else:
            return """You are a healthcare assistant specializing in HIV, STDs/STIs, and prevention.
Provide accurate, helpful, and easy-to-understand information.
Focus on prevention, health maintenance, and risk reduction.
Use clear, accessible language without overly complex medical terminology.
Always recommend consulting healthcare professionals for diagnosis and treatment."""

    def _verify_signature(self, body: str, signature: str) -> bool:
        """Verify LINE webhook signature"""
        try:
            hash_digest = hmac.new(
                self.channel_secret.encode('utf-8'),
                body.encode('utf-8'),
                hashlib.sha256
            ).digest()
            expected_signature = base64.b64encode(hash_digest).decode('utf-8')
            return hmac.compare_digest(signature, expected_signature)
        except Exception:
            return False

    def _generate_request_id(self) -> str:
        """Generate unique request ID"""
        return str(uuid.uuid4())

    def _get_test_interface(self) -> str:
        """Get HTML test interface"""
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LINE Healthcare Chatbot - Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #00B900; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .test-section { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .endpoint { background: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .get { background: #61affe; color: white; }
        .post { background: #49cc90; color: white; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 2px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 LINE Healthcare Chatbot</h1>
        <p>Python Serverless Implementation - Test Interface</p>
    </div>
    
    <div class="test-section">
        <h2>Available Endpoints</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/health</strong>
            <p>Health check endpoint with service information</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <strong>/webhook</strong>
            <p>LINE webhook endpoint for receiving messages</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/test</strong>
            <p>This test interface</p>
        </div>
    </div>
    
    <div class="test-section">
        <h2>Healthcare Features</h2>
        <ul>
            <li>🦠 HIV/AIDS information and prevention</li>
            <li>💊 PrEP (Pre-exposure prophylaxis) guidance</li>
            <li>🏥 STDs/STIs information</li>
            <li>🌐 Multilingual support (English/Thai)</li>
            <li>🤖 AI-powered responses</li>
            <li>🔒 Privacy-compliant design</li>
        </ul>
    </div>
    
    <div class="test-section">
        <h2>Test the Health Endpoint</h2>
        <p>Click <a href="/health" target="_blank">here</a> to test the health check endpoint</p>
    </div>
</body>
</html>"""

    # Healthcare knowledge base methods
    def _get_hiv_info_en(self) -> str:
        return """🏥 **HIV Information**

HIV (Human Immunodeficiency Virus) attacks the immune system:

**Key Facts:**
• **Transmission**: Blood, semen, vaginal fluids, breast milk
• **Prevention**: Condoms, PrEP, regular testing
• **Treatment**: Antiretroviral therapy (ART) is highly effective
• **Testing**: Multiple test types with different window periods

**U=U**: Undetectable = Untransmittable. People with undetectable viral loads cannot transmit HIV sexually.

**Prevention Methods:**
• Use condoms consistently and correctly
• Get tested regularly (every 3-6 months if sexually active)
• Consider PrEP if at high risk
• Avoid sharing needles or injection equipment
• Get treated for other STDs (they increase HIV risk)"""

    def _get_hiv_info_th(self) -> str:
        return """🏥 **ข้อมูลเอชไอวี**

เอชไอวี (Human Immunodeficiency Virus) ทำลายระบบภูมิคุ้มกัน:

**ข้อมูลสำคัญ:**
• **การติดต่อ**: เลือด น้ำอสุจิ น้ำหล่อลื่นช่องคลอด น้ำนมแม่
• **การป้องกัน**: ถุงยางอนามัย PrEP ตรวจเลือดเป็นประจำ
• **การรักษา**: ยาต้านไวรัส (ART) มีประสิทธิภาพสูง
• **การตรวจ**: การตรวจหลายประเภทที่มีช่วงหน้าต่างแตกต่างกัน

**U=U**: ตรวจไม่พบ = ไม่ติดต่อ ผู้ที่มีปริมาณไวรัสตรวจไม่พบจะไม่ติดต่อเอชไอวีทางเพศสัมพันธ์

**วิธีการป้องกัน:**
• ใช้ถุงยางอนามัยอย่างถูกต้องและสม่ำเสมอ
• ตรวจเลือดเป็นประจำ (ทุก 3-6 เดือนหากมีเพศสัมพันธ์)
• พิจารณาใช้ PrEP หากมีความเสี่ยงสูง
• หลีกเลี่ยงการใช้เข็มฉีดร่วมกัน
• รักษาโรคติดต่อทางเพศสัมพันธ์อื่นๆ (เพิ่มความเสี่ยงเอชไอวี)"""

    def _get_prep_info_en(self) -> str:
        return """🏥 **PrEP Information**

Pre-exposure prophylaxis (PrEP) prevents HIV infection:

**Effectiveness:**
• **99% effective** when taken as prescribed for sexual transmission
• **74% effective** for injection drug use

**Who Should Consider PrEP:**
• People with HIV-positive partners
• Multiple sexual partners
• Injection drug users
• Men who have sex with men in high-prevalence areas
• Anyone at substantial risk of HIV

**Monitoring Required:**
• HIV testing every 3 months
• Kidney function tests
• STD screening
• Regular medical check-ups

**Important Notes:**
• Must be taken daily for maximum effectiveness
• Does not protect against other STDs
• Requires prescription from healthcare provider
• Side effects are generally mild and temporary"""

    def _get_prep_info_th(self) -> str:
        return """🏥 **ข้อมูล PrEP**

การป้องกันก่อนสัมผัส (PrEP) ป้องกันการติดเชื้อเอชไอวี:

**ประสิทธิภาพ:**
• **99% ประสิทธิภาพ** เมื่อทานตามแพทย์สั่งสำหรับการติดต่อทางเพศสัมพันธ์
• **74% ประสิทธิภาพ** สำหรับผู้ใช้ยาเสพติดฉีด

**ใครควรพิจารณาใช้ PrEP:**
• คนที่มีคู่นอนติดเชื้อเอชไอวี
• มีคู่นอนหลายคน
• ผู้ใช้ยาเสพติดฉีด
• ชายที่มีเพศสัมพันธ์กับชายในพื้นที่ที่มีการแพร่ระบาดสูง
• ผู้ที่มีความเสี่ยงสูงต่อการติดเชื้อเอชไอวี

**การติดตามที่จำเป็น:**
• ตรวจเอชไอวีทุก 3 เดือน
• ตรวจการทำงานของไต
• ตรวจโรคติดต่อทางเพศสัมพันธ์
• ตรวจสุขภาพเป็นประจำ

**ข้อสำคัญ:**
• ต้องทานทุกวันเพื่อประสิทธิภาพสูงสุด
• ไม่ป้องกันโรคติดต่อทางเพศสัมพันธ์อื่นๆ
• ต้องมีใบสั่งยาจากแพทย์
• ผลข้างเคียงโดยทั่วไปไม่รุนแรงและชั่วคราว"""

    def _get_std_info_en(self) -> str:
        return """🏥 **STDs/STIs Information**

Sexually transmitted diseases prevention and care:

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
• Limit number of sexual partners

**Testing Recommendations:**
• Annual screening for sexually active individuals
• More frequent testing if multiple partners
• Test before new sexual relationships
• Both partners should be tested

**Treatment:**
• Most bacterial STDs are curable with antibiotics
• Viral STDs are manageable with medication
• Early treatment prevents complications
• Partner notification and treatment important"""

    def _get_std_info_th(self) -> str:
        return """🏥 **ข้อมูลโรคติดต่อทางเพศสัมพันธ์**

การป้องกันและดูแลโรคติดต่อทางเพศสัมพันธ์:

**โรคที่พบบ่อย:**
• **คลาไมเดีย** - พบบ่อยที่สุด มักไม่มีอาการ รักษาหายได้
• **หนองใน** - การติดเชื้อแบคทีเรีย อาจดื้อยา
• **ซิฟิลิส** - มีระยะของการติดเชื้อ ติดต่อได้ง่ายในระยะแรก
• **เฮอร์ปีส** - เชื้อไวรัส ควบคุมได้แต่รักษาไม่หาย
• **HPV** - บางชนิดทำให้เกิดหูด บางชนิดอาจทำให้เกิดมะเร็ง

**การป้องกัน:**
• ใช้ถุงยางอนามัยอย่างถูกต้องและสม่ำเสมอ
• ตรวจสุขภาพเป็นประจำสำหรับผู้ที่มีเพศสัมพันธ์
• มีวัคซีน HPV และไวรัสตับอักเสบบี
• สื่อสารอย่างเปิดเผยกับคู่นอน
• จำกัดจำนวนคู่นอน

**คำแนะนำการตรวจ:**
• ตรวจประจำปีสำหรับผู้ที่มีเพศสัมพันธ์
• ตรวจบ่อยขึ้นหากมีคู่นอนหลายคน
• ตรวจก่อนมีความสัมพันธ์ใหม่
• คู่นอนทั้งคู่ควรตรวจ

**การรักษา:**
• โรคแบคทีเรียส่วนใหญ่รักษาหายได้ด้วยยาปฏิชีวนะ
• โรคไวรัสควบคุมได้ด้วยยา
• การรักษาเร็วป้องกันภาวะแทรกซ้อน
• การแจ้งและรักษาคู่นอนสำคัญ"""


# Cloudflare Workers entry point
async def on_fetch(request, env, ctx):
    """Cloudflare Workers fetch handler"""
    try:
        chatbot = LineHealthcareChatbot(env)
        
        # Parse URL path
        url = request.url
        path_parts = url.split('/')
        path = '/' + path_parts[-1] if len(path_parts) > 3 else '/'
        
        # Convert Cloudflare request to our format
        request_data = {
            'method': request.method,
            'path': path,
            'headers': dict(request.headers),
            'body': await request.text() if request.method == 'POST' else ''
        }
        
        # Handle the request
        response = await chatbot.handle_request(request_data)
        
        # Convert our response to Cloudflare Response
        from js import Response
        return Response.new(
            response['body'],
            {
                'status': response['statusCode'],
                'headers': response['headers']
            }
        )
        
    except Exception as e:
        print(f"Error in on_fetch: {str(e)}")
        from js import Response
        return Response.new(
            json.dumps({'error': 'Internal server error', 'message': str(e)}),
            {
                'status': 500,
                'headers': {'Content-Type': 'application/json'}
            }
        )


# For local testing
if __name__ == "__main__":
    import asyncio
    
    # Mock environment for testing
    test_env = {
        'ENVIRONMENT': 'development',
        'CHANNEL_SECRET': 'test_secret',
        'CHANNEL_ACCESS_TOKEN': 'test_token',
        'CLOUDFLARE_ACCOUNT_ID': 'test_account',
        'CLOUDFLARE_API_TOKEN': 'test_api_token'
    }
    
    chatbot = LineHealthcareChatbot(test_env)
    
    # Test health check
    async def test_health():
        request = {
            'method': 'GET',
            'path': '/health',
            'headers': {},
            'body': ''
        }
        response = await chatbot.handle_request(request)
        print("Health check response:", json.dumps(response, indent=2))
    
    asyncio.run(test_health())