/**
 * Healthcare Chatbot Query Testing Script
 * Tests various healthcare queries with the deployed chatbot
 */

const NGROK_URL = process.env.NGROK_URL || 'https://your-ngrok-url.ngrok-free.app';

// Test healthcare queries in multiple languages
const healthcareTestCases = [
  // HIV-related queries (English)
  {
    query: 'What is HIV and how does it affect the immune system?',
    language: 'en',
    expectedIntent: 'hiv_general',
    category: 'HIV Information'
  },
  {
    query: 'How long is the window period for HIV testing?',
    language: 'en',
    expectedIntent: 'hiv_testing',
    category: 'HIV Testing'
  },
  {
    query: 'What are the latest HIV treatment options available?',
    language: 'en',
    expectedIntent: 'hiv_treatment',
    category: 'HIV Treatment'
  },
  
  // HIV-related queries (Thai)
  {
    query: 'เอชไอวีคืออะไร และมีผลต่อระบบภูมิคุ้มกันอย่างไร',
    language: 'th',
    expectedIntent: 'hiv_general',
    category: 'ข้อมูลเอชไอวี'
  },
  {
    query: 'การตรวจเอชไอวีมีช่วงหน้าต่างนานแค่ไหน',
    language: 'th',
    expectedIntent: 'hiv_testing',
    category: 'การตรวจเอชไอวี'
  },
  {
    query: 'ยารักษาเอชไอวีแบบใหม่มีอะไรบ้าง',
    language: 'th',
    expectedIntent: 'hiv_treatment',
    category: 'การรักษาเอชไอวี'
  },
  
  // PrEP queries
  {
    query: 'What is PrEP and who should consider taking it?',
    language: 'en',
    expectedIntent: 'prep',
    category: 'PrEP Information'
  },
  {
    query: 'PrEP คืออะไร และใครควรพิจารณาใช้',
    language: 'th',
    expectedIntent: 'prep',
    category: 'ข้อมูล PrEP'
  },
  
  // STD/STI queries
  {
    query: 'What are the most common sexually transmitted infections?',
    language: 'en',
    expectedIntent: 'std_general',
    category: 'STD Information'
  },
  {
    query: 'โรคติดต่อทางเพศสัมพันธ์ที่พบบ่อยมีอะไรบ้าง',
    language: 'th',
    expectedIntent: 'std_general',
    category: 'ข้อมูลโรคติดต่อทางเพศ'
  },
  {
    query: 'I have symptoms like burning during urination, what should I do?',
    language: 'en',
    expectedIntent: 'std_symptoms',
    category: 'STD Symptoms'
  },
  {
    query: 'มีอาการปวดปัสสาวะ ควรทำอย่างไร',
    language: 'th',
    expectedIntent: 'std_symptoms',
    category: 'อาการโรคติดต่อทางเพศ'
  },
  
  // Sexual health queries
  {
    query: 'What are the best practices for safe sex?',
    language: 'en',
    expectedIntent: 'sexual_health',
    category: 'Sexual Health'
  },
  {
    query: 'การมีเพศสัมพันธ์ที่ปลอดภัยควรปฏิบัติอย่างไร',
    language: 'th',
    expectedIntent: 'sexual_health',
    category: 'สุขภาพทางเพศ'
  },
  
  // Edge cases and complex queries
  {
    query: 'Can HIV be transmitted through oral sex and what are the risks?',
    language: 'en',
    expectedIntent: 'hiv_general',
    category: 'Complex HIV Query'
  },
  {
    query: 'If my partner is HIV positive but undetectable, can I get infected?',
    language: 'en',
    expectedIntent: 'hiv_treatment',
    category: 'U=U Information'
  }
];

/**
 * Send test query to healthcare chatbot
 */
