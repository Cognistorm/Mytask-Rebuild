# 4.3.2a Gig removal / restore in the data model, EV-130, contract 1.5.0

From: solution-architect (+ product-analyst for the spec rows) · To: backend-engineer (4.3.2b, 4.3.7, 4.3.8), web-engineer (4.3.13 admin), mobile-engineer (info) · Date: 2026-10-07

## What I did
- **Data model §3.D** (`docs/03-architecture/data-model.md`, revision note at the top): on `gigs`
  - `deleted_by gig_deleted_by null` — new enum `gig_deleted_by` (`owner`, `staff`);
  - `deleted_by_staff_id uuid null FK→staff` (null for migrated staff removals);
  - `removal_reason varchar(1000) null` (internal, staff only);
  - `submitted_at timestamptz null` (last create/edit that went to `pending`; moderation queue oldest first);
  - CK `gigs_deleted_ck`: `(status = 'deleted') = (deleted_at IS NOT NULL) AND (deleted_at IS NULL) = (deleted_by IS NULL)`;
  - CK `gigs_removal_ck`: `deleted_by = 'staff' OR (deleted_by_staff_id IS NULL AND removal_reason IS NULL)`;
  - IX `(status, submitted_at) WHERE status = 'pending'`.
  `AdminGig.removedAt` = `deleted_at`; `restoreDeadlineAt` = `deleted_at + 30 days` (computed, not stored).
  §12.2: legacy owner delete (`status = deleted` + `deleted_at`) → `deleted_by = owner`; legacy admin delete =
  Laravel soft delete with status unchanged (`legacy/APP/app/Livewire/Admin/Gigs/GigsComponent.php:187`) →
  status `deleted`, `deleted_by = staff`; `submitted_at` = `updated_at` for pending gigs.
- **Analytics confirmed:** `analytics_events` (monthly partitions, 90 days raw) and `analytics_daily` of §3.S, as
  designed, are created in 4.3.2b; `gigs.visits_count` / `impressions_count` stay the fast counters.
- **Owner Q-123 (b):** spec 15 NEW **EV-130** gig restored (owner; email + in-app + push; T; SMS-ready OFF), total 130
  events / 47 NEW; spec 16 AC-20 extended + 4 NEW keys (en + ka): `t_admin_gig_restore_plan_limit`,
  `t_subject_gig_restored`, `t_gig_restored_email_body`, `t_ur_gig_title_has_been_restored`.
- **ADR-024** (`docs/03-architecture/adr/024-gig-restore-plan-limit-and-notice.md`) and **contract 1.5.0**:
  `adminRestoreGig` description, `x-settings: [S-001, S-002]`, `x-notifications: [EV-130]`; 422 PLAN_LIMIT_REACHED
  was already a declared code, so no schema change. `npm run verify:final`: lint 0/0, check-contract 0/0,
  check-coverage 0/0, 719/719 ACs. `packages/types` + `packages/api-client` regenerated.

## Files created/changed
- `docs/03-architecture/data-model.md` (§3.D, §12.2, revision note)
- `docs/03-architecture/adr/024-gig-restore-plan-limit-and-notice.md` (new)
- `docs/02-specs/15-notifications.md` (EV-130, counts), `docs/02-specs/16-admin-panel.md` (AC-20, notifications, Texts, Q-123 answered)
- `docs/04-api/src/paths/d2-catalog-gigs-reviews-content.yaml`, `src/openapi.base.yaml`, `src/openapi.root.yaml`, `openapi.yaml`, `README.md`
- `packages/types/src/generated/*`, `packages/api-client/src/generated/operations.ts`
- `docs/01-discovery/open-questions.md`, `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
**4.3.2b (backend):** one migration with the rest of §3.D (upgrades, FAQs, images, documents, favourites), the four
columns + enum + checks + index above, `analytics_events` / `analytics_daily`; S-070 registry row; 23 i18n keys
(19 from the 4.3.1 handoff §F + the 4 above; values in spec 04, spec 00 and spec 16 Texts; placeholders as `{{name}}`).
Schema test like `test/catalog-schema.test.ts` for the new checks.
**4.3.7:** restore per ADR-024 §1–§2 (limit check inside the owner's gig-count lock, back to `active`, clear the
removal columns, `SearchIndex`, audit `gig.restore`, `gig.status_changed`). **4.3.8:** add EV-130 to the outbox
event union, mail templates and the catalogue test.

## Open questions / risks
- None new. Risk: `PremiumStatus` is still always false, so restore uses the Standard limit (S-001) for everyone
  until slice 8 — same as `createGig`.
