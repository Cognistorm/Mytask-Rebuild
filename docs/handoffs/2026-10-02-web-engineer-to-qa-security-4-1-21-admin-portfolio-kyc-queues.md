# Handoff — 4.1.21 Admin portfolio queue + KYC queue (web-engineer → QA, security)

## What I did
Built the two staff moderation queues of slice 1 in `apps/admin` against the existing API (4.1.12, 4.1.13).

- **Portfolio queue `/portfolio`** (spec 16 AC-19, AC-21; spec 02 AC-25, AC-26, AC-42; legacy
  `livewire/admin/portfolios/portfolios.blade.php`, `Admin/Portfolios/PortfoliosComponent.php:65-135`):
  - status tabs Pending (default, oldest first from the API) / Active / Rejected;
  - filters owner (user id) + created-date range; `totalCount` in the title;
  - each item has the owner summary and the content as the public sees it: thumbnail + images open the large
    variant, description, `t_live_preview` link, `t_watch_video` link;
  - Approve (pending only); Reject with a reason (required, ≤ 1,000, trimmed, shown to the owner);
    "Delete portfolio" = `adminRemovePortfolioItem` for pending or active items, with a reason and the legacy
    confirmation `t_are_u_sure_u_want_to_delete_this`;
  - rejected items show the reason, who decided and when; they have no actions.
- **KYC queue `/kyc`** (spec 16 AC-19, AC-27; spec 02 AC-36, AC-37, AC-39; legacy
  `livewire/admin/verifications/verifications.blade.php`, `VerificationsComponent.php:67-155`):
  - status tabs Pending / Verified / Declined; document-type filter (applies at once) + owner + date range;
  - each item shows the owner summary, document type and date;
  - front / back (not for passports) / selfie stay hidden until "View" is clicked. The click calls
    `adminGetKycFileDownload?mode=json` (audited, 1–2 min signed link) and shows the image inline. No URL is fetched before that and nothing is cached;
  - legacy "Approve files" / "Decline files" with the legacy confirmations; decline needs a reason;
  - declined items show the reason, the reviewer and the time.
- **Both queues:**
  - a 409 shows `t_item_already_decided` and reloads the list;
  - an empty pending queue shows `t_admin_queue_empty`, other tabs show `t_no_data_to_show_now`;
  - "Load more" follows the cursor;
  - nav links appear only with `portfolio.moderate` / `kyc.review`. Without the permission the page shows `t_u_dont_have_permissions_to_access_page` and calls no API (the API enforces it anyway).
- Shared `apps/admin/src/components/moderation.tsx`, reusable by the later queues (gigs, projects, offers…):
  - `OwnerSummary` (account status, deleted, restricted, Premium, KYC state, open reports, earlier rejections);
  - `StatusTabs`, `QueueFilterForm`;
  - `filterQuery`: date-input days are read as Asia/Tbilisi days; `createdTo` is exclusive, so the "to" day is included;
  - `useCursorList`, `decisionError`.

## Files created/changed
- `apps/admin/src/app/portfolio/page.tsx`, `apps/admin/src/app/kyc/page.tsx` (new)
- `apps/admin/src/components/moderation.tsx` (new), `nav.tsx` (2 links), `auth.css` (queue styles, tokens only)
- `apps/admin/e2e/portfolio-queue.spec.ts` (6), `apps/admin/e2e/kyc-queue.spec.ts` (4), routed API
- `packages/i18n/en.json`, `ka.json`:
  - 5 NEW keys: `t_admin_earlier_rejections`, `t_admin_date_from`, `t_admin_date_to` (the legacy `t_from` / `t_to` mean sender / recipient in ka), `t_kyc_state_none`, `t_restricted`;
  - ka filled for legacy keys that were still English: `t_approve_files`, `t_decline_files`, `t_front_side`, `t_back_side`, `t_declined`, `t_document_type`, `t_verifications`, `t_are_u_sure_u_want_to_approve_this_verification`, `t_are_u_sure_u_want_to_decline_this_verification`.

## Checks
- Admin E2E: 12 passed, 4 skipped (the full-stack ones, as before).
- typecheck + lint: 19/19.
- Prettier, i18n check, admin build: OK.

## What the next agent must do
- **Mobile (4.1.22):** nothing here. These are staff-only screens; there is no staff mobile app.
- **QA (4.1.26):** parity against the legacy admin lists.
  - Legacy had one list with approve/delete and no reject. Reject with a reason is NEW (Q-117).
  - Do a click-through against the real stack (`pnpm local`, staff with `portfolio.moderate` / `kyc.review`). The E2E tests here use a routed API; the API rules are covered by the API tests.
- **Security (4.1.27):** confirm that the KYC images are only ever loaded through the audited per-click signed link (no prefetch, no file URL in the list).

## Open questions / risks
- The admin home still redirects to `/settings`. The queue counters on the admin home (AC-17) come with slice 16.
- No approve note field. `StaffOptionalNoteRequest` is optional; legacy had none.
