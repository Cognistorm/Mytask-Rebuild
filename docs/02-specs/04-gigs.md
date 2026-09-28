# 04 — Gigs
Status: **approved** (Owner 2026-09-28; P-14…P-37 accepted)
Author: product-analyst (P2-A2) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-020…BR-024, BR-013, BR-036; `routes-and-pages.md` (`/create`, `/post/service`, `/seller/gigs/*`, `/service/{slug}`, `/account/favorite`); `notifications.md` (gig rows); `data-model.md` (gigs and children); `docs/05-design/audit.md` §3.4. Owner decisions: Q-013, Q-021, Q-022, Q-023, Q-045, Q-055, Q-056, Q-061, Q-068, Q-069. Platform rules: `00-platform-rules.md` (§2 plans, R-2.3…R-2.5, R-5.2…R-5.5, R-5.9; settings S-001, S-002, S-041, S-070, S-077…S-083, S-100; P-1).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-32…P-37, see "Open questions").

Legacy code traced for this spec (read-only). Discovery only surveyed the wizard; these are the actual rules:
- **Create wizard** `/create`: `legacy/APP/app/Livewire/Main/Create/CreateComponent.php` with view `resources/views/livewire/main/create/create.blade.php`. It is **one page** with four blocks: Overview (title ka/en, category → sub-category → child category, description ka/en), Pricing (price, delivery time), Gallery (thumbnail, images, documents), and an "SEO meta tags" modal (`create.blade.php:76-352`). Save: `create()` `:652-863`.
- The component also has methods for tags (`:200-263`), FAQ (`:270-337`), upgrades (`:344-411`) and requirement questions (`:418-645`), and the database has `gig_upgrades`, `gig_faqs`, `gig_requirements`, `gig_seo`, `gig_documents`. **But the live page has no fields for them and `create()` never saves them** (`:720-814` saves gig, translations, SEO, images, documents only). The separate step components `Create/Steps/*` and `Seller/Gigs/Options/Steps/*` are not included by any page. The gig page and checkout still display and sell upgrades that exist in the data (`Service/ServiceComponent.php:393-409`; BR-031).
- Validators: `app/Http/Validators/Main/Create/OverviewValidator.php:43-66` (ka title 3–100 + `GeorgianTextOnly`, en title 3–100 + `EnglishTextOnly`, all three category levels required, ka description ≥ 10, SEO title ≤ 100, SEO description ≤ 150); `PricingValidator.php` (price `^\d+(\.\d{1,2})?$` max 10 chars; delivery ∈ {0,1,2,3,4,5,6,7,14,21,30}; upgrade title ≤ 100, extra days in the same list); `GalleryValidator.php:42-54` (thumbnail JPG/PNG required; 1…max images JPG/PNG ≤ max size; 0…max documents PDF ≤ max size); FAQ question ≤ 100, answer ≤ 300 (`OverviewValidator.php:205-211`); `app/Rules/EnglishTextOnly.php:9-25` (needs ≥ 1 Latin letter and no Georgian letter).
- Plan limit: `CreateComponent.php:660-668` (checked only when the user presses Create; redirect `/subscription?gigs=true`).
- Slug: create `:676` = slug(ka title, 138 chars) + `-` + uid; **edit** `Seller/Gigs/Options/EditComponent.php:324` rebuilds it from the title **in the current UI language** on every save, so the URL changes on each edit.
- Edit: `EditComponent.php:304-477` (status back to `pending` when auto-approve is OFF; **child category is not saved**, `:332-335`; new gallery images replace all old ones `:375-403`; single images can be removed `:231-261`); validator `Seller/Gigs/Edit/GalleryValidator.php:44-52` (all files optional).
- Moderation: `Admin/Gigs/GigsComponent.php:211-324` (publish → `GigPublished` + in-app `t_ur_gig_title_has_been_published`; reject with reason → `YourGigNeedsChanges` + in-app `t_ur_gig_needs_changes_rejected_admin`).
- My gigs: `Seller/Gigs/GigsComponent.php` (delete refused while orders are in the queue; delete sets status `deleted`). Analytics: `Seller/Gigs/Options/AnalyticsComponent.php` (sales, clicks, impressions, reviews, devices, browsers, OS, referrers, countries, cities via ip-api.com).
- Gig page: `Service/ServiceComponent.php:34-162` (English without English text → 404 `:40-46`; pending visible to owner only; statuses active/featured/boosted/trending public `:52-61`; related gigs `:136-162`), report `:212-303` (reason 6–500, once per user, **no admin notification**), add to cart `:310-437` (seller unavailable, own gig, quantity 1–10), favourites `:444-525`. Favourites list: `Account/Favorite/FavoriteComponent.php` (42 per page, remove).

---

## Goal
Let every user publish gigs ("I will design a logo") through a simple wizard, with the new mandatory number of revisions, plan limits and optional admin moderation; show each gig on a clear gig page; let buyers save favourites and report bad gigs. This is vision priority 1 ("Post a GIG & Browse GIGs").

