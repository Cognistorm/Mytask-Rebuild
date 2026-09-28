# 07 — Reviews
Status: ready for Owner
Author: product-analyst (P2-A3) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-040, BR-042; `routes-and-pages.md` (`/account/reviews/*`, `/seller/reviews/*`, `/reviews/{id}`); `notifications.md` (`ReviewReceived`, `t_u_have_received_new_rating`); `data-model.md` (`reviews`). Owner decisions: Q-014, Q-046, Q-062. Platform rules: `00-platform-rules.md` R-1.5, §4.18 (review: rating 1–5, message ≤ 800, one per completed item per side). Specs: 02 AC-10 (two rating blocks), 02 P-21 ("Deleted user"), 03 AC-9/AC-13/R-S4 (rating filter and "Best rating" sort), 04 AC-26 (gig page Reviews tab), 06 AC-30/AC-33 (completion), 11 (project completion), 12 (custom offers).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-54…P-56, see "Open questions").

Legacy code traced for this spec (read-only):
- **Create** `app/Livewire/Main/Account/Reviews/Options/CreateComponent.php`: only the buyer, only for an order item that is `delivered` and `is_finished` `:39-55`; an existing review redirects to edit `:59-70`; saves `user_id` (author), `seller_id`, `gig_id`, `order_item_id`, rating, message `:160-176`; recalculates the gig's `rating` and `counter_reviews` from **all** its reviews `:180-198`; `ReviewReceived` + in-app `t_u_have_received_new_rating` to the seller `:202-214`. Validator `app/Http/Validators/Main/Account/Reviews/CreateValidator.php:26-28` (message required ≤ 800, rating in 1–5).
- **Edit** `Account/Reviews/Options/EditComponent.php:126-170`: the author can change rating and message at any time; gig average recalculated.
- **Table** `database/migrations/2022_07_27_182044_create_reviews_table.php:16-30`: `status` enum `active|hidden` (default active); linked to a gig (not to projects or offers).
- **Admin** `app/Livewire/Admin/Reviews/ReviewsComponent.php:65-96`: delete only (recalculates the gig average); no hide action although the column exists.
- **Profile rating** `app/Livewire/Main/Profile/ProfileComponent.php:94-157`: shown only for `account_type = seller`; star breakdown counts `status = active` reviews `:118-123`, but the average `User::rating()` (`app/Models/User.php:233-243`) counts **all** reviews including hidden ones.
- **Public list** `app/Livewire/Main/Reviews/ReviewsComponent.php:135-154` (`/reviews/{gigUid}`): active reviews, 30 per page, filter by star.
- **Seller view** `Main/Seller/Reviews/ReviewsComponent.php`, `Options/DetailsComponent.php:26-31` (read-only; no reply feature).

---

## Goal
Let both sides of every completed job rate each other with 1–5 stars and a short text, so that reputation replaces the removed levels (Q-014): the buyer rates the freelancer, the freelancer rates the buyer, for gig orders and projects (Q-046, Q-062). Show fair averages on gigs and profiles, and let staff hide abusive reviews.

## Roles involved
- **Buyer / client**: reviews the freelancer after a completed gig order, custom offer (P-54) or project.
- **Freelancer**: reviews the buyer/client after the same.
- **Visitors**: read reviews on gig pages, profiles and `/reviews/{gig}`.
- **Staff (Content Moderator)**: hide / unhide reviews (spec 16).
- **System**: recalculates averages.

## User stories
- As a buyer, I want to rate the freelancer after the job, so that other buyers can decide.
- As a freelancer, I want to rate the client, so that other freelancers know who is a good client (Q-062).
- As a visitor, I want to see a freelancer's rating as a freelancer and as a client separately, so that I understand both sides.
- As the Owner, I want staff to hide insulting or fake reviews without deleting evidence.

## Acceptance criteria

