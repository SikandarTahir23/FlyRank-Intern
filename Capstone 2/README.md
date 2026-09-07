# AI Image Understanding & Content Matching Engine

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client    │────▶│  FastAPI     │────▶│  Domain Services │
│  (HTTP)     │     │  Controllers │     │  (Core Logic)   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    ▼                             ▼                             ▼
            ┌───────────────┐           ┌─────────────────┐           ┌─────────────────┐
            │  Vision       │           │  Embedding      │           │  Matching       │
            │  Ingestion    │           │  Service        │           │  Service        │
            │  (Gemini)     │           │  (Gemini)       │           │  (pgvector)     │
            └───────┬───────┘           └────────┬────────┘           └────────┬────────┘
                    │                            │                            │
                    ▼                            ▼                            ▼
            ┌───────────────┐           ┌─────────────────┐           ┌─────────────────┐
            │  Image        │           │  Embedding      │           │  Mismatch       │
            │  Metadata     │           │  Repository     │           │  Guard          │
            └───────────────┘           └─────────────────┘           └────────┬────────┘
                                                                                │
                                                                                ▼
                                                                        ┌─────────────────┐
                                                                        │  Recommendation │
                                                                        │  Audit Log      │
                                                                        └─────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Gemini API Key (free tier at https://aistudio.google.com)

### 1. Start Database
```bash
docker compose up -d
```

### 2. Apply Migrations
```bash
python -m migrations.run
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 5. Run API Server
```bash
python -m app.main
```
Server starts at http://localhost:8000

### 6. (Optional) Run Background Workers
```bash
# Terminal 2: Ingest images from data/images/
python -m app.workers.ingestion_worker

# Terminal 3: Generate missing embeddings
python -m app.workers.embedding_worker
```

### 7. Run Evaluation
```bash
python -m eval.runner
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Liveness probe |
| GET | /ready | Readiness probe (DB check) |
| POST | /images/ingest | Upload image, triggers vision + embedding |
| GET | /images/{id} | Get image with metadata |
| POST | /posts | Create blog post with target_subject/category |
| GET | /posts/{id} | Get post details |
| GET | /posts | List all posts |
| GET | /recommendations/{post_id} | Get Top-1 recommendation + audit trail |
| POST | /eval/run | Run full evaluation suite (dev only) |

## Configuration (.env)

```env
# Database
DATABASE_URL=postgresql://capstone:capstone@localhost:5432/capstone

# AI Models (Gemini 1.5 Flash free tier)
GEMINI_API_KEY=your_gemini_api_key_here

# Matching thresholds
COSINE_THRESHOLD=0.72
CONFIDENCE_THRESHOLD=0.75

# Logging
LOG_LEVEL=INFO
```

## Data Flow

1. **Image Ingestion** (`POST /images/ingest`)
   - Save image record with `status=pending`
   - Call Gemini Vision with strict JSON prompt
   - Validate output against `VisionOutput` Pydantic model
   - Persist metadata to `image_metadata`, flag if confidence < 0.75
   - Generate image embedding via Gemini, store in `embeddings` (pgvector)
   - Update image `status=completed` or `flagged`

2. **Post Creation** (`POST /posts`)
   - Save post with `target_subject` and `target_category`
   - Generate post embedding from title + content + targets
   - Store in `embeddings` (entity_type=post)

3. **Recommendation** (`GET /recommendations/{post_id}`)
   - Retrieve post embedding
   - Cosine search in pgvector for top-K image embeddings
   - For each candidate: fetch metadata, run Mismatch Guard
   - Log every candidate to `recommendation_audits`
   - Return first `accepted` candidate, or `no_match`

## Mismatch Guard Logic

```
Input: post, candidate, similarity_score

1. SEMANTIC THRESHOLD
   IF similarity < 0.72 → REJECT "below_similarity_cutoff"

2. ENTITY CONFLICT
   IF candidate.subject != post.target_subject:
       IF (post.target_subject="red fox" AND candidate.subject in {"wolf","gray wolf"}):
           REJECT "species_conflict:wolf_for_fox"
       IF category mismatch → REJECT "category_mismatch"

3. CONFIDENCE CUTOFF
   IF candidate.confidence < 0.75 → REJECT "low_confidence"

4. ACCEPT
```

## Evaluation

### Test Dataset
`data/eval_set.yaml` — 11 labeled posts across 5 categories + adversarial wolf/fox pair

### Probes
| # | Probe | Validates |
|---|-------|-----------|
| 1 | Basic Match | Top-1 precision on labeled set |
| 2 | Wolf vs Fox | Deterministic species rejection |
| 3 | Confidence Cutoff | Low-confidence flagging |
| 4 | No Match Trigger | Exhaustive candidate rejection |
| 5 | Cost Tracking | AI cost logging completeness |
| 6 | Audit Completeness | Per-candidate audit logging |

### Run All Probes
```bash
python -m eval.runner
```

Output:
```
Total posts: 11
Top-1 Precision: 9/11 = 81.82%
No-Match Rate: 1/11 = 9.09%
```

## Submission Pack

| File | Purpose |
|------|---------|
| `capstone.yaml` | Project manifest |
| `EVIDENCE.md` | Probe-by-probe acceptance evidence |
| `BUILDLOG.md` | Build/deployment verification log |
| `README.md` | This file |

## Project Structure

```
capstone/
├── app/
│   ├── api/           # FastAPI routes, schemas, dependencies
│   ├── core/          # Domain services (vision, embedding, matching, guard)
│   ├── domain/        # Pure domain models, value objects, events
│   ├── repositories/  # Raw SQL data access (asyncpg)
│   ├── ai/            # Gemini client wrapper, prompts
│   ├── workers/       # Background ingestion/embedding workers
│   └── utils/         # Vector math, structured logging
├── migrations/        # Raw SQL migrations (versioned)
├── eval/              # Evaluation runner, probes, metrics
├── data/
│   ├── images/        # ~50 licensed-free images (gitignored)
│   └── eval_set.yaml  # Labeled test cases
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── pyproject.toml
├── capstone.yaml
├── EVIDENCE.md
├── BUILDLOG.md
└── README.md
```

## License

Capstone project for FlyRank Internship.