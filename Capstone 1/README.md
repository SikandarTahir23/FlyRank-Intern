# FlyRank Widget Platform

> Enterprise-grade embeddable widget and lead-capture platform

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   Visitor    │     │  2nd Origin  │     │   Admin      │               │
│   │   Browser    │     │  (port 8080) │     │   Dashboard  │               │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘               │
│          │                    │                    │                        │
│          │ 1. Load widget.js  │                    │                        │
│          │◄───────────────────│                    │                        │
│          │                    │                    │                        │
│          │ 2. Fetch config    │ 3. Embed widget   │ 4. API Key Auth       │
│          ├───────────────────►│◄──────────────────►│                        │
│          │                    │                    │                        │
│          │ 5. Submit form     │                    │ 6. View submissions   │
│          ├────────────────────────────────────────►│                        │
│          │                    │                    │                        │
│          ▼                    ▼                    ▼                        │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                    API GATEWAY (Express)                          │     │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │     │
│   │  │   CORS      │  │  Rate Limit │  │  Payload    │              │     │
│   │  │  Middleware │  │  (Redis)    │  │  Size Check │              │     │
│   │  └─────────────┘  └─────────────┘  └─────────────┘              │     │
│   └──────────────────────────┬──────────────────────────────────────┘     │
│                              │                                            │
│          ┌───────────────────┼───────────────────┐                       │
│          ▼                   ▼                   ▼                       │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  Widgets    │    │ Submissions │    │  Tenants    │                │
│   │  Module     │    │  Module     │    │  Module     │                │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                │
│          │                  │                  │                        │
│          ▼                  ▼                  ▼                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │ PostgreSQL  │    │ PostgreSQL  │    │ PostgreSQL  │                │
│   │ (widgets)   │    │(submissions)│    │ (tenants)   │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│          │                  │                  │                        │
│          │         ┌────────┴────────┐        │                        │
│          │         ▼                 ▼        │                        │
│          │  ┌─────────┐         ┌─────────┐   │                        │
│          │  │ Geo Svc │         │ Notif.  │   │                        │
│          │  │ (A->B-> │         │ Service │   │                        │
│          │  │ NullGeo)│         │(Console │   │                        │
│          │  └─────────┘         │+Mailpit)│   │                        │
│          │                      └─────────┘   │                        │
│          └────────────────────────────────────┘                        │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                      INFRASTRUCTURE (Docker)                     │  │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│   │  │PostgreSQL│  │  Redis   │  │ Mailpit  │  │   App    │         │  │
│   │  │  :5432   │  │  :6379   │  │ :1025/8025│ │  :3000   │         │  │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### 1. Start Infrastructure
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Migrations & Seed
```bash
pnpm run migrate
pnpm run seed
```

### 4. Start Development Server
```bash
pnpm run dev
```

### 5. Start Cross-Origin Test Page (separate terminal)
```bash
npx serve client-test -p 8080
```

### 6. Verify
| Service | URL |
|---------|-----|
| API Health | http://localhost:3000/health |
| Widget JS | http://localhost:3000/static/widget.v1.js |
| Widget Config | http://localhost:3000/api/widgets/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/config |
| Test Page | http://localhost:8080 |
| Mailpit UI | http://localhost:8025 |

---

## API Documentation

### Public Endpoints (No Auth, Open CORS)

#### GET /static/widget.v1.js
Embeddable widget script.
- **Cache:** `public, max-age=31536000, immutable`
- **Usage:** `<script src="/static/widget.v1.js" data-widget-id="..."></script>`

#### GET /api/widgets/:id/config
Public widget configuration for rendering.
- **Cache:** `public, max-age=60, stale-while-revalidate=300`
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Alpha Lead Form",
    "type": "lead-form",
    "config": {
      "title": "Get in Touch",
      "fields": [
        {"name": "email", "label": "Email", "type": "email", "required": true},
        {"name": "name", "label": "Name", "type": "text", "required": true}
      ],
      "buttonText": "Submit",
      "honeypotFieldName": "website_url"
    }
  }
}
```

#### POST /api/submissions
Form submission endpoint.
- **Headers:** `X-Widget-Id` (required), `Content-Type: application/json`
- **Rate Limit:** 5 req/30s per IP per widget
- **Payload Limit:** 50KB
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "widget_id": "uuid",
    "created_at": "2026-09-05T...",
    "geo": {"country": "US", "city": "San Francisco"}
  }
}
```
- **Error (413):** Payload too large
- **Error (429):** Rate limited with `Retry-After` header

---

### Admin Endpoints (Require `X-Api-Key` Header)

