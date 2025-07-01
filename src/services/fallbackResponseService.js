/**
 * Fallback Response Service
 * Provides fallback responses when AI generation fails
 */

// English fallback responses for general queries
const generalFallbackResponsesEN = [
  'I\'m sorry, I couldn\'t process your request at the moment. Could you try again later?',
  'I apologize, but I\'m having trouble understanding your question. Could you rephrase it?',
  'I\'m experiencing some technical difficulties. Please try again in a few moments.',
  'I couldn\'t generate a proper response right now. Please try asking in a different way.',
  'Sorry for the inconvenience, but I\'m unable to provide an answer at this time.'
];

// Thai fallback responses for general queries
const generalFallbackResponsesTH = [
  'ขออภัย ฉันไม่สามารถประมวลผลคำขอของคุณได้ในขณะนี้ คุณลองอีกครั้งในภายหลังได้ไหมคะ/ครับ?',
  'ขออภัย แต่ฉันกำลังมีปัญหาในการเข้าใจคำถามของคุณ คุณช่วยถามใหม่ได้ไหมคะ/ครับ?',
  'ฉันกำลังประสบปัญหาทางเทคนิคบางอย่าง โปรดลองอีกครั้งในอีกสักครู่นะคะ/ครับ',
  'ฉันไม่สามารถสร้างคำตอบที่เหมาะสมได้ในตอนนี้ โปรดลองถามด้วยวิธีอื่นคะ/ครับ',
  'ขออภัยในความไม่สะดวก แต่ฉันไม่สามารถให้คำตอบได้ในขณะนี้คะ/ครับ'
];

// English fallback responses for healthcare queries
const healthcareFallbackResponsesEN = [
  'I apologize, but I\'m unable to provide healthcare information at the moment. For accurate medical advice, please consult a healthcare professional.',
  'I\'m sorry, but I can\'t process your healthcare question right now. For health concerns, it\'s always best to speak with a qualified medical provider.',
  'For your health-related question, I recommend consulting with a healthcare professional who can provide personalized advice based on your specific situation.',
  'I\'m experiencing difficulties accessing healthcare information. For urgent health concerns, please contact a medical professional directly.',
  'I apologize for the inconvenience, but I cannot provide medical information at this time. Please consult with a healthcare provider for accurate guidance.'
];

// Thai fallback responses for healthcare queries
const healthcareFallbackResponsesTH = [
  'ขออภัย ฉันไม่สามารถให้ข้อมูลด้านสุขภาพได้ในขณะนี้ สำหรับคำแนะนำทางการแพทย์ที่ถูกต้อง โปรดปรึกษาบุคลากรทางการแพทย์คะ/ครับ',
  'ขออภัย แต่ฉันไม่สามารถประมวลผลคำถามด้านสุขภาพของคุณได้ในขณะนี้ สำหรับปัญหาสุขภาพ ควรปรึกษากับผู้ให้บริการทางการแพทย์ที่มีคุณสมบัติเหมาะสมคะ/ครับ',
  'สำหรับคำถามเกี่ยวกับสุขภาพของคุณ ฉันขอแนะนำให้ปรึกษากับบุคลากรทางการแพทย์ที่สามารถให้คำแนะนำส่วนบุคคลตามสถานการณ์เฉพาะของคุณคะ/ครับ',
  'ฉันกำลังประสบปัญหาในการเข้าถึงข้อมูลด้านสุขภาพ สำหรับปัญหาสุขภาพเร่งด่วน โปรดติดต่อบุคลากรทางการแพทย์โดยตรงคะ/ครับ',
  'ขออภัยในความไม่สะดวก แต่ฉันไม่สามารถให้ข้อมูลทางการแพทย์ได้ในขณะนี้ โปรดปรึกษากับผู้ให้บริการด้านสุขภาพเพื่อขอคำแนะนำที่ถูกต้องคะ/ครับ'
];

// Topic-specific fallback responses (English)
const topicFallbackResponsesEN = {
  hiv: [
    'For HIV-related questions, I recommend consulting with a healthcare provider who specializes in infectious diseases or sexual health.',
    'I apologize, but I can\'t provide specific HIV information at the moment. Please contact a healthcare professional for accurate guidance.',
    'For questions about HIV testing, prevention, or treatment, please speak with a qualified healthcare provider who can address your specific concerns.'
  ],
  std: [
    'For questions about sexually transmitted infections, I recommend speaking with a healthcare provider who can provide accurate information and testing options.',
    'I apologize, but I can\'t process your STI-related question right now. Please consult with a healthcare professional for proper guidance.',
    'For concerns about sexually transmitted infections, it\'s important to speak with a qualified healthcare provider who can offer personalized advice and testing options.'
  ],
  prep: [
    'For information about PrEP (Pre-Exposure Prophylaxis), please consult with a healthcare provider who can determine if it\'s appropriate for your situation.',
    'I apologize, but I can\'t provide specific PrEP information at the moment. Please speak with a healthcare professional who specializes in HIV prevention.',
    'For questions about PrEP, including eligibility, effectiveness, and side effects, please consult with a qualified healthcare provider.'
  ],
  testing: [
    'For information about HIV or STI testing, I recommend contacting a healthcare provider or local sexual health clinic for accurate guidance.',
    'I apologize, but I can\'t provide specific testing information at the moment. Please consult with a healthcare professional about your testing options.',
    'For questions about testing procedures, locations, or interpreting results, please speak with a qualified healthcare provider who can address your specific concerns.'
  ]
};

