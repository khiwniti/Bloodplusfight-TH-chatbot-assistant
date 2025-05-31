const { generateResponse, getProviderStats, resetProviderStats } = require('../aiService');
const deepSeekService = require('../deepSeekService');
const openRouterService = require('../openRouterService');
const fallbackResponseService = require('../fallbackResponseService');
const cacheService = require('../cachedResponseService');
const config = require('../../../config/config');

jest.mock('../deepSeekService');
jest.mock('../openRouterService');
jest.mock('../fallbackResponseService');
jest.mock('../cachedResponseService');
jest.mock('../../../config/config', () => ({
  ai: {
    primaryProvider: 'openRouter'
  },
  features: {
    enableCache: true
  }
}));

describe('AI Service', () => {
  const mockContext = {
    userId: 'user123',
    language: 'en',
    conversationHistory: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ]
  };

  const mockOptions = {
    temperature: 0.7
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.get.mockReturnValue(undefined);
    cacheService.set.mockReturnValue(true);
    openRouterService.generateResponse.mockResolvedValue('OpenRouter response');
    deepSeekService.generateResponse.mockResolvedValue('DeepSeek response');
    fallbackResponseService.getFallbackResponse.mockResolvedValue('Fallback response');
    resetProviderStats();
  });

  test('should use cached response if available', async () => {
    cacheService.get.mockReturnValue('Cached response');
    
    const result = await generateResponse('Hello', mockContext);
    
    expect(result).toBe('Cached response');
    expect(cacheService.get).toHaveBeenCalledWith(`ai:en:Hello`);
    expect(openRouterService.generateResponse).not.toHaveBeenCalled();
    expect(deepSeekService.generateResponse).not.toHaveBeenCalled();
  });

  test('should use primary provider (OpenRouter) successfully', async () => {
    const result = await generateResponse('Hello', mockContext, mockOptions);
    
    expect(result).toBe('OpenRouter response');
    expect(openRouterService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, mockOptions);
    expect(deepSeekService.generateResponse).not.toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith(`ai:en:Hello`, 'OpenRouter response');
    
    const stats = getProviderStats();
    expect(stats.openRouter.calls).toBe(1);
    expect(stats.openRouter.success).toBe(1);
    expect(stats.openRouter.failures).toBe(0);
  });

  test('should fallback to secondary provider if primary fails', async () => {
    openRouterService.generateResponse.mockRejectedValue(new Error('OpenRouter error'));
    
    const result = await generateResponse('Hello', mockContext);
    
    expect(result).toBe('DeepSeek response');
    expect(openRouterService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, {});
    expect(deepSeekService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, {});
    expect(cacheService.set).toHaveBeenCalledWith(`ai:en:Hello`, 'DeepSeek response');
    
    const stats = getProviderStats();
    expect(stats.openRouter.calls).toBe(1);
    expect(stats.openRouter.failures).toBe(1);
    expect(stats.deepSeek.calls).toBe(1);
    expect(stats.deepSeek.success).toBe(1);
  });

  test('should use fallback response if both providers fail', async () => {
    openRouterService.generateResponse.mockRejectedValue(new Error('OpenRouter error'));
    deepSeekService.generateResponse.mockRejectedValue(new Error('DeepSeek error'));
    
    const result = await generateResponse('Hello', mockContext);
    
    expect(result).toBe('Fallback response');
    expect(openRouterService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, {});
    expect(deepSeekService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, {});
    expect(fallbackResponseService.getFallbackResponse).toHaveBeenCalledWith('en', 'Hello');
    
    const stats = getProviderStats();
    expect(stats.openRouter.calls).toBe(1);
    expect(stats.openRouter.failures).toBe(1);
    expect(stats.deepSeek.calls).toBe(1);
    expect(stats.deepSeek.failures).toBe(1);
  });

  test('should handle a different primary provider (DeepSeek)', async () => {
    config.ai.primaryProvider = 'deepSeek';
    
    const result = await generateResponse('Hello', mockContext);
    
    expect(result).toBe('DeepSeek response');
    expect(deepSeekService.generateResponse).toHaveBeenCalledWith('Hello', mockContext, {});
    expect(openRouterService.generateResponse).not.toHaveBeenCalled();
    
    // Reset for other tests
    config.ai.primaryProvider = 'openRouter';
  });

  test('should correctly calculate provider stats', async () => {
    // First call - success
    await generateResponse('Hello', mockContext);
    
    // Second call - failure with primary, success with fallback
    openRouterService.generateResponse.mockRejectedValueOnce(new Error('OpenRouter error'));
    await generateResponse('Failed query', mockContext);
    
    // Third call - success
    await generateResponse('Another query', mockContext);
    
    const stats = getProviderStats();
    expect(stats.openRouter.calls).toBe(3);
    expect(stats.openRouter.success).toBe(2);
    expect(stats.openRouter.failures).toBe(1);
    expect(stats.openRouter.successRate).toBe('66.67%');
    
    expect(stats.deepSeek.calls).toBe(1);
    expect(stats.deepSeek.success).toBe(1);
    expect(stats.deepSeek.failures).toBe(0);
    expect(stats.deepSeek.successRate).toBe('100.00%');
    
    resetProviderStats();
    const resetStats = getProviderStats();
    expect(resetStats.openRouter.calls).toBe(0);
    expect(resetStats.deepSeek.calls).toBe(0);
  });
});