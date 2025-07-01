/**
 * Healthcare Service
 * Provides HIV and STDs healthcare information in both English and Thai languages
 */

/**
 * Healthcare knowledge base organized by topics and languages
 */
const healthcareKnowledge = {
  en: {
    // Topic: Understanding HIV and STDs
    understanding: {
      hiv: 'HIV (Human Immunodeficiency Virus) is a virus that attacks the immune system, potentially leading to AIDS if untreated. It\'s transmitted through blood, sexual fluids, breast milk, or from mother to child during pregnancy/birth.',
      stds: 'Common STDs include chlamydia, gonorrhea, syphilis, herpes, HPV (human papillomavirus), and trichomoniasis. Each has unique symptoms, transmission methods, and treatments.',
      transmission: 'Most STDs spread through sexual contact (vaginal, anal, or oral), but some (like HIV and syphilis) can spread via blood or skin-to-skin contact.',
      symptoms: 'STD symptoms vary widely; some are asymptomatic. Common signs include unusual discharge, sores, pain, or itching in genital areas, but many require testing for confirmation.'
    },
    
    // Topic: Prevention
    prevention: {
      condoms: 'Correct and consistent use of latex or polyurethane condoms reduces risk of HIV and most STDs.',
      prep: 'PrEP (Pre-Exposure Prophylaxis) is a daily medication for HIV-negative individuals to prevent HIV infection, highly effective when taken as prescribed.',
      pep: 'PEP (Post-Exposure Prophylaxis) is an emergency medication taken within 72 hours of potential HIV exposure to prevent infection.',
      vaccines: 'Vaccines exist for HPV and hepatitis B, reducing risk of related STDs.',
      testing: 'Regular STD testing is recommended for sexually active individuals, especially those with new or multiple partners.',
      communication: 'Discussing sexual health and testing history with partners is essential for making informed decisions.'
    },
    
    // Topic: Testing and Diagnosis
    testing: {
      locations: 'Testing is available at clinics, hospitals, community health centers, or through at-home testing kits for HIV or some STDs.',
      process: 'Testing involves blood tests, urine samples, swabs, or physical exams, depending on the STD.',
      confidentiality: 'Testing is typically confidential; some regions offer anonymous HIV testing.',
      frequency: 'Annual testing is recommended for sexually active individuals; more frequent testing (every 3-6 months) is advised for those with higher risk factors.'
    },
    
    // Topic: Treatment and Management
    treatment: {
      hiv: 'HIV is managed with antiretroviral therapy (ART), which suppresses viral load and prevents progression to AIDS. It requires lifelong adherence under medical supervision.',
      bacterial: 'Bacterial STDs like chlamydia, gonorrhea, and syphilis are treatable with antibiotics. Follow-up testing ensures clearance.',
      viral: 'Viral STDs like herpes and HPV are managed (not cured) with medications to reduce symptoms or complications.',
      notification: 'It\'s essential to inform partners for testing/treatment to prevent reinfection or spread.',
      followup: 'Regular medical checkups are critical for monitoring and managing chronic conditions like HIV or herpes.'
    },
    
    // Topic: Support
    support: {
      counseling: 'Counseling is available for coping with diagnosis, stigma, or relationship concerns, offered by clinics or support groups.',
      groups: 'Online or in-person support groups exist for individuals with HIV/STDs to share experiences and reduce isolation.',
      stigma: 'Education helps counter myths about HIV and STDs, such as HIV not being spread through casual contact like hugging or sharing utensils.'
    },
    
    // Topic: When to Seek Help
    seekHelp: {
      symptoms: 'Any unusual genital symptoms, fever, or fatigue after potential exposure warrant immediate testing.',
      exposure: 'Unprotected sex, condom breakage, or sharing needles requires prompt consultation for PEP or testing.',
      checkups: 'Even without symptoms, regular STD screenings are advised for sexually active individuals.'
    },
    
    // Frequently Asked Questions
    faqs: {
      howToKnow: 'Many STDs are asymptomatic, so testing is the only way to confirm. Symptoms like discharge, sores, or pain should prompt a visit to a healthcare provider.',
      hivCure: 'No cure exists for HIV, but antiretroviral therapy (ART) allows people with HIV to live long, healthy lives with undetectable viral loads, reducing transmission risk.',
      prepSafety: 'PrEP is highly effective (>99% when taken daily) and safe for most people, though it requires medical monitoring for side effects.',
      testCost: 'Costs for STD tests vary, but many clinics offer free or low-cost testing. At-home kits are available but may cost more.',
      oralSex: 'Yes, STDs like herpes, gonorrhea, and syphilis can be transmitted through oral sex. Condoms or dental dams reduce risk.',
      positiveTest: 'If you test positive, consult a healthcare provider immediately for treatment options, inform recent partners, and seek counseling for emotional support.'
    },
    
    // Resources
    resources: {
      global: 'World Health Organization (www.who.int) provides guidelines on STD/HIV prevention and treatment.',
      us: 'CDC (www.cdc.gov/std) offers comprehensive information on testing, treatment, and prevention.',
      testing: 'Find testing locations at gettested.cdc.gov (U.S.) or through your local health department.',
      support: 'TheBody.com provides HIV support; Planned Parenthood (www.plannedparenthood.org) offers STD resources.',
      emergency: 'For PEP, contact a doctor or emergency room within 72 hours of potential HIV exposure.'
    },
    
    // Disclaimer
    disclaimer: 'This information is for educational purposes only and not intended as medical advice. Please consult healthcare professionals for diagnosis, treatment, or personal health concerns.'
  },
  
  th: {
    // Topic: Understanding HIV and STDs
    understanding: {
      hiv: 'HIV (เอชไอวี หรือ ไวรัสภูมิคุ้มกันบกพร่องของมนุษย์) เป็นไวรัสที่โจมตีระบบภูมิคุ้มกัน หากไม่ได้รับการรักษาอาจนำไปสู่โรคเอดส์ มันถูกส่งผ่านทางเลือด สารคัดหลั่งทางเพศ นมแม่ หรือจากแม่สู่ลูกระหว่างการตั้งครรภ์/คลอด',
      stds: 'โรคติดต่อทางเพศสัมพันธ์ (STDs) ที่พบบ่อย ได้แก่ คลามิเดีย หนองใน ซิฟิลิส เริม HPV (ไวรัสฮิวแมนแพปิลโลมา) และพยาธิช่องคลอด แต่ละโรคมีอาการ วิธีการแพร่เชื้อ และการรักษาที่แตกต่างกัน',
      transmission: 'โรคติดต่อทางเพศสัมพันธ์ส่วนใหญ่แพร่กระจายผ่านการสัมผัสทางเพศ (ทางช่องคลอด ทวารหนัก หรือปาก) แต่บางโรค (เช่น HIV และซิฟิลิส) สามารถแพร่ผ่านเลือดหรือการสัมผัสผิวหนังได้',
      symptoms: 'อาการของโรคติดต่อทางเพศสัมพันธ์มีความหลากหลาย บางคนอาจไม่แสดงอาการ อาการทั่วไปรวมถึงมีสารคัดหลั่งผิดปกติ แผล ปวด หรือคันในบริเวณอวัยวะเพศ แต่หลายโรคต้องการการตรวจเพื่อยืนยัน'
    },
    
    // Topic: Prevention
    prevention: {
      condoms: 'การใช้ถุงยางอนามัยลาเท็กซ์หรือโพลียูรีเทนอย่างถูกต้องและสม่ำเสมอช่วยลดความเสี่ยงของการติดเชื้อเอชไอวีและโรคติดต่อทางเพศสัมพันธ์ส่วนใหญ่ได้อย่างมีประสิทธิภาพ',
      prep: 'PrEP (ยาป้องกันก่อนการสัมผัสเชื้อ) เป็นยาที่รับประทานทุกวันสำหรับผู้ที่ไม่มีเชื้อเอชไอวี เพื่อป้องกันการติดเชื้อ การรับประทานอย่างสม่ำเสมอตามที่แพทย์กำหนดจะช่วยให้มีประสิทธิภาพสูงในการป้องกัน',
      pep: 'PEP (ยาป้องกันหลังการสัมผัสเชื้อ) เป็นยาฉุกเฉินที่ต้องรับประทานภายใน 72 ชั่วโมงหลังจากมีโอกาสสัมผัสเชื้อเอชไอวี เพื่อป้องกันการติดเชื้อ ควรปรึกษาบุคลากรทางการแพทย์โดยเร็วที่สุด',
      vaccines: 'มีวัคซีนสำหรับป้องกันโรคเอชพีวี (HPV) และไวรัสตับอักเสบบี ซึ่งช่วยลดความเสี่ยงของโรคติดต่อทางเพศสัมพันธ์ที่เกี่ยวข้องได้อย่างมีประสิทธิภาพ',
      testing: 'ขอแนะนำให้มีการตรวจโรคติดต่อทางเพศสัมพันธ์เป็นประจำสำหรับผู้ที่มีเพศสัมพันธ์ โดยเฉพาะผู้ที่มีคู่นอนใหม่หรือหลายคน การตรวจอย่างสม่ำเสมอเป็นส่วนสำคัญของการดูแลสุขภาพทางเพศ',
      communication: 'การพูดคุยเกี่ยวกับสุขภาพทางเพศและประวัติการตรวจกับคู่นอนเป็นสิ่งสำคัญในการตัดสินใจอย่างมีข้อมูลเพื่อการมีเพศสัมพันธ์ที่ปลอดภัย'
    },
    
    // Topic: Testing and Diagnosis
    testing: {
      locations: 'การตรวจมีให้บริการที่คลินิก โรงพยาบาล ศูนย์สุขภาพชุมชน หรือผ่านชุดตรวจที่บ้านสำหรับ HIV หรือโรคติดต่อทางเพศสัมพันธ์บางชนิด',
      process: 'การตรวจประกอบด้วยการตรวจเลือด ตัวอย่างปัสสาวะ การเก็บตัวอย่าง หรือการตรวจร่างกาย ขึ้นอยู่กับโรคติดต่อทางเพศสัมพันธ์',
      confidentiality: 'การตรวจมักเป็นความลับ บางพื้นที่เสนอการตรวจ HIV แบบไม่ระบุตัวตน',
      frequency: 'แนะนำให้ตรวจประจำปีสำหรับผู้ที่มีเพศสัมพันธ์ แนะนำให้ตรวจบ่อยขึ้น (ทุก 3-6 เดือน) สำหรับผู้ที่มีความเสี่ยงสูงกว่า'
    },
    
    // Topic: Treatment and Management
    treatment: {
      hiv: 'HIV จัดการด้วยยาต้านไวรัส (ART) ซึ่งกดไวรัสและป้องกันการพัฒนาไปสู่โรคเอดส์ ต้องใช้ยาตลอดชีวิตภายใต้การดูแลทางการแพทย์',
      bacterial: 'โรคติดต่อทางเพศสัมพันธ์จากแบคทีเรีย เช่น คลามิเดีย หนองใน และซิฟิลิส สามารถรักษาได้ด้วยยาปฏิชีวนะ ควรตรวจติดตามผลเพื่อให้แน่ใจว่าหายสนิท',
      viral: 'โรคติดต่อทางเพศสัมพันธ์จากไวรัส เช่น เริมและ HPV สามารถจัดการได้ (ไม่สามารถรักษาให้หายขาด) ด้วยยาเพื่อลดอาการหรือภาวะแทรกซ้อน',
      notification: 'เป็นสิ่งสำคัญที่ต้องแจ้งคู่นอนเพื่อการตรวจ/รักษาเพื่อป้องกันการติดเชื้อซ้ำหรือการแพร่กระจาย',
      followup: 'การตรวจสุขภาพทางการแพทย์เป็นประจำมีความสำคัญสำหรับการติดตามและจัดการกับโรคเรื้อรัง เช่น HIV หรือเริม'
    },
    
    // Topic: Support
    support: {
      counseling: 'มีบริการให้คำปรึกษาสำหรับการรับมือกับการวินิจฉัย ความรู้สึกอับอาย หรือความกังวลเกี่ยวกับความสัมพันธ์ โดยคลินิกหรือกลุ่มสนับสนุน',
      groups: 'มีกลุ่มสนับสนุนออนไลน์หรือพบปะตัวจริงสำหรับผู้ที่มี HIV/STDs เพื่อแบ่งปันประสบการณ์และลดความรู้สึกโดดเดี่ยว',
      stigma: 'การให้ความรู้ช่วยต่อต้านความเข้าใจผิดเกี่ยวกับ HIV และโรคติดต่อทางเพศสัมพันธ์ เช่น HIV ไม่แพร่ผ่านการสัมผัสทั่วไป เช่น การกอด หรือการใช้ภาชนะร่วมกัน'
    },
    
    // Topic: When to Seek Help
    seekHelp: {
      symptoms: 'อาการผิดปกติที่อวัยวะเพศ มีไข้ หรือเหนื่อยล้าหลังจากมีโอกาสสัมผัสเชื้อควรได้รับการตรวจทันที',
      exposure: 'การมีเพศสัมพันธ์โดยไม่ป้องกัน ถุงยางแตก หรือการใช้เข็มฉีดยาร่วมกันต้องได้รับคำปรึกษาทันทีสำหรับ PEP หรือการตรวจ',
      checkups: 'แม้ไม่มีอาการ แนะนำให้ตรวจคัดกรองโรคติดต่อทางเพศสัมพันธ์เป็นประจำสำหรับผู้ที่มีเพศสัมพันธ์'
    },
    
    // Frequently Asked Questions
    faqs: {
      howToKnow: 'โรคติดต่อทางเพศสัมพันธ์หลายชนิดไม่แสดงอาการ การตรวจเป็นวิธีเดียวที่จะยืนยันได้ อาการเช่นสารคัดหลั่งผิดปกติ แผล หรือปวดควรไปพบแพทย์ทันที',
      hivCure: 'ยังไม่มีวิธีรักษา HIV ให้หายขาด แต่การรักษาด้วยยาต้านไวรัส (ART) ช่วยให้ผู้ที่มีเชื้อ HIV มีชีวิตที่ยืนยาวและมีสุขภาพดี โดยมีปริมาณไวรัสต่ำจนตรวจไม่พบ ซึ่งลดความเสี่ยงในการแพร่เชื้อ',
      prepSafety: 'PrEP มีประสิทธิภาพสูง (>99% เมื่อทานทุกวัน) และปลอดภัยสำหรับคนส่วนใหญ่ แต่ต้องมีการติดตามทางการแพทย์สำหรับผลข้างเคียง',
      testCost: 'ค่าใช้จ่ายในการตรวจโรคติดต่อทางเพศสัมพันธ์แตกต่างกันไป แต่คลินิกหลายแห่งเสนอการตรวจฟรีหรือราคาถูก ชุดตรวจที่บ้านมีให้บริการแต่อาจมีราคาสูงกว่า',
      oralSex: 'ใช่ โรคติดต่อทางเพศสัมพันธ์เช่น เริม หนองใน และซิฟิลิสสามารถแพร่ผ่านการมีเพศสัมพันธ์ทางปากได้ ถุงยางอนามัยหรือแผ่นยางอนามัยช่วยลดความเสี่ยง',
      positiveTest: 'หากคุณตรวจพบเชื้อ ปรึกษาแพทย์ทันทีเพื่อรับทราบตัวเลือกในการรักษา แจ้งคู่นอนล่าสุด และขอคำปรึกษาเพื่อการสนับสนุนทางอารมณ์'
    },
    
    // Resources
    resources: {
      global: 'องค์การอนามัยโลก (www.who.int) ให้แนวทางเกี่ยวกับการป้องกันและรักษา STD/HIV',
      us: 'ศูนย์ควบคุมและป้องกันโรค (CDC) (www.cdc.gov/std) มีข้อมูลที่ครอบคลุมเกี่ยวกับการตรวจ การรักษา และการป้องกัน',
      testing: 'ค้นหาสถานที่ตรวจได้ที่ gettested.cdc.gov (สหรัฐฯ) หรือผ่านกรมอนามัยในท้องถิ่นของคุณ',
      support: 'TheBody.com ให้การสนับสนุนเกี่ยวกับ HIV Planned Parenthood (www.plannedparenthood.org) มีทรัพยากรเกี่ยวกับ STD',
      emergency: 'สำหรับ PEP ติดต่อแพทย์หรือห้องฉุกเฉินภายใน 72 ชั่วโมงหลังจากมีโอกาสสัมผัสเชื้อ HIV',
      thailand: 'กรมควบคุมโรค (ddc.moph.go.th) ให้ข้อมูลเกี่ยวกับการป้องกันและรักษาโรคติดต่อทางเพศสัมพันธ์ในประเทศไทย'
    },
    
    // Disclaimer
    disclaimer: 'ข้อมูลนี้มีไว้เพื่อวัตถุประสงค์ทางการศึกษาเท่านั้นและไม่ได้มีเจตนาเป็นคำแนะนำทางการแพทย์ โปรดปรึกษาผู้เชี่ยวชาญด้านการดูแลสุขภาพสำหรับการวินิจฉัย การรักษา หรือความกังวลเกี่ยวกับสุขภาพส่วนบุคคล'
  }
};

