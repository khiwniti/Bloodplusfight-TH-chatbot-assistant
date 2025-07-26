/**
 * Medical Research Service for Healthcare Information
 * Advanced web scraping and research capabilities for trusted medical sources
 */

import { Logger } from '../utils/logger.js';
import { PerformanceOptimizer } from '../utils/performance.js';

export class MedicalResearchService {
  constructor(env) {
    this.env = env;
    this.logger = new Logger(env);
    this.performance = new PerformanceOptimizer(env);
    
    // Research configuration
    this.config = {
      timeout: parseInt(env.MEDICAL_RESEARCH_TIMEOUT || '15000'),
      maxResults: parseInt(env.MEDICAL_MAX_RESULTS || '5'),
      maxConcurrentRequests: parseInt(env.MEDICAL_CONCURRENT_REQUESTS || '3'),
      cacheEnabled: env.ENABLE_MEDICAL_CACHE === 'true',
      cacheTTL: parseInt(env.MEDICAL_CACHE_TTL || '7200'), // 2 hours
      userAgent: 'LINE-Healthcare-Bot/2.0 (+https://linebot.healthcare)',
      respectRobotsTxt: true
    };

    // Trusted medical sources with specialized parsers
    this.medicalSources = {
      'who.int': {
        name: 'World Health Organization',
        priority: 1,
        reliability: 0.98,
        searchUrl: 'https://www.who.int/search?query={query}&language={lang}',
        contentSelectors: ['.sf-content-block', '.page-content', 'main'],
        titleSelectors: ['h1', '.page-title', '.main-title'],
        excludeSelectors: ['.navigation', '.footer', '.sidebar', '.ads'],
        rateLimit: 2000, // ms between requests
        language: {
          en: 'en',
          th: 'th'
        }
      },
      'cdc.gov': {
        name: 'Centers for Disease Control and Prevention',
        priority: 1,
        reliability: 0.97,
        searchUrl: 'https://search.cdc.gov/search/?query={query}&srt=date&affiliate=cdc-main',
        contentSelectors: ['.syndicate', '.content', 'main'],
        titleSelectors: ['h1', '.page-title'],
        excludeSelectors: ['.nav', '.footer', '.social-media'],
        rateLimit: 1500,
        language: {
          en: 'en',
          th: 'en' // CDC primarily English
        }
      },
      'nih.gov': {
        name: 'National Institutes of Health',
        priority: 1,
        reliability: 0.96,
        searchUrl: 'https://www.nih.gov/search/{query}',
        contentSelectors: ['.content', '.main-content', 'article'],
        titleSelectors: ['h1', '.page-title'],
        excludeSelectors: ['.navigation', '.footer'],
        rateLimit: 2000,
        language: {
          en: 'en',
          th: 'en'
        }
      },
      'mayoclinic.org': {
        name: 'Mayo Clinic',
        priority: 2,
        reliability: 0.95,
        searchUrl: 'https://www.mayoclinic.org/search/search-results?q={query}',
        contentSelectors: ['.content', '.main-content'],
        titleSelectors: ['h1'],
        excludeSelectors: ['.navigation', '.ads', '.related-links'],
        rateLimit: 3000,
        language: {
          en: 'en',
          th: 'en'
        }
      },
      'thaiddc.ddc.moph.go.th': {
        name: 'Department of Disease Control Thailand',
        priority: 1,
        reliability: 0.94,
        searchUrl: 'https://thaiddc.ddc.moph.go.th/search?q={query}',
        contentSelectors: ['.content', '.main'],
        titleSelectors: ['h1', '.title'],
        excludeSelectors: ['.menu', '.footer'],
        rateLimit: 2500,
        language: {
          en: 'th',
          th: 'th'
        }
      },
      'aidsinfo.nih.gov': {
        name: 'AIDSinfo - NIH',
        priority: 1,
        reliability: 0.97,
        searchUrl: 'https://aidsinfo.nih.gov/search?q={query}',
        contentSelectors: ['.main-content', '.content-area'],
        titleSelectors: ['h1'],
        excludeSelectors: ['.nav', '.sidebar'],
        rateLimit: 2000,
        language: {
          en: 'en',
          th: 'en'
        }
      }
    };

    // Medical content extraction patterns
    this.extractionPatterns = {
      symptoms: /symptoms?:?\s*([^.!?]*[.!?])/gi,
      treatment: /treatment:?\s*([^.!?]*[.!?])/gi,
      prevention: /prevention:?\s*([^.!?]*[.!?])/gi,
      causes: /causes?:?\s*([^.!?]*[.!?])/gi,
      diagnosis: /diagnosis:?\s*([^.!?]*[.!?])/gi,
      dosage: /dosage:?\s*([^.!?]*[.!?])/gi,
      sideEffects: /side effects?:?\s*([^.!?]*[.!?])/gi
    };

    // Content quality indicators
    this.qualityIndicators = {
      positive: [
        'peer-reviewed', 'clinical trial', 'randomized', 'evidence-based',
        'systematic review', 'meta-analysis', 'published', 'research',
        'peer reviewed', 'clinical study', 'medical journal'
      ],
      negative: [
        'advertisement', 'sponsored', 'affiliate', 'buy now',
        'miracle cure', 'instant', 'guaranteed', 'secret'
      ]
    };

    // Request deduplication cache
    this.requestCache = new Map();
    this.rateLimiters = new Map();
  }

