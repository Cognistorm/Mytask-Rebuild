# QA test plan: slice 3 — Gigs (spec 04)
Date: 2026-10-07 | QA: ROADMAP 4.3.18a + 4.3.18b (independent sessions; did not write slice 3 code) | Branch: `feat/gigs`
Spec: `docs/02-specs/04-gigs.md` (39 ACs, R-G1…R-G11, EC-1…EC-13) + spec 16 AC-20 (staff remove / restore, Q-123 (b), ADR-024). Contract 1.5.0. Report: `docs/06-qa/reports/04-gigs-2026-10-07.md`. Security review: 4.3.19 (uploads).
AC → operation map: `docs/handoffs/2026-10-07-orchestrator-to-architect-backend-web-mobile-4-3-1-spec-04-check.md` (37 API ACs; AC-13 and AC-31 NOT-API / later slice).

**Limits of this slice:** cart, checkout and chat come later (spec 06 / 08), so AC-29 "Add to cart" refusal, AC-30 own-gig cart refusal and AC-31 "Contact seller" have no button yet (hidden until slices 5 / 7). Orders do not exist yet: `orders_in_queue` (R-G8) is set in the database by the tests; recent orders on the analytics page stay empty. Premium is a test double until slice 8. In-app + push of EV-20/21/130 wait for slice 15.

