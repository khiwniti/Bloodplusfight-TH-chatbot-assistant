#!/bin/bash

# Healthcare Chatbot Testing Setup with ngrok
# This script sets up local testing environment with ngrok tunnel

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NGROK_AUTHTOKEN="2xkslEhOciEmIBwpsCtNlaJImff_2boeAAJBE5FKjNgY5snjA"
HEALTHCARE_TEST_PORT=8787
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}\")\" && pwd)"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites for healthcare chatbot testing..."
    
    # Check if ngrok is installed
    if ! command -v ngrok &> /dev/null; then
        log_error "ngrok not found. Installing ngrok..."
        
        # Install ngrok based on OS
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
            echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
            sudo apt update && sudo apt install ngrok
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install ngrok/ngrok/ngrok
        else
            log_error "Please install ngrok manually: https://ngrok.com/download"
            exit 1
        fi
    fi
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI not found. Install with: npm install -g wrangler"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Install Node.js 18+ first"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Setup ngrok authentication
setup_ngrok() {
    log_info "Setting up ngrok authentication..."
    
    # Add authtoken to ngrok
    ngrok config add-authtoken "$NGROK_AUTHTOKEN"
    
    log_info "ngrok authentication configured"
}

# Setup healthcare test environment
setup_test_environment() {
    log_info "Setting up healthcare test environment..."
    
    # Install dependencies if not already installed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing Node.js dependencies..."
        npm install
    fi
    
    # Create test environment file
    cat > .env.test << EOF
# Healthcare Chatbot Test Environment
NODE_ENV=test
ENVIRONMENT=development

# LINE Bot Test Configuration
CHANNEL_ACCESS_TOKEN=test-channel-access-token
CHANNEL_SECRET=test-channel-secret

# AI Services Test Configuration
DEEPSEEK_API_KEY=test-deepseek-key
OPENROUTER_API_KEY=test-openrouter-key

# Healthcare Configuration
ENABLE_HEALTHCARE_RESEARCH=true
HEALTHCARE_RESEARCH_TIMEOUT=15000
HEALTHCARE_MAX_RESULTS=5
ENABLE_HEALTHCARE_ANALYTICS=true
HEALTHCARE_PRIVACY_MODE=strict
HEALTHCARE_RETENTION_DAYS=30
HEALTHCARE_ANONYMIZATION=true

# Medical Research Configuration
MEDICAL_RESEARCH_TIMEOUT=15000
MEDICAL_MAX_RESULTS=5
MEDICAL_CONCURRENT_REQUESTS=3
ENABLE_MEDICAL_CACHE=true
MEDICAL_CACHE_TTL=7200

# Security Configuration
ANALYTICS_SALT=test-analytics-salt-$(date +%s)
ANONYMIZATION_SALT=test-anonymization-salt-$(date +%s)
WEBHOOK_SECRET=test-webhook-secret-$(date +%s)
ADMIN_API_KEY=test-admin-key-$(date +%s)

# Test Database Configuration
DATABASE_URL=test-database.db
EOF

    log_info "Test environment configured"
}

# Initialize test database
setup_test_database() {
    log_info "Setting up test database for healthcare features..."
    
    # Create local test database
    if [[ ! -f "test-healthcare.db" ]]; then
        log_info "Creating test database with healthcare schema..."
        
        # Combine all migration files for local testing
        cat migrations/0001_initial_schema.sql migrations/0002_analytics_schema.sql migrations/0003_healthcare_schema.sql > combined_schema.sql
        
        # Create SQLite database (simulating D1 for local testing)
        sqlite3 test-healthcare.db < combined_schema.sql
        
        log_info "Test database created with healthcare schema"
        rm combined_schema.sql
    else
        log_info "Test database already exists"
    fi
}

