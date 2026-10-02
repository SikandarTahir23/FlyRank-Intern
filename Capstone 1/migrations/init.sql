-- Capstone Widget Platform - Database Initialization Script
-- This script is idempotent and can be run multiple times safely

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    api_key         VARCHAR(64) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key);

-- ============================================
-- WIDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS widgets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('lead-form', 'contact', 'newsletter', 'custom')),
    config_json     JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id ON widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_active ON widgets(tenant_id, is_active) WHERE is_active;

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    widget_id       UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payload_json    JSONB NOT NULL,
    ip_address      INET NOT NULL,
    geo_country     VARCHAR(2),
    geo_city        VARCHAR(100),
    is_spam         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_submissions_widget_created ON submissions(widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_created ON submissions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_widget_tenant_created ON submissions(widget_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_ip_created ON submissions(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_is_spam_created ON submissions(is_spam, created_at DESC) WHERE is_spam = FALSE;

-- Additional partial indexes for common dashboard filters
CREATE INDEX IF NOT EXISTS idx_submissions_recent ON submissions(created_at DESC)
    WHERE created_at > NOW() - INTERVAL '30 days';

-- For geo analytics
CREATE INDEX IF NOT EXISTS idx_submissions_geo_country ON submissions(geo_country, created_at DESC)
    WHERE geo_country IS NOT NULL;

-- ============================================
-- SEED DATA (Deterministic for evaluation probes)
-- ============================================
-- Tenant Alpha
INSERT INTO tenants (id, name, api_key) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant Alpha', 'tk_alpha_abcdef123456')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key;

-- Tenant Beta
INSERT INTO tenants (id, name, api_key) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Tenant Beta', 'tk_beta_ghijkl789012')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    api_key = EXCLUDED.api_key;

-- Widget for Tenant Alpha
INSERT INTO widgets (id, tenant_id, name, type, config_json, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alpha Lead Form', 'lead-form',
     '{"title": "Get in Touch", "fields": [{"name": "email", "label": "Email", "type": "email", "required": true}, {"name": "name", "label": "Name", "type": "text", "required": true}, {"name": "message", "label": "Message", "type": "textarea", "required": false}], "buttonText": "Submit", "honeypotFieldName": "website_url"}', TRUE)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    config_json = EXCLUDED.config_json,
    is_active = EXCLUDED.is_active;

-- Second widget for Tenant Alpha
INSERT INTO widgets (id, tenant_id, name, type, config_json, is_active) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Alpha Newsletter', 'newsletter',
     '{"title": "Subscribe to Updates", "fields": [{"name": "email", "label": "Email", "type": "email", "required": true}], "buttonText": "Subscribe", "honeypotFieldName": "website"}', TRUE)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    config_json = EXCLUDED.config_json,
    is_active = EXCLUDED.is_active;

-- Widget for Tenant Beta
INSERT INTO widgets (id, tenant_id, name, type, config_json, is_active) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Beta Contact Form', 'contact',
     '{"title": "Contact Us", "fields": [{"name": "email", "label": "Email", "type": "email", "required": true}, {"name": "subject", "label": "Subject", "type": "text", "required": true}, {"name": "message", "label": "Message", "type": "textarea", "required": true}], "buttonText": "Send Message", "honeypotFieldName": "url"}', TRUE)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    config_json = EXCLUDED.config_json,
    is_active = EXCLUDED.is_active;

-- Second widget for Tenant Beta
INSERT INTO widgets (id, tenant_id, name, type, config_json, is_active) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Beta Feedback', 'lead-form',
     '{"title": "Feedback Form", "fields": [{"name": "email", "label": "Email", "type": "email", "required": true}, {"name": "rating", "label": "Rating (1-5)", "type": "number", "required": true}, {"name": "comments", "label": "Comments", "type": "textarea", "required": false}], "buttonText": "Submit Feedback", "honeypotFieldName": "website_field"}', TRUE)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    config_json = EXCLUDED.config_json,
    is_active = EXCLUDED.is_active;