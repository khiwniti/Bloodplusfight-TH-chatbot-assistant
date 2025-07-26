/**
 * Enhanced Healthcare Service for HIV/STDs Information
 * Specialized medical information service with privacy compliance and research capabilities
 */

import { DatabaseService } from './database.js';
import { Logger } from '../utils/logger.js';
import { PerformanceOptimizer } from '../utils/performance.js';

export class EnhancedHealthcareService {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseService(env);
    this.logger = new Logger(env);
    this.performance = new PerformanceOptimizer(env);
    
    // Healthcare configuration
    this.config = {
      enableResearch: env.ENABLE_HEALTHCARE_RESEARCH === 'true',
      researchTimeout: parseInt(env.HEALTHCARE_RESEARCH_TIMEOUT || '10000'),
      maxResearchResults: parseInt(env.HEALTHCARE_MAX_RESULTS || '5'),
      enableAnalytics: env.ENABLE_HEALTHCARE_ANALYTICS === 'true',
      privacyMode: env.HEALTHCARE_PRIVACY_MODE || 'strict'
    };

    // Medical knowledge base - HIV/STDs focused
    this.medicalKnowledgeBase = {
      hiv: {
        overview: {
          en: {
            definition: "HIV (Human Immunodeficiency Virus) is a virus that attacks the immune system, specifically CD4+ T cells. Without treatment, HIV can lead to AIDS.",
            transmission: "HIV is transmitted through blood, semen, vaginal fluids, rectal fluids, and breast milk.",
            prevention: "Use condoms, PrEP (pre-exposure prophylaxis), regular testing, and avoid sharing needles.",
            symptoms: "Early symptoms may include fever, fatigue, swollen lymph nodes, and flu-like symptoms."
          },
          th: {
            definition: "เอชไอวี คือไวรัสที่ทำลายระบบภูมิคุ้มกันของร่างกาย โดยเฉพาะเซลล์ CD4+ หากไม่ได้รับการรักษาอาจพัฒนาเป็นเอดส์",
            transmission: "เอชไอวีติดต่อผ่านเลือด น้ำอสุจิ น้ำหล่อลื่นช่องคลอด น้ำหล่อลื่นทวารหนัก และน้ำนมแม่",
            prevention: "ใช้ถุงยางอนามัย ทาน PrEP ตรวจเลือดเป็นประจำ และหลีกเลี่ยงการใช้เข็มร่วมกัน",
            symptoms: "อาการแรกเริ่มอาจมีไข้ เหนื่อยล้า ต่อมน้ำเหลืองโต และอาการคล้ายไข้หวัดใหญ่"
          }
        },
        testing: {
          en: {
            types: "HIV tests include antibody tests, antigen tests, and nucleic acid tests (NAT).",
            timing: "Window period varies: 10-33 days for NAT, 18-45 days for antigen tests, 23-90 days for antibody tests.",
            locations: "Testing available at hospitals, clinics, community health centers, and some pharmacies.",
            frequency: "Annual testing recommended for sexually active individuals, more frequent for high-risk groups."
          },
          th: {
            types: "การตรวจเอชไอวีมี 3 ประเภท: ตรวจหาแอนติบอดี้ ตรวจหาแอนติเจน และตรวจหาสารพันธุกรรม",
            timing: "ช่วงหน้าต่าง: 10-33 วันสำหรับการตรวจสารพันธุกรรม 18-45 วันสำหรับแอนติเจน 23-90 วันสำหรับแอนติบอดี้",
            locations: "ตรวจได้ที่โรงพยาบาล คลินิก ศูนย์สุขภาพชุมชน และร้านขายยาบางแห่ง",
            frequency: "แนะนำให้ตรวจปีละครั้งสำหรับผู้ที่มีเพศสัมพันธ์ กลุ่มเสี่ยงสูงควรตรวจบ่อยกว่า"
          }
        },
        treatment: {
          en: {
            art: "Antiretroviral therapy (ART) is highly effective. Modern HIV treatment can help people live normal lifespans.",
            adherence: "Taking HIV medications exactly as prescribed is crucial for treatment success.",
            monitoring: "Regular monitoring includes viral load tests, CD4 counts, and medication side effects.",
            undetectable: "Undetectable = Untransmittable (U=U): When viral load is undetectable, HIV cannot be transmitted sexually."
          },
          th: {
            art: "การรักษาด้วยยาต้านไวรัส (ART) มีประสิทธิภาพสูง ผู้ติดเชื้อสามารถมีอายุขัยปกติได้",
            adherence: "การทานยาตามที่แพทย์สั่งอย่างเคร่งครัดเป็นสิ่งสำคัญสำหรับความสำเร็จของการรักษา",
            monitoring: "การติดตามรวมถึงการตรวจปริมาณไวรัส จำนวนเซลล์ CD4 และผลข้างเคียงของยา",
            undetectable: "ตรวจไม่พบ = ไม่ติดต่อ (U=U): เมื่อปริมาณไวรัสตรวจไม่พบ เอชไอวีจะไม่ติดต่อทางเพศสัมพันธ์"
          }
        },
        prep: {
          en: {
            definition: "Pre-exposure prophylaxis (PrEP) is medicine taken to prevent HIV infection.",
            effectiveness: "PrEP is 99% effective at preventing HIV from sex when taken as prescribed.",
            candidates: "Recommended for people at high risk: multiple partners, partner with HIV, injection drug users.",
            monitoring: "Requires regular HIV testing, kidney function tests, and STD screening."
          },
          th: {
            definition: "PrEP คือยาที่ทานเพื่อป้องกันการติดเชื้อเอชไอวี",
            effectiveness: "PrEP มีประสิทธิภาพ 99% ในการป้องกันเอชไอวีจากเพศสัมพันธ์เมื่อทานตามแพทย์สั่ง",
            candidates: "แนะนำสำหรับกลุ่มเสี่ยงสูง: มีคู่นอนหลายคน คู่นอนติดเอชไอวี ผู้ใช้ยาเสพติดฉีด",
            monitoring: "ต้องตรวจเอชไอวี ตรวจไต และตรวจโรคติดต่อทางเพศสัมพันธ์เป็นประจำ"
          }
        }
      },
      stds: {
        common_stds: {
          en: {
            chlamydia: "Most common bacterial STD. Often asymptomatic. Curable with antibiotics.",
            gonorrhea: "Bacterial infection affecting genitals, rectum, throat. May be drug-resistant.",
            syphilis: "Bacterial infection with stages. Highly contagious in early stages. Curable with penicillin.",
            herpes: "Viral infection causing sores. HSV-1 (oral) and HSV-2 (genital). Manageable but not curable.",
            hpv: "Human papillomavirus. Some types cause genital warts, others can cause cancer."
          },
          th: {
            chlamydia: "โรคติดต่อทางเพศสัมพันธ์จากแบคทีเรียที่พบบ่อยที่สุด มักไม่มีอาการ รักษาหายได้ด้วยยาปฏิชีวนะ",
            gonorrhea: "การติดเชื้อแบคทีเรียที่อวัยวะเพศ ทวารหนัก คอ อาจดื้อยา",
            syphilis: "การติดเชื้อแบคทีเรียที่มีหลายระยะ ติดต่อได้ง่ายในระยะแรก รักษาหายได้ด้วยเพนิซิลิน",
            herpes: "การติดเชื้อไวรัสที่ทำให้เกิดแผล HSV-1 (ปาก) และ HSV-2 (อวัยวะเพศ) ควบคุมได้แต่รักษาไม่หาย",
            hpv: "ไวรัสบางชนิดทำให้เกิดหูดที่อวัยวะเพศ บางชนิดอาจทำให้เกิดมะเร็ง"
          }
        },
        prevention: {
          en: {
            condoms: "Male and female condoms are highly effective at preventing most STDs.",
            testing: "Regular STD testing helps detect infections early, even when asymptomatic.",
            vaccination: "HPV and Hepatitis B vaccines available for prevention.",
            communication: "Open communication with partners about sexual health and testing history."
          },
          th: {
            condoms: "ถุงยางอนามัยชายและหญิงมีประสิทธิภาพสูงในการป้องกันโรคติดต่อทางเพศสัมพันธ์",
            testing: "การตรวจโรคติดต่อทางเพศสัมพันธ์เป็นประจำช่วยตรวจพบการติดเชื้อตั้งแต่เริ่มต้น",
            vaccination: "มีวัคซีน HPV และไวรัสตับอักเสบบีสำหรับการป้องกัน",
            communication: "การสื่อสารที่เปิดเผยกับคู่นอนเกี่ยวกับสุขภาพทางเพศและประวัติการตรวจ"
          }
        }
      },
      sexual_health: {
        safe_practices: {
          en: {
            preparation: "Discuss sexual health, get tested together, use protection consistently.",
            protection: "Use condoms or dental dams for all sexual activities including oral sex.",
            hygiene: "Good personal hygiene before and after sexual activity.",
            substances: "Avoid alcohol/drugs that impair judgment about safe sex practices."
          },
          th: {
            preparation: "หารือเรื่องสุขภาพทางเพศ ตรวจร่วมกัน ใช้ความคุ้มครองอย่างสม่ำเสมอ",
            protection: "ใช้ถุงยางอนามัยหรือแผ่นยางสำหรับกิจกรรมทางเพศทุกประเภทรวมถึงการมีเพศสัมพันธ์ทางปาก",
            hygiene: "รักษาความสะอาดส่วนตัวให้ดีก่อนและหลังมีเพศสัมพันธ์",
            substances: "หลีกเลี่ยงแอลกอฮอล์/ยาเสพติดที่ทำให้ตัดสินใจผิดพลาดเรื่องเซ็กส์ที่ปลอดภัย"
          }
        }
      }
    };

