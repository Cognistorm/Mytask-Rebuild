# 4.1.12 Portfolio API — user and staff operations

From: backend-engineer · To: web-engineer (4.1.17, 4.1.19, 4.1.21), mobile-engineer (4.1.24), qa-engineer, security-reviewer · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Built the 11 portfolio operations of contract 1.3.0 (spec 02 AC-24…AC-28, AC-42, R-P6; spec 16 AC-19, AC-21). No contract or data-model change.

**Owner side** (`/portfolio-items`)
- `createPortfolioItem`: title (trimmed, 3–100), description (trimmed, ≥ 10), thumbnail + 1…S-089 gallery images, optional project/video link (http/https only, ≤ 120; blank → null). Files must be the caller's own `ready` `portfolio_image` uploads that no other item uses (else 422 `FILE_PURPOSE_MISMATCH`; not scanned yet → 422 `FILE_NOT_READY`). Duplicate gallery ids count once. Slug = legacy `substr(Str::slug(title), 0, 138) . '-' . uid` with a 20-char upper-case hex uid (`CreateComponent.php:120-126`, `helpers.php:76`).
- S-071 ON → `active` at once (`publishedAt` set), no admin email. S-071 OFF → `pending` and EV-14 `Admin/PendingPortfolio` to every S-100 address, in the same transaction.
- `updatePortfolioItem`: omitted fields unchanged; `imageFileIds` replaces the whole gallery. **Every save follows S-071 again** (legacy `EditComponent.php:186-226`), also for an `active` item. Rejected → edit clears `rejectionReason`/`rejectedAt` (the reason stays in the audit log). The slug follows the new title, the uid never changes. Files the item no longer uses are deleted after the save (best effort, logged).
- `deletePortfolioItem`: any status, at any time; the item and its files are deleted. Others' items → 404 (edit and delete).
- Attached thumbnails/gallery images answer 409 on `deleteFile`.

**Public reads** (optional session)
- `listPortfolioItems?username=`: others see only `active` items, newest first (`createdAt`, then id); the owner also gets `pending` and `rejected` cards. Unknown, pending, banned or deleted profile → 404. Cursor-paginated (default 20).
- `getPortfolioItem` / `lookupPortfolioItem` (`uid` or `slug`, exactly one, else 400; the uid is the slug's last part, so an old slug still finds the item — the web answers 301 to the current `slug`). Not `active` → 404 except for the owner. `rejectionReason`/`rejectedAt` only for the owner (and staff).

**Staff** (`/admin/portfolio-items`, permission `portfolio.moderate`)
- `adminListPortfolioItems`: default `status=pending`, oldest first, 50 per page, `totalCount`; other statuses newest first; filters `userId`, `createdFrom`, `createdTo`.
- `adminGetPortfolioItem`: item as the owner sees it + `ModerationOwnerSummary` + `decidedBy`/`decidedAt`.
- `adminApprovePortfolioItem` (optional note, audit `portfolio.approve`, EV-15 to the owner) and `adminRejectPortfolioItem` (reason required after trimming, ≤ 1,000; audit `portfolio.reject`; EV-126 with `title` + `reason`): compare-and-set on `pending`; the second decision → 409 `STATE_CONFLICT` `t_item_already_decided`.
- `adminRemovePortfolioItem`: any status, reason required, audit `portfolio.remove` with the reason; item + files deleted; 204.
- `ModerationOwnerSummary`: real account status, restriction, KYC state (latest verification), open user reports; `earlierRejectionCount` = `portfolio.reject` audit entries for this owner (survives edits). Plan `standard` until slice 9.

**Emails** (outbox → worker): templates EV-14 (link `<admin>/portfolio`), EV-15 and EV-126 (link `/seller/portfolio`). In-app + push of EV-15/EV-126 stay for slice 14 (payloads already carry `title`/`reason`).

**Shared pieces added**
- `apps/api/src/platform/pagination.ts`: the first keyset cursor (`(createdAt, id)` base64url; forged cursor → 400 on `cursor`). Reuse it for every later list.
- `apps/api/src/modules/profiles/user-summaries.ts` (`UserSummaries`, exported): `UserSummary` with real avatar, `isIdVerified`, `isOnline`, `countryCode`; `owner()` builds `ModerationOwnerSummary`. The restrictions module still has its own neutral-value summary — switching it is a small follow-up.
- `FilesService.purgeDetached(fileId)`: deletes a file whose item is gone (no owner/restriction check).

## Files created/changed
- `apps/api/src/modules/profiles/portfolio.service.ts`, `portfolio.controllers.ts`, `user-summaries.ts` (new); `profiles.module.ts`
- `apps/api/src/platform/pagination.ts` (new)
- `apps/api/src/modules/files/files.service.ts` (`purgeDetached`, `remove` now shares `purge`)
- `apps/api/src/platform/outbox/outbox.service.ts` (EV-14, EV-15, EV-126), `apps/api/src/platform/mail/templates.ts`
- `packages/i18n/en.json`, `ka.json`: the 4 Q-117 keys were **missing** (the 4.1.7 note said they existed): `t_portfolio_rejected_reason`, `t_ur_portfolio_title_has_been_rejected`, `t_subject_seller_portfolio_rejected`, `t_portfolio_rejected_email_body` — added from the spec 02 Texts table (en + ka, `{{title}}`/`{{reason}}`).
- `apps/api/test/portfolio.test.ts` (20 tests); `apps/api/test/two-factor-challenges.test.ts` (pre-existing isolation bug: it failed after `staff.test` left `setting_versions` rows; now deletes them first).

Checks: API 351 passed / 5 skipped, typecheck, ESLint, Prettier, i18n check OK.

## What the next agent must do
- **web (4.1.17)**: public portfolio list/item via `listPortfolioItems` + `lookupPortfolioItem?slug=`; 301 to `item.slug` when the URL slug differs; empty state `t_no_portfolio_yet`.
- **web (4.1.19) / mobile (4.1.24)**: create/edit = upload each image (`portfolio_image`) → complete → poll `getFile` until ready → send ids. Show "Pending" (`t_portfolio_pending_review`) and the rejected chip + `t_portfolio_rejected_reason` with `rejectionReason`. Selling → Portfolio = `listPortfolioItems?username=<me>` with the session.
- **admin (4.1.21)**: queue page at `/portfolio` (the EV-14 email links there), approve / reject (reason) / remove (reason), `totalCount` counter.
- **4.1.15**: EV-14, EV-15, EV-126 email templates are done here; only EV-16…EV-18 remain (likely with 4.1.13).
- **QA**: parity with legacy create/edit/delete/approve; note the CHANGE items (reject with reason, S-100 recipients).

## Open questions / risks
- Approve vs. an owner edit at the same moment: the compare-and-set also checks `updatedAt` read in the same request, so a staff click can only approve the version it loaded within that request — not the one shown on screen earlier. Acceptable for slice 1; the admin page should reload the item after a 409.
- An item whose thumbnail has no CDN variants (never expected: files are checked `ready` on save) is left out of lists and fails loudly on item reads. Migration (Phase 5) must give migrated thumbnails their variants.
- No new Owner question.
