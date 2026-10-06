# 03 — Categories and search
Status: **approved** (Owner 2026-09-28; P-14…P-37 accepted)
Author: product-analyst (P2-A2) | Date: 2026-09-28
Updated 2026-10-06 with ADR-023 (category colours, spec 3X R-1, Owner Q-169…Q-171): NEW AC-38, AC-39.
Legacy reference: `docs/01-discovery/features.md` §L, BR-015, BR-023, BR-053; `routes-and-pages.md` (`/search`, `/categories/*`, `/hire/{keyword}`, `/sellers`, `/explore/projects/*`); `i18n.md`; `docs/05-design/audit.md` §3.1–3.3, §3.5. Owner decisions: Q-013, Q-014, Q-022, Q-023, Q-024, Q-069. Platform rules: `00-platform-rules.md` (§2 Premium entitlements, R-2.1, R-5.5, R-5.6, R-5.8; settings S-075, S-076, S-103, S-107, S-108).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-26…P-31, see "Open questions").

Legacy code traced for this spec (read-only). Discovery only surveyed this area; these are the actual rules:
- Search: `legacy/APP/app/Livewire/Main/Search/SearchComponent.php:161-284`. Keyword: `- _ ' " / \` +` become spaces, then **one phrase** `LIKE %keyword%` on title or description in any language (`:164, :269-274`). Filters: min price, max price, delivery time **equal to** the value (`:189-193`), rating **≥** value (`:197-201`). Sorts: popular = `counter_visits` desc, rating desc, sales = `counter_sales` desc, newest = id desc, price as decimal asc/desc (`:205-265`). **No sort chosen = no ORDER BY at all** (database order). English UI hides gigs without English text (`:276-278`). 42 per page (`:280`).
- Category pages: `Categories/CategoryComponent.php:158-264` (+ `SubcategoryComponent.php:174-274`, `ChildcategoryComponent.php:186-286`): same filters and sorts, **but** rating filter is `BETWEEN value AND value+1` (`:193`) and price sorts compare the price **as text** (`:239-247`). No English filter. 42 per page. Child category must belong to the sub-category (`ChildcategoryComponent.php:64`).
- Categories admin: `app/Http/Validators/Admin/Categories/CreateValidator.php:34-48` (name per language ≤ 60, slug unique ≤ 60, description ≤ 300, icon, image, `is_visible`). `is_visible` is used only by the home category rows (`Home/HomeComponent.php:129`).
- Home gig rows: `Home/HomeComponent.php:85-132`. "Top gigs" = 4 random gigs whose owner has **any** subscription row (even expired), topped up with random others (`:92-110`) — the only legacy "top offers" logic. Category rows: visible categories in random order, 4 random gigs each. Best sellers (S-108): 12 users with the most sales (`:137-160`).
- Premium card highlight: `resources/views/livewire/main/cards/gig.blade.php:1` (yellow 5 px border when the owner has active Premium).
- `/hire/{keyword}`: `Hire/HireComponent.php:30-153` — if no user skill has exactly this slug, redirect to `/search?q=…` (`:39-61`); otherwise sellers with a skill whose slug or name contains the keyword, random order, 42 per page.
- `/sellers`: `Sellers/SellersComponent.php:91-104` — sellers whose **level** is a seller level, status active/verified, random order, 40 per page. Levels are removed (Q-014), so this filter must be replaced.
- Project explore: `Explore/Projects/ProjectsComponent.php:122-180` (statuses active + completed, newest first, keyword phrase `LIKE`, English UI hides projects without English, 40 per page); category page `CategoryComponent.php:122-134` (project categories); skill page `SkillComponent.php:29-152` looks the category up in the **gig** categories table, because `projects_skills.category_id` was re-pointed to gig categories (`2023_11_10_142537_change_category_id_on_projects_skills_table.php:16-17`) while projects still point to project categories. Post-project also mixes the two tables (`Post/ProjectComponent.php` `updatedCategory`). Project categories admin: `Filament/Resources/ProjectCategoryResource.php:48-52` (name, slug, SEO description, image).

---

