# 10 — Projects (post, moderate, project page)
Status: **ready for Owner**
Author: product-analyst (P2-A4) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-015, BR-050…BR-054; `routes-and-pages.md` (`/post/project`, `/project/{pid}/{slug}`, `/account/projects`, `/account/projects/edit/{id}`, `/explore/projects/*`); `notifications.md` (`NewProjectInCategory`, `ProjectReported`, `YourProjectApproved`, `YourProjectRejected`); `risks-and-debt.md` R-031. Owner decisions: Q-013, Q-021, Q-022, Q-023, Q-024, Q-026, Q-028, Q-035, Q-068, Q-069. Platform rules: `00-platform-rules.md` §2 (plan table, R-2.2, R-2.3), §4.12 (S-075, S-076), §4.11 (S-072), §4.1 (S-003, S-004), §4.2 (S-016), §4.13 (S-078), §5 (R-5.2…R-5.9), X-02, X-03, X-13, X-14; P-9. Specs: 02 AC-41 (username masking), 03 AC-31…AC-34 and R-S8 (project categories, skills, explore lists), 04 AC-37 (report pattern), 08 (chat), 11 (proposals, award, payment, delivery), 16 (moderation queue), 17 (SEO), `url-map.md` (P2-B3).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-73…P-79, see "Open questions").

Legacy code traced for this spec (read-only):
- **Post form** `app/Livewire/Main/Post/ProjectComponent.php` (CR line endings) + view `resources/views/livewire/main/post/project.blade.php`: fields ka/en title, ka/en description, category, thumbnail, min/max price, optional promotion plans; **budget type is hidden and defaults to `fixed`**; the component has `addSkill` with the `max_skills` limit, but the **view has no skills field and the skills are never saved** (the save code is commented out); min price must be **strictly lower** than max price; `pid = mt_rand(100000, 999999)` with no uniqueness retry; slug from the first language's title (≤ 160); status `pending_payment` when a promotion is chosen, else `active` if `auto_approve_projects`, else `pending_approval`; `ProjectNotificationService::notifyFreelancersAboutNewProject()` is called right after saving, **even for pending projects**.
- **Validator** `app/Http/Validators/Main/Post/ProjectValidator.php:32-55`: ka title required 3–100, Georgian letters + digits + `-_.,!?()` only; en title optional 3–100, Latin only; ka description required ≥ 10 (no maximum), Georgian only; en description optional ≥ 10, Latin only; thumbnail required image jpg/jpeg/png ≤ `max_image_size` MB; category must exist in `projects_categories`; `salary_type` fixed|hourly; prices `^([1-9][0-9]*|0)(\.[0-9]{1,2})?$` (0 allowed).
- **Notify category freelancers** `app/Services/Project/ProjectNotificationService.php:13-44`: gig category with the **same slug** as the project category; owners of active gigs in it, except the poster, with user status `active` only (verified users skipped); email `NewProjectInCategory` in the **poster's** locale.
- **Project page** `app/Livewire/Main/Project/ProjectComponent.php`: feature off → redirect home `:77-81`; English locale without English text → **404** `:97-102` (BR-054); non-owners get 404 for `pending_approval|pending_payment|hidden|rejected` `:124-130`; visit tracking job `:140-148`; average bid over **all non-hidden bids** (pending and rejected included) `:328-353`; masked client username `:362-387` (BR-015); report `:1106-1255` (logged in, not own, reason `reason_1…6` + description ≤ 1,500 `Validators/Main/Project/ReportValidator.php:26-28`, one **unseen** report per user, `Admin/ProjectReported` to the first admin); view `project.blade.php`: summary (budget, budget type, bids count, average bid for Premium/owner only, status, posted date), client info (avatar, masked username, "Chat now" Premium-only, label hard-coded "კონტაქტი"), "Beware of scams" box, share, report, proposals section (spec 11); clicks/impressions are commented out.
- **Client list** `app/Livewire/Main/Account/Projects/ProjectsComponent.php`: **hard delete** of a project in `pending_approval|pending_payment|active|rejected|hidden` together with all its bids, reports, visits and milestones `:149-257` — even when a bid is awarded and waiting for acceptance.
- **Edit** `app/Livewire/Main/Account/Projects/Options/EditComponent.php`: allowed in `pending_approval|pending_payment|active|rejected` `:80-84` (also while an award waits for acceptance); skills code commented out `:92-106, :560`; status recomputed (auto-approve → active, else back to pending approval) `:572, :598`; **slug regenerated**, so the URL changes `:566-580`.
- **Admin moderation** `app/Livewire/Admin/Projects/ProjectsComponent.php`: approve → `active` + `YourProjectApproved` `:77-94`; reject with `rejection_reason` → `rejected` + `YourProjectRejected` `:138-165`. No admin email when a project waits for approval.
- Status enum `app/Enums/ProjectStatus.php:5-35`: active, pending_final_review, completed, pending_payment, rejected, pending_approval, under_development, closed, incomplete, hidden. Explore lists: spec 03 AC-32/AC-33.

