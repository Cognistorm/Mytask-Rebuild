-- Social login links (data-model §3.A social_accounts; ADR-002 §7).
CREATE TYPE "social_provider" AS ENUM ('google', 'facebook', 'github', 'linkedin', 'twitter');

CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "social_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
