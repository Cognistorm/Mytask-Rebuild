# 4.3.6 Favourites and gig reports — backend-engineer → backend (4.3.7), web (4.3.11, 4.3.12), mobile, QA

## What I did
- **`putFavorite`** `PUT /favorites/{gigId}` (spec 04 AC-35, R-G10): the gig must be visible to the caller as on
  `getGig` (`GigPages.visible`, otherwise 404); own gig → 403 FORBIDDEN (also for the owner's pending gig); upsert, so
  a second call returns the first `createdAt` (200 `FavoriteGig`).
- **`deleteFavorite`** `DELETE /favorites/{gigId}` (AC-35, AC-36): 204 every time, whatever the gig's state (a saved
  gig that became pending or deleted can still be removed); 404 only for a gig id that does not exist at all.
- **`listFavorites`** `GET /favorites` (AC-36, EC-11): newest saved first, keyset cursor of `(createdAt, gigId)`
  (the usual `encodeCursor` format, bad cursor → 400), default 20 (clients send `limit=42`). Only active gigs of
  listable owners (active/verified, not deleted, not restricted — the Prisma form of `LISTABLE_OWNER`). Rows of hidden
  gigs are kept, so they come back when the gig is listable again.
- **`GigCard.isFavorite`** is real (`catalog/gig-cards.ts`): one `favorites` query per page of cards for a signed-in
  caller; guests still get `null`. Covers search, category lists, home, related, favourites.
- **`createGigReport`** `POST /gigs/{gigId}/reports` (AC-37, AC-38, EC-10, SEC-23), order as legacy
  `Main/Service/ServiceComponent.php:212-303`:
  1. the shared `ReportLimiter` (10/h per user across all report operations; counted before anything else, I-31);
  2. visibility as `getGig` → 404 (EC-10: deleted after the page opened);
  3. own gig → 403 FORBIDDEN `t_gig_owner_cant_report_his_gig`;
  4. reason trimmed, 6–500 characters (code points) → 400 VALIDATION_FAILED on `reason` with `t_validator_min` {min: 6}
     / `t_validator_max` {max: 500} (legacy `Http/Validators/Main/Service/ReportValidator.php`);
  5. one report per user and gig → 409 DUPLICATE `t_looks_like_alrdy_reported_this_gig` (checked in the transaction;
     a race is settled by the `reports` unique key, P2002 → the same 409). Unlike profile reports, a second report does
     not replace the first (legacy refused it).
  6. `reports` row (`target_type = gig`, `pending`) + EV-22 outbox to every S-100 address, one transaction → 201
     `GigReport`.
- **EV-22 `Admin/GigReported`** email template (NEW, P-36): subject `t_subject_admin_gig_reported`, body NEW key
  `t_notification_admin_reported_gig` (en + ka, written like the profile report email), button `t_reported_gigs` →
  `{admin}/reports`. So 4.3.8 only has EV-20, EV-21 and EV-130 left.
- Restricted callers get 403 ACCOUNT_RESTRICTED from the global guard on all four operations (no `@AllowRestricted`).

## Files created/changed
- `apps/api/src/modules/gigs/gig-favorites.service.ts` (new), `gig-reports.service.ts` (new)
- `apps/api/src/modules/gigs/gigs.controllers.ts` (`report` + new `FavoritesController`), `gigs.module.ts`
- `apps/api/src/modules/catalog/gig-cards.ts` (real `isFavorite`)
- `apps/api/src/platform/outbox/outbox.service.ts` (EV-22), `apps/api/src/platform/mail/templates.ts` (EV-22)
- `packages/i18n/en.json`, `ka.json` (`t_notification_admin_reported_gig`); `docs/02-specs/04-gigs.md` Texts row
- `apps/api/test/gigs-favorites-reports.test.ts` (8 tests)
- Results: API 734 passed / 6 skipped; typecheck, lint, prettier (non-generated) green; i18n check OK.

## What the next agent must do
- **4.3.7 (backend):** admin gig moderation. Gig reports are already in `reports` for `adminListReports` (4.15.9).
- **4.3.11 (web, gig page):** favourite button uses `viewer.isFavorite`, `PUT`/`DELETE /favorites/{id}`, toasts
  `t_gig_has_been_added_to_favorite_list` / `t_gig_removed_from_ur_favorite_list`; guests see
  `t_pls_login_or_register_to_add_to_favovorite`. Report dialog: hide/disable when `viewer.hasReported`; map 409 to
  `t_looks_like_alrdy_reported_this_gig`, 403 to `t_gig_owner_cant_report_his_gig`, success `t_gig_reported_successfully`;
  guests see `t_pls_login_or_register_to_report_this_gig`.
- **4.3.12 (web, `/account/favorite`):** `GET /favorites?limit=42`, remove action, empty `t_no_favorites_yet`.

## Open questions / risks
- The Owner may want to refine the wording of the NEW `t_notification_admin_reported_gig` (both languages).
- `putFavorite` returns 403 with the generic `t_forbidden` for the owner (the contract names no specific key; clients
  never show the button to the owner, R-G10).
