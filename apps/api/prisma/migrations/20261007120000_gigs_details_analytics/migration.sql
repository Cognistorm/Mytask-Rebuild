-- Spec 04 data model (ROADMAP 4.3.2b, data-model §3.D, §3.S, ADR-012, ADR-024): the rest of §3.D (upgrades,
-- FAQs, gallery images, documents, favourites), staff removal / restore columns on `gigs`, and the analytics
-- tables for gig views. Gig reports use the `reports` table of slice 2 (target_type `gig`).

-- CreateEnum
CREATE TYPE "gig_deleted_by" AS ENUM ('owner', 'staff');

-- AlterTable
ALTER TABLE "gigs" ADD COLUMN "deleted_by" "gig_deleted_by",
ADD COLUMN "deleted_by_staff_id" UUID,
ADD COLUMN "removal_reason" VARCHAR(1000),
ADD COLUMN "submitted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "gig_upgrades" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "gig_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "price_tetri" BIGINT NOT NULL,
    "extra_days" SMALLINT NOT NULL DEFAULT 0,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gig_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_faqs" (
    "id" UUID NOT NULL,
    "gig_id" UUID NOT NULL,
    "question" VARCHAR(100) NOT NULL,
    "answer" VARCHAR(300) NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "gig_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_images" (
    "gig_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "gig_images_pkey" PRIMARY KEY ("gig_id","file_id")
);

-- CreateTable
CREATE TABLE "gig_documents" (
    "gig_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "gig_documents_pkey" PRIMARY KEY ("gig_id","file_id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "gig_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","gig_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gig_upgrades_legacy_id_key" ON "gig_upgrades"("legacy_id");

-- CreateIndex
CREATE INDEX "gig_upgrades_gig_id_idx" ON "gig_upgrades"("gig_id");

-- CreateIndex
CREATE INDEX "gig_faqs_gig_id_idx" ON "gig_faqs"("gig_id");

-- CreateIndex
CREATE INDEX "gig_images_file_id_idx" ON "gig_images"("file_id");

-- CreateIndex
CREATE INDEX "gig_documents_file_id_idx" ON "gig_documents"("file_id");

-- CreateIndex
CREATE INDEX "favorites_user_id_created_at_idx" ON "favorites"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "favorites_gig_id_idx" ON "favorites"("gig_id");

-- AddForeignKey
ALTER TABLE "gig_upgrades" ADD CONSTRAINT "gig_upgrades_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_faqs" ADD CONSTRAINT "gig_faqs_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_images" ADD CONSTRAINT "gig_images_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_documents" ADD CONSTRAINT "gig_documents_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- data-model §3.D: removal / restore (ADR-024), checks, files, gallery order.

-- Removal: `deleted` ⇔ `deleted_at` ⇔ `deleted_by`; who removed and why only for staff removals (staff id null
-- for migrated staff removals). Replaces the 4.2.2b pair check.
ALTER TABLE "gigs" DROP CONSTRAINT "gigs_deleted_ck";
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_deleted_ck" CHECK (
  ("status" = 'deleted') = ("deleted_at" IS NOT NULL) AND ("deleted_at" IS NULL) = ("deleted_by" IS NULL));
-- `IS NOT DISTINCT FROM`: a plain `=` is NULL while `deleted_by` is NULL, and a NULL check passes.
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_removal_ck" CHECK (
  "deleted_by" IS NOT DISTINCT FROM 'staff' OR ("deleted_by_staff_id" IS NULL AND "removal_reason" IS NULL));
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_deleted_by_staff_fk" FOREIGN KEY ("deleted_by_staff_id") REFERENCES "staff"("id");
-- Moderation queue, oldest first (spec 16 AC-19).
CREATE INDEX "gigs_pending_submitted_ix" ON "gigs" ("status", "submitted_at") WHERE "status" = 'pending';

