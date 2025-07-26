# Microservices API Contracts

## 🎯 Overview

This document defines the API contracts for all microservices in the LINE Bot system. Each service exposes well-defined interfaces for inter-service communication and external integrations.

## 🔄 Service Communication Patterns

### Synchronous Communication (REST)
- **Use Case**: Request-response operations requiring immediate feedback
- **Examples**: User authentication, product retrieval, immediate data queries
- **Protocol**: HTTP/HTTPS with JSON payloads

### Asynchronous Communication (Message Queue)
- **Use Case**: Event-driven operations, notifications, background processing
- **Examples**: User activity tracking, analytics events, cache invalidation
- **Protocol**: Redis Pub/Sub or RabbitMQ

## 📊 Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "metadata": {
    "timestamp": "2025-01-25T10:00:00Z",
    "correlationId": "trace-12345",
    "version": "v1"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Customer with ID 'user123' not found",
    "details": {
      "userId": "user123",
      "service": "customer-management"
    }
  },
  "metadata": {
    "timestamp": "2025-01-25T10:00:00Z",
    "correlationId": "trace-12345",
    "version": "v1"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 1️⃣ LINE Bot Gateway Service (Port: 3001)

### Webhook Endpoints

#### POST /webhook
**Purpose**: Handle LINE Bot webhook events
```json
{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "Hello"
      },
      "source": {
        "userId": "line_user_123",
        "type": "user"
      },
      "timestamp": 1642781234567
    }
  ]
}
```

#### POST /webhook/debug
**Purpose**: Debug webhook without signature validation
```json
{
  "testMessage": "Debug webhook payload",
  "userId": "test_user",
  "timestamp": "2025-01-25T10:00:00Z"
}
```

### Internal Service APIs

#### POST /internal/route-message
**Purpose**: Route messages to appropriate services
```json
{
  "userId": "line_user_123",
  "message": "I want to buy a product",
  "messageType": "text",
  "language": "en",
  "correlationId": "trace-12345"
}
```

#### GET /internal/conversation/{userId}
**Purpose**: Get conversation status
```json
{
  "success": true,
  "data": {
    "userId": "line_user_123",
    "status": "active",
    "lastActivity": "2025-01-25T09:30:00Z",
    "messageCount": 15,
    "language": "en"
  }
}
```

---

## 2️⃣ AI/Conversation Service (Port: 3002)

### AI Generation APIs

#### POST /ai/generate
**Purpose**: Generate AI response
```json
{
  "userId": "line_user_123",
  "message": "What products do you have?",
  "context": {
    "language": "en",
    "previousMessages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-01-25T09:00:00Z"
      }
    ],
    "userProfile": {
      "preferences": ["electronics", "gadgets"],
      "purchaseHistory": []
    }
  },
  "options": {
    "provider": "deepSeek",
    "maxTokens": 2000,
    "temperature": 0.7
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "We have a variety of electronics and gadgets...",
    "provider": "deepSeek",
    "tokensUsed": 150,
    "processingTime": 1.2,
    "confidence": 0.95,
    "intent": "product_inquiry",
    "entities": ["electronics", "gadgets"]
  }
}
```

#### GET /ai/providers/stats
**Purpose**: Get AI provider statistics
```json
{
  "success": true,
  "data": {
    "deepSeek": {
      "calls": 1543,
      "success": 1487,
      "failures": 56,
      "successRate": "96.37%",
      "avgResponseTime": 1.8
    },
    "openRouter": {
      "calls": 892,
      "success": 856,
      "failures": 36,
      "successRate": "95.96%",
      "avgResponseTime": 2.1
    }
  }
}
```

### Conversation Management APIs

#### GET /conversation/{userId}
**Purpose**: Get conversation history
```json
{
  "success": true,
  "data": {
    "userId": "line_user_123",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-01-25T09:00:00Z",
        "metadata": {
          "intent": "greeting",
          "sentiment": "positive"
        }
      },
      {
        "role": "assistant",
        "content": "Hello! How can I help you today?",
        "timestamp": "2025-01-25T09:00:01Z",
        "metadata": {
          "provider": "deepSeek",
          "confidence": 0.98
        }
      }
    ],
    "sessionInfo": {
      "startTime": "2025-01-25T09:00:00Z",
      "messageCount": 10,
      "language": "en",
      "status": "active"
    }
  }
}
```

#### POST /conversation/{userId}/message
**Purpose**: Add message to conversation
```json
{
  "role": "user",
  "content": "I want to see your products",
  "metadata": {
    "intent": "product_inquiry",
    "entities": ["products"],
    "sentiment": "neutral"
  }
}
```

---

## 3️⃣ Customer Management Service (Port: 3003)

### Customer APIs

#### GET /customers/{userId}
**Purpose**: Get customer profile
```json
{
  "success": true,
  "data": {
    "lineUserId": "line_user_123",
    "displayName": "John Doe",
    "profile": {
      "language": "en",
      "timezone": "Asia/Bangkok",
      "preferences": ["electronics", "health", "fitness"],
      "interests": ["gadgets", "nutrition"]
    },
    "analytics": {
      "totalMessages": 245,
      "totalSessions": 34,
      "avgSessionLength": 8.5,
      "lastActivity": "2025-01-25T09:30:00Z",
      "joinDate": "2024-12-01T10:00:00Z"
    },
    "segmentation": {
      "tier": "premium",
      "engagement": "high",
      "purchaseIntent": "medium"
    }
  }
}
```

#### POST /customers
**Purpose**: Create new customer
```json
{
  "lineUserId": "line_user_456",
  "displayName": "Jane Smith",
  "profile": {
    "language": "th",
    "timezone": "Asia/Bangkok"
  }
}
```

#### PUT /customers/{userId}/preferences
**Purpose**: Update customer preferences
```json
{
  "preferences": ["healthcare", "fitness", "nutrition"],
  "interests": ["supplements", "exercise"]
}
```

### Purchase History APIs

#### GET /customers/{userId}/purchases
**Purpose**: Get purchase history
```json
{
  "success": true,
  "data": {
    "purchases": [
      {
        "purchaseId": "purchase_789",
        "productId": "product_123",
        "productName": "Health Supplement",
        "amount": 299.99,
        "currency": "THB",
        "purchaseDate": "2025-01-20T14:30:00Z",
        "status": "completed"
      }
    ],
    "summary": {
      "totalPurchases": 3,
      "totalAmount": 899.97,
      "avgOrderValue": 299.99,
      "lastPurchase": "2025-01-20T14:30:00Z"
    }
  }
}
```

#### POST /customers/{userId}/purchases
**Purpose**: Record new purchase
```json
{
  "productId": "product_456",
  "amount": 199.99,
  "currency": "THB",
  "metadata": {
    "channel": "line_bot",
    "campaign": "winter_sale"
  }
}
```

### Analytics APIs

#### GET /customers/{userId}/analytics
**Purpose**: Get customer analytics
```json
{
  "success": true,
  "data": {
    "engagement": {
      "totalMessages": 245,
      "totalSessions": 34,
      "avgSessionLength": 8.5,
      "lastActivity": "2025-01-25T09:30:00Z"
    },
    "behavior": {
      "topIntents": ["product_inquiry", "health_question", "greeting"],
      "topCategories": ["electronics", "health", "fitness"],
      "sessionTimes": ["09:00-12:00", "18:00-21:00"],
      "responseTime": 2.3
    },
    "conversion": {
      "inquiriesToPurchases": 0.15,
      "avgTimeToPurchase": "3.2 days",
      "repeatPurchaseRate": 0.67
    }
  }
}
```

---

## 4️⃣ Product Catalog Service (Port: 3004)

### Product APIs

#### GET /products
**Purpose**: Get all products with filtering
**Query Parameters**:
- `category`: Filter by category
- `language`: Product language (en/th)
- `page`: Page number
- `limit`: Items per page
- `search`: Search term

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "product_123",
        "name": "Premium Health Supplement",
        "description": "High-quality vitamins and minerals for optimal health",
        "price": 299.99,
        "currency": "THB",
        "category": "health",
        "subcategory": "supplements",
        "images": [
          "https://example.com/image1.jpg"
        ],
        "specifications": {
          "weight": "500g",
          "servings": 30,
          "ingredients": ["Vitamin C", "Vitamin D", "Zinc"]
        },
        "availability": {
          "inStock": true,
          "quantity": 45,
          "reorderLevel": 10
        },
        "multilingual": {
          "en": {
            "name": "Premium Health Supplement",
            "description": "High-quality vitamins and minerals for optimal health"
          },
          "th": {
            "name": "อาหารเสริมเพื่อสุขภาพ",
            "description": "วิตามินและแร่ธาตุคุณภาพสูงเพื่อสุขภาพที่ดี"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

#### GET /products/{productId}
**Purpose**: Get specific product
```json
{
  "success": true,
  "data": {
    "productId": "product_123",
    "name": "Premium Health Supplement",
    "description": "High-quality vitamins and minerals for optimal health",
    "price": 299.99,
    "currency": "THB",
    "category": "health",
    "images": ["https://example.com/image1.jpg"],
    "specifications": {
      "weight": "500g",
      "servings": 30
    },
    "reviews": {
      "average": 4.7,
      "count": 234
    },
    "relatedProducts": ["product_124", "product_125"]
  }
}
```

### Category APIs

#### GET /categories
**Purpose**: Get all product categories
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "categoryId": "health",
        "name": "Health & Wellness",
        "description": "Products for your health and wellness needs",
        "subcategories": [
          {
            "subcategoryId": "supplements",
            "name": "Supplements",
            "productCount": 45
          },
          {
            "subcategoryId": "fitness",
            "name": "Fitness Equipment",
            "productCount": 23
          }
        ],
        "productCount": 68
      }
    ]
  }
}
```

### Admin APIs (Protected)

#### POST /admin/products
**Purpose**: Create new product
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 199.99,
  "currency": "THB",
  "category": "electronics",
  "specifications": {
    "feature1": "value1"
  },
  "multilingual": {
    "en": {
      "name": "New Product",
      "description": "Product description"
    },
    "th": {
      "name": "สินค้าใหม่",
      "description": "คำอธิบายสินค้า"
    }
  }
}
```