// Topic-specific fallback responses (Thai)
const topicFallbackResponsesTH = {
  hiv: [
    'สำหรับคำถามเกี่ยวกับเอชไอวี ฉันขอแนะนำให้ปรึกษากับผู้ให้บริการด้านสุขภาพที่เชี่ยวชาญด้านโรคติดเชื้อหรือสุขภาพทางเพศคะ/ครับ',
    'ขออภัย แต่ฉันไม่สามารถให้ข้อมูลเฉพาะเกี่ยวกับเอชไอวีได้ในขณะนี้ โปรดติดต่อบุคลากรทางการแพทย์เพื่อขอคำแนะนำที่ถูกต้องคะ/ครับ',
    'สำหรับคำถามเกี่ยวกับการตรวจเอชไอวี การป้องกัน หรือการรักษา โปรดปรึกษากับผู้ให้บริการด้านสุขภาพที่มีคุณสมบัติเหมาะสมซึ่งสามารถตอบข้อกังวลเฉพาะของคุณได้คะ/ครับ'
  ],
  std: [
    'สำหรับคำถามเกี่ยวกับโรคติดต่อทางเพศสัมพันธ์ ฉันขอแนะนำให้ปรึกษากับผู้ให้บริการด้านสุขภาพที่สามารถให้ข้อมูลที่ถูกต้องและทางเลือกในการตรวจคะ/ครับ',
    'ขออภัย แต่ฉันไม่สามารถประมวลผลคำถามเกี่ยวกับโรคติดต่อทางเพศสัมพันธ์ของคุณได้ในขณะนี้ โปรดปรึกษากับบุคลากรทางการแพทย์เพื่อขอคำแนะนำที่เหมาะสมคะ/ครับ',
    'สำหรับข้อกังวลเกี่ยวกับโรคติดต่อทางเพศสัมพันธ์ เป็นสิ่งสำคัญที่จะต้องปรึกษากับผู้ให้บริการด้านสุขภาพที่มีคุณสมบัติเหมาะสมซึ่งสามารถให้คำแนะนำส่วนบุคคลและทางเลือกในการตรวจคะ/ครับ'
  ],
  prep: [
    'สำหรับข้อมูลเกี่ยวกับ PrEP (การป้องกันก่อนการสัมผัสเชื้อ) โปรดปรึกษากับผู้ให้บริการด้านสุขภาพที่สามารถพิจารณาว่าเหมาะสมกับสถานการณ์ของคุณหรือไม่คะ/ครับ',
    'ขออภัย แต่ฉันไม่สามารถให้ข้อมูลเฉพาะเกี่ยวกับ PrEP ได้ในขณะนี้ โปรดปรึกษากับบุคลากรทางการแพทย์ที่เชี่ยวชาญด้านการป้องกันเอชไอวีคะ/ครับ',
    'สำหรับคำถามเกี่ยวกับ PrEP รวมถึงคุณสมบัติ ประสิทธิภาพ และผลข้างเคียง โปรดปรึกษากับผู้ให้บริการด้านสุขภาพที่มีคุณสมบัติเหมาะสมคะ/ครับ'
  ],
  testing: [
    'สำหรับข้อมูลเกี่ยวกับการตรวจเอชไอวีหรือโรคติดต่อทางเพศสัมพันธ์ ฉันขอแนะนำให้ติดต่อผู้ให้บริการด้านสุขภาพหรือคลินิกสุขภาพทางเพศในท้องถิ่นเพื่อขอคำแนะนำที่ถูกต้องคะ/ครับ',
    'ขออภัย แต่ฉันไม่สามารถให้ข้อมูลเฉพาะเกี่ยวกับการตรวจได้ในขณะนี้ โปรดปรึกษากับบุคลากรทางการแพทย์เกี่ยวกับทางเลือกในการตรวจของคุณคะ/ครับ',
    'สำหรับคำถามเกี่ยวกับขั้นตอนการตรวจ สถานที่ หรือการแปลผล โปรดปรึกษากับผู้ให้บริการด้านสุขภาพที่มีคุณสมบัติเหมาะสมซึ่งสามารถตอบข้อกังวลเฉพาะของคุณได้คะ/ครับ'
  ]
};

