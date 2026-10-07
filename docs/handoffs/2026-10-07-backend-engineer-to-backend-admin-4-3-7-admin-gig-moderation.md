# 4.3.7 Staff gig moderation API — backend-engineer → backend (4.3.8), admin (4.3.13), QA

## What I did
All six operations of the contract tag "Admin Gigs" (1.5.0), permission `gigs.moderate`, in the new
`AdminGigs` service (`apps/api/src/modules/gigs/admin-gigs.service.ts`) and `AdminGigsController`:
- **`adminListGigs`** `GET /admin/gigs` (spec 16 AC-19, AC-31): `status=pending` alone = the queue, oldest
  `submittedAt` first (its cursor carries `submittedAt`); any other status set, or none (= every gig), newest first.
  Filters `userId`, `categoryId` (any level), `q` (title in either language, case-insensitive, or the 20-hex uid),
  `createdFrom`/`createdTo`; default 50 per page; `totalCount` always. Items: title in the request language with
  `contentLocale`, thumbnail, top category, owner `UserSummary`, `deletedBy`.
- **`adminGetGig`** `GET /admin/gigs/{gigId}`: any status (deleted too, spec 04 AC-28), both languages, files,
  categories in the request language, `isFeatured` (= owner Premium), `rejectionReason` (while rejected),
  `deletedBy`, `removalReason` (staff removals only), `removedAt` (= `deleted_at`), `restoreDeadlineAt`
  (staff removal + 30 days), `ownerSummary` (`earlierRejectionCount` = audit rows `gig.reject` of the owner's gigs).
- **`adminPublishGig`**: pending → active, `publishedAt` kept if it was set before; optional note audited.
- **`adminRejectGig`**: pending → rejected; reason trimmed, blank → 400 `reason`/`required`; shown to the owner
  (`listMyGigs` and `getGigOwnerView` already return it while rejected).
- **`adminRemoveGig`**: active only (else 409 STATE_CONFLICT `t_item_already_decided` + `currentState`), then
  `orders_in_queue` > 0 → 409 GIG_HAS_ORDERS_IN_QUEUE; `deleted` + `deleted_by = staff` + staff id + internal reason;
  leaves search; files kept (as an owner deletion). No owner notification (contract). Returns 200 `AdminGig`.
- **`adminRestoreGig`**: only `deleted_by = staff` (owner deletions → 409), within 30 days of `deleted_at`
  (else 422 GIG_RESTORE_WINDOW_EXPIRED `t_gig_restore_window_expired`), then the owner's plan limit under the owner
  row lock (the same count as createGig) → 422 PLAN_LIMIT_REACHED `t_admin_gig_restore_plan_limit` with `limit`,
  `settingId`, `count`. Success: active, the four removal columns cleared, back in search, optional note audited.
- **First decision wins**: every decision locks the gig row (`FOR UPDATE`), re-reads its state, updates, writes
  the search document (`SearchIndex.indexGig`) and the audit row (`gig.publish|reject|remove|restore`, `after.userId`)
  in one transaction. Tested with a simultaneous publish + reject (one 200, one 409, one audit row).
- `GigLimits.lockAndCount` (shared by createGig and restore); `allows` exported.
- `ModerationOwnerSummary.reportCount` (`UserSummaries.owner`, every queue) now also counts open reports about the
  user's gigs (created since 4.3.6), as the contract describes.
- NEW i18n key `t_gig_restore_window_expired` (en + ka; text of the 2026-09-29 integration handoff, "განცხადება" as
  in the other gig keys); row added to the spec 16 Texts table.

## Files created/changed
- `apps/api/src/modules/gigs/admin-gigs.service.ts` (new), `gigs.controllers.ts`, `gigs.module.ts`, `gig-limits.ts`
- `apps/api/src/modules/profiles/user-summaries.ts`
- `packages/i18n/en.json`, `ka.json`; `docs/02-specs/16-admin-panel.md` (Texts row)
- `apps/api/test/gigs-admin.test.ts` (9 tests)
- Results: API 744 passed / 6 skipped; typecheck, lint, prettier green; i18n check OK.

## What the next agent must do
- **4.3.8 (backend):** queue the owner notifications from `AdminGigs` inside the decision transaction (the
  `decide()` helper is the place): EV-20 `GigPublished` on publish, EV-21 `YourGigNeedsChanges` (with the reason) on
  reject, EV-130 `GigRestored` on restore; email now, in-app + push wait for slice 15.
- **4.3.13 (admin):** queue = `GET /admin/gigs?status=pending`, counter = `totalCount`, empty `t_admin_queue_empty`;
  show `restoreDeadlineAt` and a Restore button only for `deletedBy = staff`; map 409 `t_item_already_decided` to a
  reload, 422 PLAN_LIMIT_REACHED / GIG_RESTORE_WINDOW_EXPIRED to their messages.

## Open questions / risks
- `submittedAt` is required in the contract but null for gigs published without review (S-070 ON); the API returns
  `createdAt` for those. Pending gigs always have it.
- STATE_CONFLICT on remove/restore uses `t_item_already_decided` (+ `currentState`), as the other staff decisions.
- The realtime `gig.status_changed` (`x-emits`) waits for the gateway (slice 08), like the other `x-emits`.