### Who can review, and when (Q-046, Q-062)
- AC-1 Given a gig order item that is **completed** (by the buyer, by auto-release, or by an admin decision that paid the freelancer), When its buyer or its freelancer opens it, Then each of them sees "Leave a review" until they have written one. Items that are canceled or refunded, or not yet completed, cannot be reviewed; the API refuses with `t_review_not_allowed`. (LEGACY buyer side `CreateComponent.php:39-55`; CHANGE Q-062 freelancer side; auto-release NEW spec 06 AC-33)
- AC-2 Given a project whose payment was completed (released to the freelancer, spec 11), When the client or the awarded freelancer opens it, Then each of them can review the other once. (NEW Q-046, Q-062)
- AC-3 Given a completed custom offer (spec 12), When the buyer or the freelancer opens it, Then each of them can review the other once. (PROPOSED P-54)
- AC-4 Given a user who is not the buyer/client or the freelancer of that item, When they try to review it (screen or API), Then the answer is 404. Nobody can review themselves (00 R-1.3). (LEGACY ownership check; API NEW)
- AC-5 Given the buyer completes a gig order (spec 06 AC-30), When the completion succeeds, Then the buyer is taken straight to the review form. The freelancer's order page and both dashboards show the item under "To review". (LEGACY redirect `FilesComponent.php:345`; "To review" NEW)

### Writing and editing (00 §4.18)
- AC-6 Given the review form, When the author submits a star rating (whole number 1–5, required) and a text (required, 1–800 characters, plain text), Then the review is published at once with `t_review_submitted`. A missing rating or text, or text over 800, is refused with the field message. (LEGACY `CreateValidator.php:26-28`)
- AC-7 Given the author already reviewed this item, When they open "Leave a review" again, Then the edit form of their review opens instead. The API refuses a second review for the same item and side with `t_review_already_exists`. (LEGACY `CreateComponent.php:59-70`; one per side Q-062)
- AC-8 Given the author edits their review (rating and/or text, same rules as AC-6), When they save, Then the review is updated, shows "edited" with the date, and all affected averages are recalculated (`t_review_updated_succes`). Authors cannot delete their reviews. (LEGACY edit `EditComponent.php:126-170`; "edited" label and rules PROPOSED P-55)

### Notifications
- AC-9 Given a new review is published, When it is saved, Then the person reviewed gets `ReviewReceived` (email) and `t_u_have_received_new_rating` (in-app + push) with a link to the review — the freelancer when a buyer/client wrote it, the buyer/client when a freelancer wrote it. Edits send nothing. (LEGACY to the seller; CHANGE Q-062 both directions)

### Ratings and averages
- AC-10 Given a gig, When its rating is shown (cards, gig page, search filter and "Best rating" sort in spec 03), Then it is the average of the **visible** buyer→freelancer reviews on that gig's order items, with their count. A gig without such reviews has no rating (cards show `t_no_reviews_yet`, spec 03). (LEGACY average; CHANGE: hidden reviews excluded)
- AC-11 Given a user's profile, When the "As a freelancer" block is built (spec 02 AC-10), Then it uses all visible reviews written about this user by buyers/clients, from gig orders, custom offers and projects: average, count, and the number of 5-, 4-, 3-, 2- and 1-star reviews. Reviews on gigs that were later deleted still count. (LEGACY breakdown; CHANGE: projects and offers added Q-046; shown for every user Q-013)
- AC-12 Given a user's profile, When the "As a client" block is built, Then it uses all visible reviews written about this user by freelancers, from the same three sources, with the same figures. (NEW Q-062)
- AC-13 Given a review is created, edited, hidden or unhidden, When the change is saved, Then every affected figure (gig rating, both user blocks) is updated at once, and the same numbers are returned on web and mobile. (CHANGE: legacy averages included hidden reviews, `User.php:233-243`)
- AC-14 Given example data — a freelancer with visible buyer reviews 5, 4 and 4 on one gig and one hidden 1-star review — When the figures are calculated, Then the gig rating is 4.33 (shown as 4.3), the count is 3, the breakdown is 5★ 1, 4★ 2, 3★ 0, 2★ 0, 1★ 0, and the hidden review is not counted anywhere. (display rounding PROPOSED P-56)