---

## Goal
Let any user post a fixed-budget project in Georgian (with Latin words allowed) and optionally English, have it go live after moderation (auto-approved at launch), notify freelancers in the matching category, and show a clear project page where Premium freelancers can send proposals (spec 11). This is vision priority 2 ("Post a project & browse projects").

## Roles involved
- **Client** (any user, dual role Q-013): posts, edits, closes, deletes own projects; sees own proposals (spec 11).
- **Visitor / guest / freelancer**: reads project pages; reports; Premium freelancers see proposals and full client username (BR-015, BR-057) and send proposals (spec 11).
- **Staff (Content Moderator)**: approves, rejects, hides projects; handles reports (spec 16).
- **System**: category notifications, visit counting.

## User stories
- As a client, I want to post what I need with a budget range, so that freelancers can send me proposals.
- As a client, I want my project to go live immediately (when auto-approve is ON), so that I get proposals fast.
- As a client, I want to edit, close or delete my project, so that I stay in control.
- As a freelancer, I want an email when a project is posted in my category, so that I can react quickly.
- As a visitor, I want to read a project in English even when only Georgian text exists, instead of an error page (Q-023).
- As a user, I want to report a fake or abusive project.

## Acceptance criteria

### Feature toggle and entry points
- AC-1 Given S-075 `projects.enabled` is ON, When a logged-in user opens "Post a project" (header button, Buying dashboard; mobile "+" → Project), Then the post form opens at `/post/project` (final path in `url-map.md`). Guests are sent to login and come back. Given S-075 is OFF, Then the entry points are hidden and every project URL and endpoint shows the "feature disabled" state (00 AC-11; 03 AC-34). (LEGACY toggle; CHANGE: legacy redirected home)

### Posting (BR-051; Q-022, Q-035; P-73)
- AC-2 Given the post form, When it opens, Then it shows: Georgian title (required), Georgian description (required), English title and English description (optional, with the notice `t_english_fields_optional_notice_v2` of spec 04 AC-7), category (required, project categories of spec 03), skills (optional, up to S-076 from the chosen category), thumbnail image (required), budget min and max in GEL (required). There is no budget-type choice and no promotion block. (LEGACY fields; CHANGE X-02 hourly removed, X-03 promotions removed; skills restored PROPOSED P-73)
- AC-3 Given the Georgian title, When it is saved, Then 3–100 characters are accepted, and Georgian letters, Latin letters, digits, spaces and normal punctuation are all allowed (e.g. "Logo დიზაინი Photoshop-ში"). Given the English title, Then 3–100 characters without Georgian letters. (CHANGE Q-022, R-5.3, X-13; English rule LEGACY R-5.4)
- AC-4 Given the Georgian description, When it is saved, Then 10–10,000 characters are accepted (Georgian and Latin allowed); the English description is optional, 10–10,000 characters, no Georgian letters. Line breaks are kept; HTML is not accepted. (LEGACY minimum; maximum PROPOSED P-73)
- AC-5 Given the budget, When min and max are saved, Then each is a number with up to 2 decimals, min ≥ 1.00 GEL, and min < max; otherwise `t_validator_regex`, `t_budget_min_too_low` or `t_max_project_price_must_be_greater`. The project is always fixed-price (Q-035). (LEGACY strict min < max; minimum 1.00 PROPOSED P-73)
- AC-6 Given skills, When the user adds one, Then only skills of the selected category can be chosen, each at most once, up to S-076 (default 5); the next one is refused with `t_max_allowed_skills_reached`. Changing the category clears the chosen skills. (LEGACY limit and message `Post/ProjectComponent.php` `addSkill`; P-31 skills per category; saved PROPOSED P-73)
- AC-7 Given the thumbnail, When it is uploaded, Then only jpg, jpeg or png up to S-078 MB (default 5) is accepted, shown as a preview with "Remove"; on mobile it can come from the camera or the photo library. (LEGACY validator; camera NEW mobile)
- AC-8 Given a valid form, When the user presses "Post project", Then the project is created with a unique 6-digit project number (pid) and a slug from the Georgian title, the status is **active** if S-072 is ON (launch value) or **pending approval** if OFF, and the user lands on Buying → Projects with `t_ur_project_created_success` or `t_ur_project_created_and_pending_approval`. (LEGACY BR-052; unique pid CHANGE P-79)
- AC-9 Given the user's open projects (pending approval, or active and not yet awarded — P-9) reach S-003 (Standard) or S-004 (Premium), When they try to post another one (screen or API), Then it is refused with `t_plan_project_limit_reached` and an "Upgrade to Premium" button for Standard users. Defaults are unlimited, so nothing is refused at launch. (NEW Q-021, P-9; R-2.3 lowering never hides existing projects)
- AC-10 Given S-016 `fees.project.posting_fee` is OFF (launch), When a project is posted, Then no payment is asked. (Q-006; switching it ON needs a payment flow that is out of scope, see "Out of scope")