/**
 * Get a random fallback response based on language and context
 * @param {string} language - User language ('en' or 'th')
 * @param {string} userMessage - User's message for context detection
 * @returns {string} Fallback response
 */
const getFallbackResponse = (language = 'en', userMessage = '') => {
  // Default to English if language is not specified or invalid
  const isEnglish = language !== 'th';
  
  // Convert user message to lowercase for easier matching
  const lowerMessage = userMessage.toLowerCase();
  
  // Check if this is a healthcare-related query
  const isHealthcareQuery = isHealthcareRelated(lowerMessage);
  
  // If healthcare-related, try to get a topic-specific response first
  if (isHealthcareQuery) {
    const topicResponse = getTopicSpecificResponse(lowerMessage, isEnglish);
    if (topicResponse) {
      return topicResponse;
    }
    
    // If no topic-specific response, use general healthcare fallback
    const healthcareResponses = isEnglish ? healthcareFallbackResponsesEN : healthcareFallbackResponsesTH;
    return getRandomResponse(healthcareResponses);
  }
  
  // For non-healthcare queries, use general fallback
  const generalResponses = isEnglish ? generalFallbackResponsesEN : generalFallbackResponsesTH;
  return getRandomResponse(generalResponses);
};

/**
 * Check if a message is healthcare-related
 * @param {string} message - User message (lowercase)
 * @returns {boolean} True if healthcare-related
 */
const isHealthcareRelated = (message) => {
  const healthcareKeywords = [
    // English keywords
    'hiv', 'aids', 'std', 'sti', 'sexual', 'health', 'test', 'symptom', 'disease',
    'infection', 'treatment', 'prep', 'pep', 'condom', 'protection', 'clinic',
    'doctor', 'nurse', 'hospital', 'medicine', 'drug', 'prescription', 'therapy',
    'viral', 'bacteria', 'transmission', 'prevent', 'cure', 'diagnose',
    
    // Thai keywords
    'เอชไอวี', 'เอดส์', 'โรคติดต่อ', 'ทางเพศ', 'สุขภาพ', 'ตรวจ', 'อาการ', 'โรค',
    'ติดเชื้อ', 'การรักษา', 'พรีพ', 'เพ็พ', 'ถุงยาง', 'ป้องกัน', 'คลินิก',
    'หมอ', 'แพทย์', 'พยาบาล', 'โรงพยาบาล', 'ยา', 'ใบสั่งยา', 'บำบัด',
    'ไวรัส', 'แบคทีเรีย', 'การติดต่อ', 'ป้องกัน', 'รักษา', 'วินิจฉัย'
  ];
  
  return healthcareKeywords.some(keyword => message.includes(keyword));
};

/**
 * Get a topic-specific response based on message content
 * @param {string} message - User message (lowercase)
 * @param {boolean} isEnglish - Whether to use English responses
 * @returns {string|null} Topic-specific response or null if no match
 */
const getTopicSpecificResponse = (message, isEnglish) => {
  const topicResponses = isEnglish ? topicFallbackResponsesEN : topicFallbackResponsesTH;
  
  // Check for HIV-related keywords
  if (message.includes('hiv') || message.includes('เอชไอวี') || 
      message.includes('aids') || message.includes('เอดส์')) {
    return getRandomResponse(topicResponses.hiv);
  }
  
  // Check for STD/STI-related keywords
  if (message.includes('std') || message.includes('sti') || 
      message.includes('โรคติดต่อทางเพศ') || message.includes('กามโรค')) {
    return getRandomResponse(topicResponses.std);
  }
  
  // Check for PrEP-related keywords
  if (message.includes('prep') || message.includes('พรีพ') || 
      message.includes('pre-exposure') || message.includes('ป้องกันก่อน')) {
    return getRandomResponse(topicResponses.prep);
  }
  
  // Check for testing-related keywords
  if (message.includes('test') || message.includes('ตรวจ') || 
      message.includes('screening') || message.includes('คัดกรอง')) {
    return getRandomResponse(topicResponses.testing);
  }
  
  // No specific topic match
  return null;
};

/**
 * Get a random response from an array of responses
 * @param {Array<string>} responses - Array of possible responses
 * @returns {string} Random response
 */
const getRandomResponse = (responses) => {
  if (!responses || responses.length === 0) {
    return 'I\'m sorry, I\'m unable to provide a response at this time.';
  }
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
};

/**
 * Log failed API calls for analysis
 * @param {string} userId - User ID
 * @param {string} query - User's message
 * @param {Error} error - Error object
 */
const logFailedApiCall = (userId, query, error) => {
  const now = new Date().toISOString();
  console.error(`[${now}] API Failure - User: ${userId}, Query: "${query}", Error: ${error.message}`);
  
  // Here you could add MongoDB logging or external service logging
};

// Export the functions
module.exports = {
  getFallbackResponse,
  logFailedApiCall
};