## Goal
Help buyers find the right gig or freelancer fast: the 3-level gig category tree, search with filters and sorting, freelancer lists (`/sellers`, `/hire/{keyword}`) and project categories/skills, all in Georgian and English. Add the Premium "Featured/Top" badge and ranking boost the Owner asked for (Q-069).

## Roles involved
- **Guest** and **User**: browse, search, filter, sort.
- **Premium user**: their gigs get the badge and the ranking boost (Q-069).
- **Staff**: manage gig categories, project categories and skills (admin screens in spec 16).

## User stories
- As a buyer, I want to browse gigs by category, sub-category and child category, so that I can narrow down what I need.
- As a buyer, I want to search by keywords and filter by rating, price and delivery time, and sort the results, so that I find the best match.
- As a Premium freelancer, I want my gigs to show a "Featured" badge and appear higher in lists, so that my subscription pays off.
- As an English visitor, I want every gig to appear under `/en/`, showing the Georgian text when there is no English version.
- As a client, I want to find freelancers who have a given skill, so that I can contact them.
- As the Owner, I want old category, search and hire URLs to keep working for SEO.

## Acceptance criteria

### Gig category tree
- AC-1 Given the gig categories, When any page shows them (header menu, category pages, gig wizard), Then they form three levels: category → sub-category → child category. Each level has a Georgian and an English name, a unique slug, an optional SEO description, and (top level) an icon and an image. (LEGACY data-model; R-5.8)
- AC-2 Given the header on desktop, When it loads, Then the second row lists the top-level categories, and hovering or focusing one opens a panel with its sub-categories (and their child categories), each linking to its page. On mobile the same tree is an accordion in the menu. It must also open by keyboard (audit §3.1). (LEGACY layout)
- AC-3 Given `/categories/{c}`, `/categories/{c}/{s}` or `/categories/{c}/{s}/{child}`, When the slugs exist and each lower level belongs to the level above, Then the page shows the level's name as title, a breadcrumb, the gig list of that level (all gigs whose category, sub-category or child category is that node), the filters and the sort of AC-9…AC-14. When a slug does not exist or does not belong to its parent, Then the answer is 404. (LEGACY `ChildcategoryComponent.php:64`)
- AC-4 Given a category page under `/en/…`, When the category has no English name or description, Then the Georgian text is shown (HTTP 200) with the fallback note `t_content_shown_in_georgian` only where body content is shown. (CHANGE Q-023; R-5.5)
- AC-5 Given staff set a top-level category's `is_visible` to OFF, When the home page loads, Then that category gets no row on the home page. It still appears in the header, its pages still work, and gigs in it still appear in search. (LEGACY `HomeComponent.php:129`)

### Gig lists: what is listed (search, category pages, home rows, `/hire` does not list gigs)
- AC-6 Given any public gig list, When it is built, Then it contains only gigs with status active, whose owner is active or verified and is not banned, restricted or deleted. (LEGACY gig status; owner rule ACCEPTED P-29)
- AC-7 Given the English site (`/en/…`), When a gig list is built, Then it includes gigs without English text too; their cards show the Georgian title. (CHANGE Q-023; legacy search and home rows hid them, `SearchComponent.php:276-278`, `HomeComponent.php:90`)
- AC-8 Given a list page, When there are more results than one page, Then 42 gigs are shown per page on web (numbered pages; the page is kept in the URL) and 42 per load on mobile (infinite scroll). (LEGACY 42)

### Filters (search and all category levels) — one set of rules everywhere (ACCEPTED P-27 where marked)
- AC-9 Given the rating filter with options 5, 4+, 3+, 2+, 1+, When the buyer picks "N+", Then only gigs with an average rating ≥ N are listed (5 = exactly 5.0). (LEGACY search `:197-201`; CHANGE for category pages, which used `BETWEEN N AND N+1`: ACCEPTED P-27a)
- AC-10 Given min price and/or max price, When they are applied, Then only gigs with price ≥ min and/or ≤ max are listed (limits included; up to 2 decimals). When min is greater than max, Then the filter is refused with `t_min_price_greater_than_max` and the previous results stay. (LEGACY range; validation ACCEPTED P-27c)
- AC-11 Given the delivery-time filter with options 1, 2, 3, 4, 5, 6 days, 1, 2, 3 weeks and 1 month, When the buyer picks N days, Then only gigs whose delivery time is **at most** N days are listed (gigs with "None" = 0 days are included). (ACCEPTED P-27b; legacy listed only gigs with exactly N days)
- AC-12 Given filters are set, When the page is reloaded, shared or opened on mobile through a link, Then the same filters and sort are applied (they are in the URL: `q`, `min_price`, `max_price`, `delivery_time`, `rating`, `sort_by`), and changing any filter goes back to page 1. "Reset filter" clears them all. (LEGACY `SearchComponent.php:27-34, :287-380`)

