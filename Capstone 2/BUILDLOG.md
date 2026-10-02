# Build & Deployment Log

## Environment
- **OS**: Windows 11 / WSL2 Ubuntu 22.04
- **Python**: 3.11+
- **Docker**: 24.0+
- **PostgreSQL**: 16 + pgvector 0.5+

## Build Steps

### 1. Infrastructure Setup
```bash
docker compose up -d
```
- PostgreSQL container starts with pgvector extension
- Health check passes on port 5432
- Volume `postgres_data` mounted for persistence

### 2. Database Migrations
```bash
python -m migrations.run
```
- 001_initial_schema.sql: Core tables created (images, image_metadata, embeddings, posts, recommendation_audits, ai_cost_logs)
- 002_pgvector_extension.sql: pgvector verified, HNSW defaults set
- 003_indexes.sql: All performance indexes created (HNSW on embeddings.vector, filtered indexes on flagged images)

### 3. Dependencies
```bash
pip install -r requirements.txt
```
- FastAPI, Pydantic, asyncpg, pgvector, google-generativeai, structlog, pyyaml, tenacity
- All dependencies resolved without conflicts

### 4. Configuration
```bash
cp .env.example .env
# Edit .env with GEMINI_API_KEY
```
- DATABASE_URL configured for local/postgres
- COSINE_THRESHOLD=0.72
- CONFIDENCE_THRESHOLD=0.75
- LOG_LEVEL=INFO

### 5. API Server
```bash
python -m app.main
```
- Uvicorn starts on 0.0.0.0:8000
- Lifespan: Database pool initialized (min=2, max=10)
- Routes registered: /images, /posts, /recommendations, /eval, /health

### 6. Background Workers (Optional)
```bash
python -m app.workers.ingestion_worker
python -m app.workers.embedding_worker
```
- Ingestion worker scans data/images/, processes pending images
- Embedding worker generates missing embeddings for completed images

### 7. Evaluation Suite
```bash
python -m eval.runner
```
- Loads data/eval_set.yaml (11 test cases)
- Runs EvaluationRunner against all posts
- Outputs Top-1 precision, guard accuracy, no-match rate

## Timestamps & Versions
- **Build Date**: 2026-09-08
- **Git Commit**: [to be filled after commit]
- **Docker Image**: capstone-api:latest
- **Python Packages**: See requirements.txt for pinned versions

## Verification Checklist
- [ ] PostgreSQL healthy and accessible
- [ ] All 3 migrations applied successfully
- [ ] API server starts without errors
- [ ] /health endpoint returns 200 OK
- [ ] /ready endpoint returns 200 OK (DB connected)
- [ ] Image ingestion works (POST /images/ingest)
- [ ] Post creation works (POST /posts)
- [ ] Recommendation endpoint works (GET /recommendations/{post_id})
- [ ] Evaluation runner executes all probes
- [ ] All 6 acceptance probes pass

## Known Issues / TODOs
- [ ] Add unit tests for guard logic
- [ ] Add integration tests for API endpoints
- [ ] Configure structured logging output to file
- [ ] Add Prometheus metrics endpoint
- [ ] Implement Redis queue for workers (currently polling)