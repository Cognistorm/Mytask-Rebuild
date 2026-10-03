-- Spec 03 data model (ROADMAP 4.2.2b, data-model §3.C, §3.R, §3.S): gig categories (3 levels), project
-- categories, skills, old slugs, the gig core of §3.D (the rest of §3.D comes with slice 3) and search documents.

-- CreateEnum
CREATE TYPE "translation_source" AS ENUM ('human', 'machine');

-- CreateEnum
CREATE TYPE "category_legacy_source" AS ENUM ('categories', 'subcategories', 'childcategories');

-- CreateEnum
CREATE TYPE "slug_entity_type" AS ENUM ('gig_category', 'page', 'blog_article');

-- CreateEnum
CREATE TYPE "gig_status" AS ENUM ('pending', 'active', 'rejected', 'deleted');

-- CreateEnum
CREATE TYPE "search_entity_type" AS ENUM ('gig', 'project', 'user');

-- CreateTable
CREATE TABLE "gig_categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "depth" SMALLINT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "icon_file_id" UUID,
    "image_file_id" UUID,
    "legacy_source" "category_legacy_source",
    "legacy_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gig_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_category_translations" (
    "category_id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "content_top" TEXT,
    "content_bottom" TEXT,
    "source" "translation_source" NOT NULL DEFAULT 'human',
    "source_locale" "locale",
    "source_hash" BYTEA,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID,
    "updated_by_staff_id" UUID,

    CONSTRAINT "gig_category_translations_pkey" PRIMARY KEY ("category_id","locale")
);

-- CreateTable
CREATE TABLE "project_categories" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "slug" VARCHAR(160) NOT NULL,
    "gig_category_id" UUID,
    "image_file_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_category_translations" (
    "project_category_id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "seo_description" TEXT,
    "source" "translation_source" NOT NULL DEFAULT 'human',
    "source_locale" "locale",
    "source_hash" BYTEA,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID,
    "updated_by_staff_id" UUID,

    CONSTRAINT "project_category_translations_pkey" PRIMARY KEY ("project_category_id","locale")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "project_category_id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_translations" (
    "skill_id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "source" "translation_source" NOT NULL DEFAULT 'human',
    "source_locale" "locale",
    "source_hash" BYTEA,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID,
    "updated_by_staff_id" UUID,

    CONSTRAINT "skill_translations_pkey" PRIMARY KEY ("skill_id","locale")
);

-- CreateTable
CREATE TABLE "slug_redirects" (
    "entity_type" "slug_entity_type" NOT NULL,
    "scope" SMALLINT NOT NULL,
    "old_slug" VARCHAR(160) NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_redirects_pkey" PRIMARY KEY ("entity_type","scope","old_slug")
);

-- CreateTable
CREATE TABLE "gigs" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "uid" VARCHAR(20) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID NOT NULL,
    "childcategory_id" UUID NOT NULL,
    "price_tetri" BIGINT NOT NULL,
    "delivery_days" SMALLINT NOT NULL,
    "revisions_allowed" SMALLINT,
    "status" "gig_status" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "thumbnail_file_id" UUID NOT NULL,
    "seo_title" VARCHAR(100),
    "seo_description" VARCHAR(150),
    "video_url" TEXT,
    "visits_count" BIGINT NOT NULL DEFAULT 0,
    "impressions_count" BIGINT NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "orders_in_queue" INTEGER NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_translations" (
    "gig_id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "source" "translation_source" NOT NULL DEFAULT 'human',
    "source_locale" "locale",
    "source_hash" BYTEA,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID,
    "updated_by_staff_id" UUID,

    CONSTRAINT "gig_translations_pkey" PRIMARY KEY ("gig_id","locale")
);

-- CreateTable
CREATE TABLE "search_documents" (
    "entity_type" "search_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "tsv" tsvector NOT NULL DEFAULT ''::tsvector,
    "search_text" TEXT NOT NULL DEFAULT '',
    "category_id" UUID,
    "subcategory_id" UUID,
    "childcategory_id" UUID,
    "project_category_id" UUID,
    "price_tetri" BIGINT,
    "delivery_days" SMALLINT,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "rating_sum" INTEGER NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "visits_count" BIGINT NOT NULL DEFAULT 0,
    "owner_is_premium" BOOLEAN NOT NULL DEFAULT false,
    "owner_listable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "search_documents_pkey" PRIMARY KEY ("entity_type","entity_id")
);