  /**
   * Perform comprehensive medical research
   * @param {string} query - Medical query
   * @param {string} language - Language preference
   * @param {Object} options - Research options
   * @returns {Array} Research results
   */
  async performMedicalResearch(query, language = 'en', options = {}) {
    const startTime = Date.now();
    const requestId = options.requestId || crypto.randomUUID();

    return await this.performance.monitor('medical_research', async () => {
      try {
        this.logger.info('Starting medical research', {
          requestId,
          query: query.substring(0, 100),
          language,
          sources: Object.keys(this.medicalSources).length
        });

        // Check cache first
        const cacheKey = this.generateCacheKey(query, language);
        if (this.config.cacheEnabled) {
          const cached = await this.getCachedResults(cacheKey);
          if (cached) {
            this.logger.debug('Medical research cache hit', { requestId, cacheKey });
            return cached;
          }
        }

        // Prepare search queries with medical context
        const enhancedQueries = this.enhanceQueryWithMedicalContext(query, language);
        
        // Research from multiple sources with intelligent batching
        const researchResults = await this.researchFromSources(
          enhancedQueries,
          language,
          requestId
        );

        // Filter and rank results by quality and relevance
        const qualityResults = this.filterAndRankResults(
          researchResults,
          query,
          language
        );

        // Extract structured medical information
        const structuredResults = this.extractStructuredMedicalInfo(
          qualityResults,
          query
        );

        // Verify medical accuracy and consistency
        const verifiedResults = await this.verifyMedicalAccuracy(
          structuredResults,
          requestId
        );

        // Cache successful results
        if (this.config.cacheEnabled && verifiedResults.length > 0) {
          await this.cacheResults(cacheKey, verifiedResults);
        }

        this.logger.info('Medical research completed', {
          requestId,
          resultsFound: verifiedResults.length,
          processingTime: Date.now() - startTime,
          sourcesUsed: [...new Set(verifiedResults.map(r => r.source))].length
        });

        return verifiedResults;

      } catch (error) {
        this.logger.error('Medical research failed', {
          requestId,
          error: error.message,
          stack: error.stack,
          query: query.substring(0, 100)
        });

        return [];
      }
    });
  }