### Moderation (BR-052; S-072)
- AC-11 Given S-072 is OFF, When a project is posted or edited, Then it becomes **pending approval**, only the owner and staff can open its page (owner sees `t_project_pending_approval_notice`), and the admin email `Admin/PendingProject` goes to every S-100 address. (LEGACY status; admin email NEW PROPOSED P-77)
- AC-12 Given staff approve a pending project, When they press Approve, Then it becomes **active**, appears in explore lists (03 AC-32), the owner gets `YourProjectApproved` (email) and `t_ur_project_title_has_been_approved` (in-app + push), and the category notification of AC-19 is sent. (LEGACY `Admin/Projects/ProjectsComponent.php:77-94`; in-app NEW P-77)
- AC-13 Given staff reject a pending project with a reason (required), When they save, Then it becomes **rejected**, the owner gets `YourProjectRejected` (email, with the reason) and `t_ur_project_needs_changes` (in-app + push), and the owner can edit it, which sends it back to pending approval. (LEGACY `:138-165`)
- AC-14 Given staff hide a project (moderation, e.g. after reports) with an internal reason, When it is hidden, Then non-owners get 404, it leaves explore lists, open proposals can no longer be awarded, the owner sees `t_project_hidden_by_staff`, and staff can unhide it. A project with a paid, unfinished payment cannot be hidden until that payment is completed or refunded (spec 11/13). (LEGACY status `hidden`; rules PROPOSED P-75)

### Project page (BR-054, BR-015; Q-023; P-78)
- AC-15 Given `/project/{pid}/{slug}` (Georgian) or `/en/project/{pid}/{slug}`, When the project is active, closed, hired, completed or refunded, Then anyone can open it; when it is pending approval, rejected, hidden or deleted, Then only the owner and staff can (others: 404). A known pid with an old slug redirects (301) to the current slug. (LEGACY visibility; CHANGE Q-024 `/en/`; slug redirect PROPOSED P-79)
- AC-16 Given the English URL and a project without English text, When it opens, Then the Georgian title and description are shown with `t_content_shown_in_georgian` (HTTP 200). (CHANGE Q-023, X-14; legacy 404 `ProjectComponent.php:97-102`)
- AC-17 Given the project page, When it loads, Then it shows (web: main column + right summary box; mobile: stacked sections, sticky action bar):
  - breadcrumb (Home → Projects → category), title, posted date, status chip;
  - description, skills chips (each links to `/explore/projects/{category}/{skill}`, 03 AC-33), thumbnail;
  - summary: budget "min – max GEL" with `t_fixed_price`, number of active proposals, average of active proposals (only to the owner, Premium users and staff; others see `t_need_subscription`), project number;
  - client info: avatar, username (masked per 02 AC-41 for guests and for users who are neither Premium, nor the owner, nor staff), "Chat now" (spec 08 AC-2, open to every logged-in user);
  - "Beware of scams" box (`t_beware_of_scams`, `t_beware_of_scams_details`);
  - actions: "Bid on this project" (spec 11), Share (copy link, Facebook, X, LinkedIn), Report (AC-22);
  - proposals section (spec 11).
  (LEGACY layout; CHANGE: average counts active proposals only, legacy counted pending and rejected, `:328-353`; "Chat now" not Premium-gated, Q-069b)
- AC-18 Given a project that is not active (closed, hired, completed, refunded) or active with an award waiting for acceptance, When a freelancer opens it, Then "Bid on this project" is replaced by `t_this_project_is_closed_for_bidding` with a link `t_find_another_project` to `/explore/projects`. (LEGACY)