---

## 5️⃣ Healthcare/Research Service (Port: 3005)

### Research APIs

#### POST /research/search
**Purpose**: Perform web research
```json
{
  "query": "benefits of vitamin D",
  "language": "en",
  "maxResults": 3,
  "timeout": 5000,
  "context": {
    "userId": "line_user_123",
    "previousQueries": ["vitamin supplements", "health benefits"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "query": "benefits of vitamin D",
    "results": [
      {
        "title": "Health Benefits of Vitamin D",
        "url": "https://example.com/vitamin-d-benefits",
        "summary": "Vitamin D supports bone health, immune function...",
        "source": "HealthLine",
        "relevance": 0.95,
        "lastUpdated": "2025-01-20T00:00:00Z"
      }
    ],
    "metadata": {
      "searchTime": 2.3,
      "totalResults": 15,
      "language": "en",
      "cacheStatus": "miss"
    }
  }
}
```

### Healthcare Knowledge APIs

#### GET /healthcare/topics
**Purpose**: Get healthcare topics
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "topicId": "nutrition",
        "name": "Nutrition",
        "description": "Information about healthy eating and nutrition",
        "subtopics": ["vitamins", "minerals", "diet_plans"],
        "contentCount": 234
      }
    ]
  }
}
```

#### GET /healthcare/topics/{topicId}
**Purpose**: Get specific healthcare topic information
```json
{
  "success": true,
  "data": {
    "topicId": "nutrition",
    "name": "Nutrition",
    "content": {
      "overview": "Nutrition is the process of providing...",
      "keyPoints": [
        "Balanced diet is essential for health",
        "Vitamins and minerals support body functions"
      ],
      "recommendations": [
        "Eat 5 servings of fruits and vegetables daily",
        "Choose whole grains over refined grains"
      ]
    },
    "sources": [
      {
        "title": "Nutrition Guidelines",
        "url": "https://example.com/nutrition",
        "authority": "WHO"
      }
    ],
    "lastUpdated": "2025-01-20T00:00:00Z"
  }
}
```

---

## 6️⃣ Monitoring/Admin Service (Port: 3006)

### System Health APIs

#### GET /health/system
**Purpose**: Get overall system health
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-25T10:00:00Z",
    "services": {
      "line-bot-gateway": {
        "status": "healthy",
        "responseTime": 45,
        "lastCheck": "2025-01-25T09:59:30Z"
      },
      "ai-conversation": {
        "status": "healthy",
        "responseTime": 120,
        "lastCheck": "2025-01-25T09:59:30Z"
      },
      "customer-management": {
        "status": "degraded",
        "responseTime": 850,
        "lastCheck": "2025-01-25T09:59:30Z",
        "issues": ["high_response_time"]
      }
    },
    "infrastructure": {
      "database": "healthy",
      "cache": "healthy",
      "messageQueue": "healthy"
    }
  }
}
```