## Roles involved
- **User as freelancer**: creates, edits, deletes gigs; sees analytics (Q-013: every user).
- **User as buyer / guest**: views gig pages, adds to cart (spec 06), favourites, reports.
- **Premium user**: higher gig limit (S-002), badge and ranking (spec 03).
- **Staff (content moderator)**: approves or rejects gigs when S-070 is OFF; handles reports (spec 16).

## User stories
- As a freelancer, I want to publish a gig in one short wizard with Georgian text (Latin words allowed), so that posting is fast.
- As a freelancer, I want to state how many revisions my price includes, so that buyers know the deal in advance (Q-056).
- As a freelancer on the free plan, I want to know before I start that I have reached my gig limit, so that I do not lose my work.
- As a freelancer, I want to know when my gig is published or needs changes, and why.
- As a buyer, I want the gig page to show price, delivery time, revisions, extras, reviews and the seller, so that I can decide.
- As a buyer, I want to save gigs to favourites and report gigs that break the rules.

## Acceptance criteria

### Starting the wizard and the plan limit (Q-021)
- AC-1 Given a logged-in user, When they choose "Create a new gig" (header, Selling dashboard, profile), Then the wizard opens (`/create`; mobile: Selling → Gigs → +). `/post/service` redirects to `/create`. Guests are sent to login first. (LEGACY routes; dual role Q-013)
- AC-2 Given a Standard user whose non-deleted gigs (active, pending and rejected) equal S-001 `plans.standard.gig_limit` (default 1), When they open the wizard, Then it does not open; they see `t_plan_gig_limit_reached` with the limit and an "Upgrade to Premium" button to `/subscription?gigs=true`. (00 AC-5; check on opening ACCEPTED P-35)
- AC-3 Given the same user bypasses the screen (old tab, second device or direct API call), When the gig is submitted, Then the API refuses it with the plan-limit error. For Premium users S-002 applies (default unlimited). (00 AC-5, AC-6; LEGACY check at submit `CreateComponent.php:660-668`)

### Wizard content — Overview
- AC-4 Given the Overview block, When the user fills it, Then these fields exist: Georgian title (required, 3–100 chars), English title (optional, 3–100), category, sub-category and child category (all required; each list shows only children of the level above and resets the lower levels when a higher one changes), Georgian description (required, ≥ 10 chars, formatted text: bold, italic, lists, line breaks) and English description (optional, ≥ 10). (LEGACY BR-020)
- AC-5 Given a Georgian title such as `Logo დიზაინი Photoshop-ში`, When it is saved, Then it is accepted: Latin letters, digits and normal punctuation are allowed next to Georgian. A Georgian field with no Georgian letter at all (for example `Logo design`) is refused with `t_validator_georgian_letter_required`. (CHANGE Q-022, R-5.3; "at least one Georgian letter" ACCEPTED P-37)
- AC-6 Given an English title or description that contains a Georgian letter, or no Latin letter, When it is saved, Then it is refused with `t_validator_english_only`. (LEGACY R-5.4, `EnglishTextOnly.php`)
- AC-7 Given the wizard, When it opens, Then a language notice says that English is optional and that, without it, English visitors see the Georgian text (`t_english_fields_optional_notice_v2`). (CHANGE Q-023: the legacy notice said the gig would not appear in English)

### Wizard content — Pricing and number of revisions
- AC-8 Given the Pricing block, When the user fills it, Then these fields exist: price in GEL (digits with up to 2 decimals, at most 10 characters, at least 1.00), delivery time (one of: None, 1, 2, 3, 4, 5, 6 days, 1 week, 2 weeks, 3 weeks, 1 month = 0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30 days), and number of revisions (required). (LEGACY BR-020; minimum price ACCEPTED P-35; revisions NEW)
- AC-9 Given the "Number of revisions" field, When the user saves, Then only a whole number from 0 to S-041 `revisions.max_allowed` (default 10) is accepted. Empty, negative, decimal or above the maximum is refused with `t_validator_revisions_range`. 0 means "no revisions". There is no "unlimited" option. (NEW Q-056, Q-061a, P-1; Q-045)
- AC-10 Given the admin changes S-041 from 10 to 5, When a freelancer edits a gig that has 8 revisions, Then the gig keeps 8 until it is saved again; on save, 8 is refused and a value of 0–5 must be chosen. Orders already placed keep the number they were bought with (spec 06). (00 AC-8, EC-2 pattern)

### Wizard content — optional extras (ACCEPTED P-32)
- AC-11 Given the Upgrades block (optional), When the user adds an upgrade with a title (≤ 100 chars), a price (same format as AC-8) and extra delivery days (from the delivery list, 0 = no change), Then it is saved with the gig. At most 10 upgrades per gig. Upgrades can be edited and removed. (legacy data and checkout support, `PricingValidator::upgrade`; wizard field ACCEPTED P-32)
- AC-12 Given the FAQ block (optional), When the user adds a question (≤ 100 chars) and an answer (≤ 300 chars), Then it is saved with the gig. At most 10 FAQ entries. (legacy validator `OverviewValidator::faq`; wizard field ACCEPTED P-32)
- AC-13 Given the wizard, When it is shown, Then it has no fields for tags, a video link, or structured buyer-requirement questions. The buyer writes the order details as free text after payment (spec 06, BR-036). (LEGACY live wizard; P-32)