### Sorting and the Premium boost (Q-069 NEW; exact rule ACCEPTED P-26)
- AC-13 Given the sort menu, When it opens, Then it offers: Recommended (default, NEW label), Most popular, Best rating, Most selling, Newest first, Price: Low to High, Price: High to Low. (LEGACY list + NEW default)
- AC-14 Given a list sorted by Recommended, Most popular, Best rating, Most selling or Newest first, When results are ordered, Then **all gigs whose owner has an active Premium plan (R-2.1) come before all other gigs**, and inside each of the two groups the chosen sort applies: Most popular = most visits first; Best rating = highest average rating first; Most selling = most completed sales first; Newest first = newest publish date first; Recommended = a mixed order that changes once a day and is the same for every visitor that day. Ties are broken by newest gig first. (NEW Q-069; ACCEPTED P-26)
- AC-15 Given a list sorted by Price: Low to High or High to Low, When results are ordered, Then they are ordered by numeric price only (no Premium boost), ties newest first. The badge is still shown. (ACCEPTED P-26; legacy category pages sorted the price as text, P-27d)
- AC-16 Example (test data): Premium gigs P1 (rating 4.0) and P2 (rating 3.0), Standard gigs S1 (rating 5.0) and S2 (rating 4.5), all matching the filters. Sorted by Best rating the order is P1, P2, S1, S2. Sorted by Price: Low to High with prices P1 = 50, P2 = 20, S1 = 10, S2 = 30 the order is S1, P2, S2, P1. With the filter "4+", the Best-rating order is P1, S1, S2 (P2 is filtered out before ranking; the boost never adds a gig that does not match). (P-26)
- AC-17 Given a freelancer's Premium ends (or starts), When the next list is requested (at most 60 seconds later, the legacy Premium cache time BR-113), Then their gigs lose (or gain) the boost and the badge. Nothing else about the gigs changes. (NEW Q-069; R-2.1)

### Featured/Top badge (Q-069 NEW) and highlight (BR-023 LEGACY)
- AC-18 Given a gig whose owner has active Premium, When its card is shown anywhere (search, category pages, home rows, profile, favourites, "You may also like"), Then the card has the legacy highlight frame and a "Featured" badge (`t_featured`). The gig page shows the same badge next to the title. Other gigs have neither. The badge has a text label, not colour only. (LEGACY BR-023 + NEW Q-069)

### Search (`/search?q=…`, header and hero search box)
- AC-19 Given a keyword, When the buyer searches, Then the list contains gigs where **every word** of the keyword appears (in any order, case-insensitive) in the title or the description, in Georgian or English, whatever the UI language. The characters `- _ ' " / \` +` count as spaces. Every gig the legacy phrase search would find is also found. (LEGACY scope; word rule ACCEPTED P-28)
- AC-20 Given an empty keyword, When the buyer opens `/search`, Then all listed gigs (AC-6) are shown with filters and sort. (LEGACY)
- AC-21 Given no gig matches, When the results load, Then the empty state shows `t_we_couldnt_find_anthing_search_term` and a "Reset filter" action if filters are set. (LEGACY)
- AC-22 Given the phone layout, When any page with the header is shown, Then a search entry is reachable from the header (icon that opens a full-width search field), not only from the home hero. (CHANGE for mobile usability, audit §3.1; same behaviour)
- AC-23 Given the search page title, When results are shown, Then the heading reads `t_search_results_for_q` with the keyword. (LEGACY)