### Where reviews are shown
- AC-15 Given a gig page, When the Reviews tab opens (spec 04 AC-26), Then it shows the newest visible buyer→freelancer reviews of that gig (reviewer avatar and username, stars, text, date, "edited" mark) and "See all reviews", which opens `/reviews/{gig}` with 30 per page and a filter by star (5…1). (LEGACY `Main/Reviews/ReviewsComponent.php:135-154`)
- AC-16 Given a profile, When the reviews section opens, Then it has two lists, "From clients" and "From freelancers", newest first, each review showing what it was for (gig title with link, project title with link, or "Custom offer"), stars, text and date. (NEW Q-062; spec 02 AC-10)
- AC-17 Given Buying → My reviews, When it opens, Then it has tabs "To review" (completed items where the user was the buyer/client and has not reviewed), "Written" (their reviews of freelancers, with Edit) and "Received" (reviews freelancers wrote about them). Given Selling → Reviews, Then it has tabs "To review", "Received" (from buyers/clients) and "Written" (their reviews of buyers/clients, with Edit). Each review opens a details page. (LEGACY pages `Account/Reviews`, `Seller/Reviews`; tabs NEW)
- AC-18 Given the reviewer's account was deleted, When a review is shown, Then the name reads "Deleted user" without a profile link, and the review stays visible and counted. Given the reviewed gig was deleted, Then the gig title is shown without a link. (spec 02 P-21)

### Moderation (spec 16)
- AC-19 Given a staff member with the review-moderation permission, When they hide a review with an internal reason, Then it disappears from gig pages, profiles, `/reviews/{gig}` and every average; the reviewed person no longer sees it; the author sees it in "Written" with `t_review_hidden_by_moderator`; and the action is audit-logged. "Unhide" restores it and the averages. (CHANGE: legacy deleted reviews, `Admin/Reviews/ReviewsComponent.php:65-96`; hide replaces delete, PROPOSED P-55)
- AC-20 Given the admin reviews list, When it opens, Then staff can filter by rating, status (visible/hidden), direction (about freelancer / about client) and source (gig, project, offer), and search by user or gig. (LEGACY list; filters NEW)

### Migration
- AC-21 Given legacy reviews (buyer→seller, gig orders), When they are migrated, Then each keeps author, reviewed user, gig, order item, rating, text, dates and status (`hidden` stays hidden), and counts as a buyer→freelancer review. (vision: data preserved)

---

## Business rules
- R-V1 **Eligibility** (Q-046, Q-062): one review per side per completed item. Items: gig order items (spec 06), custom offers (P-54, spec 12), projects (spec 11). "Completed" = the money was released to the freelancer (buyer, auto-release, or admin decision). Canceled/refunded items: no reviews.
- R-V2 **Direction**: `about_freelancer` (author = buyer/client) or `about_client` (author = freelancer). Each review stores the item, the author and the reviewed user.
- R-V3 **Content** (LEGACY BR-042, 00 §4.18): rating integer 1–5; text required, ≤ 800 characters, plain text, sanitised. Published immediately (no pre-moderation, LEGACY).
- R-V4 **Editing** (LEGACY, P-55): the author may edit at any time; "edited" is shown; authors cannot delete; no time limit to write or edit.
- R-V5 **Averages**: arithmetic mean of visible reviews, stored exactly and displayed with one decimal (P-56). Gig rating = `about_freelancer` reviews of that gig's items. User freelancer rating = all visible `about_freelancer` reviews of that user. User client rating = all visible `about_client` reviews of that user. Hidden reviews never count.
- R-V6 **Moderation** (P-55): staff hide/unhide with an internal reason and audit; no deletion by staff or users.
- R-V7 **No levels or badges** (Q-014, X-05): reviews and the two rating blocks are the only reputation.
- R-V8 **Money**: reviews never affect money or timers. No money movements in this spec.