### Wizard content — Gallery and SEO
- AC-14 Given the Gallery block, When the user uploads, Then a thumbnail (JPG/PNG, ≤ S-078 MB, required) and 1 to S-077 gallery images (JPG/PNG, each ≤ S-078 MB) are required, and, if S-080 `media.gig.documents_enabled` is ON, 0 to S-081 PDF documents (each ≤ S-082 MB) are allowed. Wrong type or size is refused per file with its own message. Mobile offers camera or photo library. (LEGACY `GalleryValidator.php:42-54`; thumbnail size limit now S-078)
- AC-15 Given the optional "SEO meta tags" dialog, When both an SEO title (≤ 100 chars) and an SEO description (≤ 150 chars) are filled, Then they are saved and used for the gig page's title and meta description (spec 17). When only one is filled, Then neither is saved and the user sees `t_seo_both_fields_required`. (LEGACY `CreateComponent.php:753-762`; message NEW)

### Submitting, moderation and notifications (BR-022)
- AC-16 Given all required fields are valid, When the user presses "Create", Then the gig is saved with its slug (AC-33) and: if S-070 `moderation.gigs.auto_approve` is ON, status active and the success screen `t_gig_created` / `t_gig_created_subtitle` with "View gig"; if S-070 is OFF, status pending, the success screen `t_gig_created_subtitle_pending_approval`, and `Admin/PendingGig` to every address in S-100. (LEGACY; CHANGE recipients Q-026)
- AC-17 Given a pending gig, When a staff member publishes it, Then it becomes active and public, and the owner gets `GigPublished` (email) and `t_ur_gig_title_has_been_published` (in-app + push, P-11) linking to the gig page. (LEGACY `Admin/Gigs/GigsComponent.php:211-242`)
- AC-18 Given a pending gig, When a staff member rejects it with a reason, Then its status becomes rejected, the reason is shown to the owner on My gigs and in the edit screen, and the owner gets `YourGigNeedsChanges` (email, with the reason) and `t_ur_gig_needs_changes_rejected_admin` (in-app + push) linking to My gigs. (LEGACY `:286-324`)
- AC-19 Given a validation error in any block, When "Create" is pressed, Then nothing is saved, the first invalid field is focused, and each invalid field shows its message (`t_toast_form_validation_error` as summary). (LEGACY)

### Editing and deleting (My gigs)
- AC-20 Given Selling → Gigs, When it opens, Then it lists the user's non-deleted gigs with thumbnail, title, price, status (Active, Pending, Rejected + reason), and actions View, Edit, Analytics, Delete. Empty state: `t_no_gigs_yet` with "Create a new gig". (LEGACY)
- AC-21 Given the owner edits a gig, When they save valid data, Then all fields of AC-4…AC-15 are updated, **including the child category**. (LEGACY edit; child-category save fixes `EditComponent.php:332-335`)
- AC-22 Given S-070 is OFF, When the owner saves an edit of any gig (active, pending or rejected), Then its status becomes pending, it leaves the public lists and its page until approved, `Admin/PendingGig` is sent, and orders already placed continue. Given S-070 is ON, Then it stays or becomes active at once. (LEGACY `EditComponent.php:327-331, :445-450`)
- AC-23 Given the gallery in edit, When the owner removes one image, adds images, or changes the order, Then only that change is applied (no need to re-upload everything); the first image after the thumbnail is the first in the gallery; the count must stay within 1 to S-077. The thumbnail can be replaced. (LEGACY single-image removal; add and reorder ACCEPTED P-34; legacy replaced the whole gallery on upload)
- AC-24 Given a gig with orders in the queue (paid order items not finished), When the owner deletes it, Then it is refused with `t_this_gig_has_orders_in_queue_delete`. Otherwise, after the confirmation `t_are_u_sure_u_want_to_delete_gig`, the gig becomes deleted: it disappears from public pages and from My gigs, it no longer counts toward the plan limit, and its past orders and reviews keep their data. (LEGACY `Seller/Gigs/GigsComponent.php`; R-2.4)
- AC-25 Given a user edits a gig while being over the plan limit (for example Premium expired), When they save, Then the edit is allowed (the limit only blocks new gigs). (00 R-2.3, R-2.5)