### Home gig rows (LEGACY, with the Q-069 rule)
- AC-24 Given the home page, When the "Top gigs" row loads, Then it shows 4 gigs: gigs of active-Premium owners first (random), topped up with random other gigs if fewer than 4 exist. (LEGACY logic `HomeComponent.php:92-110`; CHANGE: legacy counted any subscription row, even expired; now active Premium only, R-2.1)
- AC-25 Given the home page, When the category rows load, Then each visible top-level category (AC-5), in random order, shows up to 4 of its gigs, Premium owners' gigs first (random inside each group), with a "See more" link to the category page. The "See more" link is also visible on phones. (LEGACY random rows; Premium-first ACCEPTED P-26; audit §3.2 mobile fix)
- AC-26 Given S-108 `appearance.home.best_sellers` is ON, When the home page loads, Then a block shows up to 12 users (AC-6 owner rules) with the most completed sales, most first. Given it is OFF, Then the block is not shown. (LEGACY `HomeComponent.php:137-160`, account-type filter dropped)

### `/sellers` and `/hire/{keyword}`
- AC-27 Given `/sellers`, When it opens, Then it lists freelancers = users who are active or verified, not banned, restricted or deleted, and have at least one active gig. The order is a mix that changes once a day. 40 per page. Each card shows avatar, username, "ID verified" when KYC is approved, up to 3 skills, "Contact me" and "View profile". (LEGACY page; membership rule ACCEPTED P-30 replaces the removed seller-level filter, Q-014)
- AC-28 Given `/hire/{keyword}` where at least one user skill has exactly this slug, When it opens, Then the title is `t_hire_the_best_skill_name_experts` with the skill name, and the list shows users (AC-27 status rules, gig not required) who have a skill whose slug or name contains the keyword. The order is a mix that changes once a day. 42 per page. (LEGACY `HireComponent.php:39-151`; account-type filter dropped, Q-013)
- AC-29 Given `/hire/{keyword}` where no skill has this exact slug, When it opens, Then the visitor is redirected to `/search?q={keyword with + for spaces}` (under `/en/` for English). (LEGACY `HireComponent.php:55-59`)
- AC-30 Given a skill chip on a profile (spec 02 AC-8), When it is clicked, Then it opens `/hire/{skill-slug}`. (LEGACY)

### Project categories and skills
- AC-31 Given the project categories, When they are shown (explore page chips, post-project form, category pages), Then each has a Georgian and English name, a unique slug, an optional SEO description and an image. Each skill has a Georgian and English name and a slug, and belongs to one project category. A project can have at most S-076 skills (spec 10). (LEGACY; skill → project category ACCEPTED P-31)
- AC-32 Given `/explore/projects`, When it opens with or without `?q=`, Then it lists projects with status active or completed, newest first, 40 per page. With `q`, the same word rule as AC-19 applies to project title and description in either language. English UI includes projects without English text, showing the Georgian text. (LEGACY list; CHANGE Q-023; word rule P-28)
- AC-33 Given `/explore/projects/{category}` or `/explore/projects/{category}/{skill}`, When the category (and the skill inside it) exist, Then the list is filtered to that category (and skill), newest first, 40 per page. Otherwise 404. (LEGACY; P-31 fixes the legacy lookup of the category in the wrong table)
- AC-34 Given S-075 `projects.enabled` is OFF, When any `/explore/projects…` URL is opened, Then the "feature disabled" state of 00 AC-11 is shown (legacy redirected to home), and project links are hidden from menus. (00 AC-11)

### Languages and URLs (Q-023, Q-024)
- AC-35 Given any page of this spec, When it is requested under `/en/` (for example `/en/categories/{c}/{s}`, `/en/search?q=logo`, `/en/hire/{keyword}`, `/en/sellers`, `/en/explore/projects/{category}`), Then it works with the same slugs as the Georgian page, English UI texts, and Georgian fallback for missing English content. The Georgian page stays unprefixed. (NEW Q-024; R-5.6)
- AC-36 Given a legacy URL with `?locale=en` or `?locale=ka` for any page of this spec, When it is requested, Then it redirects (301) to the matching new URL defined in `url-map.md` (P2-B3). (Q-024)
- AC-37 Given a list page, When it is rendered, Then it has a canonical URL and hreflang links for ka and en as defined in `url-map.md`. Filtered or sorted variants point their canonical to the unfiltered page. (Q-024; detail owned by url-map)

