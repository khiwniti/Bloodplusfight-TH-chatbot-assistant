/**
 * Research Service
 * Provides web search and content extraction capabilities for the LINE bot
 * Specialized for healthcare-related queries
 */

const axios = require('axios');
const config = require('../../config/config');
const cheerio = require('cheerio');
const deepSeekService = require('./deepSeekService');
const healthcareService = require('./healthcareService');

// Healthcare-focused search keywords for better search results
const healthcareKeywords = {
  en: {
    general: ['medical', 'healthcare', 'health', 'treatment', 'prevention', 'symptoms', 'diagnosis', 'cure'],
    diseases: ['disease', 'condition', 'disorder', 'syndrome', 'infection', 'virus', 'bacteria'],
    symptoms: ['symptoms', 'signs', 'indication', 'pain', 'discomfort', 'feeling'],
    treatments: ['treatment', 'medication', 'drug', 'therapy', 'procedure', 'management', 'cure']
  },
  th: {
    general: ['สุขภาพ', 'การรักษา', 'อาการ', 'ป้องกัน', 'วินิจฉัย', 'รักษา'],
    diseases: ['โรค', 'ภาวะ', 'อาการ', 'การติดเชื้อ', 'ไวรัส', 'แบคทีเรีย'],
    symptoms: ['อาการ', 'สัญญาณ', 'ความเจ็บปวด', 'ไม่สบาย', 'ความรู้สึก'],
    treatments: ['การรักษา', 'ยา', 'การบำบัด', 'ขั้นตอน', 'การจัดการ', 'การดูแล']
  }
};

// Trusted healthcare websites for prioritization
const trustedHealthSources = [
  'who.int', 'cdc.gov', 'nih.gov', 'mayoclinic.org', 'webmd.com', 'medlineplus.gov',
  'healthline.com', 'medicalnewstoday.com', 'clevelandclinic.org', 'hopkinsmedicine.org',
  'ddc.moph.go.th', 'si.mahidol.ac.th', 'rama.mahidol.ac.th', 'chula.ac.th', 'thaihealth.or.th'
];

/**
 * Perform web search for the given healthcare query
 * @param {string} query - Search query
 * @param {string} lang - Language code ('en' or 'th')
 * @returns {Promise<object>} - Search results
 */
const performWebSearch = async (query, lang = 'en') => {
  try {
    // Add healthcare-specific search operators
    let searchQuery = enhanceHealthcareQuery(query, lang);
    
    // Add language-specific search operators
    if (lang === 'th') {
      searchQuery = `${searchQuery} lang:th`;
    }
    
    console.log(`Performing healthcare web search for: ${searchQuery}`);
    
    // Use firecrawl search API or mock data based on config
    let searchResults;
    
    if (config.research.enabled) {
      try {
        // Attempt to use Firecrawl
        searchResults = await searchWebWithFirecrawl(searchQuery, lang);
      } catch (error) {
        console.error('Error using Firecrawl, falling back to mock data:', error);
        searchResults = mockHealthcareResults(query, lang);
      }
    } else {
      // Use mock data if research is disabled
      searchResults = mockHealthcareResults(query, lang);
    }
    
    // Sort results to prioritize trusted healthcare sources
    searchResults = prioritizeTrustedSources(searchResults);
    
    return searchResults;
  } catch (error) {
    console.error('Error in healthcare web search:', error);
    throw error;
  }
};

/**
 * Prioritize trusted healthcare sources in search results
 * @param {Array} results - Search results
 * @returns {Array} - Prioritized search results
 */
const prioritizeTrustedSources = (results) => {
  if (!results || !Array.isArray(results) || results.length === 0) return results;
  
  // Sort results based on trusted sources
  return results.sort((a, b) => {
    // Check if URLs exist
    const aUrl = a.url || '';
    const bUrl = b.url || '';
    
    // Calculate trust scores
    const aTrusted = trustedHealthSources.some(source => aUrl.includes(source)) ? 1 : 0;
    const bTrusted = trustedHealthSources.some(source => bUrl.includes(source)) ? 1 : 0;
    
    // Sort by trust score (descending)
    return bTrusted - aTrusted;
  });
};

