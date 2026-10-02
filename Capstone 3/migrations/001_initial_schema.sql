-- Migration: 001_initial_schema.sql
-- Initial schema for Usage Metering & Billing Engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tenants table
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    stripe_customer_id  VARCHAR(255) UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE deleted_at IS NULL;

-- plans table
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key                 VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    monthly_price_cents INTEGER NOT NULL DEFAULT 0,
    stripe_price_id     VARCHAR(255) UNIQUE,
    monthly_token_limit BIGINT,
    monthly_request_limit BIGINT,
    price_input_tokens_cents      INTEGER NOT NULL DEFAULT 0,
    price_cached_input_tokens_cents INTEGER NOT NULL DEFAULT 0,
    price_output_tokens_cents     INTEGER NOT NULL DEFAULT 0,
    price_reasoning_tokens_cents  INTEGER NOT NULL DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plans
INSERT INTO plans (key, name, description, monthly_price_cents, monthly_token_limit, monthly_request_limit,
    price_input_tokens_cents, price_cached_input_tokens_cents, price_output_tokens_cents, price_reasoning_tokens_cents)
VALUES 
    ('free', 'Free Tier', 'Free tier with limited usage', 0, 100000, 1000, 50, 10, 150, 150),
    ('pro', 'Pro Tier', 'Professional tier with higher limits', 2900, 10000000, 100000, 30, 5, 90, 90)
ON CONFLICT (key) DO NOTHING;

-- subscriptions table
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    plan_id                 UUID NOT NULL REFERENCES plans(id),
    stripe_subscription_id  VARCHAR(255) UNIQUE,
    stripe_customer_id      VARCHAR(255) NOT NULL,
    status                  VARCHAR(50) NOT NULL,
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    canceled_at             TIMESTAMPTZ,
    version                 INTEGER NOT NULL DEFAULT 1,
    metadata                JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_subscriptions_tenant_active 
    ON subscriptions(tenant_id) 
    WHERE status IN ('trialing', 'active', 'past_due');

CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- usage_events table
CREATE TABLE usage_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    subscription_id         UUID NOT NULL REFERENCES subscriptions(id),
    idempotency_key         VARCHAR(255) NOT NULL,
    event_type              VARCHAR(50) NOT NULL,
    input_tokens            BIGINT NOT NULL DEFAULT 0,
    cached_input_tokens     BIGINT NOT NULL DEFAULT 0,
    output_tokens           BIGINT NOT NULL DEFAULT 0,
    reasoning_tokens        BIGINT NOT NULL DEFAULT 0,
    cost_cents              BIGINT NOT NULL DEFAULT 0,
    request_id              VARCHAR(255),
    model                   VARCHAR(100),
    endpoint                VARCHAR(255),
    metadata                JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usage_events_idempotency 
    ON usage_events(tenant_id, idempotency_key);

CREATE INDEX idx_usage_events_subscription_period 
    ON usage_events(subscription_id, created_at);

CREATE INDEX idx_usage_events_tenant_created 
    ON usage_events(tenant_id, created_at DESC);

-- usage_aggregates table
CREATE TABLE usage_aggregates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id         UUID NOT NULL REFERENCES subscriptions(id),
    period_start            TIMESTAMPTZ NOT NULL,
    period_end              TIMESTAMPTZ NOT NULL,
    total_input_tokens      BIGINT NOT NULL DEFAULT 0,
    total_cached_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens     BIGINT NOT NULL DEFAULT 0,
    total_reasoning_tokens  BIGINT NOT NULL DEFAULT 0,
    total_cost_cents        BIGINT NOT NULL DEFAULT 0,
    request_count           BIGINT NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, period_start)
);

CREATE INDEX idx_usage_aggregates_subscription_period 
    ON usage_aggregates(subscription_id, period_start DESC);

-- stripe_webhook_events table
CREATE TABLE stripe_webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type      VARCHAR(100) NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload         JSONB NOT NULL
);

CREATE INDEX idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);

-- Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
    USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON subscriptions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON usage_events
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON usage_aggregates
    USING (subscription_id IN (
        SELECT id FROM subscriptions WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
    ));

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();