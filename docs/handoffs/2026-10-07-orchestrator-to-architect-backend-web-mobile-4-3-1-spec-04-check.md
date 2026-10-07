# 4.3.1 Spec check — spec 04 Gigs vs contract 1.4.0, data model, code and the 4.3 task list

From: orchestrator · To: solution-architect, backend-engineer, web-engineer, mobile-engineer (slice 3, branch `feat/gigs`) · Date: 2026-10-07

## What I did
Checked spec 04 (approved, 39 ACs) against `docs/04-api/openapi.yaml` 1.4.0, `docs/04-api/coverage/04.md`,
`docs/03-architecture/data-model.md` §3.B/§3.D/§3.S, ADR-011, ADR-012, `url-map.md` §1/§4.1/§5, spec 15 EV-19…EV-22,
spec 16 AC-19/AC-20/AC-28, `docs/05-design/screens/02-gig-page.md` + `03-gig-create-wizard.md`, the current code
(`apps/api` schema, settings registry, file purposes, catalog module, `packages/i18n`) and the 4.3 tasks in
`docs/ROADMAP.md`. No code was written.

**Result: the contract is complete for spec 04.** All 37 API ACs map to operations that exist and list `04 AC-n`
in `x-covers` (checked with a script over the contract). The 2 NOT-API ACs (AC-7 notice, AC-31 navigation to chat)
are correct. **No contract change.** There is **one data-model gap** (staff removal / restore, section B), **one
open Owner question that is now due** (Q-123, section C), and several **code foundations missing** (section E).
ROADMAP 4.3 has been updated (section G).

## A. Contract operations (all present, contract 1.4.0)
| Operation | ACs | Audience | ROADMAP task |
|---|---|---|---|
| `getGigCreationEligibility` | AC-1, 2 | user, S-001/S-002 | 4.3.3 |
| `createGig` | AC-3…6, 8, 9, 11…16, 19, 33; 00 AC-5 | user | 4.3.3 |
| `updateGig` | AC-5, 6, 9…12, 14, 15, 19, 21…23, 25, 33 | owner, others 404 | 4.3.3 |
| `deleteGig` | AC-24 (409 GIG_HAS_ORDERS_IN_QUEUE) | owner | 4.3.3 |
| `getGig`, `lookupGig` | AC-26…30, 33 (web 301 when slug differs) | optional-user | 4.3.4 |
| `getGigOwnerView`, `listMyGigs` | AC-18, 20, 21 | owner | 4.3.4 |
| `listRelatedGigs` | AC-32 (P-137 M1…M4) | optional-user | 4.3.5 |
| `recordGigView`, `getGigAnalytics` | AC-34, 39 | optional-user / owner | 4.3.5 |
| `listFavorites`, `putFavorite`, `deleteFavorite` | AC-35, 36 | user | 4.3.6 |
| `createGigReport` | AC-37, 38 (rate limit 10/h across report ops, SEC-23) | user, not owner | 4.3.6 |
| `adminListGigs`, `adminGetGig`, `adminPublishGig`, `adminRejectGig`, `adminRemoveGig`, `adminRestoreGig` | AC-17, 18, 28; 16 AC-19, 20 | staff `gigs.moderate` | 4.3.7 |
| `putCartItem` (refusals AC-29, AC-30) | — | slice 5 | not here |
| `resolveRedirect` (AC-33 is served by `lookupGig` + web 301; `resolveRedirect` is for CMS/categories) | — | slice 16 | not here |

`gigs.moderate` and `reports.handle` exist in `apps/api/src/modules/staff/permissions.ts`. Settings S-001, S-002,
S-041, S-077…S-083, S-100 exist in `registry.ts`. `SearchIndex.indexGig` / `removeGig` exist
(`catalog/search-index.ts:28, :81`). `PremiumStatus` seam exists (`subscriptions/premium-status.ts`).
The `reports` table (one table for all targets, UK reporter + target) already exists since slice 2.