  /**
   * Enhance query with medical context and synonyms
   * @param {string} query - Original query
   * @param {string} language - Language code
   * @returns {Array} Enhanced queries
   */
  enhanceQueryWithMedicalContext(query, language) {
    const baseQuery = query.toLowerCase().trim();
    const enhancedQueries = [baseQuery];

    // Medical synonym mapping
    const medicalSynonyms = {
      en: {
        'hiv': ['hiv', 'human immunodeficiency virus', 'aids virus'],
        'aids': ['aids', 'acquired immunodeficiency syndrome', 'hiv aids'],
        'std': ['std', 'sti', 'sexually transmitted disease', 'sexually transmitted infection'],
        'herpes': ['herpes', 'hsv', 'herpes simplex'],
        'chlamydia': ['chlamydia', 'chlamydia trachomatis'],
        'gonorrhea': ['gonorrhea', 'gonorrhoea', 'clap'],
        'syphilis': ['syphilis', 'treponema pallidum'],
        'prep': ['prep', 'pre-exposure prophylaxis', 'hiv prevention'],
        'pep': ['pep', 'post-exposure prophylaxis']
      },
      th: {
        'เอชไอวี': ['เอชไอวี', 'เอดส์', 'ไวรัสเอชไอวี'],
        'เอดส์': ['เอดส์', 'เอชไอวี', 'ภูมิคุ้มกันบกพร่อง'],
        'โรคติดต่อทางเพศ': ['โรคติดต่อทางเพศ', 'โรคกามโรค', 'STD'],
        'เพรพ': ['เพรพ', 'PrEP', 'การป้องกันก่อนสัมผัส']
      }
    };

    // Add synonym variations
    const synonyms = medicalSynonyms[language] || {};
    for (const [term, variations] of Object.entries(synonyms)) {
      if (baseQuery.includes(term)) {
        variations.forEach(variation => {
          if (variation !== term) {
            enhancedQueries.push(baseQuery.replace(term, variation));
          }
        });
      }
    }

    // Add medical context terms
    const contextTerms = {
      en: ['medical', 'health', 'treatment', 'symptoms', 'prevention'],
      th: ['การแพทย์', 'สุขภาพ', 'การรักษา', 'อาการ', 'การป้องกัน']
    };

    const contexts = contextTerms[language] || contextTerms.en;
    contexts.forEach(context => {
      enhancedQueries.push(`${baseQuery} ${context}`);
    });

    return [...new Set(enhancedQueries)].slice(0, 5); // Limit to 5 variations
  }

  /**
   * Research from multiple medical sources
   * @param {Array} queries - Enhanced queries
   * @param {string} language - Language code
   * @param {string} requestId - Request ID
   * @returns {Array} Raw research results
   */
  async researchFromSources(queries, language, requestId) {
    const sourcePriorities = Object.entries(this.medicalSources)
      .sort(([, a], [, b]) => a.priority - b.priority);

    const researchPromises = [];

    // Create research tasks for each source and query combination
    for (const [sourceId, sourceConfig] of sourcePriorities) {
      for (const query of queries) {
        researchPromises.push(
          this.researchFromSource(sourceId, sourceConfig, query, language, requestId)
        );

        // Limit concurrent requests
        if (researchPromises.length >= this.config.maxConcurrentRequests) {
          break;
        }
      }
    }

    // Execute research with intelligent batching
    const results = await this.performance.batchOperations(
      researchPromises,
      {
        batchSize: this.config.maxConcurrentRequests,
        concurrentBatches: 2,
        retryFailures: true
      }
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value)
      .flat();
  }

