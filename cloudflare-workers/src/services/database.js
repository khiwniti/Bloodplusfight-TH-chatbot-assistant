/**
 * Database Service for Cloudflare Workers
 * Handles D1 SQLite operations and Workers KV caching
 */

export class DatabaseService {
  constructor(env) {
    this.db = env.DB;
    this.kv = env.KV;
    this.env = env;
  }

  // ===============================
  // Customer Operations
  // ===============================

  /**
   * Get customer by LINE user ID
   * @param {string} lineUserId - LINE user ID
   * @returns {Object|null} Customer data
   */
  async getCustomer(lineUserId) {
    try {
      const customer = await this.db.prepare(
        'SELECT * FROM customers WHERE line_user_id = ?'
      ).bind(lineUserId).first();

      if (customer) {
        return {
          ...customer,
          preferences: this.parseJSON(customer.preferences),
          analytics: this.parseJSON(customer.analytics)
        };
      }

      return null;
    } catch (error) {
      console.error('Database error getting customer:', error);
      return null;
    }
  }

  /**
   * Create new customer
   * @param {Object} customerData - Customer information
   * @returns {Object} Created customer
   */
  async createCustomer(customerData) {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.db.prepare(`
        INSERT INTO customers (id, line_user_id, display_name, language, preferences, analytics, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        customerData.lineUserId,
        customerData.displayName || 'Customer',
        customerData.language || 'en',
        JSON.stringify(customerData.preferences || []),
        JSON.stringify(customerData.analytics || {}),
        now,
        now
      ).run();

      return await this.getCustomer(customerData.lineUserId);
    } catch (error) {
      console.error('Database error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update customer data
   * @param {string} lineUserId - LINE user ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated customer
   */
  async updateCustomer(lineUserId, updates) {
    try {
      const updateFields = [];
      const values = [];

      if (updates.displayName !== undefined) {
        updateFields.push('display_name = ?');
        values.push(updates.displayName);
      }

      if (updates.language !== undefined) {
        updateFields.push('language = ?');
        values.push(updates.language);
      }

      if (updates.preferences !== undefined) {
        updateFields.push('preferences = ?');
        values.push(JSON.stringify(updates.preferences));
      }

      if (updates.analytics !== undefined) {
        updateFields.push('analytics = ?');
        values.push(JSON.stringify(updates.analytics));
      }

      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(lineUserId);

      await this.db.prepare(`
        UPDATE customers SET ${updateFields.join(', ')} WHERE line_user_id = ?
      `).bind(...values).run();

      return await this.getCustomer(lineUserId);
    } catch (error) {
      console.error('Database error updating customer:', error);
      throw error;
    }
  }

  // ===============================
  // Conversation Operations
  // ===============================

  /**
   * Get active conversation for user
   * @param {string} lineUserId - LINE user ID
   * @returns {Object|null} Active conversation
   */
  async getActiveConversation(lineUserId) {
    try {
      const conversation = await this.db.prepare(`
        SELECT * FROM conversations 
        WHERE line_user_id = ? AND status = 'active'
        ORDER BY last_activity DESC LIMIT 1
      `).bind(lineUserId).first();

      if (conversation) {
        return {
          ...conversation,
          metadata: this.parseJSON(conversation.metadata)
        };
      }

      return null;
    } catch (error) {
      console.error('Database error getting conversation:', error);
      return null;
    }
  }

  /**
   * Create new conversation
   * @param {string} lineUserId - LINE user ID
   * @param {string} language - Conversation language
   * @returns {Object} Created conversation
   */
  async createConversation(lineUserId, language = 'en') {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.db.prepare(`
        INSERT INTO conversations (id, line_user_id, status, language, session_start, last_activity, message_count, metadata)
        VALUES (?, ?, 'active', ?, ?, ?, 0, '{}')
      `).bind(id, lineUserId, language, now, now).run();

      return await this.getActiveConversation(lineUserId);
    } catch (error) {
      console.error('Database error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   * @param {Object} metadata - Additional metadata
   * @returns {string} Message ID
   */
  async addMessage(conversationId, role, content, metadata = {}) {
    try {
      const messageId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert message
      await this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, intent, sentiment, confidence, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        messageId,
        conversationId,
        role,
        content,
        metadata.intent || null,
        metadata.sentiment || null,
        metadata.confidence || null,
        now,
        JSON.stringify(metadata)
      ).run();

      // Update conversation
      await this.db.prepare(`
        UPDATE conversations 
        SET last_activity = ?, message_count = message_count + 1
        WHERE id = ?
      `).bind(now, conversationId).run();

      return messageId;
    } catch (error) {
      console.error('Database error adding message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   * @param {string} lineUserId - LINE user ID
   * @param {number} limit - Number of messages to retrieve
   * @returns {Array} Message history
   */
  async getConversationHistory(lineUserId, limit = 10) {
    try {
      const messages = await this.db.prepare(`
        SELECT m.* FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.line_user_id = ? AND c.status = 'active'
        ORDER BY m.timestamp DESC LIMIT ?
      `).bind(lineUserId, limit).all();

      return messages.results.map(msg => ({
        ...msg,
        metadata: this.parseJSON(msg.metadata)
      })).reverse();
    } catch (error) {
      console.error('Database error getting conversation history:', error);
      return [];
    }
  }

  /**
   * End conversation
   * @param {string} conversationId - Conversation ID
   */
  async endConversation(conversationId) {
    try {
      await this.db.prepare(`
        UPDATE conversations 
        SET status = 'ended', last_activity = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), conversationId).run();
    } catch (error) {
      console.error('Database error ending conversation:', error);
    }
  }

  // ===============================
  // Product Operations
  // ===============================

  /**
   * Search products
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Product results
   */
  async searchProducts(query, options = {}) {
    try {
      let sql = 'SELECT * FROM products WHERE status = "active"';
      const params = [];

      if (query) {
        sql += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (options.category) {
        sql += ' AND category = ?';
        params.push(options.category);
      }

      sql += ' ORDER BY name LIMIT ?';
      params.push(options.limit || 10);

      const products = await this.db.prepare(sql).bind(...params).all();

      return products.results.map(product => ({
        ...product,
        specifications: this.parseJSON(product.specifications),
        multilingual: this.parseJSON(product.multilingual),
        availability: this.parseJSON(product.availability),
        analytics: this.parseJSON(product.analytics)
      }));
    } catch (error) {
      console.error('Database error searching products:', error);
      return [];
    }
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {Object|null} Product data
   */
  async getProduct(productId) {
    try {
      const product = await this.db.prepare(
        'SELECT * FROM products WHERE id = ? AND status = "active"'
      ).bind(productId).first();

      if (product) {
        return {
          ...product,
          specifications: this.parseJSON(product.specifications),
          multilingual: this.parseJSON(product.multilingual),
          availability: this.parseJSON(product.availability),
          analytics: this.parseJSON(product.analytics)
        };
      }

      return null;
    } catch (error) {
      console.error('Database error getting product:', error);
      return null;
    }
  }

  /**
   * Create product
   * @param {Object} productData - Product information
   * @returns {Object} Created product
   */
  async createProduct(productData) {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await this.db.prepare(`
        INSERT INTO products (
          id, name, description, price, currency, category, subcategory,
          specifications, multilingual, availability, analytics,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).bind(
        id,
        productData.name,
        productData.description || '',
        productData.price || 0,
        productData.currency || 'THB',
        productData.category || '',
        productData.subcategory || '',
        JSON.stringify(productData.specifications || {}),
        JSON.stringify(productData.multilingual || {}),
        JSON.stringify(productData.availability || {}),
        JSON.stringify(productData.analytics || {}),
        now,
        now
      ).run();

      return await this.getProduct(id);
    } catch (error) {
      console.error('Database error creating product:', error);
      throw error;
    }
  }

  /**
   * Update product
   * @param {string} productId - Product ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated product
   */
  async updateProduct(productId, updates) {
    try {
      const updateFields = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'price', 'currency', 'category', 'subcategory', 'status'
      ];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      });

      const jsonFields = ['specifications', 'multilingual', 'availability', 'analytics'];
      jsonFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(JSON.stringify(updates[field]));
        }
      });

      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(productId);

      await this.db.prepare(`
        UPDATE products SET ${updateFields.join(', ')} WHERE id = ?
      `).bind(...values).run();

      return await this.getProduct(productId);
    } catch (error) {
      console.error('Database error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   * @param {string} productId - Product ID
   */
  async deleteProduct(productId) {
    try {
      await this.db.prepare(`
        UPDATE products 
        SET status = 'deleted', updated_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), productId).run();
    } catch (error) {
      console.error('Database error deleting product:', error);
      throw error;
    }
  }

  // ===============================
  // AI Session Operations
  // ===============================

  /**
   * Get AI session for user and provider
   * @param {string} lineUserId - LINE user ID
   * @param {string} provider - AI provider
   * @returns {Object|null} AI session
   */
  async getAISession(lineUserId, provider) {
    try {
      const session = await this.db.prepare(`
        SELECT * FROM ai_sessions 
        WHERE line_user_id = ? AND provider = ? AND status = 'active'
        ORDER BY updated_at DESC LIMIT 1
      `).bind(lineUserId, provider).first();

      if (session) {
        return {
          ...session,
          session_data: this.parseJSON(session.session_data),
          context: this.parseJSON(session.context)
        };
      }

      return null;
    } catch (error) {
      console.error('Database error getting AI session:', error);
      return null;
    }
  }

  /**
   * Create or update AI session
   * @param {string} lineUserId - LINE user ID
   * @param {string} provider - AI provider
   * @param {Object} sessionData - Session data
   * @param {Object} context - Context data
   * @returns {string} Session ID
   */
  async upsertAISession(lineUserId, provider, sessionData, context) {
    try {
      const existing = await this.getAISession(lineUserId, provider);
      const now = new Date().toISOString();

      if (existing) {
        // Update existing session
        await this.db.prepare(`
          UPDATE ai_sessions 
          SET session_data = ?, context = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          JSON.stringify(sessionData),
          JSON.stringify(context),
          now,
          existing.id
        ).run();

        return existing.id;
      } else {
        // Create new session
        const id = crypto.randomUUID();
        
        await this.db.prepare(`
          INSERT INTO ai_sessions (id, line_user_id, provider, session_data, context, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
        `).bind(
          id,
          lineUserId,
          provider,
          JSON.stringify(sessionData),
          JSON.stringify(context),
          now,
          now
        ).run();

        return id;
      }
    } catch (error) {
      console.error('Database error upserting AI session:', error);
      throw error;
    }
  }

  // ===============================
  // Cache Operations (Workers KV)
  // ===============================

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @returns {*} Cached value
   */
  async getCachedResponse(key) {
    try {
      const cached = await this.kv.get(key, 'json');
      return cached;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached response
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async setCachedResponse(key, value, ttl = 3600) {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached response
   * @param {string} key - Cache key
   */
  async deleteCachedResponse(key) {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Get multiple cached responses
   * @param {Array} keys - Cache keys
   * @returns {Object} Key-value pairs
   */
  async getMultipleCachedResponses(keys) {
    try {
      const results = {};
      const promises = keys.map(async (key) => {
        const value = await this.kv.get(key, 'json');
        if (value !== null) {
          results[key] = value;
        }
      });

      await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Cache multi-get error:', error);
      return {};
    }
  }

  // ===============================
  // Analytics Operations
  // ===============================

  /**
   * Get analytics data
   * @param {Object} options - Query options
   * @returns {Object} Analytics data
   */
  async getAnalytics(options = {}) {
    try {
      const { startDate, endDate } = options;
      let dateFilter = '';
      const params = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE m.timestamp BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      // Get basic stats
      const stats = await this.db.prepare(`
        SELECT 
          COUNT(DISTINCT c.line_user_id) as active_users,
          COUNT(m.id) as total_messages,
          AVG(m.confidence) as avg_confidence,
          COUNT(DISTINCT c.id) as total_conversations
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        ${dateFilter}
      `).bind(...params).first();

      // Get message distribution by intent
      const intents = await this.db.prepare(`
        SELECT 
          m.intent,
          COUNT(*) as count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        ${dateFilter}
        GROUP BY m.intent
        ORDER BY count DESC
        LIMIT 10
      `).bind(...params).all();

      // Get language distribution
      const languages = await this.db.prepare(`
        SELECT 
          language,
          COUNT(*) as count
        FROM conversations
        GROUP BY language
        ORDER BY count DESC
      `).all();

      return {
        overview: stats,
        intents: intents.results,
        languages: languages.results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database error getting analytics:', error);
      return {
        overview: {},
        intents: [],
        languages: [],
        error: error.message
      };
    }
  }

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Safely parse JSON string
   * @param {string} jsonString - JSON string to parse
   * @returns {*} Parsed object or default value
   */
  parseJSON(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : {};
    } catch (error) {
      console.error('JSON parse error:', error);
      return {};
    }
  }

  /**
   * Execute raw SQL query (for migrations and maintenance)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {*} Query result
   */
  async executeRaw(sql, params = []) {
    try {
      return await this.db.prepare(sql).bind(...params).run();
    } catch (error) {
      console.error('Raw query error:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   * @returns {Object} Database stats
   */
  async getDatabaseStats() {
    try {
      const tables = ['customers', 'conversations', 'messages', 'products', 'ai_sessions'];
      const stats = {};

      for (const table of tables) {
        const result = await this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        stats[table] = result.count;
      }

      return {
        tables: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database stats error:', error);
      return { error: error.message };
    }
  }
}