### Gig page (`/service/{slug}`, `/en/service/{slug}`)
- AC-26 Given an active gig whose owner is listable (spec 03 P-29), When anyone opens its page, Then it shows: breadcrumb (category levels), title with the "Featured" badge if the owner has Premium (spec 03 AC-18), seller row (avatar, username, online status, ID verified mark, rating), stats (orders in queue, delivery time, average rating and review count), image carousel with thumbnails, the purchase box (starting price, upgrades with checkboxes showing "+ price" and `t_delivery_time_will_be_increased_by_extra` / `t_no_changes_delivery_time`, no quantity selector: quantity is always 1 (spec 06 P-46, Owner 2026-09-28), "Add to cart", "Contact seller"), the number of revisions (`t_revisions_included` or `t_no_revisions`), Actions (Share, Report, Add to/Remove from favourites), tabs Description, FAQ (only if any), Reviews, Documents (only if any, downloadable), and "You may also like". (LEGACY `service.blade.php`; revisions NEW Q-056)
- AC-27 Given the gig has no English text, When it is opened under `/en/`, Then the page shows the Georgian title and description with HTTP 200 and the note `t_content_shown_in_georgian`. (CHANGE Q-023; legacy returned 404, `ServiceComponent.php:40-46`)
- AC-28 Given a pending gig, When its owner (or staff) opens the page, Then it shows with the banner `t_this_gig_not_activated_yet`. Anyone else gets 404. Rejected and deleted gigs return 404 to everyone except staff. (LEGACY `:52-61`)
- AC-29 Given the seller has set "unavailable until" (spec 02), or is restricted, When a buyer presses "Add to cart", Then it is refused with `t_seller_wont_be_able_to_receive_orders_date` (with the date when known), and the page shows the notice. (LEGACY `:314-326`; restricted owner ACCEPTED with spec 03 P-29)
- AC-30 Given the viewer owns the gig, When they press "Add to cart", Then it is refused with `t_u_cant_add_ur_own_gigs_to_shopping_cart`. The owner sees "Edit gig" instead of the favourite button. (LEGACY; 00 R-1.3)
- AC-31 Given "Contact seller", When a logged-in user presses it, Then the chat with the seller opens (spec 08). Guests go to login. (LEGACY; chat not Premium-gated, Q-069)
- AC-32 Given "You may also like", When the page loads, Then up to 40 other listable gigs from the same sub-category or with a similar title are shown as a carousel in random order (no Premium boost). (LEGACY `:136-162`)
- AC-33 Given a gig, When its URL is built, Then the slug is the transliterated slug of the Georgian title (≤ 138 chars) + `-` + the gig's unique id (for example `/service/logo-dizaini-a1b2c3…`). The slug changes only when the Georgian title changes; any older slug of the same gig redirects (301) to the current one, found by the unique id at the end. (LEGACY BR-024, R-5.9; stable slug and redirect ACCEPTED P-33)
- AC-34 Given a gig page view by someone other than the owner, When it loads, Then the gig's visit counter increases and the visit is recorded for analytics (device, browser, OS, referrer, country/city from a local source, no third-party IP lookup). (LEGACY; CHANGE Q-055, X-09)

### Favourites
- AC-35 Given a logged-in user who does not own the gig, When they press "Add to favourite" on the gig page or a gig card, Then the gig is saved (`t_gig_has_been_added_to_favorite_list`) and the button becomes "Remove from favourite". Pressing it again removes it (`t_gig_removed_from_ur_favorite_list`). A guest sees `t_pls_login_or_register_to_add_to_favovorite`. (LEGACY `ServiceComponent.php:444-525`)
- AC-36 Given Buying → Favourites (`/account/favorite`), When it opens, Then it lists the user's saved gigs that are still listable, 42 per page, each with a remove action. Saved gigs that are no longer listable (deleted, pending, owner banned) are not shown. Empty state: `t_no_favorites_yet`. (LEGACY list; hide non-listable ACCEPTED with spec 03 P-29)

### Reporting
- AC-37 Given a logged-in user who does not own the gig, When they report it with a reason (6–500 chars), Then the report is saved for staff (`t_gig_reported_successfully`). A second report of the same gig by the same user is refused with `t_looks_like_alrdy_reported_this_gig`. Guests see `t_pls_login_or_register_to_report_this_gig`; owners see `t_gig_owner_cant_report_his_gig`. (LEGACY `:212-303`)
- AC-38 Given a new gig report, When it is saved, Then an admin email `Admin/GigReported` goes to every address in S-100. (NEW, ACCEPTED P-36; legacy sent none, unlike profile/project/bid reports)

### Gig analytics (Selling → Gigs → Analytics)
- AC-39 Given the owner opens a gig's analytics, When it loads, Then it shows total sales, total clicks (visits), total impressions, total reviews, and charts for devices, browsers, operating systems, referrers, countries and cities, plus the recent orders of the gig. Countries/cities come from the platform's own IP-location source (ADR-012). Other users get 404. (LEGACY `AnalyticsComponent.php`; CHANGE Q-055)

---

## Business rules
- R-G1 **Fields and limits** (LEGACY BR-020 unless marked): titles 3–100; descriptions ≥ 10 (formatted, sanitised); price `^\d+(\.\d{1,2})?$`, ≤ 10 chars, ≥ 1.00 GEL (P-35); delivery time from the fixed list (00 §4.18); number of revisions 0…S-041 (NEW Q-056, P-1); images/documents per S-077…S-082; SEO title ≤ 100 and description ≤ 150, saved only together.
- R-G2 **Languages** (Q-022, Q-023): Georgian required, English optional; Georgian fields may contain Latin letters but need at least one Georgian letter (P-37); English fields may not contain Georgian letters (LEGACY). English pages fall back to Georgian.
- R-G3 **Plan limit** (00 §2, R-2.3…R-2.5): counted gigs = non-deleted (active, pending, rejected); checked when the wizard opens (P-35) and, authoritatively, on submit; edits are never blocked by the limit; deleting a gig frees a slot.
- R-G4 **Moderation** (LEGACY BR-022): S-070. Create and every edit go to pending while S-070 is OFF. Rejected gigs can be edited and resubmitted without limit.
- R-G5 **Statuses**: pending, active, rejected, deleted. The legacy statuses `boosted`, `trending` and `featured` had no behaviour and migrate as active (spec 03 R-S1).
- R-G6 **Number of revisions** (NEW Q-056, Q-061, P-1, P-2): a property of the gig, copied onto each order when it is bought (spec 06 counts and enforces it). Upgrades do not change it.
- R-G7 **Slug** (LEGACY BR-024 + ACCEPTED P-33): Georgian title + unique id; stable unless the Georgian title changes; old slugs 301 to the current one.
- R-G8 **Orders in queue**: the number of the gig's order items that are paid and not finished (pending, started or delivered). A gig with a queue cannot be deleted (LEGACY). Spec 06 keeps this number up to date.
- R-G9 **Upgrades and FAQ** (ACCEPTED P-32): optional, at most 10 each. An upgrade's price and extra days are copied onto the order when bought (spec 06), so later edits do not change placed orders.
- R-G10 **Own gigs**: an owner cannot buy, favourite or report their own gig (00 R-1.3; LEGACY).
- R-G11 **Documents** are public downloads, as legacy (`/uploads/documents/{uid}`, no auth). Deliveries and requirement files are private (spec 06).

---

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Create/Edit wizard | one page with blocks Overview, Pricing (+ revisions), Upgrades*, FAQ*, Gallery, SEO dialog; a side summary with progress; language notice at the top (`*` if P-32 accepted) | a stepper with one block per screen (Overview → Pricing → Extras* → Gallery → Review & publish); sticky "Next"/"Publish" bar; camera/library pickers | loading (categories); per-field errors; upload progress per file; success screen (published or pending); plan-limit screen (AC-2) |
| My gigs | `/seller/gigs` table/cards with status chips | Selling → Gigs list with swipe or menu actions | empty; loading; error; success |
| Gig analytics | `/seller/gigs/analytics/{uid}` KPI tiles + charts | same, stacked | "no data yet" per chart |
| Gig page | `/service/{slug}`: gallery left, purchase box right, tabs below, related gigs slider (audit §3.4 keep) | gallery on top, then title and seller, then a **sticky bottom bar with price and "Add to cart"** (audit §3.4 fix), tabs as sections | loading skeleton; 404; pending banner (owner); unavailable notice; success |
| Share dialog | Facebook, Twitter/X, LinkedIn, WhatsApp, copy link | native share sheet | copied toast |
| Report dialog | modal | bottom sheet | success / already reported |
| Favourites | `/account/favorite` grid | Buying → Favourites | empty; success |

Accessibility: the main button meets contrast (Q-073 dark teal), carousel is keyboard-usable, upgrade checkboxes and touch targets ≥ 44 px, tab ids fixed (audit §3.4).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `Admin/PendingGig` (`t_subject_admin_pending_gig`) | email | all S-100 recipients | create or edit while S-070 is OFF (AC-16, AC-22) | LEGACY, CHANGE recipients (Q-026) |
| `GigPublished` (`t_subject_everyone_ur_gig_published`) + in-app `t_ur_gig_title_has_been_published` | email + in-app + push (P-11) | owner | staff publish (AC-17) | LEGACY (push NEW) |
| `YourGigNeedsChanges` (`t_subject_freelancer_ur_gig_needs_changes`) + in-app `t_ur_gig_needs_changes_rejected_admin` | email + in-app + push | owner | staff reject (AC-18) | LEGACY (push NEW) |
| `Admin/GigReported` (`t_subject_admin_gig_reported`) | email | all S-100 recipients | gig report (AC-38) | **NEW, ACCEPTED P-36** |

