#!/bin/bash

# Quick Healthcare Chatbot Test with ngrok
# Simplified version for immediate testing

set -e

echo "🏥 Healthcare Chatbot Quick Test Setup"
echo "======================================"

# Configuration
NGROK_AUTHTOKEN="2xkslEhOciEmIBwpsCtNlaJImff_2boeAAJBE5FKjNgY5snjA"
PORT=8787

# Setup ngrok if not already configured
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Please install ngrok first:"
    echo "   https://ngrok.com/download"
    exit 1
fi

# Configure ngrok authtoken
echo "🔑 Configuring ngrok authtoken..."
ngrok config add-authtoken "$NGROK_AUTHTOKEN"

# Create simple test server
echo "📝 Creating test server..."
cat > test-server.js << 'EOF'
const http = require('http');

const healthcareResponses = {
  'hiv': '🏥 **HIV Information**\n\nHIV attacks the immune system. Key facts:\n• Prevention: Condoms, PrEP, testing\n• Treatment: ART is highly effective\n• Testing: Multiple test types available\n\n⚠️ Consult healthcare providers for medical advice.',
  'prep': '🏥 **PrEP Information**\n\nPrEP prevents HIV infection:\n• 99% effective when taken daily\n• For high-risk individuals\n• Requires regular monitoring\n\n⚠️ Consult doctors for eligibility.',
  'std': '🏥 **STDs Information**\n\nCommon STDs and prevention:\n• Use condoms consistently\n• Regular testing recommended\n• Many STDs are curable\n\n⚠️ Seek medical advice for symptoms.'
};

function classifyIntent(text) {
  const lower = text.toLowerCase();
  if (lower.includes('hiv') || lower.includes('aids') || lower.includes('เอชไอวี')) return 'hiv';
  if (lower.includes('prep') || lower.includes('เพรพ')) return 'prep';
  if (lower.includes('std') || lower.includes('sti') || lower.includes('โรคติดต่อ')) return 'std';
  return 'general';
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'healthcare-chatbot-test',
      timestamp: new Date().toISOString(),
      features: ['healthcare', 'multilingual', 'research']
    }));
    return;
  }
  
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('📨 Webhook received:', data);
        
        if (data.events && data.events[0] && data.events[0].message) {
          const message = data.events[0].message.text;
          const intent = classifyIntent(message);
          const response = healthcareResponses[intent] || 'Hello! Ask me about HIV, PrEP, or STDs.';
          
          console.log(`🏥 Query: "${message}" -> Intent: ${intent}`);
          console.log(`📤 Response generated (${response.length} chars)`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        console.error('❌ Error:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
    return;
  }
  
  if (req.method === 'GET' && req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Healthcare Chatbot Test</title></head>
      <body style="font-family: Arial; margin: 20px">
        <h1>🏥 Healthcare Chatbot Test</h1>
        <h3>Test Queries:</h3>
        <button onclick="test('What is HIV?')">Test HIV Query</button>
        <button onclick="test('Tell me about PrEP')">Test PrEP Query</button>
        <button onclick="test('โรคติดต่อทางเพศ')">Test STD Query (Thai)</button>
        
        <h3>Custom Test:</h3>
        <input type="text" id="query" placeholder="Enter your question..." style="width: 300px">
        <button onclick="testCustom()">Send</button>
        
        <h3>Results:</h3>
        <div id="results"></div>
        
        <script>
          function test(query) {
            fetch('/webhook', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                events: [{
                  type: 'message',
                  message: {type: 'text', text: query},
                  source: {type: 'user', userId: 'test'},
                  replyToken: 'test'
                }]
              })
            }).then(() => {
              document.getElementById('results').innerHTML += 
                '<p><strong>Sent:</strong> ' + query + ' ✅</p>';
            });
          }
          
          function testCustom() {
            const query = document.getElementById('query').value;
            if (query) {
              test(query);
              document.getElementById('query').value = '';
            }
          }
        </script>
      </body>
      </html>
    `);
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(process.env.PORT || 8787, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 8787}`);
  console.log(`📋 Health: http://localhost:${process.env.PORT || 8787}/health`);
  console.log(`🧪 Test UI: http://localhost:${process.env.PORT || 8787}/test`);
  console.log(`📨 Webhook: http://localhost:${process.env.PORT || 8787}/webhook`);
});
EOF

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first"
    exit 1
fi

# Kill any existing processes
pkill -f "node test-server.js" || true
pkill -f "ngrok http" || true

# Start test server in background
echo "🚀 Starting test server on port $PORT..."
PORT=$PORT node test-server.js &
SERVER_PID=$!
echo $SERVER_PID > .server_pid

# Wait for server to start
sleep 2

# Test server health
if curl -s http://localhost:$PORT/health > /dev/null; then
    echo "✅ Test server is running"
else
    echo "❌ Test server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
ngrok http $PORT --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > .ngrok_pid

# Wait for ngrok to initialize
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)

if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "🎉 Healthcare Chatbot Test Ready!"
    echo "=================================="
    echo "🌐 Public URL: $NGROK_URL"
    echo "📋 Health Check: $NGROK_URL/health"
    echo "🧪 Test Interface: $NGROK_URL/test"
    echo "📨 Webhook URL: $NGROK_URL/webhook"
    echo ""
    echo "📱 Configure LINE Bot webhook URL: $NGROK_URL/webhook"
    echo ""
    echo "🧪 Quick Tests:"
    echo "curl -X POST $NGROK_URL/webhook -H 'Content-Type: application/json' -d '{\"events\":[{\"type\":\"message\",\"message\":{\"type\":\"text\",\"text\":\"What is HIV?\"},\"source\":{\"type\":\"user\",\"userId\":\"test\"},\"replyToken\":\"test\"}]}'"
    echo ""
    echo "Press Ctrl+C to stop..."
    
    # Save URLs for reference
    echo "$NGROK_URL" > .ngrok_url
    
    # Keep running and monitor
    trap 'echo "🛑 Shutting down..."; kill $(cat .server_pid 2>/dev/null) 2>/dev/null || true; kill $(cat .ngrok_pid 2>/dev/null) 2>/dev/null || true; rm -f .server_pid .ngrok_pid .ngrok_url test-server.js ngrok.log; exit 0' INT
    
    # Show real-time logs
    echo ""
    echo "📊 Real-time server logs:"
    echo "========================"
    tail -f ngrok.log &
    wait
else
    echo "❌ Failed to get ngrok URL"
    kill $SERVER_PID 2>/dev/null || true
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi