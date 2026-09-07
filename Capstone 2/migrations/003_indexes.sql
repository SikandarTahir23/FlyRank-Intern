-- 003_indexes.sql
-- Performance indexes for query patterns

-- Images
CREATE INDEX idx_images_status ON images(status);
CREATE INDEX idx_images_created_at ON images(created_at DESC);

-- Image metadata
CREATE INDEX idx_image_metadata_category ON image_metadata(category);
CREATE INDEX idx_image_metadata_subject ON image_metadata(subject);
CREATE INDEX idx_image_metadata_flagged ON image_metadata(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_image_metadata_confidence ON image_metadata(confidence DESC);

-- Embeddings: HNSW index for cosine similarity search
CREATE INDEX idx_embeddings_vector ON embeddings USING hnsw (vector vector_cosine_ops);
CREATE INDEX idx_embeddings_entity ON embeddings(entity_type, entity_id);

-- Posts
CREATE INDEX idx_posts_target_subject ON posts(target_subject);
CREATE INDEX idx_posts_target_category ON posts(target_category);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Recommendation audits
CREATE INDEX idx_audits_post ON recommendation_audits(post_id);
CREATE INDEX idx_audits_candidate ON recommendation_audits(candidate_image_id);
CREATE INDEX idx_audits_verdict ON recommendation_audits(guard_verdict);
CREATE INDEX idx_audits_created_at ON recommendation_audits(created_at DESC);

-- AI cost logs
CREATE INDEX idx_cost_logs_type_created ON ai_cost_logs(operation_type, created_at DESC);
CREATE INDEX idx_cost_logs_model ON ai_cost_logs(model);