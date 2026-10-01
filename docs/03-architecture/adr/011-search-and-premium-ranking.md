# ADR-011: Search — PostgreSQL full-text + trigram first, with the Premium ranking boost
Date: 2026-09-28 | Status: accepted (Owner 2026-09-30)

## Context
- Vision priority 1: post and browse gigs. Search surfaces: `/search`, category pages (3 levels), `/hire/{keyword}`, `/sellers`, `/explore/projects` (+ category/skill), filters and sorting (spec 03 traces the legacy details).
- Content is mostly Georgian, often mixed with Latin words (Q-022). PostgreSQL has no Georgian stemmer or dictionary.
- Q-069 (NEW): Premium users' gigs get a "Featured/Top" badge **and** higher priority ranking in search and category lists; the exact ranking rule is defined in spec 03.
- Constraints: one Owner, affordable, local-first; data volume is modest (thousands to tens of thousands of gigs/projects).
- Later: AI features (semantic search would be a natural addition).

## Decision
1. **Engine: PostgreSQL** (no extra service at launch).
   - A denormalised `search_documents` table (entity type, entity id, locale-independent `tsvector` built from ka + en title/description/tags/category names with the `simple` configuration, a normalised text column for trigram matching, filter columns: category ids, price range, delivery time, rating, seller online/available, plan, status, created_at).
   - Indexes: GIN on the `tsvector`, GIN `gin_trgm_ops` on the normalised text (`pg_trgm`), B-tree on filter/sort columns.
   - Maintained in the same transaction as the gig/project/profile write (or by a trigger), and when the owner's Premium status changes (subscription start/end updates the `plan` column of their documents).
   - Query: `websearch_to_tsquery('simple', q)` for whole words **OR** trigram similarity for partial/misspelled words (Georgian inflection makes exact word matches weak); results combined and ranked in one SQL function.
2. **Ranking function (one place).** `score = text_relevance (ts_rank_cd + similarity) × weights + premium_boost + quality signals`, then deterministic tie-breakers. The **Premium boost** implements Q-069: the concrete rule (e.g. "Premium first within equal relevance", a fixed additive boost, or a separate top block) is **taken from spec 03**, not invented here. If spec 03 makes the boost weight adjustable, it becomes a register setting (ADR-005). Category lists without a query use the same function with relevance = 0. The `isFeatured` (Top badge) flag is returned by the API on each gig card; clients only render it.
3. **Interface.** `SearchProvider` (`indexDocument`, `removeDocument`, `search(query, filters, sort, cursor)`), implemented by `PostgresSearchProvider`. A `MeilisearchProvider` can replace it later (typo tolerance, facets) without changing the API contract.
4. **Pagination and SEO.** Search/category endpoints use cursor pagination in the API; the web keeps SEO-friendly page numbers where legacy URLs had them (url-map.md), mapped to cursors internally.
5. **AI-ready.** The `pgvector` extension is installed but unused at launch; semantic embeddings for gigs/projects can be added to `search_documents` later and blended into the ranking function.
6. **Autocomplete** (if spec 03 wants it) uses the trigram index on titles and category names.

## Alternatives considered
- **Meilisearch now** — great typo tolerance and facets, small, open source; but one more service to run, sync and back up, and the benefit at launch volume is small. Kept as the planned upgrade path.
- **Elasticsearch/OpenSearch** — heavy (RAM, operations). Rejected.
- **Typesense** — similar to Meilisearch; same reasoning.
- **Hosted search (Algolia)** — recurring cost, data outside our control. Rejected.
- **Plain `ILIKE '%q%'` (legacy style)** — slow and no ranking. Rejected.

## Consequences
- Easier: no extra infrastructure; search is transactional (a new gig is searchable immediately); ranking lives in one testable function.
- Harder: Georgian relevance is approximate without a stemmer (trigram similarity compensates); ranking tuning needs real data (Phase 5 migrated data).
- Must change: spec 03 defines the Premium ranking rule, sort options and filters; data-model.md defines `search_documents` and indexes; openapi.yaml exposes `isFeatured` and sort/filter parameters.
