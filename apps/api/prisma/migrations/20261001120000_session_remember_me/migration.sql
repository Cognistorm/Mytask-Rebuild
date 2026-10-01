-- SEC-41 / I-23 (data-model §3.A): the "remember me" choice of the login is kept on the session and used on every
-- refresh; a login code (2FA) carries it from the password step to the session it creates.
ALTER TABLE "sessions" ADD COLUMN "remember_me" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "two_factor_challenges" ADD COLUMN "remember_me" BOOLEAN NOT NULL DEFAULT true;