No notification is sent when a gig is auto-approved (LEGACY), deleted, or favourited.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_publish_new_gig` | Publish new gig | ახალი განცხადების გამოქვეყნება |
| `t_edit_gig` | Edit gig | განცხადების რედაქტირება |
| `t_my_gigs` | My gigs | განცხადებები |
| `t_overview` | Overview | ზოგადი მიმოხილვა |
| `t_create_gig_overview_subtitle` | Describe your service | სერვისის აღწერა |
| `t_service_title` | Service title | სერვისის დასახელება |
| `t_category` / `t_choose_category` | Category / Choose category | მიმართულება / აირჩიეთ მიმართულება |
| `t_subcategory` / `t_choose_subcategory` | Subcategory / Choose subcategory | კატეგორია / აირჩეთ კატეგორია |
| `t_childcategory` / `t_choose_childcategory` | Childcategory / Choose childcategory | ქვეკატეგორია / აირჩიეთ ქვეკატეგორია |
| `t_description` | Description | აღწერა |
| `t_language_notice` | Language Notice | ენობრივი შეტყობინება |
| `t_pricing` | Pricing | ღირებულება |
| `t_create_gig_pricing_subtitle` | Set price for your gig, add extra services | გთხოვთ მიუთითოთ თქვენი პროდუქტის/სერვისის ღირებულება |
| `t_price` | Price | ფასი |
| `t_delivery_time` / `t_choose_delivery_time` | Delivery time / Choose delivery time | მიწოდების დრო / აირჩიეთ მიწოდების დრო |
| `t_none`, `t_1_day` … `t_1_month` | None, 1 day … 1 month | არცერთი, legacy values |
| `t_upgrades` | Upgrades | განახლებები |
| `t_upgrade_title` | Upgrade title | განაახლეთ სათაური |
| `t_extra_days_delivery_time_short` | + :time on delivery time | მიწოდების თარიღს დაემატა + :time |
| `t_delivery_time_will_be_increased_by_extra` | Delivery time will be increased by an extra :time | მიწოდების თარიღი გაზრდილი იქნება :time |
| `t_no_changes_delivery_time` | Delivery time won't change | (missing in legacy ka; NEW ka) მიწოდების დრო არ შეიცვლება |
| `t_faq` | FAQ | FAQ (ხშირად დასმული კითხვები) |
| `t_add_faq` | Add FAQ | კითხვების დამატება |
| `t_answer` | Answer | პასუხი |
| `t_faq_added_successfully` | Your question and answer has been successfully added | კითვა და პასუხი წარმატებით დაემატა |
| `t_gallery` | Gallery | გალერეა |
| `t_get_noticed_by_right_buyers_images` | Get noticed by the right buyers with visual examples of your services | მიიქციეთ დამკვეთის ყურადღება თქვენი სერვისების ვიზუალიზაციით |
| `t_thumbnail` | Thumbnail | მთავარი სურათი |
| `t_images` | Images | სურათები |
| `t_documents` | Documents | დოკუმენტები |
| `t_image_has_been_successfully_deleted` | Image has been successfully deleted | (missing in legacy ka; NEW ka) სურათი წარმატებით წაიშალა |
| `t_file_has_been_successfully_deleted` | File has been successfully deleted | (missing in legacy ka; NEW ka) ფაილი წარმატებით წაიშალა |
| `t_seo_meta_tags` | SEO meta tags | SEO-ს თეგები |
| `t_seo_title` / `t_seo_description` | Seo title / Seo description | SEO - სათაური / SEO - აღწერა |
| `t_create` | Create | შექმნა |
| `t_gig_created_successfully` | Gig has been successfully created | განცხადება წარმატებით დაემატა |
| `t_gig_created` | Gig created | განცხადება დამატებულია |
| `t_gig_created_subtitle` | You gig has been successfully posted, you can now share it and start receiving orders | განცხადება წარმატებით დაემატა, ახლა შეგიძლიათ გააზიაროთ ის და დაიწყოთ შეკვეთების მიღება |
| `t_gig_created_subtitle_pending_approval` | Your gig has been created and our team is reviewing it right now | განხილვის პროცესის გავლის შემდეგ, თქვენი განცხადება ავტომატურად გამოჩნდება შესაბამის კატეგორიაში |
| `t_view_gig` | View gig | განცხადების ნახვა |
| `t_validator_english_only` | Must contain only English characters | უნდა შეიცავდეს მხოლოდ ინგლისურ სიმბოლოებს |
| `t_toast_form_validation_error` | whoops there were some problems with your inputs | მოხდა შეცდომა ! |
| `t_status` / `t_active` / `t_pending` / `t_rejected` | Status / Active / Pending / Rejected | სტატუსი / აქტიურია / მომლოდინე / უარყოფილია |
| `t_rejection_reason` | Rejection reason | უარის მიზეზი |
| `t_edit` / `t_view` / `t_delete` / `t_cancel` | Edit / View / Delete / Cancel | რედაქტირება / ნახვა / წაშლა / გაუქმება |
| `t_this_gig_has_orders_in_queue_delete` | This gig has orders in queue, please finish them before you can delete it | ამ განცხადებას აქვს მომლოდინე შეკვეთები, გთხოვთ, დაასრულოთ ისინი, სანამ მის წაშლას შეძლებთ |
| `t_are_u_sure_u_want_to_delete_gig` | Are you sure you want to delete this gig? | დარწმუნებული ხართ რომ გსურთ ამ განცხადების წაშლა? |
| `t_this_gig_not_activated_yet` | This gig is under review now, and it will be publicly visible soon | განცხადება განხილვის პროცესშია |
| `t_seller_wont_be_able_to_receive_orders_date` | Seller is away right now, and he won't be able to receive new orders until :date | ფრილანსერი ამ მომენტისთვის მიუწვდომელია და სამწუხაროდ ვერ მიიღებს შეკვეთებს :date -მდე. (markup removed from the text) |
| `t_starting_at` | Starting at | საწყისი ფასი |
| `t_number_order_in_queue` / `t_number_orders_in_queue` | :number order in queue / :number orders in queue | (ka for singular missing; NEW ka) რიგშია :number შეკვეთა / რიგშია :number შეკვეთა |
| `t_number_reviews` | :number reviews | :number მიმოხილვა |
| `t_expected_delivery_date_time` | :date for delivery | (missing in legacy ka; NEW ka) მიწოდება: :date |
| `t_add_to_cart` | Add to cart | კალათაში დამატება |
| `t_contact_seller` | Contact seller | ფრილანსერთან დაკავშირება |
| `t_u_cant_add_ur_own_gigs_to_shopping_cart` | You can't add your own gigs to shopping cart | თქვენ ვერ დაამატებთ საკუთარ განცხადებას კალათაში |
| `t_download` | Download | გადმოწერა |
| `t_actions` / `t_share` / `t_report` | Actions / Share / Report | აქციები / გაზიარება / გასაჩივრება (Owner may refine `t_actions`: "აქციები" reads as "promotions") |
| `t_share_this_gig` | Share this gig | განცხადების გაზიარება |
| `t_copy_link` / `t_copied` | Copy link / Copied | ლინკის კოპირება / დაკოპირებულია |
| `t_you_may_also_like` | You may also like | რეკომენდირებული განცხადებები |
| `t_add_to_favorite` / `t_remove_from_favorite` | Add to favorite / Remove from favorite | რჩეულებში დამატება / რჩეულებიდან ამოშლა |
| `t_gig_has_been_added_to_favorite_list` | Gig has been successfully added to your favorite list | განცხადება წარმატებით დაემატა რჩეულებში |
| `t_gig_removed_from_ur_favorite_list` | Gig has been removed from your favorite list | განცხადება წაიშალა რჩეულებიდან |
| `t_pls_login_or_register_to_add_to_favovorite` | Please sign in or create an account to add this Gig to your favorite list | რჩეულებში დასამატებლად თქვენ უნდა გაიაროთ ავტორიზაცია ან დარეგისტრირდეთ |
| `t_favorite_list` | Favorite list | რჩეულები |
| `t_report_this_gig` | Report this gig | განცხადების გასაჩივრება |
| `t_let_us_know_why_u_report_this_gig` | Let us know why you would like to report this Gig | გთხოვთ გაგვიზიაროთ რატომ გსურთ ამ განცხადების გასაჩივრება |
| `t_pls_login_or_register_to_report_this_gig` | Please login or sign up to report this gig | გთხოვთ გაიაროთ ავტორიზაცია ან დარეგისტრირდეთ რომ შეძლოთ ამ განცხადების გასაჩივრება |
| `t_gig_owner_cant_report_his_gig` | You cannot report your own gigs | თქვენ არ შეგიძლიათ საკუთარი განცხადების გასაჩივრება |
| `t_looks_like_alrdy_reported_this_gig` | It looks like you already reported this gig | როგორც ჩანს, თქვენ უკვე დაარეპორტეთ ეს განცხადება |
| `t_gig_reported_successfully` | Thank you! your request has been successfully sent | მადლობა! თქვენი მოთხოვნა მიღებულია |
| `t_gig_analytics` | Gig analytics | განცხადების ანალიზი |
| `t_total_sales` / `t_total_clicks` / `t_total_impressions` / `t_total_reviews` | Total sales / Total clicks / Total impressions / Total reviews | გაყიდვების საერთო რაოდენობა / კლიკების საერთო რაოდენობა / ჩვენება / მიმოხილვები |
| `t_plan_gig_limit_reached` / `t_upgrade_to_premium` / `t_content_shown_in_georgian` / `t_featured` | see 00 / 03 | see 00 / 03 |
| Email subjects in "Notifications" | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_english_fields_optional_notice_v2` (replaces `t_english_fields_optional_notice`) | Adding an English title and description is optional. If you leave them empty, visitors of the English site will see your Georgian text. Please write Georgian words in Georgian letters. | ინგლისური სათაურისა და აღწერის დამატება სავალდებულო არ არის. თუ მათ ცარიელს დატოვებთ, საიტის ინგლისური ვერსიის სტუმრები თქვენს ქართულ ტექსტს იხილავენ. გთხოვთ, ქართული სიტყვები ქართული ასოებით დაწეროთ. |
| `t_validator_georgian_letter_required` (replaces `t_validator_georgian_only`) | Must contain Georgian text. Latin words are allowed alongside it. | უნდა შეიცავდეს ქართულ ტექსტს. მასთან ერთად ლათინური სიტყვები დაშვებულია. |
| `t_number_of_revisions` | Number of revisions | შესწორებების რაოდენობა |
| `t_number_of_revisions_hint` | How many times the buyer can ask you to revise the delivery. Choose 0 for no revisions. | რამდენჯერ შეუძლია შემკვეთს მოგთხოვოთ მიწოდებული სამუშაოს შესწორება. აირჩიეთ 0, თუ შესწორებას არ ითვალისწინებთ. |
| `t_validator_revisions_range` | Enter a whole number from 0 to :max. | შეიყვანეთ მთელი რიცხვი 0-დან :max-მდე. |
| `t_revisions_included` | :count revisions included | შედის :count შესწორება |
| `t_no_revisions` | No revisions | შესწორება არ შედის |
| `t_price_min` | The price must be at least :min GEL. | ფასი უნდა იყოს მინიმუმ :min ლარი. |
| `t_seo_both_fields_required` | Fill in both the SEO title and the SEO description, or leave both empty. | შეავსეთ SEO სათაურიც და SEO აღწერაც, ან ორივე ცარიელი დატოვეთ. |
| `t_upgrades_limit_reached` | You can add up to :max upgrades. | შეგიძლიათ დაამატოთ მაქსიმუმ :max განახლება. |
| `t_faq_limit_reached` | You can add up to :max questions. | შეგიძლიათ დაამატოთ მაქსიმუმ :max კითხვა. |
| `t_question` | Question | კითხვა |
| `t_no_gigs_yet` | You have no gigs yet. | განცხადებები ჯერ არ გაქვთ. |
| `t_no_favorites_yet` | You have no saved gigs yet. | შენახული განცხადებები ჯერ არ გაქვთ. |
| `t_reorder_images_hint` | Drag images to change their order. | სურათების რიგის შესაცვლელად გადაათრიეთ ისინი. |
| `t_subject_admin_gig_reported` | Gig reported | განცხადება გასაჩივრებულია |
| `t_create_new_gig` | see 02 | see 02 |