## B. Data-model gap (architect first, CLAUDE.md rule 2) → 4.3.2a
`AdminGig` has `deletedBy` (`owner` | `staff` | null), `removalReason`, `removedAt`, `restoreDeadlineAt` and
`submittedAt`; `adminRestoreGig` restores only staff removals within 30 days, back to the status it had (spec 16
AC-20, P-117). Data-model §3.D `gigs` (and the 4.2.2b migration) has only `deleted_at` and `rejection_reason`.
Proposed (no contract change): on `gigs` add `deleted_by gig_deleted_by null` (`owner`, `staff`),
`deleted_by_staff_id uuid null FK→staff`, `removal_reason varchar(1000) null` (internal, staff only),
`submitted_at timestamptz null` (last create/edit that went to pending; queue "oldest first", 16 AC-19);
`restoreDeadlineAt` is computed (`deleted_at + 30 days`). The status before removal is always `active`
(`adminRemoveGig` only removes active gigs), so it needs no column. Also confirm the analytics tables of ADR-012
(`analytics_events`, `analytics_daily`, §3.S) are built in 4.3.2b for gig views (they do not exist yet), and that
`impressions_count` / `visits_count` on `gigs` are the counters.

## C. Owner question now due: Q-123 (blocks only `adminRestoreGig` in 4.3.7)
Q-123 (`open-questions.md:641`, slice item 04/16): when staff restore a removed gig — (1) does it count against
the owner's plan limit, (2) does it go back to pending when S-070 is OFF, (3) is the owner notified?
Contract default: restored to **active**, **no** limit check, **no** notification. Recommendation in the register:
check the limit and notify (a NEW event). Everything else in slice 3 can proceed; 4.3.7 builds restore with the
contract default unless the Owner answers otherwise before then.

## D. Dependencies on slices not built yet — neutral values, never invented data
| Field / behaviour | Neutral value now | Filled by |
|---|---|---|
| Premium (`isFeatured` badge on the gig page, S-002 limit) | `PremiumStatus` = false → everyone has the Standard limit S-001 (default **1 gig**) | slice 8 |
| `ordersInQueueCount`, AC-24 / `adminRemoveGig` refusal | 0 → delete is always allowed; the check is still coded against `orders_in_queue` | slice 5 (spec 06 keeps the counter) |
| "Add to cart" (AC-26, AC-29, AC-30 refusals = `putCartItem`) | button hidden until the cart exists; the AC-29 unavailable notice and the AC-30 "Edit gig" for the owner are shown now (data is in `getGig`) | slice 5 |
| Reviews tab, rating, `reviewCount` in analytics | empty tab with `t_no_reviews_yet`, 0 | slice 6 |
| "Contact seller" (AC-31) | hidden until chat exists (no dead link) | slice 7 (spec 08) |
| `salesCount`, `recentOrders` in analytics | 0, `[]` | slice 5 |
| In-app + push of EV-20, EV-21 | email only now (same as spec 02 in 4.1.15) | slice 15 (4.14) |
| Reports queue for staff (`adminListReports`) | reports are saved; the queue screen comes later | 4.15.9 |
| SEO meta / JSON-LD output (AC-15 values) | values saved and returned; `<title>`/meta use them in the web page now; JSON-LD later | slice 16 |

## E. Foundations missing in code (no question needed; add to the named tasks)
1. **S-070 `moderation.gigs.auto_approve`** is not in `apps/api/src/platform/settings/registry.ts` (S-071 is,
   `:875`). Add it (boolean, local default as the register says: prod → OFF) → 4.3.2b.
2. **File purposes** `gig_thumbnail`, `gig_image`, `gig_document` exist in the enum but have no policy in
   `files/purposes.ts` (so uploads are refused). Thumbnail + images: JPG/PNG ≤ S-078, public image processing;
   documents: PDF ≤ S-082, public bucket (R-G11), refused while S-080 is OFF (EC-8) → 4.3.3.
3. **R-5.3a Georgian-field validator (P-136, P-37)** and the English-only rule (R-5.4) do not exist as shared code
   yet (only in the generated types). Build one validator (refused characters listed once, in order, at most 10,
   `params.chars`; descriptions checked after removing formatting) usable by projects (slice 9) too → 4.3.3.
4. **Gig description** is sanitised with the existing `platform/rich-text` sanitiser (bold, italic, lists, line
   breaks) → 4.3.3.
5. **Search index**: every gig write (create, update, delete, publish, reject, remove, restore) calls
   `SearchIndex.indexGig` / `removeGig` in the same transaction (confirms 4.2.1 §C). Favourites:
   `GigCard.isFavorite` in `catalog/gig-cards.ts:63` becomes real for signed-in callers → 4.3.6.
