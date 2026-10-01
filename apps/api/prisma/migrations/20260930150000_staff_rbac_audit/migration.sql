-- CreateEnum
CREATE TYPE "staff_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ban_source" AS ENUM ('auto_threshold', 'manual');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('staff', 'user', 'system');

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "username" CITEXT NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT,
    "password_algo" "password_algo",
    "status" "staff_status" NOT NULL DEFAULT 'active',
    "locale" "locale" NOT NULL DEFAULT 'ka',
    "last_login_at" TIMESTAMPTZ(6),
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "code" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_code" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_code")
);

-- CreateTable
CREATE TABLE "staff_roles" (
    "staff_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_by_staff_id" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("staff_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" "actor_type" NOT NULL,
    "actor_staff_id" UUID,
    "actor_user_id" UUID,
    "permission_code" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" INET,
    "user_agent" TEXT,
    "request_id" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_ips" (
    "ip" INET NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "banned_at" TIMESTAMPTZ(6),
    "source" "ban_source" NOT NULL DEFAULT 'auto_threshold',
    "note" TEXT,
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "banned_ips_pkey" PRIMARY KEY ("ip")
);

-- CreateTable
CREATE TABLE "setting_versions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_staff_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_legacy_id_key" ON "staff"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_username_key" ON "staff"("username");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_occurred_at_idx" ON "audit_log"("target_type", "target_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_staff_id_occurred_at_idx" ON "audit_log"("actor_staff_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_action_occurred_at_idx" ON "audit_log"("action", "occurred_at");

-- CreateIndex
CREATE INDEX "setting_versions_key_effective_from_idx" ON "setting_versions"("key", "effective_from" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "setting_versions_key_version_key" ON "setting_versions"("key", "version");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Slice 01 part B (data-model §3.P): constraints Prisma cannot express.
ALTER TABLE "staff"
  ADD CONSTRAINT "staff_password_algo_ck" CHECK (("password_hash" IS NULL) = ("password_algo" IS NULL));
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id");
ALTER TABLE "trusted_devices"
  ADD CONSTRAINT "trusted_devices_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id");
ALTER TABLE "two_factor_challenges"
  ADD CONSTRAINT "two_factor_challenges_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "staff"("id");
ALTER TABLE "setting_versions"
  ADD CONSTRAINT "setting_versions_key_fk" FOREIGN KEY ("key") REFERENCES "settings"("key");
-- audit_log is append-only.
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