## Edge cases
- EC-1 A Standard user deletes their only gig and creates a new one: allowed (deleted gigs do not count, R-G3).
- EC-2 Premium ends while the user has 5 gigs: all stay published; a 6th is blocked until they have fewer than S-001 non-deleted gigs (00 EC-4).
- EC-3 A category, sub-category or child category used by a gig is renamed: the gig follows the rename. Deleting a used category is not allowed (spec 16).
- EC-4 An edit is saved while an order is in progress: the order keeps the price, upgrades, delivery time and number of revisions it was bought with (spec 06).
- EC-5 An active gig is edited with S-070 OFF: it disappears from search until approved (LEGACY). Buyers who have it in their cart are told at checkout that it is no longer available (spec 06).
- EC-6 Two uploads of the same image: accepted (no duplicate check, LEGACY).
- EC-7 A Georgian title is changed: the slug changes and the old URL 301-redirects (P-33). Shared links keep working.
- EC-8 S-080 documents is switched OFF: existing documents stay visible on gig pages; new uploads are refused. (00 EC-1 pattern)
- EC-9 The wizard is left half-filled: nothing is saved (LEGACY has no drafts). On mobile, leaving asks for confirmation.
- EC-10 Reporting a gig that was deleted after the page opened: refused with 404.
- EC-11 The same user favourites a gig that later becomes pending: it is hidden from the favourites list and returns when it is active again (AC-36).

