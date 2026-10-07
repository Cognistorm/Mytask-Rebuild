# 4.3.3c `updateGig` + `deleteGig`, and the admin "unlimited" fix

From: backend-engineer · To: backend-engineer (4.3.4, 4.3.7), web-engineer (4.3.9/4.3.10, info), QA (info) · Date: 2026-10-07

## What I did
- **`PATCH /gigs/{gigId}` (`updateGig`)**, `GigsService.update` (spec 04 AC-10, AC-21…AC-23, AC-25, AC-33, EC-7, EC-8, R-G4, R-G9).
  - **Partial edit.** Only the sent fields change. `title` and `description` carry both languages (`en: null` removes it). The English row is deleted when both English fields are gone; a single missing English field is stored as `''`, as in create.
  - **Validation.** The 4.3.3b `gig-input.ts` blocks run for the sent fields, all errors at once. A changed category level is checked against the stored levels around it. Changing only the top level, for example, refuses the stored sub-category.
  - **Revisions.** Checked against today's S-041 only when `revisionsAllowed` is sent (AC-10). A stored 8 survives other edits after S-041 drops to 5.
  - **Lists replace the whole list in order:**
    - **Upgrades** keep their identity by `id`. Removed ones get `deleted_at` (placed orders keep theirs). An id of another gig, a removed upgrade or a duplicate is refused (`upgrades[i].id`, `not_allowed`).
    - **FAQs, gallery and documents** are rewritten in order. A swap is safe because the position key is deferred.
  - **Files.** Only files newly referenced are checked and marked attached. Files the gig no longer uses (old thumbnail, removed images or documents) are purged after commit, best effort, as portfolio does.
  - **S-080 OFF.** The gig may keep, reorder or remove its documents; a new document is refused with 403 FEATURE_DISABLED (EC-8).
  - **No plan-limit check** (AC-25).
  - **Slug** changes only when the `ka` title changes (EC-7). Old slugs keep resolving by uid in 4.3.4/4.3.11.
  - **Moderation (AC-22).** Every save follows S-070:
    - OFF → `pending`, with `submitted_at = now` and **EV-19 on every save**, also when the gig was already pending. This differs from portfolio's Q-166 rule, because spec 04 AC-22 says "any gig (active, pending or rejected)".
    - ON → `active`, with `published_at` kept or set.
    - The rejection reason is cleared either way.
  - **Search index** is updated in the same transaction.
- **`DELETE /gigs/{gigId}` (`deleteGig`)**, `GigsService.remove` (AC-24, R-G8, EC-1).
  - 409 GIG_HAS_ORDERS_IN_QUEUE (`t_this_gig_has_orders_in_queue_delete`) while `orders_in_queue > 0`.
  - Otherwise one update sets `status = deleted`, `deleted_at`, `deleted_by = owner`, and the search document is removed. Children and files stay for past orders and reviews. The plan slot is freed.
  - Another user's gig, a deleted gig or an unknown id → 404.
- **Both operations lock the gig row** (`SELECT … FOR UPDATE`) and read the status again. An edit racing a delete can therefore never bring a deleted gig back. The same lock will order them against staff removal in 4.3.7.
- **Owner rule 2026-10-07 ("values that may change must be editable in admin")**, saved as a standing rule.
  - All register rows used by gigs are already editable on the admin Settings screen.
  - Found and fixed one admin bug (`apps/admin/src/app/settings/page.tsx`, separate commit `e1df9ce1`). An unset limit (`null` = unlimited, S-001…S-006, whose admin text says "empty = unlimited") showed as the text "null", and an emptied number box was saved as `0`. A `0` on S-002 would block every Premium user from creating gigs. Now an empty box shows and saves as `null`; the API already accepts `null` only on those rows.
  - New admin e2e test in `e2e/settings-rows.spec.ts`.
  - Values fixed by the contract (upgrade/FAQ counts, minimum price, text lengths, delivery list) → **Q-181** for the Owner. Changing them needs the Architect and an ADR.
- **Tests:**
  - New `test/gigs-update.test.ts` (12): partial edit + slug, EV-19 on every save + rejection reason cleared, S-070 ON/OFF + search document, category chain, S-041 / plan limit, all errors at once, 404s, gallery reorder/remove/add + purge, upgrade identity, documents with S-080 OFF, delete, and the 409.
  - API **696 passed / 6 skipped**; admin e2e **68 passed / 6 skipped** (after `pnpm build`). Typecheck, lint and prettier are green.

## Files created/changed
- `apps/api/src/modules/gigs/gigs.service.ts` (`update`, `remove`, `ownGig`, `purge`, `lockLiveGig`, `fileIdsOf`), `gigs.controllers.ts`
- `apps/api/test/gigs-update.test.ts` (new)
- `apps/admin/src/app/settings/page.tsx`, `apps/admin/e2e/settings-rows.spec.ts` (commit `e1df9ce1`)
- `docs/01-discovery/open-questions.md` (Q-181), `docs/ROADMAP.md` (4.3.3c and 4.3.3 ticked), `docs/STATUS.md`

## What the next agent must do
**4.3.4 (backend): `getGig`, `lookupGig`, `getGigOwnerView`, `listMyGigs`.**
- `getGigOwnerView` = `ownGig` + `ownerView` (already in `GigsService`).
- The public `Gig` needs the per-field Georgian fallback (`catalog/localized.ts`). The `en` row may hold an empty title or description.
- Documents: `ownerView` builds their public URLs; reuse that for the public view.
- `listMyGigs`: non-deleted gigs, newest first, with `ordersInQueueCount` and the rejection reason only while `rejected`.

## Open questions / risks
- **Q-181** (Owner): which fixed gig limits become admin settings. Nothing is blocked.
- An edit purges a removed gallery image or old thumbnail at once. Slice 5 must copy what an order shows (thumbnail and title) onto the order, or keep those files, so past orders never show a broken image. Noted for the spec 06 check.
- Still open from 4.3.3a: ADR-009 wording for gig documents (architect).
