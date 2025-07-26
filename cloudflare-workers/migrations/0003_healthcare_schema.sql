-- Healthcare-specific database schema for Cloudflare D1
-- Migration 0003: Healthcare features and analytics

-- Healthcare analytics table with privacy compliance
CREATE TABLE healthcare_analytics (
  id TEXT PRIMARY KEY,
  anonymous_user_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  confidence REAL,
  response_time INTEGER,
  research_used BOOLEAN DEFAULT FALSE,
  query_length INTEGER,
  response_length INTEGER,
  user_region TEXT,
  time_of_day TEXT,
  day_of_week INTEGER,
  privacy_level TEXT DEFAULT 'strict',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Privacy consent tracking
CREATE TABLE healthcare_consent (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  consent_type TEXT DEFAULT 'healthcare_data',
  granted_at DATETIME,
  expires_at DATETIME,
  withdrawn_at DATETIME,
  ip_address TEXT, -- For legal compliance
  user_agent TEXT, -- For audit trail
  consent_version TEXT DEFAULT '1.0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Medical knowledge base cache
CREATE TABLE medical_knowledge_cache (
  id TEXT PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  intent_type TEXT NOT NULL,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  structured_data TEXT, -- JSON
  confidence_score REAL DEFAULT 0.8,
  source_type TEXT DEFAULT 'knowledge_base', -- 'knowledge_base', 'research', 'hybrid'
  cache_version TEXT DEFAULT '1.0',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Medical research results cache
CREATE TABLE medical_research_cache (
  id TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  language TEXT NOT NULL,
  results TEXT NOT NULL, -- JSON array of research results
  sources_used TEXT, -- JSON array of source IDs
  quality_score REAL DEFAULT 0.0,
  relevance_score REAL DEFAULT 0.0,
  research_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare interaction logs (anonymized)
CREATE TABLE healthcare_interactions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  anonymous_user_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- 'query', 'consent', 'feedback'
  intent TEXT,
  language TEXT DEFAULT 'en',
  confidence REAL,
  response_source TEXT, -- 'knowledge_base', 'research', 'ai', 'fallback'
  research_sources_count INTEGER DEFAULT 0,
  processing_time INTEGER,
  quality_score REAL,
  user_satisfaction INTEGER, -- 1-5 rating if provided
  error_occurred BOOLEAN DEFAULT FALSE,
  error_type TEXT,
  privacy_compliant BOOLEAN DEFAULT TRUE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Medical content moderation log
CREATE TABLE medical_content_moderation (
  id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'query', 'response', 'research_result'
  moderation_result TEXT NOT NULL, -- 'approved', 'flagged', 'blocked'
  flags TEXT, -- JSON array of flags
  confidence_score REAL DEFAULT 0.0,
  reviewed_by TEXT DEFAULT 'automated',
  review_notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare provider source reliability tracking
CREATE TABLE medical_source_reliability (
  id TEXT PRIMARY KEY,
  source_id TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  reliability_score REAL DEFAULT 0.5,
  total_queries INTEGER DEFAULT 0,
  successful_queries INTEGER DEFAULT 0,
  failed_queries INTEGER DEFAULT 0,
  average_response_time INTEGER DEFAULT 0,
  last_successful_query DATETIME,
  last_failed_query DATETIME,
  content_quality_score REAL DEFAULT 0.5,
  medical_accuracy_score REAL DEFAULT 0.5,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_healthcare_analytics_anonymous_user ON healthcare_analytics (anonymous_user_id);
CREATE INDEX idx_healthcare_analytics_intent ON healthcare_analytics (intent);
CREATE INDEX idx_healthcare_analytics_timestamp ON healthcare_analytics (timestamp);
CREATE INDEX idx_healthcare_analytics_expires ON healthcare_analytics (expires_at);

CREATE INDEX idx_healthcare_consent_user ON healthcare_consent (user_id);
CREATE INDEX idx_healthcare_consent_granted ON healthcare_consent (granted);
CREATE INDEX idx_healthcare_consent_expires ON healthcare_consent (expires_at);

CREATE INDEX idx_medical_knowledge_cache_key ON medical_knowledge_cache (cache_key);
CREATE INDEX idx_medical_knowledge_cache_intent ON medical_knowledge_cache (intent_type, language);
CREATE INDEX idx_medical_knowledge_cache_expires ON medical_knowledge_cache (expires_at);

CREATE INDEX idx_medical_research_cache_hash ON medical_research_cache (query_hash);
CREATE INDEX idx_medical_research_cache_language ON medical_research_cache (language);
CREATE INDEX idx_medical_research_cache_expires ON medical_research_cache (expires_at);

CREATE INDEX idx_healthcare_interactions_anonymous_user ON healthcare_interactions (anonymous_user_id);
CREATE INDEX idx_healthcare_interactions_intent ON healthcare_interactions (intent);
CREATE INDEX idx_healthcare_interactions_timestamp ON healthcare_interactions (timestamp);
CREATE INDEX idx_healthcare_interactions_type ON healthcare_interactions (interaction_type);

CREATE INDEX idx_medical_content_moderation_hash ON medical_content_moderation (content_hash);
CREATE INDEX idx_medical_content_moderation_result ON medical_content_moderation (moderation_result);
CREATE INDEX idx_medical_content_moderation_timestamp ON medical_content_moderation (timestamp);

CREATE INDEX idx_medical_source_reliability_source ON medical_source_reliability (source_id);
CREATE INDEX idx_medical_source_reliability_active ON medical_source_reliability (is_active);
CREATE INDEX idx_medical_source_reliability_score ON medical_source_reliability (reliability_score);

-- Views for analytics and reporting
CREATE VIEW healthcare_analytics_summary AS
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_interactions,
  COUNT(DISTINCT anonymous_user_id) as unique_users,
  AVG(confidence) as avg_confidence,
  AVG(response_time) as avg_response_time,
  SUM(CASE WHEN research_used THEN 1 ELSE 0 END) as research_used_count,
  COUNT(*) - SUM(CASE WHEN research_used THEN 1 ELSE 0 END) as knowledge_only_count
FROM healthcare_analytics 
WHERE expires_at > CURRENT_TIMESTAMP
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE VIEW healthcare_intent_distribution AS
SELECT 
  intent,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  AVG(response_time) as avg_response_time,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM healthcare_analytics WHERE expires_at > CURRENT_TIMESTAMP)), 2) as percentage
FROM healthcare_analytics 
WHERE expires_at > CURRENT_TIMESTAMP
GROUP BY intent
ORDER BY count DESC;

CREATE VIEW medical_source_performance AS
SELECT 
  source_id,
  source_name,
  reliability_score,
  total_queries,
  ROUND((successful_queries * 100.0 / NULLIF(total_queries, 0)), 2) as success_rate,
  average_response_time,
  content_quality_score,
  medical_accuracy_score,
  is_active,
  last_successful_query,
  updated_at
FROM medical_source_reliability
ORDER BY reliability_score DESC;

-- Triggers for data cleanup and maintenance
CREATE TRIGGER cleanup_expired_analytics
AFTER INSERT ON healthcare_analytics
BEGIN
  DELETE FROM healthcare_analytics 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;

CREATE TRIGGER cleanup_expired_consent
AFTER INSERT ON healthcare_consent
BEGIN
  DELETE FROM healthcare_consent 
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
END;

CREATE TRIGGER cleanup_expired_cache
AFTER INSERT ON medical_knowledge_cache
BEGIN
  DELETE FROM medical_knowledge_cache 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  DELETE FROM medical_research_cache 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;

-- Update source reliability on query completion
CREATE TRIGGER update_source_reliability
AFTER INSERT ON healthcare_interactions
WHEN NEW.research_sources_count > 0
BEGIN
  UPDATE medical_source_reliability 
  SET 
    total_queries = total_queries + 1,
    successful_queries = successful_queries + CASE WHEN NEW.error_occurred = FALSE THEN 1 ELSE 0 END,
    failed_queries = failed_queries + CASE WHEN NEW.error_occurred = TRUE THEN 1 ELSE 0 END,
    last_successful_query = CASE WHEN NEW.error_occurred = FALSE THEN CURRENT_TIMESTAMP ELSE last_successful_query END,
    last_failed_query = CASE WHEN NEW.error_occurred = TRUE THEN CURRENT_TIMESTAMP ELSE last_failed_query END,
    updated_at = CURRENT_TIMESTAMP
  WHERE source_id IN (
    -- This would need to be populated based on actual sources used
    SELECT 'placeholder_source'
  );
END;

-- Initial data for medical source reliability
INSERT INTO medical_source_reliability (
  source_id, source_name, source_url, reliability_score, 
  content_quality_score, medical_accuracy_score, is_active
) VALUES 
  ('who_int', 'World Health Organization', 'https://www.who.int', 0.98, 0.95, 0.98, TRUE),
  ('cdc_gov', 'Centers for Disease Control and Prevention', 'https://www.cdc.gov', 0.97, 0.94, 0.97, TRUE),
  ('nih_gov', 'National Institutes of Health', 'https://www.nih.gov', 0.96, 0.93, 0.96, TRUE),
  ('mayoclinic_org', 'Mayo Clinic', 'https://www.mayoclinic.org', 0.95, 0.92, 0.94, TRUE),
  ('aidsinfo_nih_gov', 'AIDSinfo - NIH', 'https://aidsinfo.nih.gov', 0.97, 0.95, 0.97, TRUE),
  ('thaiddc_ddc_moph_go_th', 'Department of Disease Control Thailand', 'https://thaiddc.ddc.moph.go.th', 0.94, 0.90, 0.93, TRUE);

-- Comments for documentation
PRAGMA table_info(healthcare_analytics);
PRAGMA table_info(healthcare_consent);
PRAGMA table_info(medical_knowledge_cache);
PRAGMA table_info(medical_research_cache);
PRAGMA table_info(healthcare_interactions);
PRAGMA table_info(medical_content_moderation);
PRAGMA table_info(medical_source_reliability);