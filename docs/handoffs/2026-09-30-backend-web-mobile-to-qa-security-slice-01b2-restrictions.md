# Handoff — slice 01 part B-2a + B-2b (staff user actions, restrictions and appeals) → QA + Security

Branch `feat/auth`. Date 2026-09-30.

## What I did
**B-2a** (commit 5f485806, CI green on all 5 jobs):
- Banned IPs of the staff login: list, add by hand, remove (spec 01 AC-52). Admin screen `/security`.
- The staff member's own password (spec 16 AC-6): other staff sessions end, this one stays. Admin screen `/account`.
- Activate a pending user (spec 01 AC-5): Idempotency-Key, EV-03, referral credit. Ban a user (AC-45): every session ends at once.
- Default roles from the spec 16 matrix, seeded once and never overwritten.

**B-2b** (this handoff):
- The 8 contract operations:
  - `listMyRestrictions` and `createRestrictionAppeal` — allowed for restricted users (`@AllowRestricted`);
  - `adminListRestrictions` (`users.read`), `adminCreateRestriction`, `adminDeleteRestriction`, `adminListRestrictionAppeals`, `adminApproveRestrictionAppeal`, `adminRejectRestrictionAppeal` (`users.restrict`).
- `users.is_restricted` is recomputed in the same transaction as every change. The flag is on while an open restriction exists (pending, submitted or rejected, not deleted), per data-model §3.A.
- Restricted users get `403 ACCOUNT_RESTRICTED` everywhere else (the existing guard).
- **Appeal rules:**
  - Only the owner's own `pending` restriction can be appealed. Someone else's restriction → 404. Any other status → 409. A rejected restriction can never be appealed again (AC-49).
  - `filesRequired` without files → 400.
- **Decisions:**
  - The first decision wins; a later one gets 409 `t_item_already_decided` (atomic conditional update).
  - A rejection reason is stored and shown. An approval note goes to the audit log only.
  - Audit actions: `restriction.create`, `restriction.delete`, `restriction_appeal.approve`, `restriction_appeal.reject`.
- **Emails** (through the outbox), with texts from the legacy mail classes:
  - EV-07: staff message plus a link to `/restricted`;
  - EV-08: to every S-100 address, linking to admin `/restrictions?userId=`;
  - EV-09 and EV-10.
- **Screens:**
  - Web `/restricted`, the restrictions removal center. Same content as legacy `livewire/restricted/index.blade.php`: status, date, "Read more" reason, and the appeal form while pending. The account page sends restricted users there.
  - Mobile `restricted` screen with the same content; Home redirects restricted users there.
  - Admin `/restrictions`: appeals queue (approve / reject with reason), add restriction (user ID, message, "files required"), history with delete.
- **i18n:** 10 legacy `dashboard.*` keys that the import had missed. Legacy English is kept, except `t_add_restriction_alert_explain`, reworded to gender-neutral "they". Georgian drafts are filled; the Owner should refine them.

## Files created/changed
- API:
  - `apps/api/src/modules/restrictions/*`, registered in `app.module.ts`;
  - `platform/mail/templates.ts` (EV-07…10), `platform/outbox/outbox.service.ts`;
  - `prisma/schema.prisma` + migration `20260930180000_restrictions`;
  - `test/staff.test.ts`: 4 new tests, 63 API tests in total.
- Web: `apps/web/src/app/[locale]/restricted/page.tsx`, `account/page.tsx`, `components/auth/ui.tsx` (TextArea) + `auth.css`.
- Mobile: `apps/mobile/src/app/restricted.tsx`, `app/index.tsx`, `components/form.tsx` (multiline).
- Admin:
  - `apps/admin/src/app/restrictions/page.tsx`, `components/nav.tsx`, `ui.tsx`, `auth.css`;
  - `e2e/restrictions.spec.ts`: full flow across admin and web;
  - `playwright.config.ts`: 1 worker, because the tests share the owner account and PGlite serves one connection at a time.
- `packages/i18n/en.json`, `ka.json`; `docs/01-discovery/open-questions.md` (Q-154).

## What the next agent must do
- **QA:**
  - parity with legacy `/restricted` and admin `users/restrict/{id}`;
  - check AC-19, AC-46…AC-50 and spec 16 AC-19/AC-29/AC-32.
  - Run `pnpm preview`, then `ADMIN_E2E_LOG=<preview log with the seed password> pnpm --filter @mytask/admin test:e2e`.
- **Security:**
  - restricted-user allow-list (only `/me`, `/me/restrictions`, `/restriction-appeals` and auth);
  - ownership (404 for someone else's restriction);
  - the staff permission split (list = `users.read`, actions = `users.restrict`);
  - the first-decision-wins race;
  - restriction and appeal texts are rendered as text, never as HTML. Legacy used `{!! !!}`; we don't.
- **Architect** (data-model.md §458), gaps to record:
  - `user_restrictions.decision_reason text null` is needed by the contract (`AdminRestriction.decisionReason`) but missing from the model. Implemented in the migration.
  - Earlier gaps are still open: `staff.full_name`, and a 2FA purpose for staff re-auth codes.
- **Next build step: B-2c** — social login (SEC-09 binding, S-065…S-069 encrypted secrets, OFF until keys exist).

## Open questions / risks
- **Q-154 (blocks appeal files):** S-093 file types for `appeal_file`. Appeal files also need the files foundation F0 (slice 02, ADR-017). Until then:
  - any `fileIds` answers 422 `FILE_NOT_READY`;
  - a `filesRequired` restriction cannot be appealed (400). Staff should leave "files required" off until F0 lands.
- The admin page takes a user ID (UUID). The user list and user page that link here come in slice 16.
- Paging: lists return the first 200 restrictions and 50 appeals with `nextCursor: null`. Cursor paging comes with the slice 16 admin lists.
- `ModerationOwnerSummary` returns fixed values for plan, KYC status and report count until those slices exist.
