-- Files F0 (data-model §3.Q, ADR-009, ADR-017; ROADMAP 4.1.3).

-- CreateEnum
CREATE TYPE "file_purpose" AS ENUM ('avatar', 'gig_image', 'gig_thumbnail', 'gig_document', 'portfolio_image', 'category_image', 'blog_image', 'project_thumbnail', 'project_file', 'delivery', 'chat_attachment', 'offer_attachment', 'appeal_file', 'kyc_document', 'home_logo');

-- CreateEnum
CREATE TYPE "file_bucket" AS ENUM ('public_media', 'private', 'kyc');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('pending', 'scanning', 'ready', 'rejected', 'deleted');

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "legacy_source" TEXT,
    "legacy_id" BIGINT,
    "purpose" "file_purpose" NOT NULL,
    "owner_user_id" UUID,
    "owner_staff_id" UUID,
    "bucket" "file_bucket" NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "declared_type" VARCHAR(127) NOT NULL,
    "detected_type" VARCHAR(127),
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" BYTEA,
    "status" "file_status" NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "scan_skipped" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB,
    "width" INTEGER,
    "height" INTEGER,
    "legacy_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_owner_user_id_purpose_idx" ON "files"("owner_user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "files_bucket_object_key_key" ON "files"("bucket", "object_key");

-- data-model §3.Q: owners, legacy key, exactly one owner for user/staff uploads, cleanup index.
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id");
ALTER TABLE "files" ADD CONSTRAINT "files_owner_staff_fk" FOREIGN KEY ("owner_staff_id") REFERENCES "staff"("id");
ALTER TABLE "files" ADD CONSTRAINT "files_one_owner_ck"
  CHECK (NOT ("owner_user_id" IS NOT NULL AND "owner_staff_id" IS NOT NULL));
ALTER TABLE "files" ADD CONSTRAINT "files_size_ck" CHECK ("size_bytes" > 0);
CREATE UNIQUE INDEX "files_legacy_uk" ON "files" ("legacy_source", "legacy_id") WHERE "legacy_id" IS NOT NULL;
CREATE INDEX "files_pending_created_ix" ON "files" ("created_at") WHERE "status" = 'pending';