-- Upgrades (R-G9): price ≥ 1.00 GEL (P-35), extra days from the delivery list (0 = no change). At most 10
-- active per gig is an app rule.
ALTER TABLE "gig_upgrades" ADD CONSTRAINT "gig_upgrades_price_ck" CHECK ("price_tetri" >= 100);
ALTER TABLE "gig_upgrades" ADD CONSTRAINT "gig_upgrades_extra_days_ck" CHECK ("extra_days" IN (0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30));
ALTER TABLE "gig_upgrades" ADD CONSTRAINT "gig_upgrades_position_ck" CHECK ("position" >= 0);
ALTER TABLE "gig_faqs" ADD CONSTRAINT "gig_faqs_position_ck" CHECK ("position" >= 0);

-- Gallery and documents: one position per gig. Deferred to the end of the transaction, so a reorder (P-34) can
-- swap positions in any order.
ALTER TABLE "gig_images" ADD CONSTRAINT "gig_images_file_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id");
ALTER TABLE "gig_images" ADD CONSTRAINT "gig_images_position_ck" CHECK ("position" >= 0);
ALTER TABLE "gig_images" ADD CONSTRAINT "gig_images_gig_position_key" UNIQUE ("gig_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "gig_documents" ADD CONSTRAINT "gig_documents_file_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id");
ALTER TABLE "gig_documents" ADD CONSTRAINT "gig_documents_position_ck" CHECK ("position" >= 0);
ALTER TABLE "gig_documents" ADD CONSTRAINT "gig_documents_gig_position_key" UNIQUE ("gig_id", "position") DEFERRABLE INITIALLY DEFERRED;


-- data-model §3.S, ADR-012: first-party analytics, no raw IP. Raw events are partitioned by month and kept 90
-- days; the DEFAULT partition takes rows until the monthly partition job (ROADMAP 4.3.5) creates the month's
-- partition. The daily aggregates feed gig analytics (spec 04 AC-39) and the admin dashboard (spec 16).
CREATE TABLE "analytics_events" (
    "id" BIGINT GENERATED BY DEFAULT AS IDENTITY,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(40) NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "path_template" VARCHAR(200),
    "locale" "locale",
    "entity_type" VARCHAR(20),
    "entity_id" UUID,
    "user_id" UUID,
    "visitor_hash" BYTEA,
    "country_code" CHAR(2),
    "city" VARCHAR(100),
    "device_type" VARCHAR(20),
    "os" VARCHAR(40),
    "browser" VARCHAR(40),
    "referrer_domain" VARCHAR(255),
    "utm" JSONB,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id", "occurred_at"),
    CONSTRAINT "analytics_events_platform_ck" CHECK ("platform" IN ('web', 'ios', 'android', 'server'))
) PARTITION BY RANGE ("occurred_at");
CREATE TABLE "analytics_events_default" PARTITION OF "analytics_events" DEFAULT;
CREATE INDEX "analytics_events_entity_ix" ON "analytics_events" ("entity_type", "entity_id", "occurred_at");
CREATE INDEX "analytics_events_type_ix" ON "analytics_events" ("event_type", "occurred_at");

-- One row per day × metric × dimension value × entity (the zero uuid stands for "no entity" in the key).
CREATE TABLE "analytics_daily" (
    "id" BIGINT GENERATED BY DEFAULT AS IDENTITY,
    "day" DATE NOT NULL,
    "metric" VARCHAR(40) NOT NULL,
    "dimension" VARCHAR(40) NOT NULL,
    "dimension_value" VARCHAR(255) NOT NULL DEFAULT '',
    "entity_type" VARCHAR(20) NOT NULL DEFAULT '',
    "entity_id" UUID,
    "count" BIGINT NOT NULL DEFAULT 0,
    "uniques" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_daily_counts_ck" CHECK ("count" >= 0 AND "uniques" >= 0)
);
CREATE UNIQUE INDEX "analytics_daily_key" ON "analytics_daily" (
  "day", "metric", "dimension", "dimension_value", "entity_type",
  COALESCE("entity_id", '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX "analytics_daily_entity_ix" ON "analytics_daily" ("entity_type", "entity_id", "day")
  WHERE "entity_id" IS NOT NULL;