-- CreateIndex
CREATE INDEX "gig_categories_parent_id_idx" ON "gig_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "gig_categories_depth_slug_key" ON "gig_categories"("depth", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "gig_categories_legacy_source_legacy_id_key" ON "gig_categories"("legacy_source", "legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_legacy_id_key" ON "project_categories"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_slug_key" ON "project_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skills_legacy_id_key" ON "skills"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_project_category_id_slug_key" ON "skills"("project_category_id", "slug");

-- CreateIndex
CREATE INDEX "slug_redirects_entity_type_entity_id_idx" ON "slug_redirects"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "gigs_legacy_id_key" ON "gigs"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "gigs_uid_key" ON "gigs"("uid");

-- CreateIndex
CREATE INDEX "gigs_category_id_idx" ON "gigs"("category_id");

-- CreateIndex
CREATE INDEX "gigs_subcategory_id_idx" ON "gigs"("subcategory_id");

-- CreateIndex
CREATE INDEX "gigs_childcategory_id_idx" ON "gigs"("childcategory_id");

-- AddForeignKey
ALTER TABLE "gig_categories" ADD CONSTRAINT "gig_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gig_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_category_translations" ADD CONSTRAINT "gig_category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "gig_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_categories" ADD CONSTRAINT "project_categories_gig_category_id_fkey" FOREIGN KEY ("gig_category_id") REFERENCES "gig_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_category_translations" ADD CONSTRAINT "project_category_translations_project_category_id_fkey" FOREIGN KEY ("project_category_id") REFERENCES "project_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_project_category_id_fkey" FOREIGN KEY ("project_category_id") REFERENCES "project_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_translations" ADD CONSTRAINT "skill_translations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "gig_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "gig_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_childcategory_id_fkey" FOREIGN KEY ("childcategory_id") REFERENCES "gig_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_translations" ADD CONSTRAINT "gig_translations_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- data-model §3.C, §3.D (core), §3.R, §3.S: FKs to files/users/staff, the category tree and gig category chain
-- triggers, state checks, search indexes.

-- Gig category tree: depth comes from the parent (1 for the top level, at most 3). A category never moves to
-- another parent (the contract has no `parentId` on update), so the depth of its children never goes stale.
ALTER TABLE "gig_categories" ADD CONSTRAINT "gig_categories_depth_ck" CHECK ("depth" BETWEEN 1 AND 3);
ALTER TABLE "gig_categories" ADD CONSTRAINT "gig_categories_icon_file_fk" FOREIGN KEY ("icon_file_id") REFERENCES "files"("id");
ALTER TABLE "gig_categories" ADD CONSTRAINT "gig_categories_image_file_fk" FOREIGN KEY ("image_file_id") REFERENCES "files"("id");

CREATE FUNCTION "gig_categories_set_depth"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."parent_id" IS DISTINCT FROM OLD."parent_id" THEN
    RAISE EXCEPTION 'gig_categories: a category cannot move to another parent' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."parent_id" IS NULL THEN
    NEW."depth" := 1;
  ELSE
    SELECT "depth" + 1 INTO NEW."depth" FROM "gig_categories" WHERE "id" = NEW."parent_id";
    IF NEW."depth" > 3 THEN
      RAISE EXCEPTION 'gig_categories: at most three levels' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "gig_categories_set_depth" BEFORE INSERT OR UPDATE OF "parent_id", "depth" ON "gig_categories"
  FOR EACH ROW EXECUTE FUNCTION "gig_categories_set_depth"();

-- A project category links only to a top-level gig category (P-31, BR-053).
ALTER TABLE "project_categories" ADD CONSTRAINT "project_categories_image_file_fk" FOREIGN KEY ("image_file_id") REFERENCES "files"("id");
CREATE FUNCTION "project_categories_check_gig_category"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."gig_category_id" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "gig_categories" WHERE "id" = NEW."gig_category_id" AND "depth" = 1) THEN
    RAISE EXCEPTION 'project_categories: gig_category_id must be a top-level gig category' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "project_categories_check_gig_category" BEFORE INSERT OR UPDATE OF "gig_category_id" ON "project_categories"
  FOR EACH ROW EXECUTE FUNCTION "project_categories_check_gig_category"();

