/**
 * Test script for the healthcare research functionality
 * 
 * Run with: node src/testResearch.js [healthcare query]
 */

const researchService = require('./services/researchService');
const healthcareService = require('./services/healthcareService');
const config = require('../config/config');

// Parse command line arguments
const args = process.argv.slice(2);
const query = args.join(' ') || 'HIV prevention methods';
// Simple Thai detection - if there are Thai characters in the text
const thaiPattern = /[\u0E00-\u0E7F]/;
const lang = thaiPattern.test(query) ? 'th' : 'en';

// Test the healthcare research functionality
async function testResearch() {
  console.log(`Testing healthcare research functionality with query: "${query}" (${lang})`);
  
  // Check if the query is healthcare related using both services
  const isHealthcareByResearch = researchService.isHealthcareQuery(query, lang);
  const isHealthcareByService = healthcareService.isHealthcareQuery(query, lang);
  const isHealthcare = isHealthcareByResearch || isHealthcareByService;
  
  console.log(`Is healthcare query (research service): ${isHealthcareByResearch}`);
  console.log(`Is healthcare query (healthcare service): ${isHealthcareByService}`);
  console.log(`Combined healthcare detection: ${isHealthcare}`);
  
  if (!isHealthcare) {
    console.log('Warning: This query may not be healthcare related. For best results, use healthcare-related queries.\n');
    console.log('Example queries: "HIV prevention", "diabetes symptoms", "vaccine safety", etc.');
  }
  
  console.log('Researching healthcare topic...');
  
  try {
    // Test healthcare response from healthcare service
    console.log('\nHealthcare service response:');
    console.log('--------------------------');
    const healthcareResponse = healthcareService.getHealthcareResponse(query, lang);
    console.log(healthcareResponse.substring(0, 200) + '... (truncated)');
    
    // Test research functionality
    console.log('\nResearch service response:');
    console.log('-------------------------');
    const researchResults = await researchService.researchTopic(query, lang);
    console.log(researchResults.substring(0, 200) + '... (truncated)');
  } catch (error) {
    console.error('Error during research test:', error);
  }
  
  console.log('\nTest completed.');
}

// Show server configuration
console.log('Server Configuration:', config.server);

// Run the test
testResearch(); 