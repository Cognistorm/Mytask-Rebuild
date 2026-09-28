## What I did
Task P2-A2 from `docs/03-architecture/phase-2-plan.md`: specs 01–04, written on top of the approved `00-platform-rules.md` (settings S-xxx, rules R-x.x and removed features X-xx are referenced, not repeated). All Owner answers Q-002…Q-080 and P-1…P-13 were applied. I traced in `/legacy/APP` the areas discovery had only surveyed (gig wizard, profile editing, portfolio, search/filters/sorting, `/sellers`, `/hire`, project taxonomy, auth details). Each spec lists file:line evidence at the top.

| Spec | Status | ACs | Highlights |
|---|---|---|---|
| `01-auth.md` | ready for Owner | 52 | Legacy bcrypt login + rehash; register/verify/reset/change as legacy; NEW optional email 2FA on new device/IP (S-056, S-057…S-059), staff 2FA toggle (S-060); NEW login throttling (S-062/S-063); reCAPTCHA (S-061); social login with keys in Admin, OFF until configured, now with status checks (fixes R-020); restrictions/appeals/staff IP ban (Q-057) |
| `02-profiles-and-dashboards.md` | ready for Owner | 41 | Dual role, Buying/Selling switcher with shared memory; Selling Home KPIs incl. Available/HOLD; public profile with two rating blocks (as freelancer / as client, Q-062), no levels (Q-014); profile editing restored; portfolio with moderation (S-071); availability for all users; account settings + deletion; KYC manual, private files (fixes R-039), integration-ready (S-122); username masking rule (BR-015) |
| `03-categories-and-search.md` | ready for Owner | 37 | 3-level gig tree; one set of filter rules for search and category pages; exact Premium ranking rule and "Featured" badge (Q-069); keyword search by words; `/sellers` and `/hire` without levels/account_type; project categories/skills; `/en/` prefix with Georgian fallback (Q-023, Q-024) |
| `04-gigs.md` | ready for Owner | 39 | Wizard as live (Overview, Pricing, Gallery, SEO) + NEW mandatory number of revisions 0…S-041 (Q-056, P-1); Latin allowed with Georgian (Q-022); plan limit S-001/S-002; moderation S-070 with published / needs-changes notifications; gig page with Georgian fallback (no more 404); favourites; reports; analytics without ip-api (Q-055) |

Key legacy findings (they drive the PROPOSED items):
- `/account/profile` (edit profile) has a component and view but **no route**, so the live "Edit profile" link is a 404 (R-037). Freelancers cannot edit headline, skills, languages or availability today.
- The live gig wizard is one page with Overview, Pricing, Gallery and SEO only. Upgrades, FAQ, tags, video and requirement questions exist in code and DB but are never saved by the live wizard. The gig page and checkout still sell upgrades that exist in the data.
- Gig edit does not save the child category, and it rebuilds the slug from the current UI language on every save (URL changes).
- Search and category pages use different filter rules (rating ≥ N vs between N and N+1; price sorted as number vs as text). The delivery filter is "exactly N days". The default search order is undefined.
- The only legacy "top offers" logic is the home "Top gigs" row (owners with any subscription row, even expired).
- Project skills point to gig categories while projects point to project categories (works only if ids match).
- Registration requires 8+ characters with an uppercase letter and a digit, but reset and change accept 6+. The key `t_password_validation_message` has no value in either language.
- Social sign-ups get no referral code. Verification links activate an account whatever its status. Login shows "something went wrong" for pending and banned users.

## Files created/changed
- `docs/02-specs/01-auth.md` (new)
- `docs/02-specs/02-profiles-and-dashboards.md` (new)
- `docs/02-specs/03-categories-and-search.md` (new)
- `docs/02-specs/04-gigs.md` (new)
- `docs/02-specs/README.md` (rows 01–04 → ready for Owner; last-update line)
- `docs/STATUS.md` (P2-A2 lines only)
- `docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a2.md` (this file)
- `docs/01-discovery/open-questions.md`: **not changed** (no new questions were needed; every open point has a sensible default and is written as a PROPOSED item).
Nothing was committed to git.