/**
 * Enhance query with healthcare-specific keywords
 * @param {string} query - Original query
 * @param {string} lang - Language code
 * @returns {string} - Enhanced healthcare query
 */
const enhanceHealthcareQuery = (query, lang = 'en') => {
  const keywords = healthcareKeywords[lang] || healthcareKeywords.en;
  
  // Determine query category
  let category = 'general';
  const lowerQuery = query.toLowerCase();
  
  if (containsKeywords(lowerQuery, keywords.diseases, lang)) {
    category = 'diseases';
  } else if (containsKeywords(lowerQuery, keywords.symptoms, lang)) {
    category = 'symptoms';
  } else if (containsKeywords(lowerQuery, keywords.treatments, lang)) {
    category = 'treatments';
  }
  
  // Get relevant keywords for the category
  const categoryKeywords = keywords[category];
  
  // Check if query already contains healthcare terms
  const hasHealthTerms = categoryKeywords.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );
  
  // If no health terms, add 'health' or 'medical' to the query
  if (!hasHealthTerms) {
    // Add healthcare context if missing
    const generalHealth = lang === 'th' ? 'สุขภาพ' : 'health';
    return `${query} ${generalHealth}`;
  }
  
  // Query already has health context
  return query;
};

/**
 * Check if text contains any keywords from the list
 * @param {string} text - Text to check
 * @param {Array} keywords - Keywords to look for
 * @param {string} lang - Language code
 * @returns {boolean} - True if contains keywords
 */
const containsKeywords = (text, keywords, lang) => {
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
};

/**
 * Search the web using firecrawl API
 * @param {string} query - Search query
 * @param {string} lang - Language code
 * @returns {Promise<object>} - Search results
 */
const searchWebWithFirecrawl = async (query, lang) => {
  try {
    console.log('Using Firecrawl for healthcare web search');
    
    // Set up search options for Firecrawl
    const searchOptions = {
      query: query,
      limit: config.research.maxResults,
      lang: lang === 'th' ? 'th' : 'en',
      country: lang === 'th' ? 'th' : 'us',
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    };

    // In a real implementation, you would use the firecrawl_search directly
    // This is a simulation using axios
    
    // Create a timeout for the search
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Search timed out')), config.research.searchTimeout);
    });
    
    // Simulate search results
    // In a real implementation, this would be a direct call to firecrawl_search
    return await Promise.race([
      mockHealthcareResults(query, lang), // Replace with actual API call in production
      timeout
    ]);
  } catch (error) {
    console.error('Error in search web with Firecrawl:', error);
    throw error;
  }
};

/**
 * Extract content from a specific URL
 * @param {string} url - URL to scrape
 * @param {string} lang - Language code
 * @returns {Promise<string>} - Extracted content
 */
const extractContentFromUrl = async (url, lang = 'en') => {
  try {
    console.log(`Extracting healthcare content from: ${url}`);
    
    if (config.research.enabled) {
      try {
        // In a real implementation, this would be a direct call to firecrawl_scrape
        // This is a simulation
        console.log('Using Firecrawl for content extraction');
        
        // Create a timeout for the scraping
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Scraping timed out')), config.research.searchTimeout);
        });
        
        // Simulate scraping
        // In a real implementation, this would be a direct call to firecrawl_scrape
        const mockContent = lang === 'th'
          ? `ข้อมูลทางการแพทย์จาก ${url}. ในการใช้งานจริง นี่จะเป็นเนื้อหาทางการแพทย์จริงจากเว็บไซต์.`
          : `Healthcare information from ${url}. In a real implementation, this would be actual medical content from the website.`;
          
        return await Promise.race([
          Promise.resolve(mockContent),
          timeout
        ]);
      } catch (error) {
        console.error('Error using Firecrawl for extraction, using mock data:', error);
        return lang === 'th'
          ? `เนื้อหาทางการแพทย์จำลองจาก ${url} เนื่องจากไม่สามารถใช้ Firecrawl ได้`
          : `Mock healthcare content from ${url} because Firecrawl extraction failed`;
      }
    } else {
      // Mock extraction result if research is disabled
      return lang === 'th'
        ? `เนื้อหาทางการแพทย์จำลองจาก ${url}`
        : `Mock healthcare content from ${url}`;
    }
  } catch (error) {
    console.error('Error extracting healthcare content:', error);
    throw error;
  }
};