## Out of scope
- Cart, checkout, order requirements, delivery, revision counting and auto-release (spec 06). Reviews (spec 07). Chat (spec 08). Custom offers (spec 12). Admin moderation queue and report screens (spec 16). SEO meta/JSON-LD output (spec 17).
- Gig tags, gig video link and structured buyer-requirement questions (not in the live wizard; P-32).
- Gig packages (Basic/Standard/Premium tiers per gig): not in legacy.
- AI translation of gigs (vision, later).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-32 Which optional blocks the wizard has.** The live wizard has only Overview, Pricing, Gallery and SEO. Upgrades, FAQ, tags, video and requirement questions exist in the old code and database but were never connected to the live wizard (nothing is saved). The gig page and checkout still sell upgrades that exist in the data. Proposal: add **Upgrades** (max 10) and **FAQ** (max 10) as optional blocks, because the gig page and checkout already support them. Leave out tags, video and requirement questions: buyers keep writing free-text order details after payment (BR-036). The register rows S-079 (video) and S-083 (tags) stay unused until you ask for those blocks.
- **P-33 Stable gig URL.** The slug is built from the Georgian title and changes only when the Georgian title changes. Old slugs redirect (301). Legacy rebuilt the slug from the title in the current UI language on every edit, so an edit made in English changed the URL to an English slug.
- **P-34 Gallery editing.** Owners can add, remove and reorder single images. Legacy replaced the whole gallery whenever new images were uploaded.
- **P-35 Plan-limit check on opening and a minimum price.** (a) The wizard checks the gig limit when it opens, so users do not fill it in for nothing (legacy checked only on submit; the server still checks on submit). (b) The price and each upgrade price must be at least 1.00 GEL (legacy accepted 0).
- **P-36 Admin email for gig reports.** Legacy sends admin emails for reported profiles, projects and bids, but not for gigs. Proposal: add `Admin/GigReported` to the S-100 recipients.
- **P-37 Georgian field needs Georgian letters.** The Georgian title and description must contain at least one Georgian letter. Latin words, digits and punctuation are allowed alongside (Q-022). This mirrors the English rule, which needs at least one Latin letter, and stops a whole title being written only in Latin letters in the Georgian field.
