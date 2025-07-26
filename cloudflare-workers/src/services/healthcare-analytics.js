/**
 * Healthcare Analytics Service
 * Privacy-compliant analytics and monitoring for healthcare interactions
 */

import { DatabaseService } from './database.js';
import { Logger } from '../utils/logger.js';

export class HealthcareAnalyticsService {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseService(env);
    this.logger = new Logger(env);
    
    // Analytics configuration
    this.config = {
      enabled: env.ENABLE_HEALTHCARE_ANALYTICS === 'true',
      anonymizationEnabled: env.HEALTHCARE_ANONYMIZATION === 'true',
      retentionDays: parseInt(env.HEALTHCARE_RETENTION_DAYS || '30'),
      aggregationInterval: parseInt(env.ANALYTICS_AGGREGATION_INTERVAL || '3600'), // 1 hour
      privacyLevel: env.HEALTHCARE_PRIVACY_LEVEL || 'strict' // strict, moderate, minimal
    };

    // Metrics tracking
    this.metrics = {
      interactions: new Map(),
      intentDistribution: new Map(),
      responseQuality: [],
      userEngagement: new Map(),
      researchUsage: new Map(),
      errorRates: new Map()
    };

    // Privacy-compliant data fields
    this.allowedFields = {
      strict: ['intent', 'language', 'confidence', 'responseTime', 'researchUsed'],
      moderate: ['intent', 'language', 'confidence', 'responseTime', 'researchUsed', 'sessionLength', 'userRegion'],
      minimal: ['intent', 'language', 'confidence', 'responseTime', 'researchUsed', 'sessionLength', 'userRegion', 'deviceType', 'timeOfDay']
    };