### Category notification (BR-053; P-76)
- AC-19 Given a project becomes **active** for the first time (posted with S-072 ON, or approved by staff), When this happens, Then `NewProjectInCategory` (`t_new_project_in_your_category`) is emailed once to every user who has at least one active gig in the top-level gig category linked to the project's category (03 R-S8), whose account is active or verified and not restricted or banned, except the project owner — each in their own language, sent in the background in batches. (LEGACY BR-053; CHANGE: legacy also emailed for pending projects, skipped verified users and used the poster's language; PROPOSED P-76)
- AC-20 Given the same project is edited, closed or re-approved later, When that happens, Then no second category email is sent. (PROPOSED P-76)

### Visits
- AC-21 Given someone opens a project page, When the visit is counted (at most once per browser per 15 minutes), Then the project's visit counter increases; the owner sees "Views" on their project in Buying → Projects. Bots are not counted. (LEGACY `Track` job `:140-148`; display NEW for the owner; no third-party IP lookup, Q-055)

### Reporting (LEGACY)
- AC-22 Given a logged-in user who does not own the project, When they report it with a reason (one of `t_report_project_reason_1…6`) and a description (required, ≤ 1,500), Then the report is saved (`t_we_have_received_bid_report_success`) and `Admin/ProjectReported` goes to every S-100 address. A second report by the same user while the first is not yet reviewed by staff is refused with `t_u_already_reported_this_project`. Guests see `t_pls_login_or_register_report_project`; owners see `t_u_cannot_report_ur_own_projects`. (LEGACY `:1106-1255`; CHANGE recipients Q-026)

### Owner actions: list, edit, close, delete (P-74, P-75)
- AC-23 Given Buying → Projects (`/account/projects`; mobile Buying → Projects), When it opens, Then it lists the user's projects newest first with title, status chip, budget, number of proposals, views, posted date and the next action (Edit, Close, Delete, View proposals, Pay — spec 11 —, Leave a review — spec 07). Filters: all, pending approval, active, hired/in progress, completed, closed/refunded, rejected. Empty: `t_no_projects_yet` with "Post a project". (LEGACY list; filters NEW)
- AC-24 Given a project that is pending approval, rejected, or active **with no award** (none waiting, none accepted), When the owner edits it, Then every posting field can be changed with the same validation (AC-2…AC-7); after saving, it returns to pending approval if S-072 is OFF (`t_ur_project_updated_and_pending_approval`) or stays active if ON. The pid never changes; if the Georgian title changed, the slug changes and the old URL redirects (301). Proposals already sent keep their amounts even if the new budget no longer contains them. (LEGACY edit + re-moderation; CHANGE: not while awarded, stable URL; PROPOSED P-74)
- AC-25 Given an active project with no accepted award, When the owner presses "Close project" and confirms (`t_close_project_confirm`), Then it becomes **closed**: no new proposals, a pending award is revoked (spec 11), the page stays public with `t_this_project_is_closed_for_bidding`, and it leaves "Latest projects" lists. A closed project cannot be reopened; the owner can post a new one. (NEW action on the LEGACY `closed` status; PROPOSED P-75)
- AC-26 Given a project that has no proposals (other than withdrawn ones) and no payment, When the owner presses "Delete project" and confirms, Then it is removed from every list and its page returns 404 for everyone except staff (kept for audit). A project with proposals cannot be deleted — only closed (AC-25). (CHANGE: legacy hard-deleted projects with all bids even while awarded; PROPOSED P-75)
- AC-27 Given a project that is hired, completed or refunded, When the owner looks for Edit, Close or Delete, Then none is offered and the API refuses them. (CHANGE: legacy allowed deletion in more states)

### Languages and SEO
- AC-28 Given a project page, When it is rendered, Then it has canonical and hreflang links as in `url-map.md`, title "project title | site title", the description as meta description, and the thumbnail (or the default OG image) as OG image. Pending, rejected, hidden and deleted projects are `noindex`. (LEGACY SEO tags `:171-217`; `/en/` NEW Q-024)

### Migration
- AC-29 Given legacy projects, When they are migrated, Then each keeps pid, slug, translations, category, thumbnail, budget, owner, dates, visits and status, mapped as in R-P3 (hourly projects keep their numbers as fixed budgets, X-02; promotion flags are dropped, X-03). Legacy project skills rows, if any, are kept when the skill belongs to the project's category (P-31). (vision "data preserved"; Q-050)

---