6. **Impressions**: `searchGigs` says every listed card counts as an impression; 4.2.4 left this neutral. Count
   them in 4.3.5 (batched, no per-card write on the request path), so AC-39 "total impressions" is real.
7. **GeoIP (ADR-012)**: no local IP-location file exists. Local first: use DB-IP Lite (CC BY 4.0, no key) or leave
   country/city null when the file is missing; never a third-party lookup. Client IP per ADR-013 §14–§19 → 4.3.5.
   The weekly update job is Phase 6 (devops).
8. **Plan-limit race**: two simultaneous `createGig` calls must not both pass the limit (lock the owner row or
   count inside a serialisable transaction) → 4.3.3 test.
9. **Slug**: transliterate the Georgian title (≤ 138) + `-` + uid (20 uppercase hex); changes only when the `ka`
   title changes; `lookupGig` matches the uid after the last `-` case-insensitively; the web answers 301 when the
   slug differs (url-map §4.1) → 4.3.3 / 4.3.4 / 4.3.11.
10. **Web routes** (url-map): `/create` (login, `noindex`), `/post/service` → 301 `/create`,
    `/service/{slug}` (+ `/en/`), `/seller/gigs`, `/seller/gigs/{uid}/edit`, `/seller/gigs/{uid}/analytics`
    (legacy id forms 301), `/account/favorite`. `/create` links already exist (seller home, profile) and gig cards
    already link to `/service/…`, which 404 until 4.3.11.
11. **Design**: wizard and gig page have screen docs (03, 02). My gigs, analytics and favourites have none: use the
    existing dashboard list patterns (portfolio list, `EmptyState`, KPI tiles) in the 3X look.

## F. i18n — 19 keys missing from both `en.json` and `ka.json` → 4.3.2b
Spec 04 NEW keys (values in the spec 04 "Texts" table): `t_english_fields_optional_notice_v2`,
`t_validator_georgian_letter_required`, `t_number_of_revisions`, `t_number_of_revisions_hint`,
`t_validator_revisions_range`, `t_revisions_included`, `t_no_revisions`, `t_price_min`, `t_seo_both_fields_required`,
`t_upgrades_limit_reached`, `t_faq_limit_reached`, `t_question`, `t_no_gigs_yet`, `t_no_favorites_yet`,
`t_reorder_images_hint`, `t_subject_admin_gig_reported`. Spec 00 keys used here (values in spec 00 lines 475–483):
`t_plan_gig_limit_reached`, `t_upgrade_to_premium`, `t_validator_georgian_field_characters`.
Placeholders follow the codebase format (`{{name}}`, not `:name`). The other 105 keys of the spec exist.

## G. ROADMAP changes
4.3.1 ticked. 4.3.2 split into **4.3.2a** (architect: section B) and **4.3.2b** (backend: tables, S-070, i18n keys).
"packages" removed from 4.3.2 (gig packages are out of scope, spec 04). 4.3.3–4.3.16 extended with sections D/E.
4.3.7 restore notes Q-123.

## Files created/changed
- `docs/handoffs/2026-10-07-orchestrator-to-architect-backend-web-mobile-4-3-1-spec-04-check.md` (this file)
- `docs/ROADMAP.md`: 4.3.1 ticked; 4.3.2 → a/b; 4.3.3–4.3.16 extended
- `docs/STATUS.md`: micro-task log + next micro-task

## What the next agent must do
**4.3.2a (solution-architect):** data-model §3.D staff-removal columns + `submitted_at` (section B), confirm the
analytics tables for gig views, migration mapping lines in §12.2 (legacy trash → `deleted_by = staff`?). No
contract change expected (if one is needed: ADR first). Then 4.3.2b (backend) uses sections B, E.1 and F.

## Open questions / risks
- **Q-123** (section C) — Owner answer needed before 4.3.7 restore, otherwise the contract default is built.
- Still open from before: DEV-M1, Q-160, Q-163, Q-164 (none blocks slice 3).
- Risk: with Premium neutral, every local test user can create only **1 gig** (S-001 default). For the Owner
  click-through (4.3.22), raise S-001 in the admin settings or add a demo seed (decide at 4.3.17).
- Risk: until slice 5 there is no cart, so the gig page's main button is hidden; the click-through checklist must
  say so.
