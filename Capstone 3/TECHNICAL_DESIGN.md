# Technical Design Document: Usage Metering & Billing Engine

## 1. Overview

This document outlines the architecture for a multi-tenant Usage Metering & Billing Engine built with Node.js, Express, and PostgreSQL. The system handles subscription management, usage tracking with idempotency guarantees, quota enforcement, complex AI token pricing, and Stripe webhook processing.

---

## 2. Database Schema

### 2.1 Design Principles

- **Strict Tenant Isolation**: All data scoped by `tenant_id` with row-level security
- **Immutable Usage Events**: Append-only event log for auditability
- **Optimistic Concurrency**: Version counters on subscriptions for safe concurrent updates
- **Soft Deletes**: `deleted_at` timestamps for audit trails

### 2.2 Tables

#### `tenants`
```sql
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
```

#### `plans`
```sql
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key                 VARCHAR(50) NOT NULL UNIQUE,  -- 'free', 'pro'
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    monthly_price_cents INTEGER NOT NULL DEFAULT 0,
    stripe_price_id     VARCHAR(255) UNIQUE,
    
    -- Quota limits (NULL = unlimited)
    monthly_token_limit BIGINT,
    monthly_request_limit BIGINT,
    
    -- Token pricing (per 1M tokens, in cents)
    price_input_tokens_cents      INTEGER NOT NULL DEFAULT 0,
    price_cached_input_tokens_cents INTEGER NOT NULL DEFAULT 0,
    price_output_tokens_cents     INTEGER NOT NULL DEFAULT 0,
    price_reasoning_tokens_cents  INTEGER NOT NULL DEFAULT 0,
    
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO plans (key, name, monthly_price_cents, monthly_token_limit, monthly_request_limit,
    price_input_tokens_cents, price_cached_input_tokens_cents, price_output_tokens_cents, price_reasoning_tokens_cents)
VALUES 
    ('free', 'Free Tier', 0, 100000, 1000, 50, 10, 150, 150),
    ('pro', 'Pro Tier', 2900, 10000000, 100000, 30, 5, 90, 90);
```

#### `subscriptions`
```sql
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    plan_id                 UUID NOT NULL REFERENCES plans(id),
    stripe_subscription_id  VARCHAR(255) UNIQUE,
    stripe_customer_id      VARCHAR(255) NOT NULL,
    status                  VARCHAR(50) NOT NULL,  -- 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    canceled_at             TIMESTAMPTZ,
    version                 INTEGER NOT NULL DEFAULT 1,  -- Optimistic locking
    metadata                JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_subscriptions_tenant_active 
    ON subscriptions(tenant_id) 
    WHERE status IN ('trialing', 'active', 'past_due') AND deleted_at IS NULL;

CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
```

#### `usage_events`
```sql
CREATE TABLE usage_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    subscription_id         UUID NOT NULL REFERENCES subscriptions(id),
    idempotency_key         VARCHAR(255) NOT NULL,
    event_type              VARCHAR(50) NOT NULL,  -- 'token_usage', 'api_request'
    
    -- Token breakdown (mutually exclusive categories per event)
    input_tokens            BIGINT NOT NULL DEFAULT 0,
    cached_input_tokens     BIGINT NOT NULL DEFAULT 0,
    output_tokens           BIGINT NOT NULL DEFAULT 0,
    reasoning_tokens        BIGINT NOT NULL DEFAULT 0,
    
    -- Computed cost at time of event (in cents)
    cost_cents              BIGINT NOT NULL DEFAULT 0,
    
    -- Request metadata
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
```

#### `usage_aggregates` (Materialized view for fast quota checks)
```sql
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
```

### 2.3 Row-Level Security (RLS)

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_aggregates ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only see their own data
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
```

---

## 3. Idempotency Strategy

### 3.1 Requirements

- **Exactly-once semantics**: Network retries must not create duplicate usage events
- **Client-generated keys**: Clients provide `Idempotency-Key` header (UUID v4 recommended)
- **TTL-based cleanup**: Keys expire after 24 hours to prevent unbounded growth

### 3.2 Flow

```
Client Request
     |
     v
+---------------------------------+
| Extract Idempotency-Key header |
+---------------------------------+
     |
     v