# Create test webhook handler
create_test_handler() {
    log_info "Creating local test webhook handler..."
    
    cat > test-webhook-server.js << 'EOF'
/**
 * Local Test Webhook Server for Healthcare Chatbot
 * Simulates Cloudflare Workers environment for local testing
 */

const http = require('http');
const crypto = require('crypto');

// Test configuration
const PORT = process.env.PORT || 8787;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-webhook-secret';

// Mock Cloudflare Workers environment
global.fetch = require('node-fetch');

// Simple healthcare response simulation
const healthcareResponses = {
  'hiv': {
    en: '🏥 **HIV Information**\n\nHIV (Human Immunodeficiency Virus) attacks the immune system. Key points:\n\n• **Transmission**: Blood, semen, vaginal fluids, breast milk\n• **Prevention**: Condoms, PrEP, regular testing\n• **Treatment**: Antiretroviral therapy (ART) is highly effective\n• **Testing**: Window period varies by test type\n\n⚠️ **Medical Disclaimer**: This is educational information only. Consult healthcare providers for medical advice.',
    th: '🏥 **ข้อมูลเอชไอวี**\n\nเอชไอวีคือไวรัสที่ทำลายระบบภูมิคุ้มกัน:\n\n• **การติดต่อ**: เลือด น้ำอสุจิ น้ำหล่อลื่นช่องคลอด น้ำนมแม่\n• **การป้องกัน**: ถุงยางอนามัย PrEP ตรวจเลือดเป็นประจำ\n• **การรักษา**: ยาต้านไวรัส (ART) มีประสิทธิภาพสูง\n• **การตรวจ**: ช่วงหน้าต่างแตกต่างตามประเภทการตรวจ\n\n⚠️ **ข้อจำกัดทางการแพทย์**: ข้อมูลนี้เพื่อการศึกษา ปรึกษาแพทย์สำหรับคำแนะนำทางการแพทย์'
  },
  'prep': {
    en: '🏥 **PrEP Information**\n\nPre-exposure prophylaxis (PrEP) prevents HIV infection:\n\n• **Effectiveness**: 99% effective when taken as prescribed\n• **Candidates**: High-risk individuals, multiple partners, partner with HIV\n• **Monitoring**: Regular HIV testing, kidney function tests\n• **Medications**: Truvada, Descovy available\n\n⚠️ **Medical Disclaimer**: Consult healthcare providers for PrEP eligibility and monitoring.',
    th: '🏥 **ข้อมูล PrEP**\n\nการป้องกันก่อนสัมผัส (PrEP) ป้องกันการติดเชื้อเอชไอวี:\n\n• **ประสิทธิภาพ**: 99% เมื่อทานตามแพทย์สั่ง\n• **กลุ่มเป้าหมาย**: กลุ่มเสี่ยงสูง มีคู่นอนหลายคน คู่นอนติดเอชไอวี\n• **การติดตาม**: ตรวจเอชไอวี ตรวจไตเป็นประจำ\n• **ยา**: Truvada, Descovy\n\n⚠️ **ข้อจำกัดทางการแพทย์**: ปรึกษาแพทย์สำหรับความเหมาะสมในการใช้ PrEP'
  },
  'std': {
    en: '🏥 **STDs Information**\n\nSexually transmitted diseases prevention and information:\n\n• **Common STDs**: Chlamydia, gonorrhea, syphilis, herpes, HPV\n• **Prevention**: Condoms, regular testing, vaccination (HPV, Hep B)\n• **Testing**: Annual testing recommended for sexually active individuals\n• **Treatment**: Many STDs are curable with proper treatment\n\n⚠️ **Medical Disclaimer**: Consult healthcare providers for testing and treatment.',
    th: '🏥 **ข้อมูลโรคติดต่อทางเพศสัมพันธ์**\n\nการป้องกันและข้อมูลโรคติดต่อทางเพศสัมพันธ์:\n\n• **โรคที่พบบ่อย**: คลาไมเดีย หนองใน ซิฟิลิส เฮอร์ปีส HPV\n• **การป้องกัน**: ถุงยางอนามัย ตรวจเป็นประจำ วัคซีน (HPV, ไวรัสตับอักเสบบี)\n• **การตรวจ**: แนะนำตรวจปีละครั้งสำหรับผู้มีเพศสัมพันธ์\n• **การรักษา**: โรคหลายชนิดรักษาหายได้ด้วยการรักษาที่เหมาะสม\n\n⚠️ **ข้อจำกัดทางการแพทย์**: ปรึกษาแพทย์สำหรับการตรวจและรักษา'
  }
};

// Classify healthcare intent
function classifyHealthcareIntent(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hiv') || lowerText.includes('aids') || lowerText.includes('เอชไอวี') || lowerText.includes('เอดส์')) {
    return 'hiv';
  }
  if (lowerText.includes('prep') || lowerText.includes('เพรพ')) {
    return 'prep';
  }
  if (lowerText.includes('std') || lowerText.includes('sti') || lowerText.includes('โรคติดต่อทางเพศ')) {
    return 'std';
  }
  
  return 'general';
}

