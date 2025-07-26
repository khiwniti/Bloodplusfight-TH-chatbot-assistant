/**
 * Test Setup Configuration
 * Global test setup for healthcare chatbot tests
 */

import { vi } from 'vitest';

// Mock global fetch for all tests
global.fetch = vi.fn();

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: vi.fn(() => 'test-uuid-123456'),
  subtle: {
    digest: vi.fn()
  }
};

// Mock TextEncoder/TextDecoder for Workers environment
global.TextEncoder = class TextEncoder {
  encode(text) {
    return new Uint8Array(text.split('').map(char => char.charCodeAt(0)));
  }
};

global.TextDecoder = class TextDecoder {
  decode(buffer) {
    return String.fromCharCode(...buffer);
  }
};

// Mock console for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset fetch mock
  global.fetch.mockReset();
  
  // Reset crypto mock
  global.crypto.randomUUID.mockReturnValue('test-uuid-123456');
});

// Test utilities
export const createMockRequest = (body = {}, headers = {}) => ({
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
  headers: new Map(Object.entries(headers)),
  method: 'POST',
  url: 'https://test.workers.dev/webhook'
});

export const createMockResponse = () => ({
  json: vi.fn(() => Promise.resolve({})),
  text: vi.fn(() => Promise.resolve('')),
  status: 200,
  ok: true
});

export const createMockEnv = (overrides = {}) => ({
  // LINE Bot configuration
  CHANNEL_ACCESS_TOKEN: 'test-channel-access-token',
  CHANNEL_SECRET: 'test-channel-secret',
  
  // AI Service configuration
  DEEPSEEK_API_KEY: 'test-deepseek-key',
  OPENROUTER_API_KEY: 'test-openrouter-key',
  
  // Healthcare configuration
  ENABLE_HEALTHCARE_RESEARCH: 'true',
  HEALTHCARE_RESEARCH_TIMEOUT: '15000',
  HEALTHCARE_MAX_RESULTS: '5',
  ENABLE_HEALTHCARE_ANALYTICS: 'true',
  HEALTHCARE_PRIVACY_MODE: 'strict',
  HEALTHCARE_RETENTION_DAYS: '30',
  HEALTHCARE_ANONYMIZATION: 'true',
  
  // Medical research configuration
  MEDICAL_RESEARCH_TIMEOUT: '15000',
  MEDICAL_MAX_RESULTS: '5',
  MEDICAL_CONCURRENT_REQUESTS: '3',
  ENABLE_MEDICAL_CACHE: 'true',
  MEDICAL_CACHE_TTL: '7200',
  
  // Security and privacy
  ANALYTICS_SALT: 'test-analytics-salt',
  ANONYMIZATION_SALT: 'test-anonymization-salt',
  WEBHOOK_SECRET: 'test-webhook-secret',
  ADMIN_API_KEY: 'test-admin-key',
  
  // Mock services
  DB: createMockDatabase(),
  KV: createMockKV(),
  ANALYTICS: createMockAnalytics(),
  
  ...overrides
});

export const createMockDatabase = () => ({
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(() => Promise.resolve({ results: [] })),
      first: vi.fn(() => Promise.resolve(null)),
      run: vi.fn(() => Promise.resolve({ success: true, meta: { changes: 1 } }))
    }))
  }))
});

export const createMockKV = () => ({
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  list: vi.fn(() => Promise.resolve({ keys: [] }))
});

export const createMockAnalytics = () => ({
  writeDataPoint: vi.fn(() => Promise.resolve())
});

// Mock LINE Bot events
export const createMockLineEvent = (type = 'message', overrides = {}) => {
  const baseEvent = {
    replyToken: 'test-reply-token',
    source: {
      type: 'user',
      userId: 'test-user-id'
    },
    timestamp: Date.now(),
    mode: 'active'
  };

  const eventTypes = {
    message: {
      type: 'message',
      message: {
        type: 'text',
        id: 'test-message-id',
        text: 'Hello, I need healthcare information'
      }
    },
    follow: {
      type: 'follow'
    },
    unfollow: {
      type: 'unfollow'
    },
    postback: {
      type: 'postback',
      postback: {
        data: 'action=healthcare&type=hiv_info'
      }
    }
  };

  return {
    ...baseEvent,
    ...eventTypes[type],
    ...overrides
  };
};

// Mock medical research responses
export const createMockResearchResult = (overrides = {}) => ({
  title: 'HIV Treatment Guidelines',
  content: 'HIV treatment involves antiretroviral therapy (ART) which is highly effective...',
  source: 'World Health Organization',
  sourceId: 'who.int',
  url: 'https://www.who.int/hiv-treatment',
  reliability: 0.98,
  relevanceScore: 0.9,
  qualityScore: 0.95,
  extractedAt: new Date().toISOString(),
  ...overrides
});

// Healthcare analytics mock data
export const createMockAnalyticsData = (count = 5) => {
  const intents = ['hiv_general', 'hiv_testing', 'prep', 'std_general', 'std_symptoms'];
  const languages = ['en', 'th'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `analytics-${i}`,
    anonymous_user_id: `anon_user_${i}`,
    intent: intents[i % intents.length],
    language: languages[i % languages.length],
    confidence: 0.8 + (Math.random() * 0.2),
    response_time: 1000 + (Math.random() * 2000),
    research_used: Math.random() > 0.5,
    query_length: 20 + Math.floor(Math.random() * 80),
    response_length: 200 + Math.floor(Math.random() * 800),
    timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
    created_at: new Date().toISOString()
  }));
};

// Common test assertions
export const expectHealthcareResponse = (response) => {
  expect(response).toBeDefined();
  expect(response.response).toBeDefined();
  expect(response.metadata).toBeDefined();
  expect(response.metadata.intent).toBeDefined();
  expect(response.metadata.confidence).toBeGreaterThan(0);
  expect(response.metadata.source).toBe('healthcare_service');
};

export const expectMedicalDisclaimer = (response, language = 'en') => {
  const disclaimerText = language === 'th' 
    ? 'ข้อจำกัดความรับผิดชอบทางการแพทย์'
    : 'Medical Disclaimer';
  
  expect(response).toContain('⚠️');
  expect(response).toContain(disclaimerText);
};

export const expectPrivacyCompliance = (data) => {
  // Check that sensitive data is not present
  expect(data.userId).toBeUndefined();
  expect(data.displayName).toBeUndefined();
  expect(data.query).toBeUndefined();
  expect(data.response).toBeUndefined();
  
  // Check that anonymized data is present
  expect(data.anonymousUserId).toMatch(/^anon_/);
  expect(data.intent).toBeDefined();
  expect(data.language).toBeDefined();
};