    // Initialize periodic aggregation
    this.initializeAggregation();
  }

  /**
   * Record healthcare interaction with privacy compliance
   * @param {Object} interactionData - Interaction data
   * @param {string} userId - User ID (will be anonymized)
   * @returns {Promise<void>}
   */
  async recordInteraction(interactionData, userId) {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Anonymize user data
      const anonymizedData = await this.anonymizeInteractionData(interactionData, userId);
      
      // Filter allowed fields based on privacy level
      const filteredData = this.filterDataByPrivacyLevel(anonymizedData);
      
      // Add metadata
      const recordData = {
        ...filteredData,
        timestamp: new Date().toISOString(),
        version: '2.0',
        privacyLevel: this.config.privacyLevel,
        expiresAt: new Date(Date.now() + (this.config.retentionDays * 24 * 60 * 60 * 1000)).toISOString()
      };

      // Store in database
      await this.database.recordHealthcareAnalytics(recordData);
      
      // Update in-memory metrics
      this.updateMetrics(recordData);
      
      // Send to Cloudflare Analytics if available
      if (this.env.ANALYTICS) {
        await this.sendToCloudflareAnalytics(recordData);
      }

      this.logger.debug('Healthcare interaction recorded', {
        intent: recordData.intent,
        language: recordData.language,
        privacyLevel: this.config.privacyLevel
      });

    } catch (error) {
      this.logger.error('Failed to record healthcare interaction', {
        error: error.message,
        intent: interactionData.intent
      });
    }
  }

  /**
   * Anonymize interaction data for privacy compliance
   * @param {Object} data - Original interaction data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Anonymized data
   */
  async anonymizeInteractionData(data, userId) {
    const anonymized = { ...data };

    if (this.config.anonymizationEnabled) {
      // Generate consistent anonymous ID
      anonymized.anonymousUserId = await this.generateAnonymousId(userId);
      
      // Remove any potentially identifying information
      delete anonymized.userId;
      delete anonymized.lineUserId;
      delete anonymized.displayName;
      delete anonymized.profilePicture;
      
      // Generalize location data
      if (anonymized.location) {
        anonymized.userRegion = this.generalizeLocation(anonymized.location);
        delete anonymized.location;
      }
      
      // Generalize temporal data
      if (anonymized.timestamp) {
        anonymized.timeOfDay = this.generalizeTimeOfDay(anonymized.timestamp);
        anonymized.dayOfWeek = new Date(anonymized.timestamp).getDay();
      }
      
      // Remove query content, keep only metadata
      if (anonymized.query) {
        anonymized.queryLength = anonymized.query.length;
        anonymized.queryLanguage = this.detectLanguage(anonymized.query);
        delete anonymized.query;
      }
      
      // Remove response content, keep only metadata
      if (anonymized.response) {
        anonymized.responseLength = anonymized.response.length;
        delete anonymized.response;
      }
    }

    return anonymized;
  }

  /**
   * Generate consistent anonymous ID for user
   * @param {string} userId - Original user ID
   * @returns {Promise<string>} Anonymous ID
   */
  async generateAnonymousId(userId) {
    if (!userId) return 'anonymous';
    
    // Use a salt to create consistent but anonymous IDs
    const salt = this.env.ANALYTICS_SALT || 'default-healthcare-salt';
    const combined = userId + salt;
    
    // Simple hash for consistency (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `anon_${Math.abs(hash).toString(36).substring(0, 12)}`;
  }

  /**
   * Filter data based on privacy level
   * @param {Object} data - Anonymized data
   * @returns {Object} Filtered data
   */
  filterDataByPrivacyLevel(data) {
    const allowedFields = this.allowedFields[this.config.privacyLevel] || this.allowedFields.strict;
    const filtered = {};
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        filtered[field] = data[field];
      }
    });
    
    // Always include required fields
    filtered.intent = data.intent || 'unknown';
    filtered.timestamp = data.timestamp;
    filtered.anonymousUserId = data.anonymousUserId;
    
    return filtered;
  }

  /**
   * Update in-memory metrics
   * @param {Object} recordData - Record data
   */
  updateMetrics(recordData) {
    // Update interaction count
    const today = new Date().toISOString().split('T')[0];
    this.metrics.interactions.set(today, (this.metrics.interactions.get(today) || 0) + 1);
    
    // Update intent distribution
    const intent = recordData.intent || 'unknown';
    this.metrics.intentDistribution.set(intent, (this.metrics.intentDistribution.get(intent) || 0) + 1);
    
    // Update quality metrics
    if (recordData.confidence !== undefined) {
      this.metrics.responseQuality.push({
        confidence: recordData.confidence,
        timestamp: recordData.timestamp,
        intent: intent
      });
      
      // Keep only recent quality metrics (last 1000)
      if (this.metrics.responseQuality.length > 1000) {
        this.metrics.responseQuality = this.metrics.responseQuality.slice(-1000);
      }
    }
    
    // Update engagement metrics
    if (recordData.anonymousUserId) {
      const userId = recordData.anonymousUserId;
      const current = this.metrics.userEngagement.get(userId) || { count: 0, lastSeen: null };
      this.metrics.userEngagement.set(userId, {
        count: current.count + 1,
        lastSeen: recordData.timestamp
      });
    }
    
    // Update research usage
    if (recordData.researchUsed !== undefined) {
      const key = recordData.researchUsed ? 'research_used' : 'knowledge_only';
      this.metrics.researchUsage.set(key, (this.metrics.researchUsage.get(key) || 0) + 1);
    }
  }

  /**
   * Send analytics to Cloudflare Analytics Engine
   * @param {Object} recordData - Record data
   */
  async sendToCloudflareAnalytics(recordData) {
    if (!this.env.ANALYTICS) {
      return;
    }

    try {
      await this.env.ANALYTICS.writeDataPoint({
        blobs: [
          recordData.intent || 'unknown',
          recordData.language || 'en',
          recordData.researchUsed ? 'research_used' : 'knowledge_only'
        ],
        doubles: [
          recordData.confidence || 0,
          recordData.responseTime || 0,
          recordData.queryLength || 0,
          recordData.responseLength || 0
        ],
        indexes: [
          recordData.privacyLevel || 'strict',
          recordData.userRegion || 'unknown',
          recordData.timeOfDay || 'unknown'
        ]
      });

    } catch (error) {
      this.logger.error('Failed to send to Cloudflare Analytics', {
        error: error.message
      });
    }
  }

  /**
   * Generate healthcare analytics report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Analytics report
   */
  async generateReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate = new Date(),
      includeDetails = false
    } = options;

    try {
      // Get aggregated data from database
      const rawData = await this.database.getHealthcareAnalytics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        privacyLevel: this.config.privacyLevel
      });

      // Generate summary statistics
      const summary = this.generateSummaryStatistics(rawData);
      
      // Generate trend analysis
      const trends = this.generateTrendAnalysis(rawData);
      
      // Generate intent analysis
      const intentAnalysis = this.generateIntentAnalysis(rawData);
      
      // Generate quality metrics
      const qualityMetrics = this.generateQualityMetrics(rawData);
      
      // Generate usage patterns
      const usagePatterns = this.generateUsagePatterns(rawData);

      const report = {
        reportId: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        privacyLevel: this.config.privacyLevel,
        summary,
        trends,
        intentAnalysis,
        qualityMetrics,
        usagePatterns
      };

      if (includeDetails) {
        report.detailedMetrics = this.generateDetailedMetrics(rawData);
      }

      this.logger.info('Healthcare analytics report generated', {
        reportId: report.reportId,
        recordCount: rawData.length,
        period: report.period.days
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate analytics report', {
        error: error.message
      });
      
      throw new Error('Analytics report generation failed');
    }
  }

  /**
   * Generate summary statistics
   * @param {Array} rawData - Raw analytics data
   * @returns {Object} Summary statistics
   */
  generateSummaryStatistics(rawData) {
    const totalInteractions = rawData.length;
    const uniqueUsers = new Set(rawData.map(r => r.anonymousUserId)).size;
    const averageConfidence = rawData.reduce((sum, r) => sum + (r.confidence || 0), 0) / totalInteractions;
    const averageResponseTime = rawData.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalInteractions;
    
    // Language distribution
    const languages = rawData.reduce((acc, r) => {
      const lang = r.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});

    // Research usage
    const researchUsed = rawData.filter(r => r.researchUsed).length;
    const researchUsageRate = totalInteractions > 0 ? (researchUsed / totalInteractions) * 100 : 0;

    return {
      totalInteractions,
      uniqueUsers,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      languageDistribution: languages,
      researchUsageRate: Math.round(researchUsageRate * 100) / 100,
      engagementRate: uniqueUsers > 0 ? Math.round((totalInteractions / uniqueUsers) * 100) / 100 : 0
    };
  }

  /**
   * Generate trend analysis
   * @param {Array} rawData - Raw analytics data
   * @returns {Object} Trend analysis
   */
  generateTrendAnalysis(rawData) {
    // Group by day
    const dailyData = rawData.reduce((acc, record) => {
      const day = record.timestamp.split('T')[0];
      if (!acc[day]) {
        acc[day] = {
          interactions: 0,
          totalConfidence: 0,
          totalResponseTime: 0,
          researchUsed: 0
        };
      }
      
      acc[day].interactions += 1;
      acc[day].totalConfidence += record.confidence || 0;
      acc[day].totalResponseTime += record.responseTime || 0;
      if (record.researchUsed) acc[day].researchUsed += 1;
      
      return acc;
    }, {});

    // Calculate daily averages
    const dailyTrends = Object.entries(dailyData).map(([date, data]) => ({
      date,
      interactions: data.interactions,
      averageConfidence: data.interactions > 0 ? data.totalConfidence / data.interactions : 0,
      averageResponseTime: data.interactions > 0 ? data.totalResponseTime / data.interactions : 0,
      researchUsageRate: data.interactions > 0 ? (data.researchUsed / data.interactions) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      dailyTrends,
      totalDays: dailyTrends.length,
      peakDay: dailyTrends.reduce((max, day) => 
        day.interactions > max.interactions ? day : max, dailyTrends[0] || {}
      )
    };
  }

  /**
   * Generate intent analysis
   * @param {Array} rawData - Raw analytics data
   * @returns {Object} Intent analysis
   */
  generateIntentAnalysis(rawData) {
    const intentStats = rawData.reduce((acc, record) => {
      const intent = record.intent || 'unknown';
      if (!acc[intent]) {
        acc[intent] = {
          count: 0,
          totalConfidence: 0,
          totalResponseTime: 0,
          researchUsed: 0
        };
      }
      
      acc[intent].count += 1;
      acc[intent].totalConfidence += record.confidence || 0;
      acc[intent].totalResponseTime += record.responseTime || 0;
      if (record.researchUsed) acc[intent].researchUsed += 1;
      
      return acc;
    }, {});

    const intentAnalysis = Object.entries(intentStats).map(([intent, stats]) => ({
      intent,
      count: stats.count,
      percentage: (stats.count / rawData.length) * 100,
      averageConfidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
      averageResponseTime: stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
      researchUsageRate: stats.count > 0 ? (stats.researchUsed / stats.count) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    return {
      intentDistribution: intentAnalysis,
      topIntent: intentAnalysis[0]?.intent || 'unknown',
      intentCount: intentAnalysis.length
    };
  }

  /**
   * Generate quality metrics
   * @param {Array} rawData - Raw analytics data
   * @returns {Object} Quality metrics
   */
  generateQualityMetrics(rawData) {
    const confidenceData = rawData.filter(r => r.confidence !== undefined);
    const responseTimeData = rawData.filter(r => r.responseTime !== undefined);

    // Confidence distribution
    const confidenceRanges = {
      'high (0.8-1.0)': confidenceData.filter(r => r.confidence >= 0.8).length,
      'medium (0.5-0.8)': confidenceData.filter(r => r.confidence >= 0.5 && r.confidence < 0.8).length,
      'low (0.0-0.5)': confidenceData.filter(r => r.confidence < 0.5).length
    };

    // Response time distribution
    const responseTimeRanges = {
      'fast (<5s)': responseTimeData.filter(r => r.responseTime < 5000).length,
      'medium (5-15s)': responseTimeData.filter(r => r.responseTime >= 5000 && r.responseTime < 15000).length,
      'slow (>15s)': responseTimeData.filter(r => r.responseTime >= 15000).length
    };

    return {
      confidenceDistribution: confidenceRanges,
      responseTimeDistribution: responseTimeRanges,
      averageConfidence: confidenceData.reduce((sum, r) => sum + r.confidence, 0) / confidenceData.length || 0,
      averageResponseTime: responseTimeData.reduce((sum, r) => sum + r.responseTime, 0) / responseTimeData.length || 0,
      highQualityRate: confidenceData.length > 0 ? (confidenceRanges['high (0.8-1.0)'] / confidenceData.length) * 100 : 0
    };
  }

  /**
   * Generate usage patterns analysis
   * @param {Array} rawData - Raw analytics data
   * @returns {Object} Usage patterns
   */
  generateUsagePatterns(rawData) {
    // Time of day analysis
    const hourlyUsage = rawData.reduce((acc, record) => {
      const hour = new Date(record.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    // Day of week analysis
    const dailyUsage = rawData.reduce((acc, record) => {
      const dayOfWeek = new Date(record.timestamp).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {});

    // Find peak usage times
    const peakHour = Object.entries(hourlyUsage).sort(([,a], [,b]) => b - a)[0];
    const peakDay = Object.entries(dailyUsage).sort(([,a], [,b]) => b - a)[0];

    return {
      hourlyDistribution: hourlyUsage,
      dailyDistribution: dailyUsage,
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} interactions)` : 'No data',
      peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]} interactions)` : 'No data'
    };
  }

  /**
   * Initialize periodic aggregation
   */
  initializeAggregation() {
    // In a real implementation, this would set up periodic tasks
    // For Workers, this could be handled by Cron Triggers
  }

  // Helper methods
  generalizeLocation(location) {
    // Generalize location to region level for privacy
    if (location.country) {
      return location.country;
    }
    return 'unknown';
  }

  generalizeTimeOfDay(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  detectLanguage(text) {
    const thaiPattern = /[\u0E00-\u0E7F]/;
    return thaiPattern.test(text) ? 'th' : 'en';
  }

  /**
   * Get current analytics statistics
   * @returns {Object} Current statistics
   */
  getCurrentStatistics() {
    return {
      interactions: Object.fromEntries(this.metrics.interactions),
      intentDistribution: Object.fromEntries(this.metrics.intentDistribution),
      averageConfidence: this.metrics.responseQuality.length > 0 
        ? this.metrics.responseQuality.reduce((sum, r) => sum + r.confidence, 0) / this.metrics.responseQuality.length
        : 0,
      activeUsers: this.metrics.userEngagement.size,
      researchUsage: Object.fromEntries(this.metrics.researchUsage),
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
}

export default HealthcareAnalyticsService;