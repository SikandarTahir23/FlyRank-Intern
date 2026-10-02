-- 001_initial_schema.sql
-- Core tables for AI Image Understanding & Content Matching Engine

CREATE EXTENSION IF NOT EXISTS vector;

-- Images table
CREATE TABLE images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path       TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'flagged')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Image metadata (vision output)
CREATE TABLE image_metadata (
    image_id        UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
    subject         TEXT NOT NULL,
    category        TEXT NOT NULL,
    attributes      TEXT[] NOT NULL DEFAULT '{}',
    caption         TEXT NOT NULL,
    confidence      REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings (pgvector)
CREATE TABLE embeddings (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     TEXT NOT NULL CHECK (entity_type IN ('image', 'post')),
    entity_id       UUID NOT NULL,
    vector          VECTOR(768) NOT NULL,
    model_name      TEXT NOT NULL DEFAULT 'gemini-embedding-001',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id)
);

-- Blog posts
CREATE TABLE posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    target_subject  TEXT NOT NULL,
    target_category TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recommendation audits (every match attempt logged)
CREATE TABLE recommendation_audits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id             UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    candidate_image_id  UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    similarity_score    REAL NOT NULL CHECK (similarity_score >= -1 AND similarity_score <= 1),
    guard_verdict       TEXT NOT NULL CHECK (guard_verdict IN ('accepted', 'rejected', 'no_match')),
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI cost tracking
CREATE TABLE ai_cost_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type      TEXT NOT NULL CHECK (operation_type IN ('vision', 'embedding_image', 'embedding_text')),
    model               TEXT NOT NULL,
    prompt_tokens       INTEGER NOT NULL DEFAULT 0,
    candidate_tokens    INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd  NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);