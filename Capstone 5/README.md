# Cloud Cost Optimizer - 10x Solution Capstone

Automated Cloud Cost Optimizer that analyzes billing data to automate resource cleanup **10x faster** than manual monthly reviews.

## 🎯 Problem & Solution

**Problem:** Cloud infrastructure costs spiral out of control when engineering teams lack visibility into idle, over-provisioned, or orphaned resources. Manual billing analysis is time-consuming, error-prone, and typically happens monthly—long after waste has accumulated.

**Solution:** Daily automated sweeps that ingest billing data, detect anomalies (IDLE, OVER_PROVISIONED, ORPHANED, SPIKE), generate LLM-powered natural-language explanations, and produce actionable optimization recommendations—all served via cached APIs for sub-50ms dashboard responses.

**10x Claim:** Reduces detection-to-remediation time from **weeks to hours** through automation.

**Non-Goal:** No live cloud provider integration. Operates exclusively on mock billing data generated locally.

---

## 🏗️ Architecture: 5 Core Concepts

| # | Concept | Implementation | Location |
|---|---------|----------------|----------|
| 1 | **API Endpoints** | RESTful Express API with OpenAPI docs | `src/modules/*/billing.routes.js` |
| 2 | **Database** | MongoDB with Mongoose models | `src/modules/*/*.model.js` |
| 3 | **Cron Jobs** | Daily sweep at 02:00 UTC via node-cron | `src/jobs/dailySweep.job.js` |
| 4 | **LLM Integration** | Mock + Ollama support for anomaly explanations | `src/config/llm.js`, `src/services/llmExplanation.service.js` |
| 5 | **Caching Logic** | In-memory Map with TTL + cache-aside pattern | `src/config/cache.js` |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- MongoDB ≥ 6 (local or Docker)
- Optional: Ollama for real LLM (`ollama pull llama3.1:8b`)

### Installation
```bash
# Clone and install
cd Capstone\ 5
npm install

# Copy environment template
cp .env.example .env

# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongodb mongo:7

# Seed database with 30 days of mock data
npm run seed

# Start server
npm run dev
```

### Verify Running
```bash
# Health check
curl http://localhost:3000/health

# API Documentation
open http://localhost:3000/api/docs
```

---

## 📋 5-Minute Demo Path

### 1. Seed & Sweep (1 min)
```bash
npm run seed          # Generates 30 days of AWS/GCP billing data + anomalies
npm run sweep         # Triggers manual daily sweep (ingest → detect → explain → optimize)
```

### 2. Explore Anomalies (1 min)
```bash
# Summary (cached, <50ms)
curl http://localhost:3000/api/v1/anomalies/summary

# List with filters
curl "http://localhost:3000/api/v1/anomalies?severity=HIGH&status=OPEN"

# Detail with LLM explanation
curl http://localhost:3000/api/v1/anomalies/<anomaly-id>
```

### 3. Review Optimizations (1 min)
```bash
curl http://localhost:3000/api/v1/optimizations

# Approve an action
curl -X POST http://localhost:3000/api/v1/optimizations/<action-id>/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "demo-user"}'
```

### 4. Check Billing (1 min)
```bash
# Monthly summary by service (cached)
curl "http://localhost:3000/api/v1/billing/summary?accountId=acct-prod-001"

# Raw records
curl "http://localhost:3000/api/v1/billing/records?service=EC2&limit=10"
```

### 5. Inspect Sweep History (1 min)
```bash
curl http://localhost:3000/api/v1/sweeps/history
```

---

## 📁 Project Structure

