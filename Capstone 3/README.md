# Usage Metering & Billing Engine

Multi-tenant usage metering and billing system with Node.js, Express, and PostgreSQL.

## Features

- Multi-tenant isolation via Row-Level Security
- Idempotent usage recording with client-provided keys
- Quota enforcement with 429/402 responses
- AI token pricing (input, cached input, output, reasoning)
- Stripe integration for subscriptions and billing portal

## Quick Start

```bash
npm install
cp .env.example .env  # add your credentials
npm run migrate       # requires PostgreSQL
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/usage` | Record usage (needs `X-Tenant-Id`, `Idempotency-Key`) |
| GET | `/api/usage/summary` | Current period usage |
| GET | `/api/subscription` | Active subscription |
| GET | `/api/subscription/plans` | Available plans |
| POST | `/api/subscription/checkout` | Create Stripe Checkout |
| POST | `/api/subscription/portal` | Create Billing Portal |
| POST | `/api/webhooks/stripe` | Stripe webhook |

## Example

```bash
curl -X POST http://localhost:3000/api/usage \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <uuid>" \
  -H "Idempotency-Key: <uuid>" \
  -d '{"eventType":"token_usage","inputTokens":1000000}'
```

## Stack

- **Node.js 20+**, Express, PostgreSQL (pg)
- **Stripe** for billing
- **Zod** for validation
- ESM modules, no build step