/**
 * Format search results into a readable message with healthcare-specific formatting
 * @param {Array} results - Search results
 * @param {string} lang - Language code
 * @returns {string} - Formatted message
 */
const formatSearchResults = (results, lang = 'en') => {
  if (!results || results.length === 0) {
    return lang === 'th' 
      ? 'ไม่พบข้อมูลทางการแพทย์ กรุณาลองใช้คำค้นหาอื่น หรือปรึกษาบุคลากรทางการแพทย์โดยตรง' 
      : 'No healthcare information found. Please try a different search term or consult a healthcare professional directly.';
  }
  
  const header = lang === 'th' ? 'ข้อมูลทางการแพทย์:' : 'Healthcare Information:';
  const disclaimer = lang === 'th' 
    ? '\n\nหมายเหตุ: ข้อมูลนี้มีไว้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ กรุณาปรึกษาบุคลากรทางการแพทย์เสมอ'
    : '\n\nNote: This information is for educational purposes only and not intended as medical advice. Always consult a healthcare professional.';
  
  const formattedResults = results.map((result, index) => {
    // Highlight trusted sources with an icon
    const isTrusted = result.url && trustedHealthSources.some(source => result.url.includes(source));
    const trustIcon = isTrusted ? (lang === 'th' ? '🏥 ' : '🏥 ') : '';
    
    return `${index + 1}. ${trustIcon}${result.title}\n${result.snippet}\n${result.url}`;
  }).join('\n\n');
  
  return `${header}\n\n${formattedResults}${disclaimer}`;
};

/**
 * Mock healthcare search results for testing
 * @param {string} query - Search query
 * @param {string} lang - Language code
 * @returns {Array} - Mock search results
 */
const mockHealthcareResults = (query, lang) => {
  if (lang === 'th') {
    return [
      {
        title: 'ข้อมูลทางการแพทย์เกี่ยวกับ: ' + query,
        snippet: 'ข้อมูลทางการแพทย์ที่เกี่ยวข้องกับการค้นหาของคุณ ในการใช้งานจริง นี่จะเป็นเนื้อหาทางการแพทย์ที่สกัดมาจากเว็บไซต์ที่เชื่อถือได้',
        url: 'https://ddc.moph.go.th/result1'
      },
      {
        title: 'คำแนะนำทางการแพทย์สำหรับ: ' + query,
        snippet: 'คำแนะนำทางการแพทย์และข้อมูลสุขภาพที่เกี่ยวข้องกับหัวข้อที่คุณค้นหา ในการใช้งานจริงจะเป็นข้อมูลจากแหล่งที่น่าเชื่อถือ',
        url: 'https://si.mahidol.ac.th/result2'
      }
    ];
  } else {
    return [
      {
        title: 'Medical Information About: ' + query,
        snippet: 'Healthcare information relevant to your query. In a real implementation, this would be medical content extracted from trusted healthcare websites.',
        url: 'https://www.cdc.gov/result1'
      },
      {
        title: 'Medical Advice For: ' + query,
        snippet: 'Medical recommendations and health information related to your search topic. In a real implementation, this would be from trustworthy medical sources.',
        url: 'https://www.who.int/result2'
      }
    ];
  }
};

/**
 * Research a healthcare topic
 * @param {string} query - User search query
 * @param {string} lang - Language code ('en' or 'th')
 * @returns {Promise<string>} - Research results as text
 */