-- Translation provenance (data-model §1 TM): who edited the row.
ALTER TABLE "gig_category_translations" ADD CONSTRAINT "gig_category_translations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");
ALTER TABLE "gig_category_translations" ADD CONSTRAINT "gig_category_translations_updated_by_staff_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "staff"("id");
ALTER TABLE "project_category_translations" ADD CONSTRAINT "project_category_translations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");
ALTER TABLE "project_category_translations" ADD CONSTRAINT "project_category_translations_updated_by_staff_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "staff"("id");
ALTER TABLE "skill_translations" ADD CONSTRAINT "skill_translations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");
ALTER TABLE "skill_translations" ADD CONSTRAINT "skill_translations_updated_by_staff_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "staff"("id");
ALTER TABLE "gig_translations" ADD CONSTRAINT "gig_translations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");
ALTER TABLE "gig_translations" ADD CONSTRAINT "gig_translations_updated_by_staff_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "staff"("id");

-- Old slugs (§3.R): categories are scoped by their level, pages and articles use 0.
ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_scope_ck" CHECK (
  ("entity_type" = 'gig_category' AND "scope" BETWEEN 1 AND 3) OR ("entity_type" <> 'gig_category' AND "scope" = 0));

-- Gigs (§3.D): price ≥ 1.00 GEL (P-35), the fixed delivery list (00 §4.18), revisions 0…100 (null only for
-- migrated gigs), non-negative counters, SEO title and description saved together, `deleted` ⇔ `deleted_at`.
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_thumbnail_file_fk" FOREIGN KEY ("thumbnail_file_id") REFERENCES "files"("id");
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_price_ck" CHECK ("price_tetri" >= 100);
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_delivery_days_ck" CHECK ("delivery_days" IN (0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30));
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_revisions_ck" CHECK (
  CASE WHEN "revisions_allowed" IS NULL THEN "legacy_id" IS NOT NULL ELSE "revisions_allowed" BETWEEN 0 AND 100 END);
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_counters_ck" CHECK (
  "orders_in_queue" >= 0 AND "sales_count" >= 0 AND "rating_count" >= 0 AND "rating_sum" >= 0
  AND "visits_count" >= 0 AND "impressions_count" >= 0);
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_seo_pair_ck" CHECK (("seo_title" IS NULL) = ("seo_description" IS NULL));
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_deleted_ck" CHECK (("status" = 'deleted') = ("deleted_at" IS NOT NULL));
CREATE INDEX "gigs_owner_not_deleted_ix" ON "gigs" ("owner_id") WHERE "status" <> 'deleted';
CREATE INDEX "gigs_status_published_ix" ON "gigs" ("status", "published_at" DESC);

-- Category chain: category (level 1) → sub-category (its child) → child category (the sub-category's child).
CREATE FUNCTION "gigs_check_category_chain"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "gig_categories" WHERE "id" = NEW."category_id" AND "depth" = 1)
     OR NOT EXISTS (SELECT 1 FROM "gig_categories" WHERE "id" = NEW."subcategory_id" AND "parent_id" = NEW."category_id")
     OR NOT EXISTS (SELECT 1 FROM "gig_categories" WHERE "id" = NEW."childcategory_id" AND "parent_id" = NEW."subcategory_id") THEN
    RAISE EXCEPTION 'gigs: category, sub-category and child category must form one branch' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "gigs_check_category_chain" BEFORE INSERT OR UPDATE OF "category_id", "subcategory_id", "childcategory_id" ON "gigs"
  FOR EACH ROW EXECUTE FUNCTION "gigs_check_category_chain"();

-- Search documents (§3.S, ADR-011): words (tsvector) and substrings (trigram) plus the filter and sort columns.
CREATE INDEX "search_documents_tsv_ix" ON "search_documents" USING gin ("tsv");
CREATE INDEX "search_documents_text_trgm_ix" ON "search_documents" USING gin ("search_text" gin_trgm_ops);
CREATE INDEX "search_documents_listing_ix" ON "search_documents" ("entity_type", "status", "published_at" DESC);
CREATE INDEX "search_documents_category_ix" ON "search_documents" ("category_id") WHERE "category_id" IS NOT NULL;
CREATE INDEX "search_documents_subcategory_ix" ON "search_documents" ("subcategory_id") WHERE "subcategory_id" IS NOT NULL;
CREATE INDEX "search_documents_childcategory_ix" ON "search_documents" ("childcategory_id") WHERE "childcategory_id" IS NOT NULL;
CREATE INDEX "search_documents_project_category_ix" ON "search_documents" ("project_category_id") WHERE "project_category_id" IS NOT NULL;
CREATE INDEX "search_documents_price_ix" ON "search_documents" ("entity_type", "price_tetri");