### Category colours (NEW, spec 3X R-1)
- AC-38 Given a top-level gig category with a colour, When the category tree, a category page (with its breadcrumb and children), the home category rows and featured tiles, or the project categories are read, Then each category carries the **resolved** colour of its top-level gig category as `#RRGGBB` (upper-case): sub- and child categories inherit it, a project category takes it from its linked top-level gig category, and a category without a colour (for example an unlinked project category) shows the brand teal. Web and app derive every shade with the one shared function and never look the colour up in the tree themselves. (NEW Q-169, Q-171; spec 3X R-1.2, R-1.4, R-1.6, AC-4, AC-8; ADR-023)
- AC-39 Given staff change a top-level category colour, When visitors next open a page or the app, Then the new colour shows within 60 seconds (the category cache time). (NEW spec 3X R-1.7, AC-7, EC-5; ADR-023)

---

## Business rules
- R-S1 **Listing eligibility** (LEGACY + ACCEPTED P-29): gig status active (legacy statuses `boosted`, `trending`, `featured` are migrated as active; they had no separate behaviour); owner active/verified; owner not banned, restricted or deleted (P-29).
- R-S2 **Filters** (P-27): rating ≥ N; price min ≤ price ≤ max, numeric; delivery time ≤ N days; min > max refused. Same rules on search and every category level.
- R-S3 **Premium ranking rule** (NEW Q-069, exact rule ACCEPTED P-26):
  1. Apply keyword and filters first. The boost never adds gigs.
  2. Split the results into two groups: A = owner has active Premium at request time (R-2.1, cached ≤ 60 s); B = everyone else.
  3. For Recommended, Most popular, Best rating, Most selling and Newest first: list group A before group B, each group ordered by the chosen sort.
  4. For the two price sorts: no groups; order by price only.
  5. "Recommended" inside each group: a daily-changing mix (the same for everyone on a given day, so paging never repeats or skips gigs).
  6. Ties: newest gig first.
  7. The same group-first rule applies to the home "Top gigs" row and the home category rows. It does **not** apply to `/sellers`, `/hire`, the profile gig list (newest first, spec 02) or "You may also like" (spec 04).
- R-S4 **Sort definitions** (LEGACY): popular = gig visits; best rating = average rating of the gig's reviews from buyers (spec 07); most selling = completed sales; newest = publish date. Price is numeric (fixes text sorting on legacy category pages).
- R-S5 **Keyword matching** (LEGACY scope + ACCEPTED P-28): title and description, both languages, all words in any order, case-insensitive; a superset of the legacy phrase search. The search engine choice (for example Postgres full-text or trigram) is ADR-011.
- R-S6 **Page sizes** (LEGACY): gig lists 42; `/sellers` 40; `/hire` 42; project lists 40.
- R-S7 **Default order before this spec** (for the record): legacy search with no sort had no defined order; legacy `/sellers` and `/hire` were random on every request. The daily mix (P-26, P-30) keeps the "random" feel while making paging stable.
- R-S8 **Project taxonomy** (ACCEPTED P-31): project categories are their own list (LEGACY `projects_categories`). Each skill belongs to one project category. Each project category is linked by staff to one top-level gig category; this link is used for "notify freelancers in the category" (BR-053, spec 10). Migration links them by equal slug (legacy BR-053 matched by slug) and moves each skill to the project category with the same slug as its current gig category.
- R-S9 **Languages** (Q-022, Q-023, Q-024): search matches Latin and Georgian letters as typed; no transliteration between them. Missing English content falls back to Georgian everywhere in this spec.