## Business rules
- R-P1 **Budget** (Q-035): fixed only; min ≥ 1.00, min < max, up to 2 decimals, GEL, stored in tetri. No budget type field (the data model keeps a type column with the single value `fixed` so hourly can return, Q-035).
- R-P2 **Content** (Q-022, Q-023, R-5.2…R-5.5): Georgian title/description required (Latin allowed), English optional (no Georgian letters), Georgian fallback on English pages.
- R-P3 **Statuses** (listing level; the work contract statuses are in spec 11):
  | Status | Meaning | Public page | In explore lists | Legacy value(s) |
  |---|---|---|---|---|
  | `pending_approval` | waiting for staff (S-072 OFF) | owner + staff | no | pending_approval |
  | `rejected` | staff asked for changes | owner + staff | no | rejected |
  | `active` | open for proposals (may have an award waiting for acceptance) | yes | yes | active |
  | `hired` | the freelancer accepted; work contract open (spec 11) | yes | no (03 lists active + completed) | under_development, pending_final_review |
  | `completed` | contract completed (money released) | yes | yes | completed (when a payment was paid) |
  | `refunded` | contract refunded to the client (spec 13) | yes | no | completed with refunded milestones |
  | `closed` | owner closed it before hiring | yes | no | closed, incomplete |
  | `hidden` | staff moderation | owner + staff | no | hidden |
  | `deleted` | owner deleted it (no proposals) | staff only | no | – |
  Legacy `pending_payment` (promotion unpaid) becomes `active` if it was otherwise approved, else `pending_approval` (X-03). Mapping detail for hired projects: spec 11 R-H10.
- R-P4 **Plan limit** (Q-021, P-9): counted = pending approval + active without accepted award; S-003/S-004 (unlimited by default).
- R-P5 **Who may act**: owner — edit (AC-24), close (AC-25), delete (AC-26), award/pay/complete (spec 11); staff — approve, reject, hide/unhide (spec 16); anyone logged in except the owner — report.
- R-P6 **Visibility of client identity** (BR-015): masked username and no profile link unless the viewer is the owner, Premium, or staff (02 AC-41). The API never returns the full username or user id to other viewers.
- R-P7 **Category notification** (BR-053, P-76): once per project, at first activation, to eligible freelancers of the linked gig category (03 R-S8), in their language.
- R-P8 **pid and URL** (R-5.9, P-79): pid = unique random 6-digit number (retry on collision); URL `/project/{pid}/{slug}`; the pid identifies the project, the slug is cosmetic and redirects when outdated.

## Money movements
None in this spec. (A project posting fee, S-016, is OFF; project payments are in spec 11.)

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Post / edit project | `/post/project`, `/account/projects/edit/{uid}`: one page with sections (Details, Category & skills, Thumbnail, Budget), language notice, "Post project" | step screens (Details → Category & skills → Thumbnail → Budget → Review), camera/library for the thumbnail | validation errors per field; uploading (progress); plan limit reached (upgrade sheet); submitting; success (toast + redirect) |
| Project page | as AC-17 | stacked; sticky bar with "Bid on this project" / status | loading skeleton; closed for bidding; pending/rejected/hidden notice for the owner; English fallback note; 404 |
| Report dialog | modal | bottom sheet | success; already reported; login required |
| Buying → Projects | list with filters and actions | list with filter chips | empty `t_no_projects_yet`; loading; error |
| Admin moderation (spec 16) | queue: approve, reject with reason, hide/unhide | – | – |

