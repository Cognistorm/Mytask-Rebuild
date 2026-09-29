# 17 — Content and SEO: CMS pages, Terms & Privacy, blog, contact, newsletter, home content, `/gita`, SEO meta, sitemap, robots, redirects
Status: **ready for Owner**
Author: product-analyst (P2-A5) | Date: 2026-09-29
Legacy reference: `docs/01-discovery/routes-and-pages.md` (public routes, "Live-only / live notes"), `features.md` L (Search, categories, SEO, content), `i18n.md`, `risks-and-debt.md` R-042. Owner decisions: Q-023, Q-024, Q-025, Q-026, Q-043, Q-055, Q-058, Q-061, Q-083, Q-103 (+ accepted P-33 gig slugs, P-71 staff-review clause wording). Platform rules: `00-platform-rules.md` R-5.5, R-5.6, R-5.8, AC-22, AC-24, §4.16 (S-103…S-120), X-14, X-15. Specs 01 (terms consent, reCAPTCHA S-061), 03 (category and search pages, R-S1 listable), 04 (gig pages, P-33), 08 (P-71 clause, AC-32), 10 (project pages), 15 (EV-115…EV-120), 16 (admin screens, permissions). `docs/03-architecture/url-map.md` (authoritative for URLs, 301s, hreflang, canonical, sitemap and robots; this spec does not repeat its tables), ADR-006, ADR-008 §6 (sitemap), ADR-013; data-model §3.R (`pages`, `blog_articles`, `blog_comments`, `newsletter_subscribers`, `support_messages`, `home_logos`).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-127…P-134, see "Open questions").

Legacy code traced for this spec (read-only):
- CMS page `app/Livewire/Main/Page/PageComponent.php:24-43` (404 for unknown slug; **external-link pages** `is_link` + `link` redirect `:33-37`), SEO `:57-103` (title "page title + separator + site title", **meta description always the site default** `:63`, canonical = current URL, OG type website, Twitter card, `fb:page_id`/`fb:app_id`, robots "index, follow", JSON-LD type **WebSite** on every page); admin `Admin/Pages/Options/CreateComponent.php:71-79` (uid, slug via `Str::slug`, `is_link`, `link`, footer `column`). Live slugs: about-company, contact-information, terms-of-service, privacy-policy, payments, mytask-faq, how-platform-works.
- Blog `Main/Blog/BlogComponent.php:29-36` (blog disabled → redirect home), `:117-120` (all articles, 20 per page, no status), newsletter form `:127-268`; article `Main/Blog/ArticleComponent.php:31-58` (disabled → redirect home), comments `:135-143` (active only, newest first, 40 per page), add comment `:152-269` (login required with key `t_login_required_to_comment` — **missing from both language files**; comment ≤ 1,500 `Validators/Main/Blog/CommentValidator.php:27`; status from `auto_approve_comments`; **`enable_comments` not checked on the server**; stores fullname, email, IP, user agent; pending → `Admin/PendingArticleComment` to `Admin::first()` `:208`); admin `Admin/Blog/Options/CreateComponent.php:91-123` (slug, image, title/content per language, **one SEO description for all languages** `:121-123`), settings `Admin/Blog/SettingsComponent.php:17-103` (`enable_blog`, `enable_comments`, `auto_approve_comments`, `display_recent_posts`), comments `Admin/Blog/Comments/CommentsComponent.php:64, 93, 126`. Live: `/blog` renders the home page (disabled).
- Contact `Main/Help/Contact/ContactComponent.php:100-186` (stores uid, IP, user agent, name, email, subject, message; `PendingMessage` to `Admin::first()` in the app locale `:133`; success `t_your_message_support_received_success`); validator `Validators/Main/Help/ContactValidator.php:25-37` (name ≤ 60, email ≤ 60, subject ≤ 120, message ≤ 2,500, reCAPTCHA); admin reply `Admin/Support/ReplyComponent.php:48-173` (subject "Re: …", `Mail::to(...)->send(new Reply(...))`, marks seen + replied).
- Newsletter sign-up `Main/Home/HomeComponent.php:187-283` and `Blog/BlogComponent.php:127-268` (enabled check `:191`; invalid email message; **already verified → silent reset, no message** `:211-218`; pending → old tokens deleted, new token `uid(60)`, `NewsletterVerification` mail; new → list row with IP + token + mail); verify `Main/Newsletter/VerifyComponent.php:19-66` (**query parameter is `?id=`**, not `?token=`; no expiry; sets `verified`, sends `NewsletterApproved`, deletes the token, **silent redirect to `/`**); admin `Admin/Newsletter/NewsletterComponent.php:55-177` (list 42 per page, export xlsx all/pending/verified `:70-97`, resend `:107`, delete `:154`), `SendComponent.php:81-92` (email to one subscriber), `SettingsComponent.php:16-80` (`is_enabled`). **No unsubscribe anywhere.**
- `/ka/gita`, `/en/gita` `routes/web.php:8-13` → standalone HTML views `resources/views/faq/index.blade.php` (title "Mytast App" `:8`, pitch sections) and `index_en.blade.php`.
- Outbound redirector `Main/Redirect/RedirectComponent.php:28-43` (`?to=` = **encrypted** URL, `safeDecrypt`), robots "index, follow" `:95`, text `t_redirecting_notification_alert`.
- Sitemap `app/Console/Commands/GenerateSitemap.php:36-60` writes `base_path('sitemap.xml')` every minute (`Kernel.php:17`) — outside the web root, so `/sitemap.xml` is 404 live (R-042, Q-025).
- Header announcement close = cookie `header_announce_closed` for 4,320 minutes (`Main/Includes/Header.php:247-251`).