---

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Header category menu | second row of top categories + hover/focus panel | menu accordion (with a search box inside the list, audit §3.1) | – |
| Search results | `/search`: left filter column (Rating, Price min/max, Delivery time, "Filter", "Reset filter"), result grid, sort menu top right (audit §3.3 keep) | results list; filter button opens a full-screen sheet with a sticky "Show results" bar; sort as a bottom sheet | loading (card skeletons); empty (AC-21); error (retry); success |
| Category page (3 levels) | same as search + title + breadcrumb (+ optional top/bottom SEO text, LEGACY translation fields `content_top/bottom`) | same | same |
| Gig card | image, title, seller mini-row, rating (or `t_no_reviews_yet` in a quiet style, audit §3.2), starting price, favourite button (spec 04), Premium frame + "Featured" badge | same, full width | – |
| Home gig rows | "Top gigs" row, one row per visible category with "See more" | horizontal carousels; "See more" visible | loading skeleton; hidden when empty |
| `/sellers` | grid of freelancer cards | list | empty; success |
| `/hire/{keyword}` | title + subtitle (`t_hire_the_best_skill_name_experts_subtitle`) + freelancer cards | list | success; redirect when no skill |
| Explore projects | search bar, "Popular" category chips, "Latest projects" list (spec 10 for the row design) | list | empty; success |

Accessibility: filter headings meet contrast; price inputs have labels; the rating filter shows stars plus text ("4+ stars"); the mega-menu opens by keyboard (audit §3.1, §3.3).

## Notifications triggered
None. (Project-category notifications to freelancers, BR-053, are in spec 10 and use the link of R-S8.)

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_search` | Search | ძებნა |
| `t_search_results_for_q` | Search results for :q | ძიების შედეგი :q |
| `t_filter` | Filter | გაფილტვრა |
| `t_reset_filter` | Reset filter | ფილტრის გასუფთავება |
| `t_rating` | Rating | რეიტინგი |
| `t_price` | Price | ფასი |
| `t_min_price` | Min price | მინიმალური ღირებულება |
| `t_max_price` | Max price | მაქსიმალური ღირებულება |
| `t_delivery_time` | Delivery time | მიწოდების დრო |
| `t_1_day` … `t_1_month` | 1 day, 2 days … 1 week, 2 weeks, 3 weeks, 1 month | legacy values |
| `t_sort_by` | Sort by | დალაგება |
| `t_most_popular` | Most popular | ყველაზე პოპულარული |
| `t_best_rating` | Best rating | საუკეთესო რეიტინგი |
| `t_most_selling` | Most selling | ყველაზე გაყიდვადი |
| `t_newest_first` | Newest first | ყველაზე ახალი |
| `t_price_low_to_high` | Price: Low to High | ფასი დაბლიდან მაღლისკენ |
| `t_price_high_to_low` | Price: High to Low | ფასი მაღლიდან დაბლისკენ |
| `t_we_couldnt_find_anthing_search_term` | We couldn't find anything with that term. Please try again | გთხოვთ სცადეთ ხელახლა |
| `t_featured` | Featured | გამორჩეული |
| `t_categories` | Categories | სარჩევი |
| `t_gigs` | Gigs | განცხადებები |
| `t_see_more` | See more | მეტის ნახვა |
| `t_home` | Home | მთავარი |
| `t_sellers` | Sellers | ფრილანსერები |
| `t_top_sellers` | Top sellers | საუკეთესო ფრილანსერები |
| `t_hire_our_best_sellers` | Hire our best experts sellers | დაიქირავეთ ჩვენი საუკეთესო ფრილანსერები |
| `t_hire_the_best_skill_name_experts` | Hire the best :skill experts | დაიქირავე საუკეთესო :skill |
| `t_hire_the_best_skill_name_experts_subtitle` | Find the most talented :skill experts to bring your ideas to life | იპოვეთ ყველაზე ნიჭიერი :skill თქვენი იდეების გასაცოცხლებლად |
| `t_account_verified` | Account verified | პროფილი ვერიფიცირებულია |
| `t_contact_me` / `t_view_profile` | Contact me / View profile | შეტყობინების გაგზავნა / პროფილის ნახვა |
| `t_projects` | Projects | პროექტები |
| `t_latest_projects` | Latest projects | უახლესი პროექტები |
| `t_explore` | Explore | აღმოაჩინე |
| `t_category` / `t_subcategory` / `t_childcategory` | Category / Subcategory / Childcategory | მიმართულება / კატეგორია / ქვეკატეგორია |
| `t_content_shown_in_georgian` | see 00 | see 00 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_recommended` | Recommended | რეკომენდებული |
| `t_min_price_greater_than_max` | The minimum price cannot be higher than the maximum price. | მინიმალური ფასი არ შეიძლება აღემატებოდეს მაქსიმალურს. |
| `t_rating_n_plus` | :n+ stars | :n+ ვარსკვლავი |
| `t_up_to_delivery` | Up to :time | მაქსიმუმ :time |
| `t_show_results` | Show results | შედეგების ჩვენება |
| `t_featured_badge_hint` | This freelancer has a Premium plan. | ამ ფრილანსერს აქვს პრემიუმ პაკეტი. |
| `t_popular_categories` | Popular: | პოპულარული: |
| `t_no_reviews_yet` | see 02 | see 02 |

