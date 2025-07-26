/**
 * Test script for Cloudflare Workers AI integration
 * Run this to test the AI service before deployment
 */

import { CloudflareAIService } from './src/services/cloudflare-ai.js';

// Mock environment for testing
const mockEnv = {
  CLOUDFLARE_ACCOUNT_ID: '5adf62efd6cf179a8939c211b155e229',
  CLOUDFLARE_API_TOKEN: 'C-OeVUYg9TnQ6eO4CTiGxcfV0p5OXdtoXfeYMl7t',
  AI_MAX_TOKENS: '2000',
  AI_TEMPERATURE: '0.7',
  AI_TOP_P: '0.9',
  MAX_CONTEXT_SIZE: '7'
};

async function testCloudflareAI() {
  console.log('🧪 Testing Cloudflare Workers AI Integration...\n');
  
  const aiService = new CloudflareAIService(mockEnv);
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const health = await aiService.healthCheck();
    console.log('✅ Health Check:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }
  
  // Test 2: Available Models
  console.log('\n2️⃣ Testing Available Models...');
  const models = aiService.getAvailableModels();
  console.log('✅ Available Models:', models.length);
  models.forEach(model => {
    console.log(`   - ${model.name}: ${model.id}`);
  });
  
  // Test 3: Basic AI Generation (English)
  console.log('\n3️⃣ Testing English Healthcare Query...');
  try {
    const response = await aiService.generateResponse(
      "What is HIV and how can it be prevented?",
      [],
      { intent: 'hiv', language: 'en' }
    );
    console.log('✅ English Response:');
    console.log('   Model:', response.model);
    console.log('   Success:', response.success);
    console.log('   Response:', response.response.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ English Query Failed:', error.message);
  }
  
  // Test 4: Thai Language Query
  console.log('\n4️⃣ Testing Thai Healthcare Query...');
  try {
    const response = await aiService.generateResponse(
      "เอชไอวีคืออะไร และป้องกันอย่างไร",
      [],
      { intent: 'hiv', language: 'th' }
    );
    console.log('✅ Thai Response:');
    console.log('   Model:', response.model);
    console.log('   Success:', response.success);
    console.log('   Response:', response.response.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Thai Query Failed:', error.message);
  }
  
  // Test 5: Conversation Context
  console.log('\n5️⃣ Testing Conversation Context...');
  try {
    const context = [
      { role: 'user', content: 'What is PrEP?' },
      { role: 'assistant', content: 'PrEP is pre-exposure prophylaxis for HIV prevention.' }
    ];
    
    const response = await aiService.generateResponse(
      "How effective is it?",
      context,
      { intent: 'prep', language: 'en' }
    );
    console.log('✅ Context Response:');
    console.log('   Model:', response.model);
    console.log('   Success:', response.success);
    console.log('   Response:', response.response.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Context Query Failed:', error.message);
  }
  
  // Test 6: Different AI Models
  console.log('\n6️⃣ Testing Different AI Models...');
  const testModels = ['llama', 'mistral', 'gemma'];
  
  for (const modelKey of testModels) {
    try {
      const response = await aiService.generateResponse(
        "Hello, how are you?",
        [],
        { model: aiService.models[modelKey] }
      );
      console.log(`✅ ${modelKey.toUpperCase()} Model:`, response.success ? 'Working' : 'Failed');
    } catch (error) {
      console.log(`❌ ${modelKey.toUpperCase()} Model Failed:`, error.message);
    }
  }
  
  console.log('\n🎉 Cloudflare AI Integration Test Complete!');
}

// Run the test
testCloudflareAI().catch(console.error);