function isHealthcareQuery(message, lang) {
  const lowerMessage = message.toLowerCase();
  const healthcareKeywords = lang === 'th' ? [
    'hiv', 'เอชไอวี', 'prep', 'เปร็ป', 'pep', 'ผลเลือด', 'ตรวจเลือด', 'เป็นลบ', 'เป็นบวก', 'อาการแพ้'
  ] : [
    'hiv', 'prep', 'pep', 'blood test', 'negative', 'positive', 'side effect'
  ];
  return healthcareKeywords.some(keyword => lowerMessage.includes(keyword));
}

function detectHealthcareTopics(message, lang) {
  const topics = [];
  const lowerMessage = message.toLowerCase();
  if (/hiv|เอชไอวี/.test(lowerMessage)) {topics.push('hiv');}
  if (/prep|เปร็ป/.test(lowerMessage)) {topics.push('prep');}
  if (/pep/.test(lowerMessage)) {topics.push('pep');}
  if (/ผลเลือด|ตรวจเลือด|เป็นลบ|เป็นบวก/.test(lowerMessage)) {topics.push('blood_test');}
  return topics.length > 0 ? topics : [];
}

function getHealthcareResponse(query, lang = 'en') {
  // You can expand this logic as needed
  const knowledge = healthcareKnowledge[lang] || healthcareKnowledge.en;
  const lowerQuery = query.toLowerCase();

  // Example: If the query is about HIV, return the HIV info
  if (lowerQuery.includes('hiv')) {
    return lang === 'th'
      ? `ข้อมูลเกี่ยวกับเอชไอวี: ${knowledge.understanding.hiv}\n\n${knowledge.disclaimer}`
      : `About HIV: ${knowledge.understanding.hiv}\n\n${knowledge.disclaimer}`;
  }

  // Default: General info
  return lang === 'th'
    ? `ข้อมูลสุขภาพทั่วไป: ${knowledge.understanding.hiv}\n\n${knowledge.disclaimer}`
    : `General health info: ${knowledge.understanding.hiv}\n\n${knowledge.disclaimer}`;
}

module.exports = {
  isHealthcareQuery,
  getHealthcareResponse,
  healthcareKnowledge,
  detectHealthcareTopics
}; 