## Edge cases
- EC-1 A gig moves category (edited): it appears in the new category lists after it is active again (spec 04 moderation).
- EC-2 A category is deleted by staff while gigs use it: not allowed while gigs, sub-categories or projects reference it (spec 16). No orphan lists.
- EC-3 A Premium owner has 50 gigs and they fill the first pages of a sort: accepted by design (R-S3). Filters still narrow the list.
- EC-4 When a list is sorted by price there is no boost, so a Premium gig can appear after Standard ones (AC-15).
- EC-5 A keyword with only separators (for example `---`): treated as empty (AC-20).
- EC-6 A very long keyword (> 100 characters): cut to 100 characters (ACCEPTED as part of P-28, protects the search engine).
- EC-7 Two skills with the same slug belong to different users: `/hire/{slug}` lists all users with a matching skill (skills are per user; LEGACY).
- EC-8 The daily mix changes at midnight (Tbilisi time) while a visitor is paging: the next page may repeat or skip some gigs once. Accepted.
- EC-9 An English page lists a Georgian-only gig: the card shows the Georgian title; the gig page shows the fallback note (spec 04).
- EC-10 A migrated gig with a legacy status `featured`/`boosted`/`trending`: listed as active; it does not get the badge unless its owner has Premium.

## Out of scope
- Gig page, favourites and "You may also like" (spec 04). Project list row design and project page (spec 10). Admin CRUD screens for categories and skills (spec 16). Sitemap, SEO meta, and 301 map (spec 17, `url-map.md`).
- Search suggestions/autocomplete, saved searches, AI search (not in legacy).
- Ranking by paid promotions (removed, X-03).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-26 Premium ranking rule (Q-069).** Premium owners' gigs are listed before all other gigs for Recommended, Most popular, Best rating, Most selling and Newest first; each group keeps the chosen order. The price sorts are pure price order (the buyer asked for price), but the badge still shows. Filters apply first. "Recommended" (the new default; legacy had no defined order) is a mix that changes once a day. The same Premium-first rule applies to the home "Top gigs" row (legacy already did this, but counted expired subscriptions) and to the home category rows.
- **P-27 One set of filter rules.** (a) Rating "N+" = rating ≥ N everywhere (legacy category pages used "between N and N+1"). (b) Delivery time "N days" = at most N days (legacy: exactly N days, so "1 week" hid 3-day gigs). (c) Min price above max price is refused with a message. (d) Price sorting is numeric everywhere (legacy category pages sorted the price as text, so 100 came before 20).
- **P-28 Keyword search by words.** Every word must appear, in any order (legacy searched the whole phrase, so "logo design" did not find "design of a logo"). All legacy results are still found. Keywords are cut to 100 characters.
- **P-29 Hide gigs of banned, restricted and deleted users** from all public lists. Legacy only checked the gig status, so gigs of banned users stayed visible and could be ordered.
- **P-30 `/sellers` membership.** With levels removed (Q-014), `/sellers` lists active users with at least one active gig (legacy used "has a seller level"). `/sellers` and `/hire` use a daily-changing mix instead of a new random order on every page load, so paging is stable.
- **P-31 Project categories and skills.** Legacy mixes two tables: projects point to project categories, but skills (and the post-project sub-categories) point to gig categories, which only works if the ids happen to match. Proposal: skills belong to project categories; each project category is linked by staff to one top-level gig category (used to notify freelancers, BR-053); migration matches them by equal slug.