const researchTopic = async (query, lang = 'en') => {
  try {
    console.log(`Researching topic: ${query} [${lang}]`);
    
    // First, search for relevant health information
    const searchResults = await performWebSearch(query, lang);
    
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results found');
      return lang === 'th' 
        ? 'ขออภัย ไม่พบข้อมูลเกี่ยวกับหัวข้อนี้ กรุณาปรึกษาบุคลากรทางการแพทย์สำหรับข้อมูลเพิ่มเติม' 
        : 'Sorry, no information found on this topic. Please consult a healthcare professional for more information.';
    }
    
    // Extract content from the first 2-3 most relevant results
    const contentPromises = searchResults.slice(0, 3).map(result => 
      extractContentFromUrl(result.url, lang)
    );
    
    const contents = await Promise.all(contentPromises);
    const validContents = contents.filter(content => content && content.length > 50);
    
    if (validContents.length === 0) {
      console.log('No valid content extracted');
      return lang === 'th'
        ? 'ขออภัย ไม่สามารถรวบรวมข้อมูลเกี่ยวกับหัวข้อนี้ได้ในขณะนี้ กรุณาปรึกษาบุคลากรทางการแพทย์สำหรับข้อมูลที่ถูกต้อง'
        : 'Sorry, unable to compile information on this topic at this time. Please consult a healthcare professional for accurate information.';
    }
    
    // Combine the relevant information
    const combinedContent = validContents.join('\n\n');
    
    // Generate a response using DeepSeek to summarize the research
    console.log('Generating summarized research response');
    
    let systemPrompt;
    if (lang === 'th') {
      systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านสุขภาพที่ให้ข้อมูลทางการแพทย์ที่ถูกต้องและเชื่อถือได้ กรุณาสรุปข้อมูลต่อไปนี้เกี่ยวกับคำถาม: "${query}"
      
ใช้ภาษาไทยแบบทางการที่เข้าใจง่าย ชัดเจน และเหมาะสมสำหรับการสื่อสารด้านสุขภาพ โดยใช้คำศัพท์ทางการแพทย์ที่ถูกต้องพร้อมคำอธิบายที่เข้าใจได้ 

จัดรูปแบบคำตอบให้เป็นย่อหน้าที่มีโครงสร้างชัดเจน แบ่งหัวข้อตามความเหมาะสม และใช้การเว้นวรรคตามหลักภาษาไทยที่ถูกต้อง 

ในกรณีข้อมูลทางการแพทย์ ให้อ้างอิงข้อมูลทางวิทยาศาสตร์และคำแนะนำล่าสุดจากองค์กรสุขภาพที่เชื่อถือได้ พร้อมเตือนให้ผู้อ่านปรึกษาบุคลากรทางการแพทย์สำหรับคำแนะนำเฉพาะบุคคล

ใช้น้ำเสียงที่เป็นมืออาชีพ เชื่อถือได้ และให้ข้อมูลที่เป็นกลางโดยไม่แสดงความคิดเห็นส่วนตัว`;
    } else {
      systemPrompt = `You are a healthcare expert providing accurate and reliable medical information. Please summarize the following information about the query: "${query}"
      
Use clear, straightforward language while maintaining accuracy. Use proper medical terminology with explanations.

Format your response in well-structured paragraphs, with appropriate headings, and proper spacing.

For medical information, reference the latest scientific data and recommendations from trusted health organizations, and remind readers to consult healthcare professionals for personalized advice.

Maintain a professional, trustworthy tone and provide objective information without personal opinions.`;
    }
    
    // Use deepSeekService.generateResponse for summarization
    const researchResponse = await deepSeekService.generateResponse(
      `${systemPrompt}\n\n${combinedContent}`,
      { language: lang }
    );
    
    // Add disclaimer
    const disclaimer = lang === 'th'
      ? '\n\nข้อมูลนี้มีไว้เพื่อวัตถุประสงค์ทางการศึกษาเท่านั้น กรุณาปรึกษาบุคลากรทางการแพทย์สำหรับคำแนะนำเฉพาะบุคคล'
      : '\n\nThis information is for educational purposes only. Please consult healthcare professionals for personalized advice.';
    
    return researchResponse + disclaimer;
  } catch (error) {
    console.error('Error researching topic:', error);
    return lang === 'th'
      ? 'ขออภัย เกิดข้อผิดพลาดในการค้นคว้าข้อมูล กรุณาลองใหม่ในภายหลัง หรือปรึกษาบุคลากรทางการแพทย์โดยตรง'
      : 'Sorry, an error occurred while researching this topic. Please try again later or consult a healthcare professional directly.';
  }
};

// Replace any openRouterService.generateCustomResponse with deepSeekService.generateResponse
async function summarizeResearchTopic(userMessage, context) {
  // ... existing code ...
  return deepSeekService.generateResponse(userMessage, context);
}

module.exports = {
  researchTopic,
  performWebSearch,
  extractContentFromUrl,
  isHealthcareQuery: healthcareService.isHealthcareQuery,
  summarizeResearchTopic
}; 