async function testHealthcareQuery(testCase) {
  try {
    const webhookPayload = {
      events: [{
        type: 'message',
        message: {
          type: 'text',
          text: testCase.query
        },
        source: {
          type: 'user',
          userId: `test-user-${Date.now()}`
        },
        replyToken: `test-reply-${Date.now()}`,
        timestamp: Date.now()
      }]
    };

    const response = await fetch(`${NGROK_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LINE-Webhook/1.0'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = {
      query: testCase.query,
      language: testCase.language,
      category: testCase.category,
      expectedIntent: testCase.expectedIntent,
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      timestamp: new Date().toISOString()
    };

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      const errorText = await response.text();
      result.errorDetails = errorText;
    }

    return result;

  } catch (error) {
    return {
      query: testCase.query,
      language: testCase.language,
      category: testCase.category,
      expectedIntent: testCase.expectedIntent,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
  try {
    console.log('🔍 Testing health endpoint...');
    
    const response = await fetch(`${NGROK_URL}/health`);
    const healthData = await response.json();
    
    if (response.ok && healthData.status === 'healthy') {
      console.log('✅ Health endpoint working');
      console.log('📊 Service info:', JSON.stringify(healthData, null, 2));
      return true;
    } else {
      console.log('❌ Health endpoint failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    return false;
  }
}

/**
 * Run all healthcare tests
 */
async function runHealthcareTests() {
  console.log('🏥 Starting Healthcare Chatbot Testing...');
  console.log(`📡 Testing against: ${NGROK_URL}`);
  console.log(`📋 Total test cases: ${healthcareTestCases.length}`);
  console.log('');

  // Test health endpoint first
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('🛑 Health check failed - aborting tests');
    return;
  }
  
  console.log('');
  console.log('🧪 Running healthcare query tests...');
  console.log('');

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < healthcareTestCases.length; i++) {
    const testCase = healthcareTestCases[i];
    
    console.log(`[${i + 1}/${healthcareTestCases.length}] Testing: ${testCase.category}`);
    console.log(`   Query: "${testCase.query.substring(0, 50)}${testCase.query.length > 50 ? '...' : ''}"`);
    console.log(`   Language: ${testCase.language}, Expected Intent: ${testCase.expectedIntent}`);
    
    const result = await testHealthcareQuery(testCase);
    results.push(result);
    
    if (result.status === 'success') {
      console.log(`   ✅ SUCCESS (${result.statusCode})`);
      successCount++;
    } else {
      console.log(`   ❌ FAILED: ${result.error || 'Unknown error'}`);
      failureCount++;
    }
    
    console.log('');
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate test report
  console.log('📊 Healthcare Testing Summary:');
  console.log('================================');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📈 Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  console.log('');

  // Breakdown by language
  const englishTests = results.filter(r => r.language === 'en');
  const thaiTests = results.filter(r => r.language === 'th');
  
  console.log('🌐 Language Breakdown:');
  console.log(`English: ${englishTests.filter(r => r.status === 'success').length}/${englishTests.length} success`);
  console.log(`Thai: ${thaiTests.filter(r => r.status === 'success').length}/${thaiTests.length} success`);
  console.log('');

  // Breakdown by category
  const categories = [...new Set(results.map(r => r.category))];
  console.log('📋 Category Breakdown:');
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
    console.log(`${category}: ${categorySuccess}/${categoryResults.length} success`);
  });
  console.log('');

  // Show failures in detail
  const failures = results.filter(r => r.status !== 'success');
  if (failures.length > 0) {
    console.log('❌ Detailed Failure Analysis:');
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.category} (${failure.language})`);
      console.log(`   Query: "${failure.query}"`);
      console.log(`   Error: ${failure.error}`);
      if (failure.errorDetails) {
        console.log(`   Details: ${failure.errorDetails.substring(0, 200)}...`);
      }
      console.log('');
    });
  }

  // Save detailed results
  const reportData = {
    summary: {
      totalTests: results.length,
      successful: successCount,
      failed: failureCount,
      successRate: ((successCount / results.length) * 100).toFixed(1),
      timestamp: new Date().toISOString(),
      testUrl: NGROK_URL
    },
    results: results
  };

  // Write results to file
  const fs = require('fs');
  const reportFilename = `healthcare-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportFilename}`);
  console.log('🏥 Healthcare testing completed!');
}

// Run tests if called directly
if (require.main === module) {
  // Check if NGROK_URL is set
  if (!process.env.NGROK_URL || process.env.NGROK_URL.includes('your-ngrok-url')) {
    console.log('❌ Please set NGROK_URL environment variable');
    console.log('Example: export NGROK_URL=https://abc123.ngrok-free.app');
    process.exit(1);
  }
  
  runHealthcareTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runHealthcareTests, testHealthcareQuery, healthcareTestCases };