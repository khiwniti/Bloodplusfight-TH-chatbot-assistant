/**
 * Comprehensive Healthcare Service Tests
 * Tests for HIV/STDs information service, medical research, and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedHealthcareService } from '../src/services/enhanced-healthcare.js';
import { MedicalResearchService } from '../src/services/medical-research.js';
import { HealthcareAnalyticsService } from '../src/services/healthcare-analytics.js';

// Mock environment
const mockEnv = {
  ENABLE_HEALTHCARE_RESEARCH: 'true',
  HEALTHCARE_RESEARCH_TIMEOUT: '15000',
  HEALTHCARE_MAX_RESULTS: '5',
  ENABLE_HEALTHCARE_ANALYTICS: 'true',
  HEALTHCARE_PRIVACY_MODE: 'strict',
  HEALTHCARE_RETENTION_DAYS: '30',
  HEALTHCARE_ANONYMIZATION: 'true',
  MEDICAL_RESEARCH_TIMEOUT: '15000',
  MEDICAL_MAX_RESULTS: '5',
  MEDICAL_CONCURRENT_REQUESTS: '3',
  ENABLE_MEDICAL_CACHE: 'true',
  MEDICAL_CACHE_TTL: '7200',
  ANALYTICS_SALT: 'test-salt-123',
  ANONYMIZATION_SALT: 'test-anon-salt-456',
  // Mock database and analytics
  DB: {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        all: vi.fn(() => Promise.resolve({ results: [] })),
        first: vi.fn(() => Promise.resolve(null)),
        run: vi.fn(() => Promise.resolve({ success: true }))
      }))
    }))
  },
  ANALYTICS: {
    writeDataPoint: vi.fn(() => Promise.resolve())
  }
};

// Mock fetch for medical research
global.fetch = vi.fn();

describe('EnhancedHealthcareService', () => {
  let healthcareService;
  
  beforeEach(() => {
    healthcareService = new EnhancedHealthcareService(mockEnv);
    vi.clearAllMocks();
  });

  describe('Healthcare Intent Classification', () => {
    it('should classify HIV general queries correctly', () => {
      const query = 'What is HIV and how does it affect the immune system?';
      const intent = healthcareService.classifyHealthcareIntent(query, 'en');
      
      expect(intent.type).toBe('hiv_general');
      expect(intent.confidence).toBeGreaterThan(0.8);
      expect(intent.matchedKeywords).toContain('hiv');
    });

    it('should classify HIV testing queries in Thai', () => {
      const query = 'การตรวจเอชไอวีใช้เวลานานแค่ไหน';
      const intent = healthcareService.classifyHealthcareIntent(query, 'th');
      
      expect(intent.type).toBe('hiv_testing');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should classify PrEP queries correctly', () => {
      const query = 'Tell me about pre-exposure prophylaxis for HIV prevention';
      const intent = healthcareService.classifyHealthcareIntent(query, 'en');
      
      expect(intent.type).toBe('prep');
      expect(intent.confidence).toBeGreaterThan(0.9);
    });

    it('should classify STD general queries', () => {
      const query = 'What are common sexually transmitted diseases?';
      const intent = healthcareService.classifyHealthcareIntent(query, 'en');
      
      expect(intent.type).toBe('std_general');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should handle unknown queries with fallback', () => {
      const query = 'What is the weather like today?';
      const intent = healthcareService.classifyHealthcareIntent(query, 'en');
      
      expect(intent.type).toBe('general_health');
      expect(intent.confidence).toBe(0.5);
    });
  });

  describe('Knowledge Base Responses', () => {
    it('should provide comprehensive HIV overview in English', async () => {
      const intent = { type: 'hiv_general', confidence: 0.9 };
      const context = { language: 'en' };
      
      const response = await healthcareService.getKnowledgeBaseResponse(intent, 'HIV information', context);
      
      expect(response).toContain('HIV Overview');
      expect(response).toContain('Human Immunodeficiency Virus');
      expect(response).toContain('CD4+ T cells');
      expect(response).toContain('transmitted through blood');
    });

    it('should provide HIV testing information in Thai', async () => {
      const intent = { type: 'hiv_testing', confidence: 0.95 };
      const context = { language: 'th' };
      
      const response = await healthcareService.getKnowledgeBaseResponse(intent, 'ตรวจเอชไอวี', context);
      
      expect(response).toContain('การตรวจเอชไอวี');
      expect(response).toContain('ช่วงหน้าต่าง');
      expect(response).toContain('10-33 วัน');
    });

    it('should provide PrEP information with proper formatting', async () => {
      const intent = { type: 'prep', confidence: 0.95 };
      const context = { language: 'en' };
      
      const response = await healthcareService.getKnowledgeBaseResponse(intent, 'PrEP information', context);
      
      expect(response).toContain('PrEP Information');
      expect(response).toContain('pre-exposure prophylaxis');
      expect(response).toContain('99% effective');
      expect(response).toContain('**Definition**');
    });
  });

  describe('Medical Disclaimer', () => {
    it('should add proper medical disclaimer in English', () => {
      const response = 'HIV testing information...';
      const result = healthcareService.addMedicalDisclaimer(response, 'en');
      
      expect(result).toContain('⚠️ **Medical Disclaimer**');
      expect(result).toContain('educational purposes only');
      expect(result).toContain('consult with a healthcare provider');
    });

    it('should add proper medical disclaimer in Thai', () => {
      const response = 'ข้อมูลการตรวจเอชไอวี...';
      const result = healthcareService.addMedicalDisclaimer(response, 'th');
      
      expect(result).toContain('⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**');
      expect(result).toContain('เพื่อการศึกษาเท่านั้น');
      expect(result).toContain('ปรึกษาแพทย์เสมอ');
    });
  });

  describe('Privacy and Anonymization', () => {
    it('should anonymize user IDs consistently', () => {
      const userId = 'user123456789';
      const anon1 = healthcareService.anonymizeUserId(userId);
      const anon2 = healthcareService.anonymizeUserId(userId);
      
      expect(anon1).toBe(anon2); // Consistent hashing
      expect(anon1).toMatch(/^anon_[a-z0-9]+$/);
      expect(anon1).not.toContain(userId);
    });

    it('should mask user IDs for logging', () => {
      const userId = 'user123456789';
      const masked = healthcareService.maskUserId(userId);
      
      expect(masked).toBe('user1***789');
      expect(masked).not.toBe(userId);
    });

    it('should generate privacy consent request', () => {
      const consent = healthcareService.generateConsentRequest('en');
      
      expect(consent.response).toContain('Privacy Notice');
      expect(consent.response).toContain('I consent');
      expect(consent.metadata.requiresConsent).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide appropriate error responses', () => {
      const errorResponse = healthcareService.getErrorResponse('en');
      
      expect(errorResponse).toContain('having trouble accessing');
      expect(errorResponse).toContain('healthcare professional');
    });

    it('should provide fallback responses', () => {
      const fallback = healthcareService.getFallbackResponse('th');
      
      expect(fallback).toContain('ช่วยตอบคำถาม');
      expect(fallback).toContain('รายละเอียดที่เจาะจง');
    });
  });
});

describe('MedicalResearchService', () => {
  let researchService;
  
  beforeEach(() => {
    researchService = new MedicalResearchService(mockEnv);
    vi.clearAllMocks();
  });

  describe('Query Enhancement', () => {
    it('should enhance HIV queries with medical synonyms', () => {
      const query = 'hiv treatment';
      const enhanced = researchService.enhanceQueryWithMedicalContext(query, 'en');
      
      expect(enhanced).toContain('hiv treatment');
      expect(enhanced).toContain('human immunodeficiency virus treatment');
      expect(enhanced.length).toBeGreaterThan(1);
    });

    it('should enhance Thai medical queries', () => {
      const query = 'เอชไอวี';
      const enhanced = researchService.enhanceQueryWithMedicalContext(query, 'th');
      
      expect(enhanced).toContain('เอชไอวี');
      expect(enhanced).toContain('เอดส์');
      expect(enhanced.some(q => q.includes('ไวรัสเอชไอวี'))).toBe(true);
    });
  });

  describe('Content Quality Assessment', () => {
    it('should calculate relevance scores correctly', () => {
      const content = 'HIV treatment involves antiretroviral therapy which is highly effective in managing HIV infection';
      const query = 'hiv treatment';
      
      const score = researchService.calculateRelevanceScore(content, query);
      
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should assess content quality based on medical indicators', () => {
      const highQualityContent = 'This peer-reviewed clinical trial shows that evidence-based treatment is effective';
      const lowQualityContent = 'Buy this miracle cure now! Guaranteed instant results!';
      
      const highScore = researchService.calculateQualityScore(highQualityContent);
      const lowScore = researchService.calculateQualityScore(lowQualityContent);
      
      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.7);
      expect(lowScore).toBeLessThan(0.5);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for medical sources', async () => {
      const sourceId = 'who.int';
      const rateLimit = 2000;
      
      // First request should be allowed
      const first = await researchService.checkRateLimit(sourceId, rateLimit);
      expect(first).toBe(true);
      
      // Immediate second request should be blocked
      const second = await researchService.checkRateLimit(sourceId, rateLimit);
      expect(second).toBe(false);
    });
  });

  describe('HTML Content Processing', () => {
    it('should clean HTML content properly', () => {
      const html = '<div>Medical <script>alert("test")</script> information about <b>HIV</b> treatment</div>';
      const cleaned = researchService.cleanHTMLContent(html);
      
      expect(cleaned).toBe('Medical information about HIV treatment');
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('<div>');
    });
  });
});

describe('HealthcareAnalyticsService', () => {
  let analyticsService;
  
  beforeEach(() => {
    analyticsService = new HealthcareAnalyticsService(mockEnv);
    vi.clearAllMocks();
  });

  describe('Privacy-Compliant Analytics', () => {
    it('should anonymize interaction data correctly', async () => {
      const interactionData = {
        query: 'What is HIV?',
        response: 'HIV is a virus...',
        userId: 'user123',
        displayName: 'John Doe',
        location: { country: 'Thailand', city: 'Bangkok' }
      };
      
      const anonymized = await analyticsService.anonymizeInteractionData(interactionData, 'user123');
      
      expect(anonymized.anonymousUserId).toMatch(/^anon_/);
      expect(anonymized.queryLength).toBe(12);
      expect(anonymized.userRegion).toBe('Thailand');
      expect(anonymized.userId).toBeUndefined();
      expect(anonymized.displayName).toBeUndefined();
      expect(anonymized.query).toBeUndefined();
    });

    it('should filter data by privacy level', () => {
      const data = {
        intent: 'hiv_general',
        language: 'en',
        confidence: 0.9,
        responseTime: 1500,
        researchUsed: true,
        sessionLength: 300,
        userRegion: 'Thailand',
        deviceType: 'mobile',
        timeOfDay: 'morning'
      };
      
      analyticsService.config.privacyLevel = 'strict';
      const filtered = analyticsService.filterDataByPrivacyLevel(data);
      
      expect(filtered.intent).toBe('hiv_general');
      expect(filtered.confidence).toBe(0.9);
      expect(filtered.deviceType).toBeUndefined(); // Not allowed in strict mode
    });
  });

  describe('Report Generation', () => {
    it('should generate summary statistics from analytics data', () => {
      const rawData = [
        { anonymousUserId: 'user1', confidence: 0.9, responseTime: 1000, researchUsed: true, language: 'en' },
        { anonymousUserId: 'user2', confidence: 0.8, responseTime: 1500, researchUsed: false, language: 'th' },
        { anonymousUserId: 'user1', confidence: 0.95, responseTime: 800, researchUsed: true, language: 'en' }
      ];
      
      const summary = analyticsService.generateSummaryStatistics(rawData);
      
      expect(summary.totalInteractions).toBe(3);
      expect(summary.uniqueUsers).toBe(2);
      expect(summary.averageConfidence).toBe(0.88);
      expect(summary.researchUsageRate).toBe(66.67);
      expect(summary.languageDistribution.en).toBe(2);
      expect(summary.languageDistribution.th).toBe(1);
    });

    it('should generate intent analysis correctly', () => {
      const rawData = [
        { intent: 'hiv_general', confidence: 0.9, responseTime: 1000, researchUsed: true },
        { intent: 'hiv_testing', confidence: 0.95, responseTime: 1200, researchUsed: false },
        { intent: 'hiv_general', confidence: 0.85, responseTime: 1100, researchUsed: true }
      ];
      
      const analysis = analyticsService.generateIntentAnalysis(rawData);
      
      expect(analysis.intentDistribution).toHaveLength(2);
      expect(analysis.topIntent).toBe('hiv_general');
      
      const hivGeneral = analysis.intentDistribution.find(i => i.intent === 'hiv_general');
      expect(hivGeneral.count).toBe(2);
      expect(hivGeneral.percentage).toBe(66.67);
      expect(hivGeneral.researchUsageRate).toBe(100);
    });
  });

  describe('Analytics Integration', () => {
    it('should send data to Cloudflare Analytics', async () => {
      const recordData = {
        intent: 'hiv_general',
        language: 'en',
        confidence: 0.9,
        responseTime: 1500,
        researchUsed: true,
        privacyLevel: 'strict'
      };
      
      await analyticsService.sendToCloudflareAnalytics(recordData);
      
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['hiv_general', 'en', 'research_used'],
        doubles: [0.9, 1500, 0, 0],
        indexes: ['strict', 'unknown', 'unknown']
      });
    });
  });
});

describe('Integration Tests', () => {
  let healthcareService;
  
  beforeEach(() => {
    healthcareService = new EnhancedHealthcareService(mockEnv);
    
    // Mock successful database operations
    mockEnv.DB.prepare = vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(() => Promise.resolve({ granted: true, expired: false })),
        run: vi.fn(() => Promise.resolve({ success: true }))
      }))
    }));
  });

  it('should handle complete healthcare query workflow', async () => {
    const query = 'What is PrEP and how effective is it?';
    const context = {
      userId: 'test-user-123',
      language: 'en',
      requestId: 'test-request-456'
    };
    
    const result = await healthcareService.handleHealthcareQuery(query, context);
    
    expect(result.response).toContain('PrEP Information');
    expect(result.response).toContain('99% effective');
    expect(result.response).toContain('Medical Disclaimer');
    expect(result.metadata.intent).toBe('prep');
    expect(result.metadata.confidence).toBeGreaterThan(0.9);
    expect(result.metadata.disclaimer).toBe(true);
  });

  it('should handle privacy consent workflow', async () => {
    // Mock no consent granted
    mockEnv.DB.prepare = vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(() => Promise.resolve(null))
      }))
    }));
    
    const query = 'HIV testing information';
    const context = { userId: 'test-user-789', language: 'en' };
    
    const result = await healthcareService.handleHealthcareQuery(query, context);
    
    expect(result.response).toContain('Privacy Notice');
    expect(result.response).toContain('I consent');
    expect(result.metadata.requiresConsent).toBe(true);
  });

  it('should handle multilingual queries correctly', async () => {
    const thaiQuery = 'เอชไอวีคืออะไร';
    const context = { userId: 'test-user-th', language: 'th' };
    
    const result = await healthcareService.handleHealthcareQuery(thaiQuery, context);
    
    expect(result.response).toContain('เอชไอวี');
    expect(result.response).toContain('ไวรัสที่ทำลายระบบภูมิคุ้มกัน');
    expect(result.response).toContain('ข้อจำกัดความรับผิดชอบทางการแพทย์');
    expect(result.metadata.intent).toBe('hiv_general');
  });
});

describe('Performance Tests', () => {
  let healthcareService;
  
  beforeEach(() => {
    healthcareService = new EnhancedHealthcareService(mockEnv);
  });

  it('should respond within acceptable time limits', async () => {
    const query = 'HIV treatment options';
    const context = { userId: 'perf-test-user', language: 'en' };
    
    const startTime = Date.now();
    const result = await healthcareService.handleHealthcareQuery(query, context);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    expect(result.metadata.processingTime).toBeLessThan(5000);
  });

  it('should handle concurrent requests efficiently', async () => {
    const queries = [
      'What is HIV?',
      'How is HIV transmitted?',
      'What is PrEP?',
      'HIV testing information',
      'STD prevention methods'
    ];
    
    const promises = queries.map((query, index) => 
      healthcareService.handleHealthcareQuery(query, {
        userId: `concurrent-user-${index}`,
        language: 'en'
      })
    );
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results).toHaveLength(5);
    expect(results.every(r => r.response && r.metadata)).toBe(true);
    expect(endTime - startTime).toBeLessThan(10000); // All should complete within 10 seconds
  });
});