---

## Goal
Publish MyTask's editable content — CMS pages (with Terms & Privacy containing the staff chat-review clause), the blog with moderated comments, the contact form, the double opt-in newsletter, home-page content and the `/gita` app page — and give every public page a correct SEO layer: Georgian unprefixed and English under `/en/` with Georgian fallback, proper meta/Open Graph/JSON-LD, hreflang/canonical/noindex, a working sitemap index and robots.txt, and one-hop 301s from every legacy URL.

## Roles involved
- **Guest / user**: reads pages and blog, comments (logged in), contacts support, subscribes to the newsletter.
- **Staff** (spec 16): `content.write` (pages, blog, home content, `/gita`), `comments.moderate`, `support.handle`, `newsletter.manage`, `settings.content.write` (S-104…S-120 content rows).
- **Search engines and social networks**: consume meta, JSON-LD, sitemap and robots.
- **System**: sitemap generation (ADR-008 §6), redirect middleware (url-map §10).

## User stories
- As a visitor, I want to read the terms, privacy policy, FAQ and "how it works" in my language, so that I trust the platform.
- As a user, I want to know that staff may read chats for disputes before I use the Inbox (Q-083).
- As a reader, I want to comment on blog articles, so that I can ask questions.
- As a visitor with a problem, I want a simple contact form and an email answer.
- As a subscriber, I want to confirm my subscription by email and to unsubscribe with one click.
- As the Owner, I want old links and Google results to keep working after the relaunch, and a sitemap that Google can read (vision "SEO: existing URLs keep working", Q-025).

## Acceptance criteria

### A. URLs, languages and redirects (Q-023, Q-024, Q-103, P-33; url-map)
- AC-1 Given any public page, When it is requested, Then the Georgian version lives at the unprefixed path and the English version under `/en/`, the language comes only from the path (url-map §1), and the language switcher links to the same page in the other language. (CHANGE Q-024, X-15; ADR-006 §1)
- AC-2 Given any legacy URL pattern of url-map §2–§6 (query `?locale=` and `?theme=`, `/ka/…`, trailing slashes, `http://`, `www.`, changed dashboard paths, removed features, admin paths), When it is requested, Then the response is exactly the status and target listed there, in one hop, with tracking parameters kept; every listed pattern has an automated request test (url-map §10). (NEW Q-024; vision "existing URLs keep working")
- AC-3 Given a gig, project or portfolio URL with an old or different slug, When it is requested, Then it answers 301 to the current slug, found by gig uid, project pid or portfolio uid (url-map §4; ACCEPTED P-33). (LEGACY URLs, CHANGE redirects)
- AC-4 Given a gig, project, blog article or CMS page without English content, When its `/en/` URL is opened, Then the page returns 200 with the Georgian text and the notice `t_content_shown_in_georgian` (00 AC-22), its canonical is the Georgian URL, it is `noindex, follow`, and it is not listed as an `en` alternate nor in the sitemap. (CHANGE Q-023, Q-103; url-map §8)
- AC-5 Given `/ka/gita`, When it is requested, Then it answers 301 to `/gita`; `/en/gita` stays as it is. (Q-103; url-map §3)

### B. CMS pages (LEGACY `/page/{slug}`)
- AC-6 Given the migration, When it runs, Then the seven legacy pages (about-company, contact-information, terms-of-service, privacy-policy, payments, mytask-faq, how-platform-works) exist with their ka and en title and content, and are served at `/page/{slug}` and `/en/page/{slug}`. An unknown or inactive slug returns 404. (LEGACY `PageComponent.php:29`)
- AC-7 Given a page marked as an external link, When `/page/{slug}` is opened, Then it answers 302 to its link (http/https only). (LEGACY `PageComponent.php:33-37`)
- AC-8 Given `content.write`, When staff create or edit a page, Then they set: slug (lower-case Latin letters, digits and hyphens, unique), title and content per language (rich text limited to headings, paragraphs, lists, links, bold/italic, tables and images from the public media library; everything else is removed on save), SEO title and SEO description per language (NEW), footer column (1–4 or none), position, active switch, or an external link instead of content; a preview shows the page in both languages; the change is audited (spec 16 AC-14). (LEGACY fields; NEW per-language SEO, P-127)
- AC-9 Given the public footer, When it renders, Then active pages appear in their footer column in position order, next to the S-114 footer links and social links. (LEGACY `column`; S-114)
- AC-10 Given staff change the slug of a page, a blog article or a category (spec 16 AC-60), When the change is saved, Then the old URL (both languages) answers 301 to the new one; after several changes every old URL goes to the current one in one hop; an old slug cannot be given to another item of the same type while it redirects. (NEW, PROPOSED P-127; legacy slug changes broke links)
- AC-11 Given the pages `terms-of-service` and `privacy-policy`, When they are shown on web or mobile, Then they contain the staff chat-review clause `t_terms_clause_staff_chat_review` (spec 08 P-71, Q-083) in its own section added by the page template, which the page editor cannot remove, and a "Last updated" date (the date of the last content change). (NEW Q-083; placement PROPOSED P-128)
- AC-12 Given the registration consent (spec 01 `t_you_must_agree_to_terms`), the checkout footer and the email footer (spec 15 AC-8), When they link to Terms or Privacy, Then the links open the page in the current language. (LEGACY links)
- AC-13 Given the mobile app, When the user opens Account → Help & legal, Then the CMS pages (About, Contact information, Terms, Privacy, Payments, FAQ, How it works, and `/gita` as "About the app") open as native screens rendering the same sanitised content from the API; external-link pages open in the in-app browser. (NEW mobile)
- AC-14 Given the legacy `payments` page mentions one-time SMS codes that do not exist (Q-043), When the content is migrated, Then the page is flagged "to review" in the admin list until staff edit it; its text is not changed automatically. (NEW, PROPOSED P-128)