### Metrics APIs

#### GET /metrics/system
**Purpose**: Get system metrics
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-25T10:00:00Z",
    "period": "1h",
    "metrics": {
      "requests": {
        "total": 15420,
        "success": 14892,
        "errors": 528,
        "successRate": 96.57
      },
      "performance": {
        "avgResponseTime": 245,
        "p95ResponseTime": 890,
        "p99ResponseTime": 1250
      },
      "resources": {
        "cpuUsage": 45.2,
        "memoryUsage": 67.8,
        "diskUsage": 23.4
      },
      "services": {
        "line-bot-gateway": {
          "requests": 3840,
          "avgResponseTime": 45,
          "errorRate": 1.2
        },
        "ai-conversation": {
          "requests": 2156,
          "avgResponseTime": 1200,
          "errorRate": 2.8
        }
      }
    }
  }
}
```

### Admin APIs

#### GET /admin/users/stats
**Purpose**: Get user statistics
```json
{
  "success": true,
  "data": {
    "totalUsers": 12543,
    "activeUsers": {
      "today": 1234,
      "thisWeek": 5678,
      "thisMonth": 9876
    },
    "newUsers": {
      "today": 45,
      "thisWeek": 234,
      "thisMonth": 789
    },
    "engagement": {
      "avgMessagesPerUser": 23.4,
      "avgSessionLength": 8.5,
      "returnUserRate": 0.67
    }
  }
}
```

---

## 7️⃣ Cache/Storage Service (Port: 3007)

### Cache APIs

#### GET /cache/{key}
**Purpose**: Get cached value
```json
{
  "success": true,
  "data": {
    "key": "ai:en:hello",
    "value": "Hello! How can I help you today?",
    "ttl": 3456,
    "createdAt": "2025-01-25T09:30:00Z"
  }
}
```

#### POST /cache/{key}
**Purpose**: Set cached value
```json
{
  "value": "Hello! How can I help you today?",
  "ttl": 3600,
  "tags": ["ai_response", "greeting"]
}
```

#### DELETE /cache/{key}
**Purpose**: Delete cached value
```json
{
  "success": true,
  "data": {
    "key": "ai:en:hello",
    "deleted": true
  }
}
```

### Bulk Operations

#### POST /cache/bulk/get
**Purpose**: Get multiple cached values
```json
{
  "keys": ["ai:en:hello", "product:123", "user:456"]
}
```

#### POST /cache/bulk/set
**Purpose**: Set multiple cached values
```json
{
  "items": [
    {
      "key": "ai:en:hello",
      "value": "Hello!",
      "ttl": 3600
    },
    {
      "key": "product:123",
      "value": {"name": "Product", "price": 100},
      "ttl": 7200
    }
  ]
}
```

### Cache Management

#### POST /cache/invalidate
**Purpose**: Invalidate cache by pattern or tags
```json
{
  "pattern": "ai:*",
  "tags": ["ai_response", "expired"]
}
```

---

## 8️⃣ Auth/Security Service (Port: 3008)

### Authentication APIs

#### POST /auth/validate
**Purpose**: Validate API key
```json
{
  "apiKey": "api_key_12345",
  "resource": "/products",
  "method": "GET"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "permissions": ["read:products", "read:customers"],
    "rateLimit": {
      "requests": 95,
      "remaining": 5,
      "resetTime": "2025-01-25T11:00:00Z"
    },
    "metadata": {
      "keyId": "key_123",
      "userId": "admin_456",
      "scope": "admin"
    }
  }
}
```

### Rate Limiting APIs

#### POST /rate-limit/check
**Purpose**: Check rate limit status
```json
{
  "identifier": "user_123",
  "resource": "ai_requests",
  "limit": 100,
  "window": 3600
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "requests": 23,
    "remaining": 77,
    "resetTime": "2025-01-25T11:00:00Z",
    "retryAfter": null
  }
}
```

### Security Audit APIs

#### GET /security/audit/logs
**Purpose**: Get security audit logs
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-25T09:45:00Z",
        "event": "api_key_validation",
        "status": "success",
        "ip": "192.168.1.100",
        "resource": "/products",
        "user": "admin_456"
      },
      {
        "timestamp": "2025-01-25T09:44:30Z",
        "event": "rate_limit_exceeded",
        "status": "blocked",
        "ip": "192.168.1.200",
        "resource": "ai_requests",
        "user": "user_789"
      }
    ]
  }
}
```

