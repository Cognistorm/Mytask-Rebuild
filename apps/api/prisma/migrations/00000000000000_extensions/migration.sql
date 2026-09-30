-- Phase 3 platform core: PostgreSQL extensions listed in docs/03-architecture/data-model.md §1.
-- pgvector is installed but unused at launch (later AI features, ADR-001).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS vector;