Key screen for design P2-C4: project page + proposal form (with spec 11).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Freelancer/NewProjectInCategory` (`t_new_project_in_your_category`) | email | eligible freelancers of the linked category | project first becomes active (AC-19) | LEGACY; CHANGE timing, recipients, language (P-76) |
| `Admin/PendingProject` (`t_subject_admin_pending_project`) | email | all S-100 | project posted or edited while S-072 OFF (AC-11) | **NEW, PROPOSED P-77** |
| `User/Employer/YourProjectApproved` (`t_subject_employer_project_approved`) + `t_ur_project_title_has_been_approved` | email + in-app + push | owner | staff approve (AC-12) | LEGACY email; in-app NEW P-77 |
| `User/Employer/YourProjectRejected` (`t_subject_employer_project_needs_changes`) + `t_ur_project_needs_changes` | email + in-app + push | owner | staff reject (AC-13) | LEGACY email; in-app NEW P-77 |
| `Admin/ProjectReported` (`t_subject_admin_project_reported`) | email | all S-100 | report (AC-22) | LEGACY; CHANGE recipients Q-026 |

Proposal, award, payment and delivery notifications are in spec 11.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_post_project` / `t_post_new_project` | Post project / Post new project | პროექტის დაპოსტვა / დაპოსტე ახალი პროექტი |
| `t_post_new_project_subtitle` | Get started by creating a new project. | დაიწყე ახალი განცხადების შექმნით (Owner may refine: "დაიწყეთ ახალი პროექტის შექმნით") |
| `t_project_title` / `t_project_description` | Project title / Project description | პროექტის სათაური / პროექტის აღწერა |
| `t_post_project_description_hint` | Type a brief description about your project, your business, and include an overview of what you need done. | დაწერეთ მოკლე აღწერა თქვენი პროექტის და ბიზნესის შესახებ და ასევე იმის შესახებ თუ რა გჭირდებათ. |
| `t_language_notice` | Language Notice | ენობრივი შეტყობინება |
| `t_english_fields_optional_notice_v2` (defined in spec 04; replaces the legacy notice, which said the listing would not appear in English, Q-023) | see 04 | see 04 |
| `t_thumbnail` | Thumbnail | მთავარი სურათი |
| `t_budget` / `t_min_price` / `t_max_price` | Budget / Min price / Max price | ბიუჯეტი / მინიმალური ღირებულება / მაქსიმალური ღირებულება |
| `t_fixed_price` | Fixed price | ფიქსირებული ფასი |
| `t_max_project_price_must_be_greater` | Max price must be greater than min price | მაქსიმალური ფასი უნდა იყოს მინიმალურ ფასზე მეტი |
| `t_max_allowed_skills_reached` | Maximum allowed skills reached | თქვენ მიაღწიეთ უნარების დაშვებულ მაქსიმალურ რაოდენობას |
| `t_ur_project_created_success` | Your project has been successfully published | პროექტი წარმატებით გამოქვეყნდა |
| `t_ur_project_created_and_pending_approval` | Your project is pending approval now. | პროექტი დადასტურების მოლოდინშია |
| `t_ur_project_updated_and_pending_approval` | Your project has been successfully updated and pending approval now. | (missing in legacy ka; NEW ka) პროექტი წარმატებით განახლდა და დადასტურების მოლოდინშია. |
| `t_ur_project_updated_successfully` | Your project has been successfully updated | პროექტი წარმატებით განახლდა |
| `t_project_details` / `t_project_summary` | Project details / Project summary | პროექტის დეტალები / პროექტის შეჯამება |
| `t_client_info` | Client info | დამკვეთი |
| `t_bids` / `t_avg_bid` / `t_need_subscription` | Bids / Avg bid / Need Subscription To View | წინადადებები / საშუალო წინადადება / სანახავად გჭირდებათ გამოწერა |
| `t_posted_date` / `t_status` | Posted date / Status | გამოქვეყნების თარიღი / სტატუსი |
| `t_active` / `t_pending_approval` / `t_rejected` / `t_hidden` / `t_closed` / `t_completed` | Active / Pending approval / Rejected / Hidden / Closed / Completed | აქტიურია / ელოდება დადასტურებას / უარყოფილია / დაფარული / დახურული / დასრულებული |
| `t_beware_of_scams` / `t_beware_of_scams_details` | Beware of scams / If you are being asked to pay a security deposit, or if you are being asked to chat on Telegram, WhatsApp, or another messaging platform, it is likely a scam. Report these projects or contact Support for assistance. | უფრთხილდით თაღლითებს / (legacy ka text kept unchanged; it contains the typos "პლათფორმის", "დაკავშრებას" for the Owner to fix) |
| `t_share_project` / `t_report_project` | Share project / Report project | პროექტის გაზიარება / პროექტის გასაჩივრება |
| `t_report_project_reason_1` … `_6` | Contains contact information / Advertising another website / Fake project posted / Obscenities or harassing behaviour / Non-full time project posted requiring abnormal bidding / Other | შეიცავს საკონტაქტო ინფორმაციას / სხვა ვებსაიტის რეკლამირება / გამოქვეყნებულია ყალბი პროექტი / უხამსობა ან შეურაცხმყოფელი ქცევა / არასრულ განაკვეთზე გამოქვეყნებული პროექტი, რომელსაც აქვს არანორმალური შეთავაზებები / სხვა |
| `t_enter_issue_description` | Enter issue description | აღწერა |
| `t_pls_login_or_register_report_project` / `t_u_cannot_report_ur_own_projects` / `t_u_already_reported_this_project` | Please login or register to report this project / You cannot report your own projects / You already reported this project | საჩივრის გამოსაგზავნად გთხოვთ გაიარეთ ავტორიზაცია ან დარეგისტრირდით / თქვენ ვერ გაასაჩივრებთ საკუთარ პროექტს / თქვენ უკვე გაასაჩივრეთ ეს პროექტი |
| `t_tnx_for_the_feedback` / `t_we_have_received_bid_report_success` | Thanks for the feedback / We have received your report and will investigate and take action on it shortly. | მადლობა გამოხმაურებისთვის / ჩვენ მივიღეთ თქვენი საჩივარი. მალე გამოვიძიებთ და მივიღებთ ზომებს. |
| `t_this_project_is_closed_for_bidding` / `t_find_another_project` | This project is closed for bidding / Find another project | ეს პროექტი დახურულია ტენდერისთვის / იპოვე სხვა პროექტები |
| `t_my_projects` / `t_edit_project` / `t_delete_project` | My projects / Edit project / Delete project | ჩემი პროექტები / პროექტის რედაქტირება / პროექტის წაშლა |
| `t_new_project_in_your_category` | New project in your category | ახალი პროექტი თქვენს კატეგორიაში |
| `t_subject_employer_project_approved` / `t_subject_employer_project_needs_changes` | Project has been approved / Project needs changes | პროექტი დამტკიცდა / პროექტს სჭირდება რედაქტირება |
| `t_subject_admin_project_reported` | Someone has reported a project | ვიღაცამ გაასაჩივრა პროექტი |
| `t_plan_project_limit_reached` / `t_content_shown_in_georgian` / `t_feature_disabled` | see 00 | see 00 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_project_skills` / `t_project_skills_hint` | Skills / Choose up to :max skills from the selected category (optional). | უნარები / აირჩიეთ მაქსიმუმ :max უნარი არჩეული კატეგორიიდან (არასავალდებულო). |
| `t_budget_min_too_low` | The minimum budget is 1.00 GEL. | მინიმალური ბიუჯეტია 1.00 ლარი. |
| `t_project_description_too_long` | The description can be up to 10,000 characters. | აღწერა შეიძლება იყოს მაქსიმუმ 10 000 სიმბოლო. |
| `t_project_pending_approval_notice` | Your project is waiting for review. Only you can see this page for now. | თქვენი პროექტი განხილვის მოლოდინშია. ამ ეტაპზე ამ გვერდს მხოლოდ თქვენ ხედავთ. |
| `t_project_hidden_by_staff` | This project was hidden by MyTask. Please contact support for details. | ეს პროექტი დამალა MyTask-მა. დეტალებისთვის დაუკავშირდით მხარდაჭერის სამსახურს. |
| `t_ur_project_title_has_been_approved` | Your project ":title" has been approved and is now live. | თქვენი პროექტი ":title" დამტკიცდა და გამოქვეყნდა. |
| `t_ur_project_needs_changes` | Your project ":title" needs changes: :reason | თქვენს პროექტს ":title" სჭირდება ცვლილებები: :reason |
| `t_subject_admin_pending_project` | New project waiting for approval | ახალი პროექტი ელოდება დადასტურებას |
| `t_close_project` / `t_close_project_confirm` | Close project / No new proposals will be accepted and any pending award will be withdrawn. Closed projects cannot be reopened. | პროექტის დახურვა / ახალი შეთავაზებები აღარ მიიღება და მოლოდინში მყოფი დამტკიცება გაუქმდება. დახურული პროექტის ხელახლა გახსნა შეუძლებელია. |
| `t_project_closed_success` | Your project has been closed. | თქვენი პროექტი დაიხურა. |
| `t_delete_project_confirm` | This project will be deleted. This cannot be undone. | ეს პროექტი წაიშლება. ამ მოქმედების გაუქმება შეუძლებელია. |
| `t_project_cannot_be_deleted_has_proposals` | This project already has proposals, so it can only be closed. | ამ პროექტზე უკვე არის შეთავაზებები, ამიტომ მისი მხოლოდ დახურვაა შესაძლებელი. |
| `t_status_hired` / `t_status_refunded_project` | In progress / Refunded | მიმდინარე / თანხა დაბრუნებულია |
| `t_views` | Views | ნახვები |
| `t_no_projects_yet` | You have not posted any projects yet. | პროექტი ჯერ არ გამოგიქვეყნებიათ. |
| `t_contact_label` | see 08 | see 08 |

## Edge cases
- EC-1 Two posts get the same random pid: the second one retries with a new number (R-P8).
- EC-2 Staff change a project category's linked gig category (03 R-S8) after posting: already sent notifications stay; later projects use the new link.
- EC-3 A skill is deleted by staff: it disappears from projects that used it; the rest of the project stays.
- EC-4 S-072 is switched from OFF to ON: already pending projects stay pending until staff act (00 EC-2 principle).
- EC-5 S-075 is switched OFF: new posts and proposals are blocked; hired projects continue to payment, delivery, refund and completion through their direct links (00 EC-1).
- EC-6 The owner's account is restricted: the projects stay as they are; active ones cannot be awarded while restricted (01 AC-19); visitors still see them. Staff may hide them.
- EC-7 A project gets a proposal while the owner is editing: the edit still saves; the proposal keeps its amount (AC-24).
- EC-8 The owner tries to close a project whose award was just accepted: refused with `t_order_status_changed` (compare-and-set); the project is hired.
- EC-9 The English slug is missing: the English URL uses the Georgian-derived slug (00 EC-8).
- EC-10 A reported project is deleted by the owner before review: the report stays visible to staff with the deleted project.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-10-1 | Category freelancers emailed for projects that were never approved | `Post/ProjectComponent.php` (save → `notifyFreelancersAboutNewProject`) | AC-19 (P-76) |
| D-10-2 | Category email in the poster's language; verified users skipped; restricted users included | `ProjectNotificationService.php:37-41` | AC-19 |
| D-10-3 | Skills chosen in the component but never saved; no skills field in the form | `Post/ProjectComponent.php` (commented save), `post/project.blade.php` | AC-2, AC-6 (P-73) |
| D-10-4 | Random pid without uniqueness retry | `Post/ProjectComponent.php` (`mt_rand(100000, 999999)`) | AC-8, R-P8 |
| D-10-5 | Editing regenerates the slug, breaking shared links | `EditComponent.php:566-580` | AC-24, AC-15 (301) |
| D-10-6 | Owner can edit budget while an award waits for acceptance | `EditComponent.php:80-84` | AC-24 |
| D-10-7 | Owner hard-deletes a project with all proposals, even an awarded one | `Account/Projects/ProjectsComponent.php:149-257` | AC-25, AC-26 |
| D-10-8 | Average bid includes pending and rejected bids | `ProjectComponent.php:328-353` | AC-17 |
| D-10-9 | English page without English text returns 404 (X-14) | `ProjectComponent.php:97-102` | AC-16 |
| D-10-10 | Budget of 0 accepted | `ProjectValidator.php:52-54` | AC-5 |
| D-10-11 | No admin email when a project waits for approval | `Post/ProjectComponent.php` | AC-11 (P-77) |
| D-10-12 | Hourly type and promotion plans (X-02, X-03) | validator `salary_type`; `ProjectPlan`, `ProjectSubscription` | AC-2 (removed) |

## Out of scope
- Proposals, award, payment, delivery, completion (spec 11); refunds and disputes (spec 13); reviews (spec 07).
- Explore lists and search (spec 03); admin screens (spec 16); sitemap (spec 17).
- A paid posting fee (S-016): if the Owner switches it ON later, posting needs a payment step that a future spec must define; until then the admin panel should not allow S-016 to be switched ON (flag for spec 16).
- Project attachments (files other than the thumbnail): not in the live form.
- Project expiry dates: the legacy `expiry_date` column is unused.

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-73 Posting form.** Keep the legacy fields, plus: (a) **skills** as an optional field, up to S-076 (5) from the chosen project category (the legacy component had the limit but the form never showed or saved skills; spec 03 already filters projects by skill); (b) description maximum 10,000 characters (legacy had none); (c) **minimum budget 1.00 GEL** (legacy allowed 0, and a 0 GEL project cannot be paid).
- **P-74 Editing.** Allowed while pending approval, rejected, or active **without an award** (legacy also allowed it while an award was waiting). After editing, the project goes back to review only if auto-approve is OFF (legacy). The project number (pid) never changes; if the title changes, the old URL redirects to the new one (legacy changed the URL). Proposals already sent keep their amounts.
- **P-75 Close, delete, hide.** (a) NEW "Close project" for active projects without an accepted award: no new proposals, a pending award is withdrawn, the page stays visible as "closed for bidding". (b) "Delete" only for projects without proposals (legacy deleted projects together with all proposals, even an awarded one); deleted projects stay in the admin panel for audit. (c) Staff "hide" as moderation, not allowed while a payment is open.
- **P-76 Category email.** Sent once, when the project first goes live (after approval if needed), to users with an active gig in the linked gig category whose account is active or verified and not restricted, each in their own language. Legacy sent it at posting (also for projects never approved), skipped verified users and used the poster's language.
- **P-77 Moderation messages.** NEW admin email `Admin/PendingProject` when a project waits for approval (as for gigs; only while auto-approve is OFF). NEW in-app/push messages to the owner on approval and rejection, next to the legacy emails.
- **P-78 Project page details.** The average proposal counts only active proposals (legacy counted pending and rejected ones) and stays visible only to the owner, Premium users and staff (legacy). The owner sees a view counter (legacy counted visits but did not show them).
- **P-79 Unique project number and stable URL.** pid stays a random 6-digit number, now guaranteed unique; old slugs redirect (301) to the current one.