---

## 🔄 Event-Driven Communication

### Message Queue Events

#### Customer Events
```json
{
  "eventType": "customer.created",
  "timestamp": "2025-01-25T10:00:00Z",
  "correlationId": "trace-12345",
  "data": {
    "userId": "line_user_123",
    "displayName": "John Doe",
    "language": "en"
  },
  "metadata": {
    "source": "customer-management",
    "version": "v1"
  }
}
```

#### Conversation Events
```json
{
  "eventType": "conversation.message_sent",
  "timestamp": "2025-01-25T10:00:00Z",
  "correlationId": "trace-12345",
  "data": {
    "userId": "line_user_123",
    "messageId": "msg_456",
    "content": "Hello",
    "intent": "greeting",
    "sentiment": "positive"
  }
}
```

#### AI Events
```json
{
  "eventType": "ai.response_generated",
  "timestamp": "2025-01-25T10:00:00Z",
  "correlationId": "trace-12345",
  "data": {
    "userId": "line_user_123",
    "provider": "deepSeek",
    "tokensUsed": 150,
    "processingTime": 1.2,
    "confidence": 0.95
  }
}
```

---

## 🔧 Error Codes

### Common Error Codes
- `INVALID_REQUEST`: Malformed request payload
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMITED`: Rate limit exceeded
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_ERROR`: Internal server error