// Detect language
function detectLanguage(text) {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'healthcare-chatbot-test',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: {
        healthcare: true,
        research: true,
        analytics: true,
        multilingual: true
      }
    }));
    return;
  }
  
  // Webhook endpoint
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        console.log('📨 Received webhook:', body);
        
        const webhookData = JSON.parse(body);
        
        // Process LINE events
        if (webhookData.events && webhookData.events.length > 0) {
          for (const event of webhookData.events) {
            if (event.type === 'message' && event.message.type === 'text') {
              const userMessage = event.message.text;
              const language = detectLanguage(userMessage);
              const intent = classifyHealthcareIntent(userMessage);
              
              console.log(`🏥 Healthcare Query: "${userMessage}" (${language}, ${intent})`);
              
              // Generate healthcare response
              let response = 'Hello! I can help you with healthcare information about HIV/AIDS, STDs, and sexual health. Ask me about:\n\n• HIV testing and treatment\n• PrEP (pre-exposure prophylaxis)\n• STD prevention and testing\n• Sexual health guidance\n\nWhat would you like to know?';
              
              if (healthcareResponses[intent]) {
                response = healthcareResponses[intent][language] || healthcareResponses[intent]['en'];
              }
              
              // Log healthcare interaction (anonymized)
              console.log(`✅ Healthcare Response Generated: ${intent} (${language})`);
              console.log(`📊 Analytics: Intent=${intent}, Language=${language}, Confidence=0.9`);
              
              // In a real implementation, this would use LINE Messaging API
              console.log('📤 Would send to LINE:', {
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: response }]
              });
            }
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        
      } catch (error) {
        console.error('❌ Webhook error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    
    return;
  }
  
  // Test endpoint for healthcare features
  if (req.method === 'GET' && req.url === '/test-healthcare') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Healthcare Chatbot Test</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .response { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 3px; }
          button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>🏥 Healthcare Chatbot Test Interface</h1>
        
        <div class="test-section">
          <h3>Test Healthcare Queries</h3>
          <button onclick="testQuery('What is HIV?', 'en')">Test HIV Query (English)</button>
          <button onclick="testQuery('เอชไอวีคืออะไร', 'th')">Test HIV Query (Thai)</button>
          <button onclick="testQuery('Tell me about PrEP', 'en')">Test PrEP Query</button>
          <button onclick="testQuery('โรคติดต่อทางเพศสัมพันธ์', 'th')">Test STD Query (Thai)</button>
          <div id="responses"></div>
        </div>
        
        <div class="test-section">
          <h3>Custom Query Test</h3>
          <input type="text" id="customQuery" placeholder="Enter your healthcare question..." style="width: 300px; padding: 5px;">
          <button onclick="testCustomQuery()">Send Query</button>
        </div>
        
        <script>
          function testQuery(query, lang) {
            const responseDiv = document.getElementById('responses');
            
            // Simulate webhook call
            const mockEvent = {
              events: [{
                type: 'message',
                message: { type: 'text', text: query },
                replyToken: 'test-reply-' + Date.now()
              }]
            };
            
            fetch('/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mockEvent)
            }).then(() => {
              const div = document.createElement('div');
              div.className = 'response';
              div.innerHTML = '<strong>Query:</strong> ' + query + ' (' + lang + ')<br><strong>Status:</strong> Processed successfully - Check console for response';
              responseDiv.appendChild(div);
            });
          }
          
          function testCustomQuery() {
            const query = document.getElementById('customQuery').value;
            if (query.trim()) {
              testQuery(query, 'auto');
              document.getElementById('customQuery').value = '';
            }
          }
        </script>
      </body>
      </html>
    `);
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
server.listen(PORT, () => {
  console.log(`🏥 Healthcare Chatbot Test Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test interface: http://localhost:${PORT}/test-healthcare`);
  console.log(`📨 Webhook endpoint: http://localhost:${PORT}/webhook`);
});
EOF

    log_info "Test webhook handler created"
}