## Money movements
None.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Review form | `/account/reviews/create/{item}` and freelancer equivalent: item summary (what, with whom, amount), 5-star input with labels, text area with counter | full-screen form, large star targets (≥ 44 px) | validation errors; submitting; success toast; already reviewed → edit |
| Edit review | same form prefilled | same | saved toast |
| Gig page Reviews tab + `/reviews/{gig}` | list, star filter chips, pagination | list with filter chips, infinite scroll | empty `t_no_reviews_yet`; loading; success |
| Profile rating blocks + two lists | spec 02 layout | stacked | "No reviews yet" per block |
| My reviews (Buying) / Reviews (Selling) | tabs To review / Written / Received | segmented tabs | empty per tab (`t_nothing_to_review`, `t_no_reviews_written`, `t_no_reviews_received`) |
| Review details | review + item link | same | hidden notice for the author |
| Admin reviews (spec 16) | table with filters, hide/unhide with reason | – | – |

Accessibility: the star input is a radio group with text labels ("4 out of 5"); star displays have text equivalents.

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Seller/ReviewReceived` (`t_subject_seller_new_review`) + `t_u_have_received_new_rating` | email + in-app + push | reviewed user (freelancer or buyer/client) | new review (AC-9) | LEGACY (freelancer); CHANGE Q-062 also to buyers/clients; push NEW (P-11) |

No notification on edit, hide or unhide.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_reviews` / `t_review` | Reviews / Review | შეფასებები / შეფასება |
| `t_my_reviews` | My reviews | შეფასებები |
| `t_rating` | Rating | რეიტინგი |
| `t_submit_new_review` | Submit new review | ახალი შეფასების გაგზავნა |
| `t_edit_review` | Edit review | შეფასების რედაქტირება |
| `t_review_updated_succes` | Your review for this gig has been successfully changed | თქვენი შეფასება ამ განცხადებაზე წარმატებით განახლდა (Owner may generalise "for this gig") |
| `t_review_details` | Review details | შეფასების დეტალები |
| `t_u_have_received_new_rating` | You have received a new rating | თქვენ მიიღეთ ახალი შეფასება |
| `t_subject_seller_new_review` | New review | ახალი შეფასება |
| `t_hidden` | Hidden | დაფარული |
| `t_no_reviews_yet` / `t_based_on_number_reviews` | see 02 | see 02 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_leave_a_review` | Leave a review | შეფასების დატოვება |
| `t_rate_the_freelancer` | How was working with :name? | როგორი იყო :name-თან თანამშრომლობა? |
| `t_rate_the_client` | How was working with this client, :name? | როგორი იყო ამ დამკვეთთან, :name-თან თანამშრომლობა? |
| `t_review_text_hint` | Describe your experience (up to 800 characters). | აღწერეთ თქვენი გამოცდილება (მაქსიმუმ 800 სიმბოლო). |
| `t_star_label` | :n out of 5 | 5-დან :n |
| `t_review_submitted` | Thank you! Your review has been published. | მადლობა! თქვენი შეფასება გამოქვეყნდა. |
| `t_review_already_exists` | You have already reviewed this. You can edit your review. | თქვენ უკვე დატოვეთ შეფასება. შეგიძლიათ მისი რედაქტირება. |
| `t_review_not_allowed` | You can review only completed work you took part in. | შეფასება შეგიძლიათ მხოლოდ დასრულებულ სამუშაოზე, რომელშიც მონაწილეობდით. |
| `t_edited` | edited | რედაქტირებულია |
| `t_as_a_freelancer` | As a freelancer | როგორც ფრილანსერი |
| `t_as_a_client` | As a client | როგორც დამკვეთი |
| `t_reviews_from_clients` | From clients | დამკვეთებისგან |
| `t_reviews_from_freelancers` | From freelancers | ფრილანსერებისგან |
| `t_to_review` | To review | შესაფასებელი |
| `t_written` | Written | დაწერილი |
| `t_received` | Received | მიღებული |
| `t_see_all_reviews` | See all reviews | ყველა შეფასების ნახვა |
| `t_review_for_gig` | For the gig: :title | განცხადებაზე: :title |
| `t_review_for_project` | For the project: :title | პროექტზე: :title |
| `t_review_for_custom_offer` | For a custom offer | ინდივიდუალურ შეთავაზებაზე |
| `t_nothing_to_review` | You have nothing to review right now. | ამ ეტაპზე შესაფასებელი არაფერი გაქვთ. |
| `t_no_reviews_written` | You have not written any reviews yet. | შეფასება ჯერ არ დაგიწერიათ. |
| `t_no_reviews_received` | You have not received any reviews yet. | შეფასება ჯერ არ მიგიღიათ. |
| `t_review_hidden_by_moderator` | This review was hidden by a moderator and is not shown publicly. | ეს შეფასება მოდერატორმა დამალა და საჯაროდ არ ჩანს. |
| `t_deleted_user` | see 02 (P-21) | see 02 (P-21) |

## Edge cases
- EC-1 A freelancer reviews the buyer first, then the buyer reviews: both are independent; neither sees the other's review before writing (no blind period, legacy-like simplicity; P-55).
- EC-2 An admin dispute decision pays the freelancer (spec 13): the item counts as completed, so both may review. A decision that refunds the buyer: no reviews.
- EC-3 A user reviews, then their account is banned: the review stays visible (moderators can hide it).
- EC-4 An item was completed by auto-release while the buyer was inactive: the buyer may still review later (no time limit, P-55).
- EC-5 A gig with 200 reviews: the gig page shows the newest (e.g. 10) and "See all"; averages are computed on the server, never by paging on the client.
- EC-6 A project with no payment completed (e.g. refunded in full): no reviews (R-V1).
- EC-7 Two edits of the same review at the same moment: the last save wins; averages are recalculated after each.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-07-1 | Averages count hidden reviews while the star breakdown does not | `User.php:233-243`, `CreateComponent.php:180-198`, `EditComponent.php:147-161` vs `ProfileComponent.php:118-123` | AC-10…AC-14, R-V5 |
| D-07-2 | Staff can only delete reviews (evidence lost) although a `hidden` status exists | `Admin/Reviews/ReviewsComponent.php:65-96` | AC-19 (hide/unhide, P-55) |
| D-07-3 | Profile rating shown only for `account_type = seller` | `ProfileComponent.php:94` | AC-11, AC-12 (every user, Q-013) |
| D-07-4 | Averages recomputed by read-then-write without locking | `CreateComponent.php:180-198` | AC-13 (server recalculation in the same transaction) |

## Out of scope
- Replies to reviews, "helpful" votes, user reports on reviews: not in legacy.
- Blind reviews (hidden until both sides write) and review deadlines: not in legacy (see P-55 alternative).
- Pre-moderation of reviews.

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-54 Custom offers get reviews too.** You enabled reviews for projects (Q-046) and mutual reviews (Q-062); custom offers were not mentioned. Proposal: a completed custom offer is reviewed like a gig order (both sides, once each), and counts in the "As a freelancer" / "As a client" blocks, but not in any gig rating.
- **P-55 Writing, editing and moderation.** As legacy: no time limit to write, the author can edit at any time (now marked "edited"), authors cannot delete. Staff **hide** reviews (reversible, with an internal reason and audit) instead of deleting them; hidden reviews are removed from every average. Alternative if you prefer stricter rules: a 30-day window to write and edit, or blind reviews that appear only when both sides have written.
- **P-56 Display rounding.** Averages are stored exactly and shown with one decimal (4.33 → 4.3); filters and sorting use the exact value (spec 03 AC-9: "4+" means ≥ 4.0).
