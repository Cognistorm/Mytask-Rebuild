-- CreateEnum
CREATE TYPE "restriction_status" AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "user_restrictions" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "files_required" BOOLEAN NOT NULL,
    "status" "restriction_status" NOT NULL DEFAULT 'pending',
    "decision_reason" TEXT,
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_staff_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restriction_appeals" (
    "id" UUID NOT NULL,
    "restriction_id" UUID NOT NULL,
    "message" VARCHAR(1500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restriction_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restriction_appeals_restriction_id_key" ON "restriction_appeals"("restriction_id");

-- AddForeignKey
ALTER TABLE "restriction_appeals" ADD CONSTRAINT "restriction_appeals_restriction_id_fkey" FOREIGN KEY ("restriction_id") REFERENCES "user_restrictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- data-model §3.A: FKs and the partial index that drives users.is_restricted.
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_created_by_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff"("id");
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_resolved_by_fk" FOREIGN KEY ("resolved_by_staff_id") REFERENCES "staff"("id");
CREATE UNIQUE INDEX "user_restrictions_legacy_uk" ON "user_restrictions" ("legacy_id") WHERE "legacy_id" IS NOT NULL;
CREATE INDEX "user_restrictions_active_ix" ON "user_restrictions" ("user_id")
  WHERE "deleted_at" IS NULL AND "status" IN ('pending', 'submitted', 'rejected');