  /**
   * Research from a specific medical source
   * @param {string} sourceId - Source identifier
   * @param {Object} sourceConfig - Source configuration
   * @param {string} query - Search query
   * @param {string} language - Language code
   * @param {string} requestId - Request ID
   * @returns {Promise<Array>} Source results
   */
  async researchFromSource(sourceId, sourceConfig, query, language, requestId) {
    try {
      // Rate limiting check
      if (!await this.checkRateLimit(sourceId, sourceConfig.rateLimit)) {
        this.logger.debug('Rate limit exceeded', { sourceId, requestId });
        return [];
      }

      // Build search URL
      const searchUrl = this.buildSearchUrl(sourceConfig, query, language);
      const deduplicationKey = `${sourceId}:${this.hashString(searchUrl)}`;

      // Check for duplicate requests
      return await this.performance.deduplicateRequest(
        deduplicationKey,
        () => this.fetchAndParseSource(sourceId, sourceConfig, searchUrl, query, requestId)
      );

    } catch (error) {
      this.logger.warn('Source research failed', {
        sourceId,
        requestId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch and parse content from medical source
   * @param {string} sourceId - Source identifier
   * @param {Object} sourceConfig - Source configuration
   * @param {string} searchUrl - Search URL
   * @param {string} query - Original query
   * @param {string} requestId - Request ID
   * @returns {Promise<Array>} Parsed results
   */
  async fetchAndParseSource(sourceId, sourceConfig, searchUrl, query, requestId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      this.logger.debug('Fetching medical source', {
        sourceId,
        requestId,
        url: searchUrl.substring(0, 100) + '...'
      });

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': language === 'th' ? 'th,en;q=0.9' : 'en,th;q=0.9',
          'Cache-Control': 'no-cache',
          'DNT': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parsedResults = await this.parseHTMLContent(
        html,
        sourceConfig,
        sourceId,
        query,
        searchUrl
      );

      this.logger.debug('Source parsing completed', {
        sourceId,
        requestId,
        resultCount: parsedResults.length
      });

      return parsedResults;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse HTML content using intelligent extraction
   * @param {string} html - HTML content
   * @param {Object} sourceConfig - Source configuration
   * @param {string} sourceId - Source ID
   * @param {string} query - Search query
   * @param {string} url - Source URL
   * @returns {Array} Parsed content items
   */
  async parseHTMLContent(html, sourceConfig, sourceId, query, url) {
    try {
      // Simple HTML parsing without DOM (Workers environment)
      const results = [];
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : '';

      // Extract main content using regex patterns
      const contentSections = this.extractContentSections(html, sourceConfig);
      
      for (const section of contentSections) {
        if (this.isRelevantContent(section, query)) {
          const cleanContent = this.cleanHTMLContent(section);
          
          if (cleanContent.length > 100) { // Minimum content length
            const structuredContent = this.extractStructuredInfo(cleanContent, query);
            
            results.push({
              title: pageTitle,
              content: cleanContent,
              structuredInfo: structuredContent,
              source: sourceConfig.name,
              sourceId,
              url,
              reliability: sourceConfig.reliability,
              extractedAt: new Date().toISOString(),
              relevanceScore: this.calculateRelevanceScore(cleanContent, query),
              qualityScore: this.calculateQualityScore(cleanContent)
            });
          }
        }
      }

      return results.slice(0, 3); // Limit results per source

    } catch (error) {
      this.logger.error('HTML parsing failed', {
        sourceId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Extract content sections from HTML
   * @param {string} html - HTML content
   * @param {Object} sourceConfig - Source configuration
   * @returns {Array} Content sections
   */
  extractContentSections(html, sourceConfig) {
    const sections = [];
    
    // Try each content selector
    for (const selector of sourceConfig.contentSelectors) {
      const pattern = this.selectorToRegex(selector);
      const matches = html.match(pattern);
      
      if (matches) {
        sections.push(...matches);
      }
    }

    // Remove excluded content
    const excludePatterns = sourceConfig.excludeSelectors.map(this.selectorToRegex);
    
    return sections.filter(section => {
      return !excludePatterns.some(pattern => pattern.test(section));
    });
  }

  /**
   * Convert CSS selector to regex pattern (simplified)
   * @param {string} selector - CSS selector
   * @returns {RegExp} Regex pattern
   */
  selectorToRegex(selector) {
    // Simplified conversion - in production, use a proper HTML parser
    const className = selector.replace('.', '');
    const tagName = selector.replace(/[.#].*/, '');
    
    if (selector.startsWith('.')) {
      return new RegExp(`<[^>]*class[^>]*${className}[^>]*>([\\s\\S]*?)<\/[^>]*>`, 'gi');
    } else if (selector.startsWith('#')) {
      return new RegExp(`<[^>]*id[^>]*${className}[^>]*>([\\s\\S]*?)<\/[^>]*>`, 'gi');
    } else {
      return new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'gi');
    }
  }

  /**
   * Clean HTML content for processing
   * @param {string} html - Raw HTML
   * @returns {string} Cleaned text
   */
  cleanHTMLContent(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
      .replace(/<[^>]*>/g, ' ')                          // Remove HTML tags
      .replace(/\s+/g, ' ')                              // Normalize whitespace
      .replace(/&nbsp;/g, ' ')                           // Replace &nbsp;
      .replace(/&amp;/g, '&')                            // Replace &amp;
      .replace(/&lt;/g, '<')                             // Replace &lt;
      .replace(/&gt;/g, '>')                             // Replace &gt;
      .replace(/&quot;/g, '"')                           // Replace &quot;
      .trim();
  }

  /**
   * Calculate content relevance score
   * @param {string} content - Content text
   * @param {string} query - Search query
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(content, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    let totalPositions = 0;

    queryTerms.forEach(term => {
      const positions = [];
      let index = contentLower.indexOf(term);
      
      while (index !== -1) {
        positions.push(index);
        matches++;
        index = contentLower.indexOf(term, index + 1);
      }

      // Earlier mentions are more relevant
      totalPositions += positions.reduce((sum, pos) => sum + (1 / (pos + 1)), 0);
    });

    const termCoverage = matches / queryTerms.length;
    const positionScore = totalPositions / content.length;
    
    return Math.min((termCoverage * 0.7 + positionScore * 0.3), 1.0);
  }

  /**
   * Calculate content quality score
   * @param {string} content - Content text
   * @returns {number} Quality score (0-1)
   */
  calculateQualityScore(content) {
    let score = 0.5; // Base score

    // Check for positive quality indicators
    const positiveMatches = this.qualityIndicators.positive.filter(indicator =>
      content.toLowerCase().includes(indicator)
    ).length;
    
    score += Math.min(positiveMatches * 0.1, 0.3);

    // Check for negative quality indicators
    const negativeMatches = this.qualityIndicators.negative.filter(indicator =>
      content.toLowerCase().includes(indicator)
    ).length;
    
    score -= Math.min(negativeMatches * 0.15, 0.4);

    // Content length bonus (longer content often more comprehensive)
    if (content.length > 500) score += 0.1;
    if (content.length > 1500) score += 0.1;

    // Medical terminology bonus
    const medicalTerms = ['treatment', 'symptoms', 'diagnosis', 'prevention', 'therapy', 'clinical'];
    const medicalMatches = medicalTerms.filter(term =>
      content.toLowerCase().includes(term)
    ).length;
    
    score += Math.min(medicalMatches * 0.05, 0.2);

    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Check rate limiting for source
   * @param {string} sourceId - Source identifier
   * @param {number} rateLimitMs - Rate limit in milliseconds
   * @returns {Promise<boolean>} Whether request is allowed
   */
  async checkRateLimit(sourceId, rateLimitMs) {
    const now = Date.now();
    const lastRequest = this.rateLimiters.get(sourceId) || 0;
    
    if (now - lastRequest < rateLimitMs) {
      return false;
    }
    
    this.rateLimiters.set(sourceId, now);
    return true;
  }

  /**
   * Generate cache key for results
   * @param {string} query - Search query
   * @param {string} language - Language code
   * @returns {string} Cache key
   */
  generateCacheKey(query, language) {
    return `medical_research:${language}:${this.hashString(query)}`;
  }

  /**
   * Hash string for consistent keys
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Additional helper methods for caching, filtering, etc.
  // (Implementations would continue here for a complete service)
}

export default MedicalResearchService;