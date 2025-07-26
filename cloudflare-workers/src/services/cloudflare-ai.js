/**
 * Cloudflare Workers AI Service
 * Provides AI responses using Cloudflare's native AI models
 */

export class CloudflareAIService {
  constructor(env) {
    this.env = env;
    this.accountId = env.CLOUDFLARE_ACCOUNT_ID || '5adf62efd6cf179a8939c211b155e229';
    this.apiToken = env.CLOUDFLARE_API_TOKEN;
    
    // Available Cloudflare AI models
    this.models = {
      llama: '@cf/meta/llama-3-8b-instruct',
      mistral: '@cf/mistral/mistral-7b-instruct-v0.1',
      codellama: '@cf/meta/codellama-7b-instruct-awq',
      gemma: '@cf/google/gemma-7b-it',
      phi: '@cf/microsoft/phi-2'
    };
    
    this.defaultModel = this.models.llama;
  }

  /**
   * Generate AI response using Cloudflare Workers AI
   */
  async generateResponse(userMessage, context = [], options = {}) {
    try {
      const model = options.model || this.defaultModel;
      const messages = this.buildMessages(userMessage, context, options);
      
      console.log('Cloudflare AI Request:', { model, messageCount: messages.length });
      
      const response = await this.callCloudflareAI(model, messages);
      
      if (!response.success) {
        throw new Error(`Cloudflare AI error: ${JSON.stringify(response.errors)}`);
      }
      
      const aiResponse = response.result.response || 'I apologize, but I cannot generate a response right now.';
      
      return {
        response: aiResponse,
        model: model,
        usage: response.result.usage || {},
        success: true
      };
      
    } catch (error) {
      console.error('Cloudflare AI Error:', error);
      return {
        response: this.getFallbackResponse(userMessage),
        model: 'fallback',
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Call Cloudflare AI using Workers AI binding
   */
  async callCloudflareAI(model, messages) {
    // Use Workers AI binding if available (in Workers environment)
    if (this.env.WORKER_AI) {
      const requestBody = {
        messages: messages,
        max_tokens: parseInt(this.env.AI_MAX_TOKENS) || 2000,
        temperature: parseFloat(this.env.AI_TEMPERATURE) || 0.7,
        top_p: parseFloat(this.env.AI_TOP_P) || 0.9
      };

      try {
        const response = await this.env.WORKER_AI.run(model, requestBody);
        return {
          success: true,
          result: {
            response: response.response,
            usage: response.usage || {}
          }
        };
      } catch (error) {
        console.error('Workers AI binding error:', error);
        throw new Error(`Workers AI Error: ${error.message}`);
      }
    }
    
    // Fallback to REST API (for testing outside Workers)
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`;
    
    const requestBody = {
      messages: messages,
      max_tokens: parseInt(this.env.AI_MAX_TOKENS) || 2000,
      temperature: parseFloat(this.env.AI_TEMPERATURE) || 0.7,
      top_p: parseFloat(this.env.AI_TOP_P) || 0.9
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Build messages array for AI context
   */
  buildMessages(userMessage, context = [], options = {}) {
    const messages = [];
    
    // System message for healthcare chatbot
    const systemMessage = {
      role: 'system',
      content: `You are a helpful healthcare chatbot assistant for Bloodplusfight, specializing in HIV/STDs information and general health guidance. 

Key Guidelines:
- Provide accurate, helpful healthcare information
- Always include medical disclaimers for health advice
- Be supportive and non-judgmental
- Respond in both English and Thai as appropriate
- Focus on prevention, education, and encouraging professional medical consultation
- For medical emergencies, always recommend immediate professional care

Remember: You provide educational information only, not medical diagnosis or treatment.`
    };
    
    messages.push(systemMessage);
    
    // Add conversation context (last few messages)
    const contextLimit = parseInt(this.env.MAX_CONTEXT_SIZE) || 7;
    const recentContext = context.slice(-contextLimit);
    
    recentContext.forEach(msg => {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    return messages;
  }

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(userMessage) {
    const fallbackResponses = [
      "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
      "เสียใจด้วย ขณะนี้ฉันมีปัญหาในการประมวลผลคำขอของคุณ กรุณาลองใหม่อีกครั้งในอีกสักครู่",
      "I apologize for the inconvenience. Our AI service is temporarily unavailable. Please contact our support team for assistance.",
      "ขออภัยในความไม่สะดวก บริการ AI ของเราไม่พร้อมใช้งานชั่วคราว กรุณาติดต่อทีมสนับสนุนของเราเพื่อขอความช่วยเหลือ"
    ];
    
    // Simple language detection
    const isThai = /[\u0E00-\u0E7F]/.test(userMessage);
    const responseIndex = isThai ? 1 : 0;
    
    return fallbackResponses[responseIndex];
  }

  /**
   * Check service health
   */
  async healthCheck() {
    try {
      const testResponse = await this.generateResponse("Hello", [], { 
        model: this.defaultModel 
      });
      
      return {
        status: testResponse.success ? 'healthy' : 'degraded',
        model: this.defaultModel,
        accountId: this.accountId,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return Object.keys(this.models).map(key => ({
      name: key,
      id: this.models[key],
      description: this.getModelDescription(key)
    }));
  }

  /**
   * Get model description
   */
  getModelDescription(modelKey) {
    const descriptions = {
      llama: 'Meta Llama 3 8B - General purpose conversational AI',
      mistral: 'Mistral 7B - Fast and efficient language model',
      codellama: 'CodeLlama 7B - Specialized for code generation',
      gemma: 'Google Gemma 7B - Advanced instruction following',
      phi: 'Microsoft Phi-2 - Compact but capable model'
    };
    
    return descriptions[modelKey] || 'Cloudflare AI Model';
  }
}

export default CloudflareAIService;