```
src/
├── app.js                 # Express app with middleware & routes
├── server.js              # Entry point, DB connection, cron startup
├── config/
│   ├── db.js              # MongoDB connection
│   ├── cache.js           # In-memory TTL cache (Map-based)
│   └── llm.js             # LLM client (mock/Ollama)
├── modules/
│   ├── billing/           # Billing ingestion & queries
│   ├── anomalies/         # Anomaly CRUD + explanations
│   ├── optimizations/     # Optimization actions workflow
│   └── sweeps/            # Sweep run history & triggers
├── jobs/
│   └── dailySweep.job.js  # Cron job: ingest → detect → explain → optimize
├── services/
│   ├── mockDataGenerator.service.js  # AWS/GCP billing data generator
│   ├── anomalyDetection.service.js   # IDLE/OVER_PROVISIONED/ORPHANED/SPIKE detection
│   ├── llmExplanation.service.js     # LLM explanation generation
│   └── optimization.service.js       # Action recommendations
├── middleware/
│   ├── error.middleware.js           # Centralized error handling
│   ├── validation.middleware.js      # Request validation
│   └── cache.middleware.js           # Cache-Control headers
├── scripts/
│   ├── seed.js             # Seed 30 days of demo data
│   └── runSweep.js         # Manual sweep trigger
└── utils/
    └── pagination.js       # Pagination helpers
```

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP port |
| `MONGODB_URI` | mongodb://localhost:27017/cloud-cost-optimizer | MongoDB connection |
| `LLM_PROVIDER` | mock | `mock` or `ollama` |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama endpoint |
| `OLLAMA_MODEL` | llama3.1:8b | Model to use |
| `CRON_SCHEDULE` | 0 2 * * * | Daily sweep schedule (cron) |
| `CACHE_TTL_BILLING_SUMMARY_MS` | 3600000 | Billing summary cache TTL |
| `CACHE_TTL_ANOMALY_SUMMARY_MS` | 1800000 | Anomaly summary cache TTL |

---

## 📡 API Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/billing/ingest` | Ingest mock billing records |
| `GET` | `/billing/records` | Query billing records (paginated) |
| `GET` | `/billing/summary` | **Cached** monthly spend by service |
| `GET` | `/anomalies` | List anomalies (filterable) |
| `GET` | `/anomalies/summary` | **Cached** anomaly counts by type/severity |
| `GET` | `/anomalies/:id` | Anomaly detail + LLM explanation |
| `PATCH` | `/anomalies/:id` | Update status (ACKNOWLEDGED/RESOLVED) |
| `GET` | `/optimizations` | List optimization actions |
| `POST` | `/optimizations/:id/approve` | Approve action |
| `POST` | `/optimizations/:id/reject` | Reject action |
| `POST` | `/sweeps/trigger` | Manual sweep trigger |
| `GET` | `/sweeps/history` | Sweep run history |
| `GET` | `/health` | Health check |
| `GET` | `/api/docs` | Swagger UI |

---

## 🧪 Testing the Walking Skeleton

The walking skeleton is the thinnest end-to-end slice:

```bash
# 1. Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# 2. Install & seed
npm install && npm run seed

# 3. Run sweep (ingest → detect → explain → optimize)
npm run sweep

# 4. Verify cached response <50ms
time curl -s http://localhost:3000/api/v1/anomalies/summary

# 5. Verify LLM explanation
curl http://localhost:3000/api/v1/anomalies/<id> | jq '.explanation'
```

Expected: All steps complete without errors, cached responses <50ms, explanations generated.

---

## 🔒 Secrets Management

- **No secrets in Git** — `.gitignore` excludes `.env*`
- **Template provided** — Copy `.env.example` to `.env` and fill values
- **LLM keys** — Only needed for Ollama (local), no cloud API keys required

---

## 🛠️ Development

```bash
# Run with auto-reload
npm run dev

# Run sweep manually
npm run sweep

# Re-seed database
npm run seed

# View OpenAPI spec
cat docs/openapi.yaml
```

---

## 📦 Production Considerations

- Replace in-memory cache with Redis for horizontal scaling
- Add authentication/authorization middleware
- Implement request rate limiting
- Add structured logging (pino/winston)
- Set up monitoring (Prometheus/Grafana)
- Configure MongoDB replica set
- Use secrets manager for production credentials

---

## 📄 License

MIT — See LICENSE for details.