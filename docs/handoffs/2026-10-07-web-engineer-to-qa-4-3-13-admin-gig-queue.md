## What I did
Built ROADMAP 4.3.13 — the admin gig moderation queue (spec 16 AC-19, AC-20; spec 04 AC-17, AC-18) on `feat/gigs`, against the 4.3.7 API (`adminListGigs`, `adminGetGig`, `adminPublishGig`, `adminRejectGig`, `adminRemoveGig`, `adminRestoreGig`; contract 1.5.0, no change).

- Route `/gigs`, sidebar group "Gigs" (`t_gigs`, Phosphor `images`, after Portfolios — legacy order, `legacy/APP/app/Livewire/Admin/Includes/Sidebar.php:115`), permission `gigs.moderate`.
- Status tabs Pending / Active / Rejected / Deleted; `limit=50`; Load more; total in the heading. Pending = queue, oldest submission first (API order).
- Filters: owner ID, date from/to (Tbilisi days, as the other queues), NEW "Title or ID" (`q`, trimmed), category of any level (public `listCategories` tree, so moderators without `catalog.write` can filter). "Reset filter" clears all (new `onReset` on `QueueFilterForm`).
- Card: owner avatar + username, title, top category, price, status, `#uid`, date; thumbnail. "Details" (`aria-expanded`) loads `adminGetGig`: owner summary, rejection reason, removal notice (staff removal date + restore deadline + internal reason / deleted by the owner), both titles, category path, gallery, price, delivery, orders in queue, rating, revisions, description HTML per language (sanitised by the API, as on the gig page), upgrades, FAQ, documents, SEO.
- Decisions: pending → Approve (Primary) / Reject (Danger, reason shown to the owner, required, ≤ 1,000). Active → "Delete gig" (legacy label `t_delete_gig`; internal reason required + legacy confirm). Deleted by staff → Restore. Owner deletions have no Restore. 409 STATE_CONFLICT → `t_item_already_decided` and the list reloads; other errors (GIG_HAS_ORDERS_IN_QUEUE, GIG_RESTORE_WINDOW_EXPIRED, PLAN_LIMIT_REACHED, 403/404) show the API message and the card stays.
- Staff cannot edit gig content (P-117): the legacy admin edit / analytics actions are not offered.

## Files created/changed
- `apps/admin/src/app/gigs/page.tsx` (new)
- `apps/admin/src/components/shell.tsx` (sidebar group + icon), `moderation.tsx` (`QueueFilterForm.onReset`), `auth.css` (`.admin-gig-*`)
- `packages/i18n/en.json`, `ka.json`: 4 NEW keys — `t_admin_gig_search` (Title or ID / სათაური ან ID), `t_admin_gig_removed` (Removed by staff / წაშალა თანამშრომელმა), `t_admin_gig_deleted_by_owner` (Deleted by the owner / წაშალა მფლობელმა), `t_admin_gig_removed_by_staff` (Removed by staff on {{date}}. It can be restored until {{until}}. / თანამშრომელმა წაშალა {{date}}. აღდგენა შესაძლებელია {{until}}-მდე.) — the Owner may refine.
- `apps/admin/e2e/gig-queue.spec.ts` (new, 7 tests incl. axe WCAG 2 A/AA), `admin-screens.spec.ts` (+ `gigs` screen), `sidebar.spec.ts` (order); baselines: new `admin-gigs-{desktop,phone}`, desktop ones renewed (new sidebar item) on a production build.

Checks: admin typecheck, lint, prettier, i18n check OK; admin E2E 77 passed / 6 skipped (the full-stack specs, need `pnpm local`).

## What the next agent must do
- QA (slice 3 tail): parity vs legacy `legacy/APP/resources/views/livewire/admin/gigs/gigs.blade.php`, `legacy/APP/app/Livewire/Admin/Gigs/GigsComponent.php:158-324` and `Trash/TrashComponent.php:113`; on a full stack: create a gig with S-070 OFF → Pending → approve / reject → owner gets EV-20 / EV-21; remove an active gig → Deleted tab → restore (EV-130, plan-limit refusal).
- Next micro-task: 4.3.14 Mobile: gig page.

## Open questions / risks
- Legacy list columns visits / sales / rating are not in `AdminGigListItem` (rating is in the details). No admin analytics screen yet.
- No "View on site" link: the admin does not know the website origin; the details show the content instead (AC-19).
- The portfolio queue gallery links have the same missing link name (axe `link-name`) that this page fixed; not changed here (out of scope) — a one-line fix for the QA findings list.
