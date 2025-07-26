#!/usr/bin/env python3
"""
Test script for LINE Healthcare Chatbot Python Serverless
"""

import json
import asyncio
from main import LineHealthcareChatbot

async def test_chatbot():
    """Test the chatbot functionality"""
    
    # Mock environment
    test_env = {
        'ENVIRONMENT': 'development',
        'CHANNEL_SECRET': 'test_secret',
        'CHANNEL_ACCESS_TOKEN': 'test_token',
        'CLOUDFLARE_ACCOUNT_ID': 'test_account',
        'AI_MODEL': '@cf/meta/llama-3-8b-instruct',
        'AI_MAX_TOKENS': '2000',
        'AI_TEMPERATURE': '0.7'
    }
    
    chatbot = LineHealthcareChatbot(test_env)
    
    print("🧪 Testing LINE Healthcare Chatbot (Python Serverless)")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1. Testing health check endpoint...")
    health_request = {
        'method': 'GET',
        'path': '/health',
        'headers': {},
        'body': ''
    }
    
    health_response = await chatbot.handle_request(health_request)
    print(f"Status: {health_response['statusCode']}")
    if health_response['statusCode'] == 200:
        health_data = json.loads(health_response['body'])
        print(f"Service: {health_data['service']}")
        print(f"Version: {health_data['version']}")
        print(f"Runtime: {health_data['runtime']}")
        print("✅ Health check passed")
    else:
        print("❌ Health check failed")
    
    # Test 2: Intent classification
    print("\n2. Testing intent classification...")
    test_messages = [
        ("What is HIV?", "en", "hiv"),
        ("เอชไอวีคืออะไร", "th", "hiv"),
        ("Tell me about PrEP", "en", "prep"),
        ("PrEP คืออะไร", "th", "prep"),
        ("STD information", "en", "std"),
        ("โรคติดต่อทางเพศสัมพันธ์", "th", "std"),
        ("Hello", "en", "general")
    ]
    
    for message, expected_lang, expected_intent in test_messages:
        detected_lang = chatbot._detect_language(message)
        detected_intent = chatbot._classify_healthcare_intent(message)
        
        print(f"Message: '{message}'")
        print(f"  Language: {detected_lang} (expected: {expected_lang}) {'✅' if detected_lang == expected_lang else '❌'}")
        print(f"  Intent: {detected_intent} (expected: {expected_intent}) {'✅' if detected_intent == expected_intent else '❌'}")
    
    # Test 3: Knowledge base responses
    print("\n3. Testing knowledge base responses...")
    for intent in ['hiv', 'prep', 'std']:
        for lang in ['en', 'th']:
            if intent in chatbot.healthcare_responses and lang in chatbot.healthcare_responses[intent]:
                response = chatbot.healthcare_responses[intent][lang]
                print(f"{intent.upper()} ({lang}): {len(response)} characters ✅")
            else:
                print(f"{intent.upper()} ({lang}): Missing ❌")
    
    # Test 4: Response formatting
    print("\n4. Testing response formatting...")
    test_response = "This is a test healthcare response."
    formatted = chatbot._format_healthcare_response(test_response, 'hiv', 'en')
    
    if "⚠️" in formatted and "educational purposes only" in formatted:
        print("✅ Medical disclaimer added correctly")
    else:
        print("❌ Medical disclaimer missing")
    
    if "🏥 Additional Resources" in formatted:
        print("✅ Healthcare resources added correctly")
    else:
        print("❌ Healthcare resources missing")
    
    # Test 5: Webhook request simulation
    print("\n5. Testing webhook request simulation...")
    webhook_request = {
        'method': 'POST',
        'path': '/webhook',
        'headers': {
            'content-type': 'application/json'
        },
        'body': json.dumps({
            'events': [
                {
                    'type': 'message',
                    'message': {
                        'type': 'text',
                        'text': 'What is HIV?'
                    },
                    'source': {
                        'userId': 'test_user_123'
                    },
                    'replyToken': 'test_reply_token'
                }
            ]
        })
    }
    
    webhook_response = await chatbot.handle_request(webhook_request)
    print(f"Webhook Status: {webhook_response['statusCode']}")
    if webhook_response['statusCode'] == 200:
        print("✅ Webhook processing successful")
    else:
        print("❌ Webhook processing failed")
    
    # Test 6: Test interface
    print("\n6. Testing test interface...")
    test_request = {
        'method': 'GET',
        'path': '/test',
        'headers': {},
        'body': ''
    }
    
    test_response = await chatbot.handle_request(test_request)
    if test_response['statusCode'] == 200 and 'html' in test_response['headers'].get('Content-Type', ''):
        print("✅ Test interface available")
    else:
        print("❌ Test interface failed")
    
    print("\n" + "=" * 60)
    print("🏁 Test completed!")
    print("\n📋 Next steps:")
    print("1. Deploy to Cloudflare Workers: ./deploy.sh")
    print("2. Set your LINE channel secrets")
    print("3. Configure webhook URL in LINE Developer Console")
    print("4. Test with real LINE messages")

if __name__ == "__main__":
    asyncio.run(test_chatbot())