### Service-Specific Error Codes

#### Customer Management Service
- `CUSTOMER_NOT_FOUND`: Customer does not exist
- `CUSTOMER_ALREADY_EXISTS`: Customer already registered
- `INVALID_PREFERENCES`: Invalid preference format

#### Product Catalog Service
- `PRODUCT_NOT_FOUND`: Product does not exist
- `CATEGORY_NOT_FOUND`: Product category not found
- `INVALID_PRODUCT_DATA`: Invalid product information

#### AI/Conversation Service
- `AI_PROVIDER_ERROR`: AI service temporarily unavailable
- `CONVERSATION_NOT_FOUND`: Conversation session not found
- `INVALID_CONTEXT`: Invalid conversation context

---

## 📋 Implementation Notes

### Security Considerations
- All APIs require authentication via API keys or JWT tokens
- Rate limiting applied per service and endpoint
- Request/response logging for audit trails
- Input validation and sanitization

### Performance Optimizations
- Response caching for frequently accessed data
- Database connection pooling
- Async processing for non-critical operations
- Request compression for large payloads

### Monitoring Integration
- Correlation IDs for distributed tracing
- Performance metrics collection
- Error tracking and alerting
- Health check endpoints for all services

This API contract serves as the foundation for microservices implementation and ensures consistent communication patterns across all services.