    // Trusted medical sources for research
    this.trustedSources = [
      'who.int',
      'cdc.gov',
      'nih.gov',
      'mayoclinic.org',
      'webmd.com',
      'healthline.com',
      'plannedparenthood.org',
      'aidsinfo.nih.gov',
      'thaiddc.ddc.moph.go.th',
      'bangkok.usembassy.gov'
    ];

    // Healthcare intent patterns
    this.healthcareIntents = {
      hiv_general: {
        keywords: {
          en: ['hiv', 'aids', 'human immunodeficiency virus', 'cd4', 'viral load'],
          th: ['เอชไอวี', 'เอดส์', 'ไวรัสเอชไอวี', 'ซีดี4', 'ปริมาณไวรัส']
        },
        confidence: 0.9
      },
      hiv_testing: {
        keywords: {
          en: ['hiv test', 'hiv testing', 'window period', 'rapid test', 'elisa'],
          th: ['ตรวจเอชไอวี', 'การตรวจเอชไอวี', 'ช่วงหน้าต่าง', 'ตรวจเร็ว', 'อีไลซ่า']
        },
        confidence: 0.95
      },
      hiv_treatment: {
        keywords: {
          en: ['art', 'antiretroviral', 'hiv treatment', 'hiv medication', 'undetectable'],
          th: ['ยาต้านไวรัส', 'การรักษาเอชไอวี', 'ยาเอชไอวี', 'ตรวจไม่พบ']
        },
        confidence: 0.9
      },
      prep: {
        keywords: {
          en: ['prep', 'pre-exposure prophylaxis', 'truvada', 'descovy', 'prevent hiv'],
          th: ['เพรพ', 'การป้องกันก่อนสัมผัส', 'ป้องกันเอชไอวี']
        },
        confidence: 0.95
      },
      std_general: {
        keywords: {
          en: ['std', 'sti', 'sexually transmitted', 'venereal disease', 'sexual health'],
          th: ['โรคติดต่อทางเพศ', 'โรคกามโรค', 'สุขภาพทางเพศ']
        },
        confidence: 0.85
      },
      std_symptoms: {
        keywords: {
          en: ['discharge', 'burning urination', 'genital sores', 'itching', 'std symptoms'],
          th: ['ตกขาว', 'ปวดปัสสาวะ', 'แผลอวัยวะเพศ', 'คัน', 'อาการโรคติดต่อทางเพศ']
        },
        confidence: 0.9
      }
    };

