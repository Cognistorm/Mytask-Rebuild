# 4.3.8 Gig owner emails (EV-20, EV-21, EV-130) — backend-engineer → web (4.3.9+), admin (4.3.13), QA (4.3.18)

## What I did
- `AdminGigs.decide()` (`apps/api/src/modules/gigs/admin-gigs.service.ts`) now queues the owner's email through the
  transactional outbox in the same transaction as the state change, search document and audit row:
  - publish → **EV-20** `GigPublished` (spec 04 AC-17),
  - reject → **EV-21** `YourGigNeedsChanges` with the staff reason (spec 04 AC-18),
  - restore → **EV-130** `GigRestored` (spec 16 AC-20, NEW Q-123 (b)),
  - remove → nothing (contract); a refused decision (409/422) rolls back and queues nothing.
- Payload: `userId` = owner (the worker reads email, username, locale at send time), `params`: `title` (ka),
  `titleEn` (en title or `''`), `slug`, and `reason` for EV-21. Aggregate `gig` / gig id.
- Templates (`apps/api/src/platform/mail/templates.ts`):
  - EV-20: legacy `legacy/APP/app/Notifications/User/Everyone/GigPublished.php:47-56` — subject
    `t_subject_everyone_ur_gig_published`, body `t_notification_gig_published`, button `t_view_gig` → `/service/{slug}`.
  - EV-21: legacy `legacy/APP/app/Notifications/User/Freelancer/YourGigNeedsChanges.php:41-55` — subject
    `t_subject_freelancer_ur_gig_needs_changes`, lines `t_notification_the_following_gig_has_been_rejected`, title,
    `t_t_notification_here_is_why`, reason; button `t_my_gigs` → `/seller/gigs`.
  - EV-130: NEW — subject `t_subject_gig_restored`, body `t_gig_restored_email_body` {title}, button `t_view_gig` →
    gig page.
  - The title follows the reader's language: English title for `en` readers when the gig has one, else Georgian.
  - Links: Georgian unprefixed, English under `/en` (ADR-006).
- No new i18n keys: all keys already existed (legacy + the 4.3.2a NEW ones).

## Files created/changed
- `apps/api/src/modules/gigs/admin-gigs.service.ts`, `apps/api/src/platform/mail/templates.ts`,
  `apps/api/src/platform/outbox/outbox.service.ts` (event types EV-20, EV-21, EV-130)
- `apps/api/test/gigs-admin.test.ts` (+9: outbox rows per decision incl. none on remove / refused restore / losing
  simultaneous decision; rendering ka + en with links; EV-21 lines; title language fallback; HTML escaping)
- Results: API 753 passed / 6 skipped; typecheck, lint, prettier green.

## What the next agent must do
- **Web (4.3.11):** the email links use `/service/{slug}` and `/seller/gigs` — keep these routes (with the
  current-slug 301) so the links work.
- **Slice 15 (4.14):** add in-app (`t_ur_gig_title_has_been_published`, `t_ur_gig_needs_changes_rejected_admin`,
  `t_ur_gig_title_has_been_restored`) + push for EV-20/21/130; the outbox rows already carry `title`/`titleEn`/`slug`.
- **QA (4.3.18):** parity — legacy EV-21 greeted with the full name when set (`fullname ?: username`); the new
  layout uses `t_hello_username` with the username like every other email here (same as EV-15/EV-126).

## Open questions / risks
- The legacy EV-20 body has the original English typo ("to see your it."); kept as the legacy value (Q-058: existing
  legacy English values are kept). The Owner may refine it in `packages/i18n/en.json`.