#### Tenants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants | List all tenants |
| POST | /api/tenants | Create tenant |
| GET | /api/tenants/:id | Get tenant |
| PUT | /api/tenants/:id | Update tenant |
| DELETE | /api/tenants/:id | Delete tenant |

#### Widgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/widgets | List tenant's widgets |
| POST | /api/widgets | Create widget |
| GET | /api/widgets/:id | Get widget |
| PUT | /api/widgets/:id | Update widget |
| DELETE | /api/widgets/:id | Delete widget |
| GET | /api/widgets/:id/embed | Get embed code |

#### Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/submissions?widget_id=... | List widget submissions |
| GET | /api/submissions/tenant | List all tenant submissions |
| GET | /api/dashboard/stats?widget_id=... | Dashboard statistics |

---

## Test Data (Deterministic)

### Tenants
| Name | API Key | ID |
|------|---------|-----|
| Tenant Alpha | `tk_alpha_abcdef123456` | `11111111-1111-1111-1111-111111111111` |
| Tenant Beta | `tk_beta_ghijkl789012` | `22222222-2222-2222-2222-222222222222` |

### Widgets
| Name | ID | Tenant | Type | Honeypot Field |
|------|-----|--------|------|----------------|
| Alpha Lead Form | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Alpha | lead-form | `website_url` |
| Alpha Newsletter | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Alpha | newsletter | `website` |
| Beta Contact Form | `cccccccc-cccc-cccc-cccc-cccccccccccc` | Beta | contact | `url` |
| Beta Feedback | `dddddddd-dddd-dddd-dddd-dddddddddddd` | Beta | lead-form | `website_field` |

---

## Evaluation Probes

Run individual probes:
```bash
npm run probe-1  # Multi-origin submissions
npm run probe-2  # Payload size limit
npm run probe-3  # Rate limit burst
npm run probe-4  # Geo fallback tolerance
npm run probe-5  # Side-effect isolation
npm run probe-6  # Honeypot trapping
```

Or run all:
```bash
npm test
```

See [EVIDENCE.md](EVIDENCE.md) for exact curl commands and expected outputs.

---

## Configuration

All configuration via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | - | Redis connection string |
| `SUBMISSION_MAX_BYTES` | 51200 | Max payload size (50KB) |
| `RATE_LIMIT_MAX` | 5 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 30000 | Rate limit window (30s) |
| `GEO_PROVIDER_A_URL` | http://ip-api.com/json/ | Primary geo provider |
| `GEO_PROVIDER_B_URL` | https://ipapi.co/json/ | Fallback geo provider |
| `GEO_TIMEOUT_MS` | 2000 | Geo provider timeout |
| `MOCK_GEO_FAILURE_A` | false | Mock Provider A failure |
| `MOCK_GEO_FAILURE_ALL` | false | Mock all geo failures |
| `MAILPIT_HOST` | localhost | Mailpit SMTP host |
| `MAILPIT_PORT` | 1025 | Mailpit SMTP port |

---

## Project Structure

```
capstone-1/
├── src/
│   ├── config/           # Config, DB, Redis
│   ├── middleware/       # Express middleware
│   ├── modules/
│   │   ├── tenants/      # Tenant CRUD
│   │   ├── widgets/      # Widget CRUD + public config
│   │   ├── submissions/  # Ingestion pipeline
│   │   ├── geo/          # Geo enrichment (A->B->NullGeo)
│   │   ├── rate-limit/   # Redis sliding window
│   │   ├── spam/         # Honeypot detection
│   │   └── notifications/# Fire-and-forget side effects
│   ├── utils/            # Helpers
│   └── types/            # TypeScript extensions
├── public/
│   └── widget.v1.js      # Embeddable widget
├── migrations/
│   └── init.sql          # Idempotent schema + seed
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # Probe tests
├── client-test/          # Cross-origin test page
├── scripts/              # Migration, seed, dev
├── docker-compose.yml
├── Dockerfile
├── capstone.yaml         # Evaluation manifest
├── EVIDENCE.md           # Probe verification commands
├── BUILDLOG.md           # Build process log
└── README.md
```

---

## Known Limitations

1. **HTTP only** - No TLS in development. Production requires reverse proxy with HTTPS.
2. **No widget versioning** - `widget.v1.js` path exists but no update strategy.
3. **Basic pagination** - Offset-based. Cursor pagination recommended for scale.
4. **Single Mailpit** - Not HA. Production needs proper email service (SendGrid, etc.).
5. **Geo providers unmocked in CI** - Real HTTP calls. Use MSW/nock for true unit tests.
6. **No audit logging** - Admin actions not logged.
7. **No API key rotation** - Keys are static.

---

## License

MIT License - Capstone Project