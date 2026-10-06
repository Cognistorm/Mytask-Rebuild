-- Files F0 part 2 (ROADMAP 4.1.4): the worker's files-scan sweeper reads `scanning` files oldest first
-- every 2 seconds; a partial index keeps that cheap however large `files` grows (ADR-008: every sweeper
-- has an index on what it selects).
CREATE INDEX "files_scanning_created_ix" ON "files" ("created_at") WHERE "status" = 'scanning';