    // Privacy and compliance settings
    this.privacySettings = {
      anonymizeData: true,
      logRetentionDays: 30,
      encryptSensitiveData: true,
      requireConsent: true,
      dataMinimization: true
    };
  }

  /**
   * Main healthcare query handler
   * @param {string} query - User's healthcare query
   * @param {Object} context - Request context
   * @returns {Object} Healthcare response
   */
  async handleHealthcareQuery(query, context = {}) {
    const startTime = Date.now();
    const requestId = context.requestId || crypto.randomUUID();
    
    return await this.performance.monitor('healthcare_query', async () => {
      try {
        // Privacy consent check
        if (!await this.checkPrivacyConsent(context.userId)) {
          return this.generateConsentRequest(context.language || 'en');
        }

        // Classify healthcare intent
        const intent = this.classifyHealthcareIntent(query, context.language || 'en');
        
        this.logger.info('Healthcare query classified', {
          requestId,
          intent: intent.type,
          confidence: intent.confidence,
          userId: this.maskUserId(context.userId)
        });

        // Get knowledge base response
        const knowledgeResponse = await this.getKnowledgeBaseResponse(
          intent,
          query,
          context
        );

        // Enhanced response with research if enabled and needed
        let enhancedResponse = knowledgeResponse;
        if (this.config.enableResearch && intent.confidence < 0.8) {
          try {
            const researchResults = await this.performMedicalResearch(
              query,
              context.language || 'en'
            );
            
            if (researchResults && researchResults.length > 0) {
              enhancedResponse = this.combineKnowledgeAndResearch(
                knowledgeResponse,
                researchResults,
                context
              );
            }
          } catch (researchError) {
            this.logger.warn('Medical research failed', {
              requestId,
              error: researchError.message
            });
          }
        }

        // Add medical disclaimer
        const finalResponse = this.addMedicalDisclaimer(
          enhancedResponse,
          context.language || 'en'
        );

        // Log healthcare interaction (anonymized)
        if (this.config.enableAnalytics) {
          await this.logHealthcareInteraction({
            intent: intent.type,
            confidence: intent.confidence,
            responseType: 'knowledge_base',
            researchUsed: enhancedResponse !== knowledgeResponse,
            language: context.language || 'en',
            processingTime: Date.now() - startTime,
            anonymizedUserId: this.anonymizeUserId(context.userId)
          });
        }

        return {
          response: finalResponse,
          metadata: {
            intent: intent.type,
            confidence: intent.confidence,
            source: 'healthcare_service',
            researchEnhanced: enhancedResponse !== knowledgeResponse,
            processingTime: Date.now() - startTime,
            disclaimer: true
          }
        };

      } catch (error) {
        this.logger.error('Healthcare query processing failed', {
          requestId,
          error: error.message,
          stack: error.stack
        });

        return {
          response: this.getErrorResponse(context.language || 'en'),
          metadata: {
            error: true,
            intent: 'error',
            source: 'healthcare_service'
          }
        };
      }
    });
  }

  /**
   * Classify healthcare intent from user query
   * @param {string} query - User query
   * @param {string} language - Query language
   * @returns {Object} Intent classification
   */
  classifyHealthcareIntent(query, language) {
    const lowerQuery = query.toLowerCase();
    let bestMatch = { type: 'general_health', confidence: 0.5 };

    for (const [intentType, intentData] of Object.entries(this.healthcareIntents)) {
      const keywords = intentData.keywords[language] || intentData.keywords.en;
      const matches = keywords.filter(keyword => 
        lowerQuery.includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        const confidence = (matches.length / keywords.length) * intentData.confidence;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type: intentType,
            confidence: Math.min(confidence, 1.0),
            matchedKeywords: matches
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get response from medical knowledge base
   * @param {Object} intent - Classified intent
   * @param {string} query - Original query
   * @param {Object} context - Request context
   * @returns {string} Knowledge base response
   */
  async getKnowledgeBaseResponse(intent, query, context) {
    const language = context.language || 'en';
    
    try {
      switch (intent.type) {
        case 'hiv_general':
          return this.formatMedicalResponse(
            this.medicalKnowledgeBase.hiv.overview[language],
            'HIV Overview',
            language
          );

        case 'hiv_testing':
          return this.formatMedicalResponse(
            this.medicalKnowledgeBase.hiv.testing[language],
            'HIV Testing Information',
            language
          );

        case 'hiv_treatment':
          return this.formatMedicalResponse(
            this.medicalKnowledgeBase.hiv.treatment[language],
            'HIV Treatment Information',
            language
          );

        case 'prep':
          return this.formatMedicalResponse(
            this.medicalKnowledgeBase.hiv.prep[language],
            'PrEP Information',
            language
          );

        case 'std_general':
          return this.formatMedicalResponse(
            this.medicalKnowledgeBase.stds.common_stds[language],
            'STDs Information',
            language
          );

        case 'std_symptoms':
          return this.formatSymptomResponse(query, language);

        default:
          return this.getGeneralHealthResponse(query, language);
      }
    } catch (error) {
      this.logger.error('Knowledge base query failed', {
        intent: intent.type,
        error: error.message
      });
      
      return this.getFallbackResponse(language);
    }
  }

  /**
   * Perform medical research using trusted sources
   * @param {string} query - Medical query
   * @param {string} language - Query language
   * @returns {Array} Research results
   */
  async performMedicalResearch(query, language) {
    if (!this.config.enableResearch) {
      return [];
    }

    return await this.performance.monitor('medical_research', async () => {
      try {
        const searchQueries = this.generateMedicalSearchQueries(query, language);
        const researchPromises = searchQueries.map(searchQuery =>
          this.searchTrustedMedicalSources(searchQuery, language)
        );

        const results = await Promise.allSettled(researchPromises);
        const validResults = results
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => result.value)
          .flat()
          .slice(0, this.config.maxResearchResults);

        return this.rankMedicalSources(validResults, query);

      } catch (error) {
        this.logger.error('Medical research failed', {
          error: error.message,
          query: query.substring(0, 100)
        });
        return [];
      }
    });
  }

  /**
   * Search trusted medical sources
   * @param {string} searchQuery - Search query
   * @param {string} language - Language code
   * @returns {Array} Search results
   */
  async searchTrustedMedicalSources(searchQuery, language) {
    const searchPromises = this.trustedSources.map(async (source) => {
      try {
        const searchUrl = this.buildMedicalSearchUrl(source, searchQuery, language);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.researchTimeout);

        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'LINE-Healthcare-Bot/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        return this.extractMedicalContent(html, source, searchQuery);

      } catch (error) {
        this.logger.debug(`Medical source search failed: ${source}`, {
          error: error.message
        });
        return null;
      }
    });

    const results = await Promise.allSettled(searchPromises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);
  }

  /**
   * Format medical response with proper structure
   * @param {Object} content - Medical content
   * @param {string} title - Response title
   * @param {string} language - Language code
   * @returns {string} Formatted response
   */
  formatMedicalResponse(content, title, language) {
    if (!content) {
      return this.getFallbackResponse(language);
    }

    const sections = Object.entries(content).map(([key, value]) => {
      const sectionTitle = this.formatSectionTitle(key, language);
      return `**${sectionTitle}**\n${value}`;
    }).join('\n\n');

    const header = language === 'th' 
      ? `🏥 **${title}**\n\n`
      : `🏥 **${title}**\n\n`;

    return header + sections;
  }

  /**
   * Add medical disclaimer to response
   * @param {string} response - Medical response
   * @param {string} language - Language code
   * @returns {string} Response with disclaimer
   */
  addMedicalDisclaimer(response, language) {
    const disclaimers = {
      en: "\n\n⚠️ **Medical Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Always consult with a healthcare provider for medical concerns, diagnosis, or treatment decisions.",
      th: "\n\n⚠️ **ข้อจำกัดความรับผิดชอบทางการแพทย์**: ข้อมูลนี้มีไว้เพื่อการศึกษาเท่านั้น ไม่ควรใช้แทนคำแนะนำทางการแพทย์จากผู้เชี่ยวชาญ กรุณาปรึกษาแพทย์เสมอสำหรับปัญหาสุขภาพ การวินิจฉัย หรือการตัดสินใจรักษา"
    };

    return response + (disclaimers[language] || disclaimers.en);
  }

  /**
   * Check user privacy consent for healthcare data
   * @param {string} userId - User ID
   * @returns {boolean} Consent status
   */
  async checkPrivacyConsent(userId) {
    if (!this.privacySettings.requireConsent) {
      return true;
    }

    try {
      const consent = await this.database.getHealthcareConsent(userId);
      return consent && consent.granted && !consent.expired;
    } catch (error) {
      this.logger.error('Privacy consent check failed', {
        error: error.message,
        userId: this.maskUserId(userId)
      });
      return false;
    }
  }

  /**
   * Generate privacy consent request
   * @param {string} language - Language code
   * @returns {Object} Consent request response
   */
  generateConsentRequest(language) {
    const consentMessages = {
      en: "🔒 **Privacy Notice**\n\nTo provide healthcare information, I need your consent to process health-related data. This information will be:\n\n• Used only to provide medical information\n• Anonymized for analytics\n• Deleted after 30 days\n• Never shared with third parties\n\nReply 'I consent' to continue with healthcare queries, or ask about other topics.",
      th: "🔒 **ประกาศความเป็นส่วนตัว**\n\nเพื่อให้ข้อมูลด้านสุขภาพ ผมต้องขอความยินยอมจากคุณในการประมวลผลข้อมูลสุขภาพ ข้อมูลนี้จะ:\n\n• ใช้เฉพาะการให้ข้อมูลทางการแพทย์\n• ทำให้ไม่สามารถระบุตัวตนได้สำหรับการวิเคราะห์\n• ลบทิ้งหลังจาก 30 วัน\n• ไม่แบ่งปันกับบุคคลที่สาม\n\nตอบ 'ยินยอม' เพื่อดำเนินการถามเรื่องสุขภาพต่อ หรือถามเรื่องอื่นได้"
    };

    return {
      response: consentMessages[language] || consentMessages.en,
      metadata: {
        requiresConsent: true,
        type: 'privacy_consent'
      }
    };
  }

  /**
   * Log healthcare interaction for analytics
   * @param {Object} interactionData - Interaction data
   */
  async logHealthcareInteraction(interactionData) {
    if (!this.config.enableAnalytics) {
      return;
    }

    try {
      await this.database.logHealthcareAnalytics({
        ...interactionData,
        timestamp: new Date().toISOString(),
        version: '2.0'
      });

      // Also log to Cloudflare Analytics if available
      if (this.env.ANALYTICS) {
        await this.env.ANALYTICS.writeDataPoint({
          blobs: [
            interactionData.intent,
            interactionData.language,
            interactionData.responseType
          ],
          doubles: [
            interactionData.confidence,
            interactionData.processingTime
          ],
          indexes: [
            interactionData.researchUsed ? 'research_used' : 'knowledge_only'
          ]
        });
      }

    } catch (error) {
      this.logger.error('Healthcare analytics logging failed', {
        error: error.message
      });
    }
  }

  /**
   * Anonymize user ID for privacy compliance
   * @param {string} userId - Original user ID
   * @returns {string} Anonymized user ID
   */
  anonymizeUserId(userId) {
    if (!userId) return 'anonymous';
    
    // Create a consistent hash of the user ID
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + this.env.ANONYMIZATION_SALT || 'default-salt');
    
    // Simple hash (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  maskUserId(userId) {
    if (!userId || userId.length < 8) return 'unknown';
    return userId.substring(0, 5) + '***' + userId.substring(userId.length - 3);
  }

  // Additional helper methods would be implemented here
  // (Shortened for brevity - full implementation would include all helper methods)

  getFallbackResponse(language) {
    const fallbacks = {
      en: "I'd be happy to help with your healthcare question. Could you please provide more specific details about what you'd like to know?",
      th: "ผมยินดีที่จะช่วยตอบคำถามด้านสุขภาพของคุณ กรุณาให้รายละเอียดที่เจาะจงมากขึ้นเกี่ยวกับสิ่งที่คุณต้องการทราบ"
    };

    return fallbacks[language] || fallbacks.en;
  }

  getErrorResponse(language) {
    const errors = {
      en: "I'm sorry, I'm having trouble accessing healthcare information right now. Please try again later or consult with a healthcare professional for immediate concerns.",
      th: "ขออภัยครับ ขณะนี้ผมมีปัญหาในการเข้าถึงข้อมูลสุขภาพ กรุณาลองใหม่ภายหลัง หรือปรึกษาผู้เชี่ยวชาญด้านสุขภาพหากมีความกังวลเร่งด่วน"
    };

    return errors[language] || errors.en;
  }

  /**
   * Get service statistics for monitoring
   * @returns {Object} Service statistics
   */
  getStatistics() {
    return {
      config: {
        researchEnabled: this.config.enableResearch,
        analyticsEnabled: this.config.enableAnalytics,
        privacyMode: this.config.privacyMode
      },
      trustedSourcesCount: this.trustedSources.length,
      intentTypesSupported: Object.keys(this.healthcareIntents).length,
      knowledgeBaseTopics: Object.keys(this.medicalKnowledgeBase).length,
      timestamp: new Date().toISOString()
    };
  }
}

export default EnhancedHealthcareService;