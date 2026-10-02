-- Spec 02 data model (ROADMAP 4.1.7, data-model §3.B): profile columns (availability included), skills,
-- languages, linked accounts, portfolio, KYC, countries and reports.

-- CreateEnum
CREATE TYPE "skill_level" AS ENUM ('beginner', 'intermediate', 'pro');

-- CreateEnum
CREATE TYPE "language_level" AS ENUM ('basic', 'conversational', 'fluent', 'native');

-- CreateEnum
CREATE TYPE "linked_provider" AS ENUM ('facebook', 'twitter', 'dribbble', 'stackoverflow', 'github', 'youtube', 'vimeo');

-- CreateEnum
CREATE TYPE "portfolio_status" AS ENUM ('pending', 'active', 'rejected');

-- CreateEnum
CREATE TYPE "kyc_document_type" AS ENUM ('national_id', 'driver_license', 'passport');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('pending', 'verified', 'declined');

-- CreateEnum
CREATE TYPE "kyc_provider" AS ENUM ('manual');

-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('user', 'gig', 'project', 'proposal');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'dismissed', 'resolved');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "about" VARCHAR(1500),
ADD COLUMN     "avatar_file_id" UUID,
ADD COLUMN     "city" VARCHAR(60),
ADD COLUMN     "country_id" SMALLINT,
ADD COLUMN     "headline" VARCHAR(100),
ADD COLUMN     "last_delivery_at" TIMESTAMPTZ(6),
ADD COLUMN     "timezone" VARCHAR(64),
ADD COLUMN     "unavailable_message" VARCHAR(750),
ADD COLUMN     "unavailable_until" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "countries" (
    "id" SMALLINT NOT NULL,
    "iso2" CHAR(2) NOT NULL,
    "name_ka" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "experience" "skill_level" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" "language_level" NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_linked_accounts" (
    "user_id" UUID NOT NULL,
    "provider" "linked_provider" NOT NULL,
    "url" VARCHAR(160) NOT NULL,

    CONSTRAINT "user_linked_accounts_pkey" PRIMARY KEY ("user_id","provider")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "uid" VARCHAR(20) NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "project_url" VARCHAR(120),
    "video_url" VARCHAR(120),
    "thumbnail_file_id" UUID NOT NULL,
    "status" "portfolio_status" NOT NULL DEFAULT 'pending',
    "rejection_reason" VARCHAR(1000),
    "rejected_at" TIMESTAMPTZ(6),
    "reviewed_by_staff_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_images" (
    "portfolio_item_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("portfolio_item_id","file_id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "user_id" UUID NOT NULL,
    "document_type" "kyc_document_type" NOT NULL,
    "front_file_id" UUID NOT NULL,
    "back_file_id" UUID,
    "selfie_file_id" UUID NOT NULL,
    "status" "kyc_status" NOT NULL DEFAULT 'pending',
    "provider" "kyc_provider" NOT NULL DEFAULT 'manual',
    "provider_reference" TEXT,
    "decline_reason" TEXT,
    "reviewed_by_staff_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "legacy_source" TEXT,
    "legacy_id" BIGINT,
    "reporter_user_id" UUID NOT NULL,
    "target_type" "report_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(1500) NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "decision_note" VARCHAR(1000),
    "handled_by_staff_id" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE INDEX "user_skills_slug_idx" ON "user_skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_legacy_id_key" ON "portfolio_items"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_uid_key" ON "portfolio_items"("uid");

-- CreateIndex
CREATE INDEX "portfolio_items_user_id_status_idx" ON "portfolio_items"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verifications_legacy_id_key" ON "kyc_verifications"("legacy_id");

-- CreateIndex
CREATE INDEX "kyc_verifications_user_id_created_at_idx" ON "kyc_verifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporter_user_id_target_type_target_id_key" ON "reports"("reporter_user_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_linked_accounts" ADD CONSTRAINT "user_linked_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_portfolio_item_id_fkey" FOREIGN KEY ("portfolio_item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- data-model §3.B: FKs to files and staff, case-insensitive uniques, search and sweeper indexes, state checks.
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_file_fk" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id");
CREATE INDEX "user_profiles_unavailable_until_ix" ON "user_profiles" ("unavailable_until") WHERE "unavailable_until" IS NOT NULL;

CREATE UNIQUE INDEX "user_skills_user_name_uk" ON "user_skills" ("user_id", lower("name"));
CREATE INDEX "user_skills_slug_trgm_ix" ON "user_skills" USING gin ("slug" gin_trgm_ops);
CREATE INDEX "user_skills_name_trgm_ix" ON "user_skills" USING gin ("name" gin_trgm_ops);
CREATE UNIQUE INDEX "user_languages_user_name_uk" ON "user_languages" ("user_id", lower("name"));

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_thumbnail_file_fk" FOREIGN KEY ("thumbnail_file_id") REFERENCES "files"("id");
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_reviewed_by_fk" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff"("id");
-- The reason is shown only while `rejected`; the owner's next edit clears both columns (spec 02 AC-42).
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_rejection_ck"
  CHECK (("status" = 'rejected') = ("rejection_reason" IS NOT NULL AND "rejected_at" IS NOT NULL));
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_file_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id");

ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_front_file_fk" FOREIGN KEY ("front_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_back_file_fk" FOREIGN KEY ("back_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_selfie_file_fk" FOREIGN KEY ("selfie_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_fk" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff"("id");
-- Migrated declines have no reason (legacy `verification_center` has none), so only "reason ⇒ declined".
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_decline_reason_ck"
  CHECK ("decline_reason" IS NULL OR "status" = 'declined');
-- One active verification per user (spec 02 AC-38).
CREATE UNIQUE INDEX "kyc_verifications_active_uk" ON "kyc_verifications" ("user_id") WHERE "status" IN ('pending', 'verified');

ALTER TABLE "reports" ADD CONSTRAINT "reports_handled_by_fk" FOREIGN KEY ("handled_by_staff_id") REFERENCES "staff"("id");
-- A decision needs a note (spec 16 AC-28); migrated "seen" rows come in as `pending`.
ALTER TABLE "reports" ADD CONSTRAINT "reports_decision_note_ck" CHECK ("status" = 'pending' OR "decision_note" IS NOT NULL);
CREATE UNIQUE INDEX "reports_legacy_uk" ON "reports" ("legacy_source", "legacy_id") WHERE "legacy_id" IS NOT NULL;

-- Reference data: only Georgia for now (Owner 2026-10-02). Legacy id 81 kept (CountriesTableSeeder), so the
-- Phase 5 ETL can add the other legacy countries by id when they are needed.
INSERT INTO "countries" ("id", "iso2", "name_ka", "name_en", "is_active") VALUES
    (81, 'GE', 'საქართველო', 'Georgia', true);