+---------------------------------+
| Validate key format (UUID v4)   |
+---------------------------------+
     |
     v
+---------------------------------+
| BEGIN TRANSACTION               |
| SELECT * FROM usage_events      |
|   WHERE tenant_id = ?           |
|     AND idempotency_key = ?     |
|   FOR UPDATE                    |
+---------------------------------+
     |
     +--> FOUND: Return existing event (200 OK with cached response)
     |
     +--> NOT FOUND:
         +---------------------------------+
         | Process billable action         |
         | Calculate cost                  |
         | INSERT INTO usage_events (...)  |
         |   ON CONFLICT (tenant_id,       |
         |                idempotency_key) |
         |   DO NOTHING                    |
         | UPDATE usage_aggregates         |
         | COMMIT                          |
         +---------------------------------+
     |
     v
Return response
```

### 3.3 Implementation Details

```typescript
// Middleware: idempotency.ts
export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  if (!key || !isValidUUID(key)) {
    return res.status(400).json({ error: 'Invalid or missing Idempotency-Key header' });
  }
  
  // Store key on request for downstream handlers
  req.idempotencyKey = key;
  next();
}

// Service: usageService.ts
async function recordUsageEvent(params: {
  tenantId: string;
  subscriptionId: string;
  idempotencyKey: string;
  eventData: UsageEventInput;
}): Promise<UsageEvent> {
  return await pg.transaction(async (tx) => {
    // Check existing
    const existing = await tx.query(
      `SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2 FOR UPDATE`,
      [params.tenantId, params.idempotencyKey]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    
    // Calculate cost
    const costCents = calculateTokenCost(params.eventData, params.subscriptionId);
    
    // Insert new event
    const result = await tx.query(
      `INSERT INTO usage_events (tenant_id, subscription_id, idempotency_key, ...)
       VALUES ($1, $2, $3, ...)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING *`,
      [params.tenantId, params.subscriptionId, params.idempotencyKey, ...]
    );
    
    if (result.rows.length === 0) {
      // Race condition: another request won the insert
      const retry = await tx.query(
        `SELECT * FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2`,
        [params.tenantId, params.idempotencyKey]
      );
      return retry.rows[0];
    }
    
    // Update aggregate
    await updateUsageAggregate(tx, params.subscriptionId, params.eventData, costCents);
    
    return result.rows[0];
  });
}
```

### 3.4 Key Cleanup Job

```sql
-- Run daily via pg_cron or external scheduler
DELETE FROM usage_events 
WHERE created_at < NOW() - INTERVAL '24 hours'
  AND idempotency_key IS NOT NULL;
```

---

## 4. Quota Enforcement

### 4.1 Enforcement Points

1. **Pre-flight Check**: Middleware validates quota before processing request
2. **Atomic Reservation**: Reserve quota within transaction to prevent race conditions
3. **Graceful Rejection**: Clear HTTP status codes and messages

### 4.2 HTTP Status Codes

| Scenario | Status Code | Response Body |
|----------|-------------|---------------|
| Request limit exceeded | `429 Too Many Requests` | `{ "error": "RATE_LIMIT_EXCEEDED", "message": "Monthly request limit reached. Upgrade to Pro for higher limits.", "retryAfter": 2592000, "limit": 1000, "used": 1000 }` |
| Token limit exceeded | `402 Payment Required` | `{ "error": "QUOTA_EXCEEDED", "message": "Monthly token limit reached. Upgrade to Pro for higher limits.", "retryAfter": 2592000, "limit": 100000, "used": 100000 }` |
| Subscription inactive | `402 Payment Required` | `{ "error": "SUBSCRIPTION_INACTIVE", "message": "Subscription is not active. Please update payment method.", "retryAfter": null }` |

### 4.3 Quota Check Logic

```typescript
// Middleware: quotaEnforcement.ts
export async function quotaEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.tenant.id;
  const subscription = await getActiveSubscription(tenantId);
  
  if (!subscription) {
    return res.status(402).json({
      error: 'SUBSCRIPTION_INACTIVE',
      message: 'No active subscription found. Please subscribe to a plan.',
      retryAfter: null
    });
  }
  
  const plan = await getPlan(subscription.planId);
  const usage = await getCurrentPeriodUsage(subscription.id);
  
  // Check request limit
  if (plan.monthlyRequestLimit && usage.requestCount >= plan.monthlyRequestLimit) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Monthly request limit of ${plan.monthlyRequestLimit} reached. Upgrade to Pro for higher limits.`,
      retryAfter: getSecondsUntilPeriodEnd(subscription.currentPeriodEnd),
      limit: plan.monthlyRequestLimit,
      used: usage.requestCount
    });
  }
  
  // Check token limit (estimated for this request)
  const estimatedTokens = estimateRequestTokens(req);
  if (plan.monthlyTokenLimit && usage.totalTokens + estimatedTokens > plan.monthlyTokenLimit) {
    return res.status(402).json({
      error: 'QUOTA_EXCEEDED',
      message: `Monthly token limit of ${plan.monthlyTokenLimit} would be exceeded. Upgrade to Pro for higher limits.`,
      retryAfter: getSecondsUntilPeriodEnd(subscription.currentPeriodEnd),
      limit: plan.monthlyTokenLimit,
      used: usage.totalTokens
    });
  }
  
  // Attach quota info to response headers
  res.set({
    'X-RateLimit-Limit-Requests': plan.monthlyRequestLimit?.toString() || 'unlimited',
    'X-RateLimit-Remaining-Requests': Math.max(0, (plan.monthlyRequestLimit || 0) - usage.requestCount).toString(),
    'X-RateLimit-Limit-Tokens': plan.monthlyTokenLimit?.toString() || 'unlimited',
    'X-RateLimit-Remaining-Tokens': Math.max(0, (plan.monthlyTokenLimit || 0) - usage.totalTokens).toString(),
    'X-RateLimit-Reset': Math.ceil(subscription.currentPeriodEnd.getTime() / 1000).toString()
  });
  
  next();
}
```

### 4.4 Atomic Quota Reservation (for high-concurrency scenarios)

```sql
-- For critical paths, reserve quota atomically
CREATE OR REPLACE FUNCTION reserve_quota(
    p_subscription_id UUID,
    p_input_tokens BIGINT,
    p_cached_input_tokens BIGINT,
    p_output_tokens BIGINT,
    p_reasoning_tokens BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_plan RECORD;
    v_usage RECORD;
    v_new_total_tokens BIGINT;
BEGIN
    SELECT p.*, s.current_period_start, s.current_period_end
    INTO v_plan
    FROM plans p
    JOIN subscriptions s ON s.plan_id = p.id
    WHERE s.id = p_subscription_id AND s.status IN ('trialing', 'active', 'past_due');
    
    SELECT COALESCE(SUM(input_tokens + cached_input_tokens + output_tokens + reasoning_tokens), 0),
           COALESCE(SUM(request_count), 0)
    INTO v_usage
    FROM usage_aggregates
    WHERE subscription_id = p_subscription_id
      AND period_start = v_plan.current_period_start;
    
    v_new_total_tokens := v_usage.total_tokens + p_input_tokens + p_cached_input_tokens + p_output_tokens + p_reasoning_tokens;
    
    IF v_plan.monthly_token_limit IS NOT NULL AND v_new_total_tokens > v_plan.monthly_token_limit THEN
        RETURN FALSE;
    END IF;
    
    IF v_plan.monthly_request_limit IS NOT NULL AND v_usage.request_count + 1 > v_plan.monthly_request_limit THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Cost Calculation Math

### 5.1 Pricing Model

Token categories are **mutually exclusive** per request and priced independently:

| Token Category | Description | Pricing Basis |
|----------------|-------------|---------------|
| Input Tokens | Standard prompt tokens | Per 1M tokens |
| Cached Input Tokens | Prefix cache hits (cheaper) | Per 1M tokens (discounted) |
| Output Tokens | Generated completion tokens | Per 1M tokens |
| Reasoning Tokens | Chain-of-thought tokens | Per 1M tokens (priced as output) |

### 5.2 Mathematical Formula

```
Total Cost (cents) = 
    floor(input_tokens / 1_000_000) * price_input_tokens_cents
  + floor(cached_input_tokens / 1_000_000) * price_cached_input_tokens_cents
  + floor(output_tokens / 1_000_000) * price_output_tokens_cents
  + floor(reasoning_tokens / 1_000_000) * price_reasoning_tokens_cents
```

**Important**: Categories are calculated **separately** then summed. Do NOT combine token counts before pricing.

### 5.3 Example Calculation

```typescript
// Plan: Pro tier
// price_input_tokens_cents = 30 (per 1M)
// price_cached_input_tokens_cents = 5 (per 1M)
// price_output_tokens_cents = 90 (per 1M)
// price_reasoning_tokens_cents = 90 (per 1M)

// Request:
// input_tokens = 1,500,000
// cached_input_tokens = 500,000
// output_tokens = 800,000
// reasoning_tokens = 200,000

// Calculation:
cost = floor(1,500,000 / 1,000,000) * 30      // = 1 * 30 = 30 cents
     + floor(500,000 / 1,000,000) * 5          // = 0 * 5 = 0 cents
     + floor(800,000 / 1,000,000) * 90         // = 0 * 90 = 0 cents
     + floor(200,000 / 1,000,000) * 90         // = 0 * 90 = 0 cents
     = 30 cents

// Note: Sub-million tokens in a category are free (floor division)
// This matches typical AI provider pricing (per 1M token increments)
```

### 5.4 Implementation

```typescript
// services/pricing.ts
export function calculateTokenCost(
  tokens: TokenBreakdown,
  plan: Plan
): number {
  const { inputTokens, cachedInputTokens, outputTokens, reasoningTokens } = tokens;
  
  let costCents = 0;
  
  // Each category priced independently with floor division
  costCents += Math.floor(inputTokens / 1_000_000) * plan.priceInputTokensCents;
  costCents += Math.floor(cachedInputTokens / 1_000_000) * plan.priceCachedInputTokensCents;
  costCents += Math.floor(outputTokens / 1_000_000) * plan.priceOutputTokensCents;
  costCents += Math.floor(reasoningTokens / 1_000_000) * plan.priceReasoningTokensCents;
  
  return costCents;
}

// Validation: categories must be mutually exclusive per event
export function validateTokenBreakdown(tokens: TokenBreakdown): void {
  // A single event should not have overlapping categories
  // This is enforced at API level - client sends one breakdown per request
  if (tokens.cachedInputTokens > tokens.inputTokens) {
    throw new Error('Cached input tokens cannot exceed total input tokens');
  }
}
```

---

## 6. Stripe Webhook Architecture

### 6.1 Event Types Handled

| Event | Purpose | Action |
|-------|---------|--------|
| `checkout.session.completed` | New subscription created | Create subscription record, grant access |
| `customer.subscription.updated` | Plan change, renewal, payment failure | Update subscription status, plan, period |
| `customer.subscription.deleted` | Cancellation | Mark subscription canceled, revoke access |

### 6.2 Security: Signature Verification

```typescript
// middleware/stripeWebhook.ts
import { Webhook } from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function stripeWebhookMiddleware(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  let event: Stripe.Event;
  
  try {
    // Verify signature and parse event
    event = Webhook.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  // Attach verified event to request
  req.stripeEvent = event;
  next();
}
```

### 6.3 Event Deduplication

```typescript
// Table for processed webhook events
CREATE TABLE stripe_webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type      VARCHAR(100) NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload         JSONB NOT NULL
);

CREATE INDEX idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
```

```typescript
// services/stripeWebhookService.ts
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // Deduplication check
  const existing = await pg.query(
    `SELECT 1 FROM stripe_webhook_events WHERE stripe_event_id = $1`,
    [event.id]
  );
  
  if (existing.rows.length > 0) {
    console.log(`Duplicate webhook event ignored: ${event.id}`);
    return;
  }
  
  // Process based on type
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  // Record processed event
  await pg.query(
    `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3)`,
    [event.id, event.type, event]
  );
}
```

### 6.4 Event Handlers

#### `checkout.session.completed`
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const tenantId = session.metadata?.tenantId;
  if (!tenantId) {
    throw new Error('Missing tenantId in session metadata');
  }
  
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await pg.transaction(async (tx) => {
    // Upsert tenant with Stripe customer ID
    await tx.query(
      `INSERT INTO tenants (id, stripe_customer_id)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET stripe_customer_id = $2`,
      [tenantId, session.customer]
    );
    
    // Get plan from price ID
    const plan = await getPlanByStripePriceId(subscription.items.data[0].price.id);
    
    // Create subscription record
    await tx.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         version = subscriptions.version + 1`,
      [
        tenantId,
        plan.id,
        subscription.id,
        session.customer,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end
      ]
    );
  });
}
```

#### `customer.subscription.updated`
```typescript
async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
  const plan = await getPlanByStripePriceId(stripeSub.items.data[0].price.id);
  
  await pg.query(
    `UPDATE subscriptions
     SET plan_id = $1,
         status = $2,
         current_period_start = $3,
         current_period_end = $4,
         cancel_at_period_end = $5,
         canceled_at = $6,
         version = version + 1,
         updated_at = NOW()
     WHERE stripe_subscription_id = $7`,
    [
      plan.id,
      stripeSub.status,
      new Date(stripeSub.current_period_start * 1000),
      new Date(stripeSub.current_period_end * 1000),
      stripeSub.cancel_at_period_end,
      stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      stripeSub.id
    ]
  );
}
```

#### `customer.subscription.deleted`
```typescript
async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  await pg.query(
    `UPDATE subscriptions
     SET status = 'canceled',
         canceled_at = NOW(),
         version = version + 1,
         updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSub.id]
  );
}
```

### 6.5 Test Mode Configuration

```typescript
// config/stripe.ts
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  apiVersion: '2024-04-10' as const,
  
  // Test mode: use test price IDs
  testMode: process.env.NODE_ENV !== 'production',
  
  // Price IDs (test mode)
  prices: {
    free: process.env.STRIPE_PRICE_FREE_TEST,
    pro: process.env.STRIPE_PRICE_PRO_TEST
  }
};
```

### 6.6 Webhook Endpoint Registration

```
# Stripe CLI for local testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Production: Register in Stripe Dashboard
# URL: https://api.yourdomain.com/api/webhooks/stripe
# Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

---

## 7. API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/usage` | Record usage event (requires Idempotency-Key) |
| GET | `/api/usage/summary` | Get current period usage summary |
| GET | `/api/subscription` | Get current subscription details |
| POST | `/api/billing/checkout` | Create Stripe Checkout session |
| POST | `/api/billing/portal` | Create Stripe Billing Portal session |
| POST | `/api/webhooks/stripe` | Stripe webhook endpoint |

---

## 8. Error Handling & Monitoring

### 8.1 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `IDEMPOTENCY_KEY_INVALID` | 400 | Missing or malformed idempotency key |
| `IDEMPOTENCY_CONFLICT` | 409 | Key exists but different payload |
| `RATE_LIMIT_EXCEEDED` | 429 | Request quota exceeded |
| `QUOTA_EXCEEDED` | 402 | Token quota exceeded |
| `SUBSCRIPTION_INACTIVE` | 402 | No active subscription |
| `STRIPE_SIGNATURE_INVALID` | 400 | Webhook signature verification failed |
| `PLAN_NOT_FOUND` | 404 | Requested plan doesn't exist |

### 8.2 Metrics to Monitor

- Webhook processing latency
- Quota rejection rates by tenant/plan
- Idempotency conflict rate
- Usage event ingestion lag
- Stripe API error rates

---

## 9. Deployment Considerations

- **Database**: PostgreSQL 15+ with `pg_cron` for aggregate refresh
- **Caching**: Redis for subscription/plan lookups (TTL: 60s)
- **Queue**: BullMQ for async webhook processing (optional, for high volume)
- **Observability**: OpenTelemetry traces, Prometheus metrics
- **Migrations**: Use `node-pg-migrate` or similar

---

## 10. Open Questions / Tradeoffs

1. **Aggregate Refresh Strategy**: Real-time triggers vs. scheduled materialized view refresh?
2. **Token Estimation**: How to estimate tokens pre-flight for quota checks?
3. **Grace Period**: Allow brief overage before hard block?
4. **Multi-currency**: Current design assumes USD cents; extend for international?
5. **Webhook Retry**: Stripe retries for 3 days; ensure idempotency handles this

---

*Document Version: 1.0*
*Author: Senior Backend Engineer*
*Date: 2026-09-08*