### C. Blog (Q-025: kept; S-117…S-119, S-074)
- AC-15 Given S-117 is ON, When `/blog` opens, Then published articles are listed newest first, 20 per page (`?page=N`), each with cover, title, excerpt (first 200 characters of the text), date and comment count; `/blog/{slug}` shows the article (title, cover, date, content, share links, comments). The English fallback of AC-4 applies. (LEGACY `BlogComponent.php:117-120`, `ArticleComponent.php:31-58`; CHANGE: blog switched on, Q-025)
- AC-16 Given S-117 is OFF, When `/blog` or an article is opened, Then the page shows `t_feature_disabled` (200, `noindex`), the blog is left out of the sitemap, and its header/footer links and the home block are hidden. (CHANGE: legacy redirected to the home page, `BlogComponent.php:29-36`; same pattern as url-map for `/explore/projects`)
- AC-17 Given `content.write`, When staff create or edit an article, Then they set slug (unique), title and content per language, cover image (public media, JPG/PNG/WebP ≤ S-078 MB), SEO title and description per language, and status draft / published / hidden; the publication date is set the first time it is published; only published articles are public (hidden or draft → 404); changes are audited. (LEGACY fields; CHANGE: statuses and per-language SEO, P-129; legacy one SEO description `CreateComponent.php:121-123`)
- AC-18 Given S-118 is ON, When an article is shown, Then its published comments appear newest first, 40 per page, each with the commenter's full name (as stored when commenting), avatar, and date. Given S-118 is OFF, Then no comment section is shown and the API refuses new comments with "feature disabled". (LEGACY `:135-143`; CHANGE: server-side check, fixes D-17-3)
- AC-19 Given a logged-in, active user and S-118 ON, When they post a comment (plain text, 1–1,500 characters), Then with S-074 ON it is published at once (`t_ur_comment_has_been_successfully_added`); with S-074 OFF it is pending (`t_ur_comment_will_be_published_soon`) and spec 15 EV-115 goes to every S-100 address. Guests see `t_login_required_to_comment` with a login link that returns to the article; restricted or banned users cannot comment (01 AC-19). At most 5 comments per user per 10 minutes (`t_too_many_requests_try_later`). (LEGACY `:152-269`; CHANGE recipients Q-026; NEW rate limit P-129)
- AC-20 Given `comments.moderate`, When staff open Blog comments, Then they can Publish, Hide (the comment disappears publicly) and Delete (spam) a comment; every action is audited. (LEGACY `CommentsComponent.php:64, 93, 126`)
- AC-21 Given S-117 and S-119 are ON, When the home page renders, Then a "Recent articles" block shows the 3 newest published articles. (LEGACY `display_recent_posts`)
- AC-22 Given the migration, When legacy articles, translations, SEO descriptions and comments are imported, Then articles come in as **hidden** (the blog was switched off live, so their content has not been public) until staff publish them; comments keep their status (active → published, pending, hidden) and author name. (Q-025; hidden import PROPOSED P-129)

