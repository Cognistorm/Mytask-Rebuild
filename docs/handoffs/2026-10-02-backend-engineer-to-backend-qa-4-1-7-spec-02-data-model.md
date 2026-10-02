# 4.1.7 Spec 02 data model, settings rows S-071 / S-122, spec 02 i18n keys

From: backend-engineer · To: backend-engineer (4.1.8a onward), QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **Prisma + migration `20261002220000_profiles`** for data-model §3.B (spec 02):
  - `user_profiles` gets headline, about, avatar_file_id (FK files), country_id (FK countries), city, timezone,
    unavailable_until, unavailable_message, last_delivery_at, plus a partial index on `unavailable_until` for the
    daily availability reset (4.1.10).
  - New tables: `user_skills` (UK `(user_id, lower(name))`, trigram on slug and name), `user_languages`
    (UK `(user_id, lower(name))`) and `user_linked_accounts` (PK user + provider).
  - `portfolio_items` + `portfolio_images` (cascade). CHECK: `status = 'rejected'` ⇔ reason and rejected_at are
    set, so the owner's edit must clear both (AC-42).
  - `kyc_verifications`: partial UK = one pending or verified verification per user (AC-38). FKs to files and staff.
  - `countries` and `reports`. Reports have a UK per reporter + target, so AC-14 can upsert. CHECK: a decision
    needs `decision_note`. Partial UK on legacy_source + legacy_id.
  - 9 enums: skill_level, language_level, linked_provider, portfolio_status, kyc_document_type, kyc_status,
    kyc_provider, report_target, report_status.
- **Contract gap closed with the architect:** `KycVerification.declineReason` had no column. The solution-architect
  recorded `kyc_verifications.decline_reason text null` in data-model §3.B, with a "Revised 2026-10-02" note.
  Legacy `verification_center` has no reason column, so migrated declines get null. The CHECK therefore only
  enforces "reason ⇒ declined".
- **Countries reference data** is in the migration, so every environment and test DB has it. It has the 243 legacy
  rows from `legacy/APP/database/seeders/CountriesTableSeeder.php`, with legacy ids and legacy `is_active` (Algeria
  is inactive in the seed). English names come from legacy. Georgian names come from CLDR (Node `Intl.DisplayNames('ka')`).
  **Two legacy codes are not ISO 3166 and were corrected:** Mayotte `TY` → `YT`, Kosovo `KS` → `XK`.
- **Settings registry:** S-071 `moderation.portfolio.auto_approve` (boolean, default OFF, area `moderation`) and
  S-122 `kyc.provider` (enum `manual`, area `system`). Neither is public.
- **i18n:** 31 keys added, en first with ka alongside (Q-058), values from the spec 02 Texts tables and
  `t_pending_balance_hint` from spec 00. The 4.1.1 count of 35 included the 4 Q-117 keys, which already existed.
  Spec `:email` placeholders are written as i18next `{{email}}`.

## Files created/changed
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261002220000_profiles/migration.sql`
- `apps/api/src/platform/settings/registry.ts`, `apps/api/test/settings-registry.test.ts`
- `apps/api/test/profiles-schema.test.ts` (new, 6 tests)
- `packages/i18n/en.json`, `packages/i18n/ka.json`
- `docs/03-architecture/data-model.md` (by the solution-architect), `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
4.1.8a (`getMyProfile`, `updateMyProfile`, `getUserProfile`, avatar). Points to watch:
- `timezone` null → `Asia/Tbilisi`.
- Avatar = `files` purpose `avatar`; delete the old file when it is replaced.
- Use the neutral values from the 4.1.1 handoff §C.
- `listCountries` (spec 16 AC-62) reads `countries` where `is_active`.

## Open questions / risks
- No new Owner question. Phase 5 ETL: legacy *production* `countries` may differ from the seed. The ETL upserts by
  id and must map `TY`/`KS` the same way.
- Docker Desktop's engine did not start on this machine (WSL is not installed), so the migration was checked on
  PGlite only (same as the unit tests): it applies cleanly, and `prisma migrate diff` shows no drift apart from the
  SQL-only objects. CI runs it on real PostgreSQL.
- Tests: API 253 passed / 5 skipped, i18n OK, typecheck and lint clean, format OK.