## What the next agent must do
- **Owner:** review the four specs and accept or correct PROPOSED items **P-14…P-37** (listed at the end of each spec). Then mark each spec `approved`. Two items touch other documents:
  - P-25 adds a settings-register row **S-123 `profile.linked_accounts.enabled`** (prod → OFF). If accepted, the product-analyst adds it to `00-platform-rules.md` §4 (00 is approved, so this needs your OK).
  - P-32 decides whether the gig wizard gets Upgrades and FAQ blocks. It is the biggest scope decision in this wave.
- **Orchestrator:** start P2-A3 (money specs 05, 06, 07, 09, 14) when ready. Spec 06 must take over from 04: copying price, upgrades, delivery time and number of revisions onto each order; keeping "orders in queue" up to date (04 R-G8); the free-text order details (BR-036); the cart refusing unavailable, restricted or no-longer-active gigs. Spec 07 must provide the two rating blocks used in 02 AC-10 and the gig rating used by 03 sorting. Spec 09 must credit referrals on activation (01 AC-6/AC-7). Spec 10 uses the masking rule (02 AC-41) and the project taxonomy (03 R-S8). Spec 16 needs permissions for: banned IPs (01 AC-52), restrictions/appeals, user activation, 2FA reset for a user (01 EC-8), portfolio/gig moderation, KYC review, reports.
- **solution-architect (P2-B1…B4):** ADR-002 must cover legacy bcrypt `$2y$10$` verify-and-rehash (01 AC-12), device-identifier trust for 2FA (01 R-A6; P-15 follows the ADR-002 device-only recommendation, and the Owner answers both at once), session list and revoke (01 AC-42…AC-45), instant revoke on ban (P-16), and the mobile reCAPTCHA mechanism (01 R-A10). ADR-011 must support word-based matching in both languages and the group-first Premium ranking with a daily-seeded order and stable cursor paging (03 R-S3). ADR-012 provides the local IP-location source for gig analytics (04 AC-39). ADR-009: KYC and appeal files private with signed links. url-map (P2-B3): old gig slugs → current slug via the uid suffix (04 AC-33), `/post/service` → `/create`, `/hire/{kw}` fallback to `/search`, canonical rules for filtered lists (03 AC-37).
- **ui-ux-designer (P2-C4):** the gig wizard layout depends on P-32 (web one page; mobile stepper). The mobile gig page needs a sticky price/"Add to cart" bar. The switcher must show labels on phones.

## Open questions / risks
- No new Q-IDs. 24 PROPOSED items (P-14…P-37; P-18 is in spec 02) wait for the Owner. If P-32 is rejected in the "all blocks" direction (tags, video, requirement questions too), specs 04 and 06 grow.
- Translation quality: some legacy Georgian values need Owner attention: `t_basic` is a joke ("გაქცეულს მოვაბრუნებ"), `t_verifications` is English in the ka file, `t_actions` = "აქციები" (reads as "promotions"). About 15 legacy keys used here have no ka value; I filled them and marked them "(NEW ka)".
- `t_english_fields_optional_notice` (legacy) says gigs without English will not appear in English. That is false after Q-023, so it is replaced by `t_english_fields_optional_notice_v2`.
- Production data unknowns: legacy gig statuses `boosted/trending/featured` are assumed to have no behaviour (migrate as active). Project-category ↔ gig-category slug matching (P-31) must be checked on the production DB copy in Phase 5.
- S-093 (allowed file types for restriction appeals) has no known value; spec 01 AC-47 depends on it. The architect proposes a list in the P2-B1 handoff; the Owner confirms before slice 01 ships.
- The architect's 9 Owner questions (P2-B1 handoff) were not copied into `open-questions.md` by me; the orchestrator may do so. Question 2 there (2FA device vs IP) is the same decision as P-15(a) here.
- The Premium ranking (P-26) intentionally leaves price sorts unboosted. If the Owner wants the boost on every sort, only AC-15/AC-16 and R-S3 step 4 change.