# Start ngrok tunnel
start_ngrok_tunnel() {
    log_info "Starting ngrok tunnel for healthcare chatbot testing..."
    
    # Kill any existing ngrok processes
    pkill -f ngrok || true
    
    # Start ngrok tunnel
    log_info "Starting ngrok tunnel on port $HEALTHCARE_TEST_PORT..."
    ngrok http $HEALTHCARE_TEST_PORT --log=stdout > ngrok.log 2>&1 &
    
    # Wait for ngrok to start
    sleep 3
    
    # Get ngrok URL
    NGROK_URL=$(curl -s localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app')
    
    if [[ -n "$NGROK_URL" ]]; then
        log_info "🌐 ngrok tunnel active: $NGROK_URL"
        log_info "📨 Webhook URL: $NGROK_URL/webhook"
        log_info "🏥 Health check: $NGROK_URL/health"
        log_info "🧪 Test interface: $NGROK_URL/test-healthcare"
        
        # Save ngrok URL for reference
        echo "$NGROK_URL" > .ngrok_url
        
        return 0
    else
        log_error "Failed to get ngrok URL. Check ngrok.log for details"
        return 1
    fi
}

# Start test server
start_test_server() {
    log_info "Starting healthcare chatbot test server..."
    
    # Export environment variables
    export PORT=$HEALTHCARE_TEST_PORT
    export NODE_ENV=test
    
    # Start the test server
    node test-webhook-server.js &
    TEST_SERVER_PID=$!
    
    # Save PID for cleanup
    echo $TEST_SERVER_PID > .test_server_pid
    
    log_info "Test server started with PID: $TEST_SERVER_PID"
    
    # Wait for server to start
    sleep 2
    
    # Test server health
    if curl -s http://localhost:$HEALTHCARE_TEST_PORT/health > /dev/null; then
        log_info "✅ Test server is healthy"
        return 0
    else
        log_error "❌ Test server health check failed"
        return 1
    fi
}

# Run healthcare tests
run_healthcare_tests() {
    log_info "Running healthcare chatbot tests..."
    
    NGROK_URL=$(cat .ngrok_url 2>/dev/null || echo "")
    
    if [[ -z "$NGROK_URL" ]]; then
        log_error "ngrok URL not found"
        return 1
    fi
    
    log_info "Testing healthcare endpoints..."
    
    # Test health endpoint
    log_info "🔍 Testing health endpoint..."
    if curl -s "$NGROK_URL/health" | grep -q "healthy"; then
        log_info "✅ Health endpoint working"
    else
        log_warn "⚠️ Health endpoint test failed"
    fi
    
    # Test webhook with healthcare queries
    log_info "🔍 Testing healthcare webhook..."
    
    # Test HIV query in English
    curl -s -X POST "$NGROK_URL/webhook" \
        -H "Content-Type: application/json" \
        -d '{
            "events": [{
                "type": "message",
                "message": {"type": "text", "text": "What is HIV and how is it transmitted?"},
                "source": {"type": "user", "userId": "test-user-123"},
                "replyToken": "test-reply-token-123"
            }]
        }' > /dev/null
    
    # Test PrEP query in Thai
    curl -s -X POST "$NGROK_URL/webhook" \
        -H "Content-Type: application/json" \
        -d '{
            "events": [{
                "type": "message",
                "message": {"type": "text", "text": "PrEP คืออะไร ใครควรใช้"},
                "source": {"type": "user", "userId": "test-user-456"},
                "replyToken": "test-reply-token-456"
            }]
        }' > /dev/null
    
    log_info "✅ Healthcare webhook tests completed"
    
    # Display test interface URL
    log_info "🧪 Interactive test interface: $NGROK_URL/test-healthcare"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Kill test server
    if [[ -f ".test_server_pid" ]]; then
        TEST_SERVER_PID=$(cat .test_server_pid)
        kill $TEST_SERVER_PID 2>/dev/null || true
        rm -f .test_server_pid
    fi
    
    # Kill ngrok
    pkill -f ngrok || true
    
    # Remove temporary files
    rm -f .ngrok_url ngrok.log test-webhook-server.js .env.test
    
    log_info "Cleanup completed"
}

# Main execution
main() {
    log_info "🏥 Starting Healthcare Chatbot Testing Setup..."
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Run setup steps
    check_prerequisites
    setup_ngrok
    setup_test_environment
    setup_test_database
    create_test_handler
    
    # Start services
    if start_test_server && start_ngrok_tunnel; then
        run_healthcare_tests
        
        log_info "🎉 Healthcare chatbot test environment ready!"
        log_info ""
        log_info "📋 Test URLs:"
        log_info "   Health Check: $(cat .ngrok_url)/health"
        log_info "   Webhook: $(cat .ngrok_url)/webhook"
        log_info "   Test Interface: $(cat .ngrok_url)/test-healthcare"
        log_info ""
        log_info "🧪 You can now:"
        log_info "   1. Open the test interface in your browser"
        log_info "   2. Configure LINE webhook URL: $(cat .ngrok_url)/webhook"
        log_info "   3. Test healthcare queries interactively"
        log_info ""
        log_info "Press Ctrl+C to stop the test environment"
        
        # Keep running until interrupted
        wait
    else
        log_error "Failed to start test environment"
        exit 1
    fi
}

# Run main function
main "$@"