## Method
- **Layer A — automated (4.3.18a).** Every suite forced (no Turborepo cache): lint, typecheck, API tests, contract (`verify:final`, `gen:check`), i18n, format; the new QA probes `apps/api/test/qa-slice04.test.ts` (real HTTP pipeline, contract validation, PGlite + in-process Redis, in-memory object storage); web E2E on the production build (stand-in API); admin E2E on the production build; the three full-stack main flows (`profiles-main-flow`, `catalog-main-flow`, `gigs-main-flow`) on `pnpm local` with a **throw-away database** (`LOCAL_PGLITE_DIR` in the session scratchpad; the Owner's `apps/api/.pglite` is never used); `expo export` of the app (iOS + Android); HTTP checks against the running stack (`S-*`, scratchpad script).
- **Layer B — parity and screens (4.3.18b).** The same screens on the live site (public pages only, no login, nothing sent) and in `/legacy/` vs the new web, app and admin; ka + en at 390 px and 1280 px; i18n of every new key (Q-058); notifications in Mailpit; cross-client web ↔ app.

Test-ID prefixes: `gigs` / `gigs-create` / `gigs-update` / `gigs-read` / `gigs-related` / `gigs-views` / `gigs-analytics` / `gigs-favorites-reports` / `gigs-admin` / `gigs-schema` / `content-language` / `gig-search` = the matching `apps/api/test/*.test.ts`; `QA-*` = QA probes in `qa-slice04.test.ts`; `S-*` = stack checks; `web:<file>` / `admin:<file>` = Playwright specs (`apps/web/e2e`, `apps/admin/e2e`); `B-*` = layer-B checks; `app` = mobile source + `expo export` + SETUP-LOCAL §4 steps 19–20 (manual, device).

## AC → test cases
| AC | What | Test cases (layer A) | Layer B |
|---|---|---|---|
| AC-1 | Wizard entry; `/post/service` → `/create`; guests → login | gigs "sends guests to login with 401"; gigs-create "sends guests to login and refuses restricted users"; web:gig-wizard "a guest is sent to login…", "/post/service answers 301…", "a restricted user goes to the restrictions page"; **S-API-1**, **S-WEB-2**, **S-WEB-3** | B-WIZ entry points (header, Selling, profile) web + app |
| AC-2 | Plan limit on opening (S-001, non-deleted) | gigs "counts active, pending and rejected gigs but not deleted ones"; web:gig-wizard "at the plan limit the form is not shown…"; **QA-LIMIT-1**, **QA-LIMIT-2** (S-001 null = unlimited); **S-API-3** | B-WIZ limit screen web + app |
| AC-3 | Plan limit on submit; S-002 for Premium | gigs-create "refuses a gig over S-001 with 422…", "lets only one of two simultaneous submits through"; gigs "applies S-002 to Premium users"; web:gig-wizard "the plan limit reached meanwhile shows a danger Banner…"; **QA-LIMIT-1**; **S-GIG-2** | – |
| AC-4 | Overview fields, dependent categories, lengths | gigs-create "returns every invalid field at once…", "counts lengths on the trimmed text…"; gigs-update "checks the category chain…"; web:gig-wizard "Overview and Pricing…"; **QA-VAL-1/2** | B-WIZ fields/order vs live `/create` (legacy Blade) |
| AC-5 | Georgian field: ≥ 1 Georgian letter, R-5.3a characters | content-language (11 + parity with `@mytask/i18n`); gigs-create (`title.ka` / `description.ka` codes, refused characters) | B-I18N message texts |
| AC-6 | English only | content-language; gigs-create (`title.en`) | – |
| AC-7 | Language notice `t_english_fields_optional_notice_v2` | web:gig-wizard (notice in the Overview test); app source | B-WIZ |
| AC-8 | Price ≥ 1.00, ≤ 10 characters; delivery list; revisions required | gigs-create (price, revisions); **QA-VAL-1** (1.00 and 9,999,999.99 accepted, delivery 0), **QA-VAL-2** (0.99, 10,000,000.00, USD, delivery 8, revisions null) | B-WIZ delivery list labels |
| AC-9 | Revisions 0…S-041, no decimals/negatives | gigs-create (11 > 10); **QA-VAL-2** (-1, 2.5, null, 11); **QA-VAL-1** (0) | – |
| AC-10 | S-041 lowered: kept until saved again | gigs-update "applies today's S-041 only when revisions are sent…"; web:gig-wizard "edit: … revisions above S-041 are refused on save" | – |
| AC-11 | Upgrades ≤ 10, title ≤ 100, price, extra days | gigs-create; gigs-update "keeps an upgrade's identity by id…"; gigs-schema; web:gig-wizard "Upgrades and FAQ…"; **QA-VAL-1/2** (10 ok, 11 / title 101 / extra days 8 refused) | B-WIZ |
| AC-12 | FAQ ≤ 10, question ≤ 100, answer ≤ 300 | gigs-schema "limits FAQ question and answer lengths"; web:gig-wizard; **QA-VAL-1/2** | B-WIZ |
| AC-13 | No tags / video / requirement fields | NOT-API; web + app wizard source (no such fields) | B-WIZ |
| AC-14 | Gallery: thumbnail, 1…S-077 images, documents while S-080 ON; per-file errors | gigs "takes JPG/PNG thumbnails and gallery images up to S-078 MB…", "takes PDF documents…", "refuses new documents while S-080 is OFF…"; gigs-create "takes only the caller's own ready files…"; web:gig-wizard "Gallery…", "documents are not offered while S-080 is OFF"; **QA-FILE-1…3**; **S-UP-1…5** (real storage + worker: wrong type / size refused before storage, fake PNG rejected by the scan) | B-WIZ camera/library (app) |
| AC-15 | SEO both or none | gigs-create (`seo`), "leaves blank optional fields out…"; web:gig-wizard "SEO dialog: both fields or none"; **QA-VAL-1/2** (100/150 ok, 101/151 refused) | B-WIZ dialog vs live |
| AC-16 | Create: slug, S-070 ON active / OFF pending + EV-19 | gigs-create "saves a pending gig while S-070 is OFF, with EV-19…", "publishes at once while S-070 is ON…"; web:gig-wizard "Create sends the whole gig; S-070 ON…", "S-070 OFF: the review text…"; admin:gigs-main-flow; **S-GIG-1** | B-NOTIF EV-19 in Mailpit |
| AC-17 | Publish → active + EV-20 | gigs-admin "publishes a pending gig once…", "owner emails EV-20…"; admin:gig-queue "pending queue: … approve publishes"; admin:gigs-main-flow; **S-ADM-1**, **S-MAIL-1** | B-NOTIF EV-20 text + link |
| AC-18 | Reject with reason → My gigs + editor + EV-21 | gigs-admin "rejects with the reason…"; gigs-read "returns the edit form to the owner with the rejection reason…"; web:my-gigs (status + reason), web:gig-wizard "edit: a rejected gig shows the reason…"; admin:gig-queue "reject needs a reason…"; admin:gigs-main-flow | B-NOTIF EV-21; app editor notice |
| AC-19 | All errors at once, focus first, summary | gigs-create "returns every invalid field at once and saves nothing"; gigs-update "runs the same field rules…"; web:gig-wizard "Overview and Pricing…", "server errors land on their fields…" | B-WIZ app jump to first step |
| AC-20 | My gigs list, statuses, actions, empty state | gigs-read "lists own non-deleted gigs newest first…", "is empty for a member without gigs…"; web:my-gigs (5); admin:gigs-main-flow | B-MY web + app vs live |
| AC-21 | Edit all fields incl. child category | gigs-update "changes only the sent fields…", "checks the category chain … saves the child category"; web:gig-wizard "edit: the stored gig fills the form…" | B-WIZ edit |
| AC-22 | Edit → pending while S-070 OFF (+ EV-19), active while ON | gigs-update "every save goes back to review…", "goes live at once while S-070 is ON…"; **QA-MASS-1** (a rejected gig cannot publish itself through the body) | – |
| AC-23 | Gallery edit: single changes, order, 1…S-077 | gigs-update "reorders, removes and adds gallery images without re-upload…"; web:gig-wizard (edit gallery); **QA-FILE-1**, **QA-FILE-2** (0 / over S-077 refused, repeated id once) | – |
| AC-24 | Delete: 409 with queue, else deleted, frees the slot | gigs-update "marks the gig deleted by its owner…", "refuses while orders are in the queue…"; web:my-gigs "delete: …", "delete refused while orders are in the queue…"; admin:gigs-main-flow; **S-GIG-6** | B-MY confirm text |
| AC-25 | Edit never limited by the plan | gigs-update "… never the plan limit (AC-25)" | – |
| AC-26 | Gig page content | gigs-read "shows an active gig to guests…"; web:gig-page (guest, gallery, tabs, related, actions); admin:gigs-main-flow (guest page); **S-GIG-4**, **S-WEB-5** | B-PAGE web + app vs live `/service/…` |
| AC-27 | `/en/` without English → Georgian + note | gigs-read "falls back per field…"; web:gig-page "no English text: Georgian content with the note…" | B-PAGE en |
| AC-28 | Pending/rejected owner only; deleted 404 | gigs-read "shows pending and rejected gigs to the owner only", "returns 404 for a deleted gig…"; web:gig-page "unknown uid and others' pending gigs answer 404", "owner: pending and rejected gigs with their notice…"; **QA-OWN-1** (all 10 page/owner/action operations 404 for a stranger), **QA-STAFF-1**, **QA-REP-1**; **S-GIG-3**, **S-WEB-1** | – |
| AC-29 | Seller away / restricted notice | gigs-read "marks the seller unavailable…"; web:gig-page (seller away); cart refusal = slice 5 | B-PAGE notice |
| AC-30 | Owner: "Edit gig" instead of favourite; cart refusal | gigs-read "tells a signed-in viewer whether they own…"; web:gig-page "Actions, owner…"; cart = slice 5 | – |
| AC-31 | Contact seller → chat | NOT-API here; slice 7 (button hidden) | – |
| AC-32 | "You may also like" (P-137) | gigs-related (7); web:gig-page "'You may also like'…" | B-PAGE |
| AC-33 | Slug from ka title + uid; stable; old slug 301 | gigs-update "changes only the sent fields; the slug stays…"; gigs-read "finds the gig by uid in any case…"; web:gig-page "an old title slug or another case redirects permanently…"; **S-WEB-6** | – |
| AC-34 | Visit counted (not owner/bots), device/browser/OS/referrer/place, no IP | gigs-views (7); web:gig-page "the visit is recorded once…", "a direct visit sends a null referrer"; **S-VIEW-1**, **S-AN-1** | – |
| AC-35 | Favourite on page **or gig card**; guest message | gigs-favorites-reports "saves idempotently…", "refuses guests (401), the owner (403)…"; web:gig-page "Actions, guest…", "Actions, signed in…"; **S-FAV-1**; gig cards: **no favourite control on web or app cards** (BUG-03) | B-CARD |
| AC-36 | Favourites list, listable only, 42 per page | gigs-favorites-reports "lists saved gigs…", "hides pending, deleted and restricted-owner gigs…"; web:favorites (4); admin:gigs-main-flow; **QA-STAFF-1**, **S-ADM-2** | B-FAV web + app vs live |
| AC-37 | Report 6–500, once, guest/owner messages | gigs-favorites-reports "saves one report per user and gig…", "refuses guests, the owner, a short or long reason…", "counts every attempt in the hourly limit…"; web:gig-page (report tests); **QA-REP-1** (6 / 500 after trim accepted, 5 / 501 refused; pending / rejected 404); **S-REP-1** | – |
| AC-38 | EV-22 Admin/GigReported to S-100 | gigs-favorites-reports "…emails EV-22 to S-100…", "EV-22 … renders…" | B-NOTIF EV-22 in Mailpit |
| AC-39 | Analytics: totals + breakdowns; others 404 | gigs-analytics (4); web:gig-analytics (4); **QA-OWN-2**, **QA-OWN-3** (owner's pending / rejected gigs readable); **S-AN-1**, **S-AN-2** | B-AN vs legacy charts; app opens the website (Owner question 4.3.16) |
| spec 16 AC-20 | Staff remove (active, reason, queue 409) / restore (30 days, plan limit, EV-130); no staff edit | gigs-admin "removes only an active gig…", "restores a staff removal within 30 days…", "refuses a restore when … plan limit"; gigs-schema (removal columns); admin:gig-queue "active gig: remove…", "deleted tab…"; admin:gigs-main-flow; **QA-STAFF-1**, **QA-STAFF-2** (pending + rejected counted), **QA-ROLE-3** (each decision only from its state); **S-ADM-2…4**, **S-MAIL-1** | B-ADM queue vs legacy Filament |

## Rules, edge cases, roles
| Item | Test cases |
|---|---|
| R-G1 fields and limits | AC-4, AC-8…AC-12, AC-15 tests; **QA-VAL-1/2** |
| R-G2 languages | content-language; AC-5/6/27 tests |
| R-G3 plan limit | AC-2/3/25 tests; **QA-LIMIT-1/2**, **QA-STAFF-2** |
| R-G4 moderation | AC-16/22 tests; **QA-MASS-1** |
| R-G5 statuses | gigs-schema; migration of legacy statuses = Phase 5 |
| R-G6 revisions copied to orders | slice 5 (spec 06) |
| R-G7 slug | AC-33 tests |
| R-G8 orders in queue | gigs-update / gigs-admin (409 with `ordersInQueue` set in the DB); real counter = slice 5 |
| R-G9 upgrades / FAQ | AC-11/12 tests; removed upgrades kept (gigs-update, gigs-schema) |
| R-G10 own gigs | gigs-favorites-reports (owner 403 favourite / report); **S-FAV-1** |
| R-G11 public documents | gigs "keeps … documents as public downloads"; gigs-create "attaches documents … as public download links"; **S-MED-3** |
| EC-1 delete then create | gigs-create "… a deleted gig frees the slot (EC-1)"; **QA-LIMIT-1** |
| EC-2 Premium ends with 5 gigs | gigs "applies S-002 to Premium users" + QA-LIMIT-1 (counting); real Premium = slice 8 |
| EC-3 category rename / delete in use | slice 2 (admin-categories "refuses a category with children, gigs…") |
| EC-4 edit during an order | slice 5 |
| EC-5 active edited with S-070 OFF leaves search | gigs-update "… an active gig edited with S-070 OFF leaves search (EC-5)" |
| EC-6 same image twice accepted | **QA-FILE-2** (the same file id twice in one list is kept once; two uploads of the same bytes are two files) |
| EC-7 slug change + 301 | AC-33 tests |
| EC-8 S-080 OFF: existing stay, new refused | gigs, gigs-create, gigs-update "keeps existing documents while S-080 is OFF…"; gigs-read (documents visible); web:gig-wizard |
| EC-9 half-filled wizard: nothing saved; leave asks | web:gig-wizard '"Discard changes?" before a link…'; app source ("Discard changes?" sheet) |
| EC-10 report a gig deleted meanwhile → 404 | gigs-favorites-reports "… a gig that is gone"; **QA-REP-1** |
| EC-11 favourite becomes pending → hidden, returns | gigs-favorites-reports "hides pending … and shows them again…"; **QA-STAFF-1**; admin:gigs-main-flow |
| EC-12 migrated description with R-5.3a characters | content-language + gigs-update "runs the same field rules…" (refused on next save); import = Phase 5 |
| EC-13 no related → hidden | gigs-related "… empty when none match"; web:gig-page |
| Rich text sanitised (CONVENTIONS §19) | gigs-create "sanitises the description…"; rich-text; **QA-SAN-1** (scripts, handlers, `javascript:` links, frames, styles, images, attributes, through `getGig` in ka and en) |
| **Wrong role tries it** | **QA-ROLE-1** (guest and user Bearer → 401 on all 6 staff gig operations), **QA-ROLE-2** (staff with `kyc.review` → 403 on all 6), gigs-admin "needs gigs.moderate", admin:gig-queue "without gigs.moderate…"; **QA-OWN-1/2** (stranger on owner operations), **QA-FILE-1/3** (other users' files), **QA-MASS-1** (owner / status / counters in the body never applied) |
| Notifications EV-19…EV-22, EV-130 | gigs-create, gigs-admin, gigs-favorites-reports (outbox + rendering ka/en); **S-MAIL-1** (EV-20 + EV-130 delivered to Mailpit); layer B reads every email |

## Stack checks (on `pnpm local`, throw-away DB; scratchpad script, never prints the seed password)
- **S-CFG-1** `GET /config/public` 200 (gig upload limits, S-080 state).
- **S-API-1…3** guests 401 on eligibility / create / admin list / favourites; unknown gig, bad uid, unknown uid 404; a new seller can create (S-001 = 1).
- **S-UP-1…5** real uploads through the presigned POST, SeaweedFS and the worker: thumbnail + 2 images `ready`; PDF as `gig_image` refused before storage; text bytes declared as PNG rejected by the scan; 50 MB refused before storage; `gig_document` PDF `ready` (S-080 ON by default).
- **S-GIG-1…6** create → pending; a second gig → 422 PLAN_LIMIT_REACHED; guest 404 / owner 200; after publish guest 200 and found by `searchGigs`; owner delete → 404, slot free.
- **S-MED-1…3** thumbnail and gallery variants 200 `image/webp` without sign-in; the document 200 `application/pdf` (R-G11).
- **S-S3** anonymous listing of `public-media` (root, `list-type=2`, `images/` prefix), all buckets, `private`, `kyc` → 403; a `private/quarantine/` object → 403/404.
- **S-WEB-1…6** pending gig page 404 for guests; `/post/service` 301 `/create`; `/create` for a guest; legacy `/seller/gigs/edit/{uid}` 301; gig page ka + en 200 after publish; old slug → permanent redirect.
- **S-ADM-1…4** (seeded Super-admin through the admin API cookie session) publish; remove (page 404, buyer favourites empty); restore (page 200); restore of an owner deletion 409.
- **S-FAV-1**, **S-REP-1**, **S-VIEW-1**, **S-AN-1/2**, **S-MAIL-1** favourite (owner 403), report + duplicate 409, view 202 → analytics clicks / browser / referrer, others 404; owner emails in Mailpit.

## Layer B checklist (4.3.18b)
- **B-WIZ, B-PAGE, B-MY, B-AN, B-FAV, B-CARD, B-ADM**: each screen on web (ka + en, 390 px and 1280 px) and in the app (source + `expo export`; device steps SETUP-LOCAL §4 19–20) vs the live site and legacy Blade / Livewire (`create.blade.php`, `service.blade.php`, `Seller/Gigs/*`, `Account/Favorite/*`, `cards/gig.blade.php`, admin `GigsComponent.php` / `TrashComponent.php`): fields, order, labels, links, messages, the states in spec 04 "Screens".
- **B-I18N**: every NEW key of spec 04 Texts and spec 16 (ADR-024) present in en + ka with the spec values; NEW keys added during the slice (4.3.2b, 4.3.6, 4.3.7, 4.3.9, 4.3.10a–e, 4.3.11a–c, 4.3.12b, 4.3.13, 4.3.15a) have en first and ka alongside; no hard-coded strings in the slice's screens.
- **B-NOTIF**: EV-19, EV-20, EV-21, EV-22, EV-130 in Mailpit (subject, body, button link, language).
- **B-X**: a gig created on web shows and edits in the app and the reverse; favourites and reports made on one client show on the other.
