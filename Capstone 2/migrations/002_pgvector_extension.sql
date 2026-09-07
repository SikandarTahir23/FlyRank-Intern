-- 002_pgvector_extension.sql
-- Ensure pgvector extension is available and configure HNSW index defaults

CREATE EXTENSION IF NOT EXISTS vector;

-- Set default HNSW parameters for better recall
-- These can be overridden per-index
SET default_hnsw_ef_construction = 64;
SET default_hnsw_m = 16;

-- Verify vector dimension compatibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'vector'
    ) THEN
        RAISE EXCEPTION 'pgvector extension not installed';
    END IF;
END $$;