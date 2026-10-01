-- Slice 01 part A: identity and access tables (data-model.md §3.A), settings (§3.K), referrals (§3.L), outbox (§3.O).

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending', 'active', 'verified', 'banned');

-- CreateEnum
CREATE TYPE "password_algo" AS ENUM ('bcrypt_legacy', 'argon2id');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('ka', 'en');

-- CreateEnum
CREATE TYPE "theme_pref" AS ENUM ('light', 'dark', 'system');

-- CreateEnum
CREATE TYPE "dashboard" AS ENUM ('buying', 'selling');

-- CreateEnum
CREATE TYPE "auth_token_purpose" AS ENUM ('email_verification', 'password_reset', 'email_change');

-- CreateEnum
CREATE TYPE "principal_type" AS ENUM ('user', 'staff');

-- CreateEnum
CREATE TYPE "client_kind" AS ENUM ('web', 'admin', 'ios', 'android');

-- CreateEnum
CREATE TYPE "session_revoke_reason" AS ENUM ('logout', 'password_change', 'ban', 'user_revoked', 'reuse_detected', 'staff_revoked', 'twofa_disabled');

-- CreateEnum
CREATE TYPE "twofa_purpose" AS ENUM ('login', 'toggle_two_factor', 'email_change', 'payout_details', 'revoke_sessions');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('pending', 'verified', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "username" CITEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "password_hash" TEXT,
    "password_algo" "password_algo",
    "password_changed_at" TIMESTAMPTZ(6),
    "email_changed_at" TIMESTAMPTZ(6),
    "status" "user_status" NOT NULL DEFAULT 'pending',
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "locale" "locale" NOT NULL DEFAULT 'ka',
    "theme" "theme_pref",
    "last_dashboard" "dashboard" NOT NULL DEFAULT 'buying',
    "referral_code" CHAR(8) NOT NULL,
    "last_activity_at" TIMESTAMPTZ(6),
    "banned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "fullname" VARCHAR(60) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "auth_token_purpose" NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "new_email" CITEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "principal_type" "principal_type" NOT NULL,
    "user_id" UUID,
    "staff_id" UUID,
    "family_id" UUID NOT NULL,
    "client" "client_kind" NOT NULL,
    "device_id_hash" BYTEA NOT NULL,
    "user_agent" TEXT,
    "device_label" TEXT,
    "ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" "session_revoke_reason",

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" UUID NOT NULL,
    "principal_type" "principal_type" NOT NULL,
    "user_id" UUID,
    "staff_id" UUID,
    "device_id_hash" BYTEA NOT NULL,
    "first_trusted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trusted_until" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_device_ips" (
    "trusted_device_id" UUID NOT NULL,
    "ip" INET NOT NULL,
    "trusted_until" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_device_ips_pkey" PRIMARY KEY ("trusted_device_id","ip")
);

-- CreateTable
CREATE TABLE "two_factor_challenges" (
    "id" UUID NOT NULL,
    "principal_type" "principal_type" NOT NULL,
    "user_id" UUID,
    "staff_id" UUID,
    "purpose" "twofa_purpose" NOT NULL,
    "code_hash" BYTEA NOT NULL,
    "device_id_hash" BYTEA,
    "ip" INET,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "max_attempts" SMALLINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "invalidated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "register_id" VARCHAR(6) NOT NULL,
    "value" JSONB NOT NULL,
    "current_version" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_staff_id" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "referrer_user_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "code_used" CHAR(8) NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "points_journal_id" BIGINT,
    "benefit_subscription_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_legacy_id_key" ON "users"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "two_factor_challenges_user_id_created_at_idx" ON "two_factor_challenges"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_register_id_key" ON "settings"("register_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_device_ips" ADD CONSTRAINT "trusted_device_ips_trusted_device_id_fkey" FOREIGN KEY ("trusted_device_id") REFERENCES "trusted_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- Constraints and indexes from data-model.md that Prisma cannot express
-- ---------------------------------------------------------------------------------------------
ALTER TABLE "users"
  ADD CONSTRAINT "users_username_ck" CHECK ("username" ~ '^[a-zA-Z0-9_]{3,60}$' AND "username" !~ '^[0-9]+$'),
  ADD CONSTRAINT "users_email_len_ck" CHECK (char_length("email") <= 60),
  ADD CONSTRAINT "users_referral_code_ck" CHECK ("referral_code" ~ '^[A-Z0-9]{8}$'),
  ADD CONSTRAINT "users_password_algo_ck" CHECK (("password_hash" IS NULL) = ("password_algo" IS NULL));
CREATE INDEX "users_status_live_ix" ON "users" ("status") WHERE "deleted_at" IS NULL;
CREATE INDEX "users_username_trgm_ix" ON "users" USING gin ("username" gin_trgm_ops);

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_principal_ck" CHECK (("user_id" IS NULL) <> ("staff_id" IS NULL));
CREATE INDEX "sessions_user_live_ix" ON "sessions" ("user_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "sessions_staff_live_ix" ON "sessions" ("staff_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "sessions_family_ix" ON "sessions" ("family_id");

ALTER TABLE "trusted_devices"
  ADD CONSTRAINT "trusted_devices_principal_ck" CHECK (("user_id" IS NULL) <> ("staff_id" IS NULL));
CREATE UNIQUE INDEX "trusted_devices_owner_device_uk"
  ON "trusted_devices" ("principal_type", coalesce("user_id", "staff_id"), "device_id_hash");

ALTER TABLE "two_factor_challenges"
  ADD CONSTRAINT "two_factor_challenges_principal_ck" CHECK (("user_id" IS NULL) <> ("staff_id" IS NULL));

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_not_self_ck" CHECK ("referrer_user_id" <> "referred_user_id");

CREATE INDEX "outbox_events_pending_ix" ON "outbox_events" ("id") WHERE "dispatched_at" IS NULL;