### D. Contact and support (LEGACY `/help/contact`)
- AC-23 Given `/help/contact` (web) or Account → Help → Contact us (mobile), When the form is shown, Then it has name (≤ 60), email (≤ 60), subject (≤ 120) and message (≤ 2,500), prefilled with the full name and email of a logged-in user, and reCAPTCHA when S-061 is ON (web; mobile uses the API's app attestation or rate limits instead). Field errors use the legacy validator messages. (LEGACY `ContactValidator.php:25-37`; mobile NEW)
- AC-24 Given a valid submission, When it is sent, Then the message is stored (name, email, subject, message, user id if logged in, page language, IP, user agent), the sender sees `t_your_message_support_received_success`, and spec 15 EV-116 goes to every S-100 address with the message text. (LEGACY `ContactComponent.php:100-150`; CHANGE recipients Q-026)
- AC-25 Given more than 5 messages within one hour from the same IP or the same email, When the next one is sent, Then it is refused with `t_too_many_requests_try_later`. (NEW, PROPOSED P-130)
- AC-26 Given `support.handle`, When staff open Support messages, Then messages are listed as new / replied / closed (new first, oldest first); opening marks it seen; "Reply" pre-fills the subject "`t_re_subject_short` + original subject", sends spec 15 EV-117 to the sender's email in the language the message was written in, stores the reply text and sets "replied"; "Close" sets "closed"; all actions are audited. (LEGACY `ReplyComponent.php:48-173`; NEW statuses and stored reply)
- AC-27 Given a support message older than 12 months, When the nightly clean-up runs, Then its IP address and user agent are removed; the message and reply stay. (NEW, PROPOSED P-130)

### E. Newsletter (LEGACY double opt-in; S-120)
- AC-28 Given S-120 is ON, When the home page (and the blog pages) render, Then the newsletter sign-up field is shown; given S-120 is OFF, Then it is hidden and the API refuses sign-ups with "feature disabled". The mobile app has no sign-up. (LEGACY `HomeComponent.php:191`, `BlogComponent.php:138`; mobile PROPOSED P-131)
- AC-29 Given an invalid email, When the user subscribes, Then `t_pls_enter_valid_email_address` is shown. (LEGACY)
- AC-30 Given a valid email, When the user subscribes, Then the same success message `t_we_sent_verification_link_newsletter` is shown whatever the state of that address; for a new, pending or unsubscribed address a new token valid 7 days is created (earlier tokens stop working) and spec 15 EV-118 is sent in the page language; for a confirmed address no email is sent. At most 3 sign-ups per email and 10 per IP per hour. (LEGACY flow; CHANGE: same message for every state, token expiry, rate limit, P-131; fixes D-17-8)
- AC-31 Given the confirmation link `/newsletter/verify?token=…` (the legacy form `?id=…` is also accepted), When it is opened with a valid token, Then the address becomes confirmed, spec 15 EV-119 is sent, and the page shows `t_newsletter_confirmed`; given an invalid or expired token, Then the page shows `t_newsletter_link_invalid`. The page is `noindex`. (LEGACY `VerifyComponent.php:19-66`; CHANGE: visible result instead of a silent redirect)
- AC-32 Given any newsletter email (welcome, staff email to a subscriber), When it is sent, Then it contains an unsubscribe link (and `List-Unsubscribe` header) to `/newsletter/unsubscribe?token=…`, which sets the address to unsubscribed without login and shows `t_newsletter_unsubscribed`. (NEW, PROPOSED P-131)
- AC-33 Given `newsletter.manage`, When staff open Newsletter, Then they can list and search subscribers by status (pending, confirmed, unsubscribed), resend the confirmation to a pending address, delete an address, send one email to a confirmed subscriber (spec 15 EV-120), and export all / pending / confirmed addresses as CSV or XLSX (re-authentication and audit, spec 16 AC-77). There is no bulk campaign sending. (LEGACY `NewsletterComponent.php:55-177`, `SendComponent.php:81-92`; P-131)
- AC-34 Given the migration, When `newsletter_list` is imported, Then verified addresses become confirmed and pending ones pending (legacy tokens are not migrated, so old confirmation links show AC-31's invalid state), with their sign-up date; the language is `ka` when unknown. (data-model §12.2)

### F. Home-page content, header and footer (S-107…S-114, S-119)
- AC-35 Given the home page, When it renders on web and mobile, Then the hero (S-113), featured categories (S-107), best sellers (S-108), logo cloud (S-109, managed logos with name, link and order), and recent articles (AC-21) are shown according to their settings; staff edit them in the settings content area (spec 16 AC-52). (LEGACY)
- AC-36 Given a header announcement (S-112, ka/en text and optional link) is set, When a public page renders, Then it is shown at the top; closing it hides it for 3 days on that browser (web) or device (mobile banner on the home screen). (LEGACY `Header.php:247-251`)
- AC-37 Given the footer, When it renders, Then it shows the S-114 links, social links and footer logos, and the CMS pages by column (AC-9); mobile shows the same links in Account → Help & legal. (LEGACY)

### G. SEO meta, Open Graph, JSON-LD (tables below)
- AC-38 Given any public page, When it is rendered on the server, Then it has: `<title>` = page title + S-111 separator + S-111 site title (home: site title + subtitle); a meta description following the page-type table; canonical, hreflang and robots following url-map §8 and AC-41; Open Graph (`og:title`, `og:description`, `og:image`, `og:url` = canonical, `og:type`, `og:site_name`, `og:locale` `ka_GE` or `en_US` plus `og:locale:alternate` when the other language exists) and Twitter tags (`summary_large_image`, `twitter:site` from S-115), and `fb:app_id` from S-115. Descriptions are plain text, at most 160 characters, cut at a word boundary. (LEGACY seotools tags `PageComponent.php:57-103`; CHANGE per-page descriptions, fixes D-17-7)
- AC-39 Given a page type with structured data in the JSON-LD table, When it is rendered, Then the JSON-LD matches the table and passes a structured-data validator in the automated tests; no page outputs the legacy generic `WebSite` block. (CHANGE, fixes D-17-5; PROPOSED P-132)
- AC-40 Given a non-production environment (local, staging), When any page or `robots.txt` is requested, Then every response carries `X-Robots-Tag: noindex, nofollow` and `robots.txt` is `Disallow: /`, whatever the settings say. (NEW, PROPOSED P-133)
- AC-41 Given the robots rules, When pages render, Then url-map §8 applies, plus: `noindex, follow` for a profile whose owner has no active gig, no public portfolio item and no visible review; `noindex` for feature-disabled pages (AC-16, S-075 OFF), the newsletter verify/unsubscribe pages, `/redirect` and all non-public pages. Such pages are never listed in the sitemap. (url-map §8; profile rule PROPOSED P-133)
- AC-42 Given any public page, When it renders, Then it has exactly one `h1`, and every content image has an `alt` text (the item title when nothing better exists). (audit §3.6)

### H. Sitemap and robots.txt (Q-025, S-116, R-042; url-map §9)
- AC-43 Given S-116 is ON in production, When `/sitemap.xml` is requested, Then it returns 200 with a sitemap index whose parts are exactly those of url-map §9 (static, pages, categories, gigs-n, projects-n, profiles-n, hire, blog), each at most 10,000 URLs; every `<url>` is the Georgian URL with `<lastmod>` and `ka`/`en`/`x-default` alternates, the `en` alternate only when English content exists; pending, hidden, rejected, deleted, noindex and feature-disabled items are excluded; changes appear within 1 hour. (CHANGE: live `/sitemap.xml` is 404, fixes D-17-1; ADR-008 §6)
- AC-44 Given S-116 is OFF, When `/sitemap.xml` is requested, Then it returns 404 and `robots.txt` has no `Sitemap:` line. (url-map §9)
- AC-45 Given production, When `/robots.txt` is requested, Then it is the file of url-map §9 (private paths disallowed in both languages, `Sitemap: https://mytask.ge/sitemap.xml`); `admin.mytask.ge/robots.txt` is `Disallow: /` (spec 16 AC-1). (NEW; legacy had none)

### I. `/gita` and the outbound redirector
- AC-46 Given `/gita` (Georgian) or `/en/gita`, When it opens, Then it shows the "MyTask App" landing page; its content is migrated from the two legacy views into an editable CMS page with slug `gita` shown with a landing layout at `/gita` (not at `/page/gita`), title corrected to "MyTask App"; it is indexable and listed in the static sitemap part. (LEGACY `routes/web.php:8-13`, `faq/index.blade.php`; CHANGE: editable, P-134)
- AC-47 Given an external link in user content or staff content, When it is rendered, Then it points to `/redirect?to={url}&sig={signature}`; the page shows the destination and `t_redirecting_notification_alert` with "Continue" and "Back" buttons and never redirects on its own. Only `http`/`https` targets with a valid server signature are accepted; any other value (including legacy encrypted `to` values) shows `t_redirect_link_invalid` with a link to the home page. The page is `noindex` and disallowed in robots.txt. (LEGACY interstitial `RedirectComponent.php:28-43`; CHANGE signature instead of encryption, no open redirect, P-134)

---

## SEO tables (PROPOSED P-132)
### Meta description and Open Graph image per page type
| Page type | Meta description (in page language; Georgian text on fallback pages) | `og:type` | `og:image` |
|---|---|---|---|
| Home `/` | S-115 default description | website | S-115 default image |
| Gig category (3 levels), project category / skill | category SEO text (first 160 characters) or `t_seo_category_description` with the category name | website | category image, else default |
| `/sellers`, `/hire/{keyword}`, `/explore/projects` | `t_seo_sellers_description` / `t_seo_hire_description` (with the keyword) / `t_seo_projects_description` | website | default |
| `/search` | S-115 default (page is `noindex`) | website | default |
| Gig `/service/{slug}` | first 160 characters of the gig description (plain text) | product | gig thumbnail |
| Project `/project/{pid}/{slug}` | first 160 characters of the project description | website | project thumbnail, else default |
| Profile `/profile/{username}` | headline + start of the "about" text | profile | avatar, else default |
| Portfolio item | portfolio title + start of its description | website | first portfolio image |
| Blog list `/blog` | `t_seo_blog_description` | website | default |
| Blog article | SEO description of that language, else excerpt | article (+ `article:published_time`, `article:modified_time`) | cover |
| CMS page, `/gita` | SEO description of that language, else S-115 default | website | default |
| `/subscription`, `/help/contact` | `t_seo_subscription_description` / `t_contact_us_subtitle` | website | default |
| `/reviews/{gigUid}` | `t_seo_reviews_description` with the gig title (page is `noindex`) | website | gig thumbnail |

### JSON-LD per page type
| Page type | JSON-LD |
|---|---|
| Home | `Organization` (name MyTask, url, logo = current logo, `sameAs` = S-114 social links) + `WebSite` with `potentialAction` `SearchAction` → `/search?q={search_term_string}` (English home → `/en/search`) |
| Categories, project categories/skills, `/sellers`, `/explore/projects` | `CollectionPage` + `BreadcrumbList` |
| Gig | `Product` (name, description, image, `sku` = gig uid, `brand` = seller display name, `offers`: `Offer` with the gig price in GEL, `priceCurrency` GEL, `availability` InStock, `url`) + `aggregateRating` only when the gig has at least one visible review (average and count, spec 07) + `BreadcrumbList` (category path) |
| Project | `WebPage` + `BreadcrumbList` (no `JobPosting` at launch) |
| Profile | `ProfilePage` with `mainEntity` `Person` (name, image, url, `jobTitle` = headline) |
| Blog article | `BlogPosting` (headline, image, `datePublished`, `dateModified`, `author` and `publisher` = Organization MyTask with logo) + `BreadcrumbList` |
| CMS page, `/gita` | `WebPage` (`/help/contact`: `ContactPage`) |

Rules: JSON-LD text uses the page language (fallback Georgian); no JSON-LD on noindex pages; prices come from the API in tetri and are written as GEL with 2 decimals.

## Business rules
- R-C1 **URL authority**: `url-map.md` is the single source for paths, 301/302/404/410 rules, hreflang, canonical, sitemap parts and robots; this spec adds only AC-10 (slug-change redirects), AC-41 (extra noindex rules), AC-40 (non-production) and AC-47 (redirector signature). (Q-024, Q-103)
- R-C2 **Content languages** (R-5.8, Q-023): pages, articles, categories and `/gita` have ka/en fields; Georgian is required, English optional; missing English → Georgian with notice, canonical to Georgian, noindex.
- R-C3 **Sanitised content**: CMS and blog content is stored as sanitised HTML with the allowed elements of AC-8; user comments and contact messages are plain text; no script is ever stored in content (scripts only through S-110, spec 16 AC-72…AC-75).
- R-C4 **Terms & Privacy** (Q-083): both pages always include the staff chat-review clause (spec 08 P-71 wording) as a template section.
- R-C5 **Blog** (Q-025): kept and ON (S-117); comments need login; moderation per S-074; S-118 enforced on the server.
- R-C6 **Contact**: stored + admin email to all S-100 addresses; rate-limited; replies by email from the admin; IP/user agent removed after 12 months.
- R-C7 **Newsletter**: double opt-in (legacy); same answer for every address state; tokens 7 days; unsubscribe in every newsletter email; no bulk campaigns at launch.
- R-C8 **Sitemap**: index + parts, cached 1 hour, generated from the API (no per-minute file writes, fixes R-042); S-116 switch.
- R-C9 **Environments**: only production is indexable (AC-40).
- R-C10 **Redirects**: one hop, 301 for permanent moves, 302 for data-dependent ones (url-map §1); slug changes of pages, articles and categories add redirects automatically.

## Money movements
None.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| CMS page | `/page/{slug}`: title, "Last updated" (Terms/Privacy), content, clause section (Terms/Privacy) | Account → Help & legal → page (native) | loading skeleton; 404 page; fallback notice |
| Blog list | `/blog`: cards grid, pagination, newsletter box | opens the web page in the in-app browser (P-129) | empty `t_no_articles_yet`; feature disabled |
| Blog article | content, share buttons, comments list, comment form or login prompt | in-app browser | comment pending/published toasts; comments disabled (no section) |
| Contact | `/help/contact`: form, reCAPTCHA notice, links to FAQ pages | native form | sending; success; field errors; rate-limited |
| Newsletter box | home and blog: email field + "Subscribe" | – | success; invalid email |
| Newsletter verify / unsubscribe | result pages | – (web) | confirmed; invalid/expired; unsubscribed |
| `/gita` | landing layout | "About the app" native page | – |
| Redirect interstitial | `/redirect`: destination, warning, Continue/Back | external links open the system browser after the same warning dialog | invalid link |
| Home blocks, announcement, footer | per settings | home banner; Help & legal links | announcement dismissed |
| Admin: pages, blog, comments, support, newsletter, home content | spec 16 AC-63 | – | – |

Accessibility: one `h1` per page; comment and contact forms have visible labels and announced errors; share buttons have text labels; the announcement close button has an accessible name; contrast per tokens.

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `Admin/PendingArticleComment` (`t_subject_admin_pending_article_comment`) — EV-115 | email | all S-100 | comment pending (AC-19) | LEGACY; CHANGE recipients Q-026 |
| `Admin/PendingMessage` (`t_subject_admin_new_support_message`) — EV-116 | email | all S-100 | contact message (AC-24) | LEGACY; CHANGE recipients |
| `SupportReply` — EV-117 | email | sender | staff reply (AC-26) | LEGACY |
| `NewsletterVerification` (`t_verify_ur_email`) — EV-118 | email | address entered | sign-up (AC-30) | LEGACY |
| `NewsletterApproved` (`t_welcome_to_newsletter_tnx`) — EV-119 | email | subscriber | confirmation (AC-31) | LEGACY; NEW unsubscribe link |
| `StaffEmail` — EV-120 | email | subscriber | staff send (AC-33) | LEGACY (merged template, spec 15 P-113) |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_contact_us` | Contact us | დაგვიკავშირდით |
| `t_contact_us_subtitle` | Need to get in touch with us? Fill the form below with your inquiry and our team will contact you soon | გთხოვთ შეავსოთ ქვემოთ მოცემული ფორმა და ჩვენი გუნდი მალე დაგიკავშირდებათ. |
| `t_name` / `t_enter_your_fullname` | Name / Full Name | სახელი / სახელი და გვარი |
| `t_email_address` / `t_enter_email_address` | E-mail address / E-Mail address | ელ-ფოსტა / ელ-ფოსტის მისამართი |
| `t_subject` / `t_enter_message_subject` | Subject / Enter message subject | სათაური / პრობლემის მოკლე აღწერილობა |
| `t_message` / `t_descibe_ur_message_in_details` | Message / Describe your message in details | შეტყობინება / გთხოვთ მოგვწეროთ პრობლემის შესახებ |
| `t_lets_talk` | Let's talk | გაგზავნა |
| `t_your_message_support_received_success` | Thank you! We have received your message and we will get back to you soon | გმადლობთ! ჩვენ მივიღეთ თქვენი შეტყობინება. ჩვენ მალე გიპასუხებთ |
| `t_re_subject_short` | Re: | Re: |
| `t_message_reply_sent_successfully` (staff) | Your reply has been successfully sent | პასუხი წარმატებით გაიგზავნა |
| `t_newsletter` | Newsletter | სიახლეები |
| `t_subscribe` | Subscribe | გამოწერა |
| `t_pls_enter_valid_email_address` | Please enter a valid email address | გთხოვთ შეიყვანოთ სწორი ელ-ფოსტის მისამართი |
| `t_we_sent_verification_link_newsletter` | We have sent you a verification link to your email to confirm your email address | ჩვენ გამოგიგზავნეთ ბმული თქვენი ელ. ფოსტის მისამართის დასადასტურებლად |
| `t_verify_ur_email` | Verify your email address | ელ-ფოსტის ვერიფიკაცია |
| `t_welcome_to_newsletter_tnx` | Thank you for subscribing | მადლობა გამოწერისთვის |
| `t_blog` / `t_articles` | Blog / Articles | ბლოგი / სტატიები |
| `t_recent_articles` | Recent articles | (missing in legacy ka; NEW ka) ბოლო სტატიები |
| `t_read_more` | Read more | მეტის წაკითხვა |
| `t_comments` / `t_comment` / `t_add_comment` | Comments / Comment / Add comment | კომენტარები / კომენტარი / კომენტარის დამატება |
| `t_ur_comment_has_been_successfully_added` | You comment has been successfully posted, Thank you! (Owner may fix: "Your comment…") | თქვენი კომენტარი წარმატებით დაიპოსტა. მადლობა! |
| `t_ur_comment_will_be_published_soon` | You comment will be visible shortly, Thank you! (Owner may fix: "Your comment…") | თქვენი კომენტარი მალე გამოჩნდება. მადლობა ! |
| `t_subject_admin_pending_article_comment` | Pending article comment | სტატიის კომენტარი მოლოდინშია |
| `t_subject_admin_new_support_message` | New support message | ახალი შეტყობინება მხარდაჭერის ცენტრიდან |
| `t_redirecting_dots` | Redirecting... | მიმდინარეობს გადამისამართება... |
| `t_redirecting_notification_alert` | You are now leaving our website to another website which is out of our control. We are not responsible for any external Web sites | თქვენ ტოვებთ ჩვენს სივრცეს და გადადიხართ სხვა ვებგვერდზე, რომელიც ჩვენს კონტროლს არ ექვემდებარება. შესაბამისად, ჩვენ არ ვართ პასუხისმგებელი სხვა ვებგვერდების უსაფრთხოებაზე. |
| `t_terms_of_service` / `t_privacy_policy` | Terms of service / Privacy policy | მომსახურების წესები და პირობები / კონფიდენციალურობის პოლიტიკა |
| `t_terms_clause_staff_chat_review` | (spec 08, ACCEPTED P-71) | (spec 08) |
| `t_content_shown_in_georgian`, `t_feature_disabled` | (spec 00) | (spec 00) |
| `t_maintenance_mode` | Maintenance mode | განახლების რეჟიმი |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_login_required_to_comment` (legacy key used but missing in both files) | Please log in to write a comment. | კომენტარის დასაწერად გთხოვთ, გაიაროთ ავტორიზაცია. |
| `t_comment_too_long` | A comment can be up to 1,500 characters. | კომენტარი შეიძლება იყოს მაქსიმუმ 1 500 სიმბოლო. |
| `t_too_many_requests_try_later` | Too many attempts. Please try again later. | ძალიან ბევრი მცდელობა. გთხოვთ, სცადოთ მოგვიანებით. |
| `t_no_articles_yet` | No articles yet. | სტატიები ჯერ არ არის. |
| `t_last_updated` | Last updated: :date | ბოლო განახლება: :date |
| `t_staff_review_section_title` | Review of conversations by MyTask staff | MyTask-ის თანამშრომლების მიერ მიმოწერის გადახედვა |
| `t_help_and_legal` | Help & legal | დახმარება და წესები |
| `t_about_the_app` | About the app | აპლიკაციის შესახებ |
| `t_newsletter_confirmed` | Your subscription is confirmed. Thank you! | გამოწერა დადასტურებულია. გმადლობთ! |
| `t_newsletter_link_invalid` | This link is invalid or has expired. Please subscribe again. | ბმული არასწორია ან ვადა გაუვიდა. გთხოვთ, ხელახლა გამოიწეროთ. |
| `t_newsletter_unsubscribed` | You have unsubscribed from the MyTask newsletter. | თქვენ გააუქმეთ MyTask-ის სიახლეების გამოწერა. |
| `t_newsletter_unsubscribe_link` | Unsubscribe from the newsletter | სიახლეების გამოწერის გაუქმება |
| `t_newsletter_box_title` | Get MyTask news by email | მიიღეთ MyTask-ის სიახლეები ელ-ფოსტით |
| `t_redirect_continue` / `t_redirect_back` | Continue to :host / Go back | გადასვლა :host-ზე / უკან დაბრუნება |
| `t_redirect_link_invalid` | This link is not valid. | ეს ბმული არასწორია. |
| `t_seo_category_description` | Find freelancers for :category on MyTask. Compare services, prices and reviews, and order safely. | იპოვეთ ფრილანსერები კატეგორიაში „:category“ MyTask-ზე. შეადარეთ სერვისები, ფასები და შეფასებები და შეუკვეთეთ უსაფრთხოდ. |
| `t_seo_sellers_description` | Discover top freelancers on MyTask by rating and reviews. | აღმოაჩინეთ საუკეთესო ფრილანსერები MyTask-ზე რეიტინგისა და შეფასებების მიხედვით. |
| `t_seo_hire_description` | Hire :keyword freelancers on MyTask. | დაიქირავეთ :keyword ფრილანსერები MyTask-ზე. |
| `t_seo_projects_description` | Browse open projects on MyTask and send your proposal. | დაათვალიერეთ ღია პროექტები MyTask-ზე და გააგზავნეთ თქვენი შეთავაზება. |
| `t_seo_blog_description` | News, tips and stories from MyTask. | სიახლეები, რჩევები და ისტორიები MyTask-ისგან. |
| `t_seo_subscription_description` | Compare MyTask Standard and Premium plans. | შეადარეთ MyTask-ის სტანდარტული და პრემიუმ პაკეტები. |
| `t_seo_reviews_description` | Reviews for ":title" on MyTask. | შეფასებები — „:title“ MyTask-ზე. |
| `t_admin_page_to_review` (staff) | To review: content may be out of date | გადასახედია: შინაარსი შეიძლება მოძველებული იყოს |
| `t_admin_support_status_new` / `_replied` / `_closed` (staff) | New / Replied / Closed | ახალი / პასუხგაცემული / დახურული |
| `t_admin_article_status_draft` / `_published` / `_hidden` (staff) | Draft / Published / Hidden | მონახაზი / გამოქვეყნებული / დამალული |

## Edge cases
- EC-1 An English page exists for a CMS page but the Georgian title is empty (legacy data): the migration reports it; the page is imported inactive until staff fill Georgian (R-5.2).
- EC-2 A blog article is hidden while it has comments: comments are kept; they reappear when it is published again.
- EC-3 A slug is changed back to an earlier value: the redirect for that value is removed and the item answers directly; other old slugs redirect to it.
- EC-4 A newsletter address unsubscribes and signs up again: a new confirmation is required (AC-30).
- EC-5 Someone opens a legacy newsletter link after cutover: legacy tokens were not migrated → invalid page with the sign-up hint (AC-31, AC-34).
- EC-6 The sitemap generator fails: the previous cached version keeps being served; System health shows the failure (spec 16 AC-69).
- EC-7 A gig has 25,000 active items across parts: gigs parts are split by 10,000 (`gigs-1`, `gigs-2`, `gigs-3`).
- EC-8 A contact message comes from a banned user who is logged out: it is accepted (support must be reachable); staff see the user link.
- EC-9 Staff remove the clause text from the Terms content by mistake: nothing changes publicly, because the clause is a template section (AC-11).
- EC-10 A user pastes a `javascript:` link into a blog comment: comments are plain text; links in staff content are only `http`, `https` or `mailto` and go through the redirector when external (AC-47).

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-17-1 | `/sitemap.xml` returns 404 although a job rewrites the file every minute outside the web root | `GenerateSitemap.php:36-60`, `Kernel.php:17` (R-042) | AC-43 |
| D-17-2 | Blog disabled live; blog URLs silently redirect to the home page | `BlogComponent.php:29-36`, `ArticleComponent.php:36-40` | AC-15, AC-16 (Q-025) |
| D-17-3 | "Comments enabled" switch not checked when saving a comment | `ArticleComponent.php:152-194` | AC-18 |
| D-17-4 | Key `t_login_required_to_comment` used but missing in both languages | `ArticleComponent.php:161`, `lang/*/messages.php` | Texts (NEW values) |
| D-17-5 | Every page declares JSON-LD type `WebSite` | `PageComponent.php:97-103` and other components | AC-39 |
| D-17-6 | No hreflang; language by session with identical URLs | `i18n.md`, `SetLocale.php:24-48` | AC-1, AC-4 (url-map §8) |
| D-17-7 | Pages always use the site's default meta description | `PageComponent.php:63` | AC-8, AC-38 |
| D-17-8 | Newsletter: silent return for confirmed addresses, tokens never expire, no unsubscribe, verify page redirects silently | `HomeComponent.php:211-218`, `VerifyComponent.php:42-66` | AC-30…AC-32 |
| D-17-9 | Contact and comment admin emails to the first admin, in the site language | `ContactComponent.php:133`, `ArticleComponent.php:208` | AC-19, AC-24 (spec 15) |
| D-17-10 | `/gita` is hard-coded HTML (title typo "Mytast App"), not editable | `faq/index.blade.php:8` | AC-46 |
| D-17-11 | One blog SEO description for all languages | `Admin/Blog/Options/CreateComponent.php:121-123` | AC-17 |
| D-17-12 | Outbound redirector page is indexable | `RedirectComponent.php:95` | AC-47 |
| D-17-13 | Changing a page slug breaks its old URL | `Admin/Pages/Options/CreateComponent.php:73` | AC-10 |
| D-17-14 | No robots.txt | live check (url-map) | AC-45 |

## Out of scope
- Writing the legal texts of Terms and Privacy (the Owner's responsibility); only the clause of Q-083 is fixed here.
- Bulk newsletter campaigns and a newsletter editor (not in legacy; P-131).
- Blog inside the mobile app as native screens (P-129: in-app browser).
- `JobPosting` rich results for projects (P-132).
- A cookie-consent banner: first-party analytics need none (ADR-012); if the Owner adds third-party tracking through S-110, the legal need for consent is the Owner's decision.
- AI translation of content (vision, later; storage ready per ADR-006 §5).
- Search, category and gig/project page content (specs 03, 04, 10); URL tables (url-map.md).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-127 CMS pages.** Keep the 7 pages and external-link pages; add an SEO title and description per language; when staff change the slug of a page, article or category, the old URL redirects (301) to the new one automatically.
- **P-128 Terms & Privacy.** The staff chat-review clause (spec 08 P-71 wording) is added by the page template as its own section, so it cannot be deleted by accident while editing; both pages show "Last updated". The legacy Payments page mentions SMS one-time codes that do not exist (Q-043): it is flagged "to review" so staff update the text before launch (no automatic change).
- **P-129 Blog.** Articles get statuses draft / published / hidden and per-language SEO; migrated articles are imported **hidden** (the blog was switched off live, so staff review before publishing); comments: login required, 1–1,500 characters, at most 5 per 10 minutes per user, "comments enabled" checked on the server; with the blog switched off the pages show "feature disabled" instead of redirecting home; the mobile app opens the blog in the in-app browser.
- **P-130 Contact form.** Rate limit 5 messages per hour per IP and per email (on top of reCAPTCHA); support inbox with statuses new / replied / closed and the stored reply; the IP address and browser data are deleted after 12 months.
- **P-131 Newsletter.** The same success message whatever the address state (no way to probe who is subscribed); confirmation links valid 7 days; the legacy `?id=` link form still accepted; visible confirmed / invalid pages instead of a silent redirect; NEW unsubscribe link in every newsletter email; export kept (CSV or XLSX, audited); no bulk campaign tool and no sign-up in the mobile app at launch.
- **P-132 Structured data.** JSON-LD per page type as in the table: Organization + WebSite search box on the home page, Product (with price and, when reviews exist, rating) for gigs, ProfilePage for profiles, BlogPosting for articles, BreadcrumbList on lists, gigs and articles; no JobPosting for projects at launch. Meta descriptions per page type as in the table.
- **P-133 Extra noindex rules.** Local and staging are never indexable; profiles with no active gig, no public portfolio item and no visible review are `noindex, follow` (thin pages) and left out of the sitemap.
- **P-134 `/gita` and the redirector.** `/gita` becomes an editable CMS landing page (content migrated, title corrected to "MyTask App"). External links go through a signed `/redirect` warning page that never redirects on its own; legacy encrypted redirect links show an "invalid link" page.
