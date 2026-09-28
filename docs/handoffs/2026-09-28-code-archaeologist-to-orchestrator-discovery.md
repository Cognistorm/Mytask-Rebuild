# Handoff: code-archaeologist → orchestrator — Phase 1 Discovery
Date: 2026-09-28
## What I did
Read `legacy/APP` (routes, middleware, 230 migrations, 152 models, key Livewire money/lifecycle components, commands, notifications, lang files, config) and fetched the live site read-only (home, /subscription, /explore/projects, a project page, /page/payments, /page/how-platform-works, /ka/gita, /blog, /sitemap.xml). Produced the discovery documents listed below with file:line evidence. No legacy files modified; no secrets copied.
## Files created/changed
docs/01-discovery/{inventory,routes-and-pages,data-model,features,roles-and-permissions,notifications,integrations,i18n,risks-and-debt}.md; appended Q-002…Q-048 to docs/01-discovery/open-questions.md; docs/STATUS.md.
## What the next agent must do
1. Owner: rotate hard-coded credentials (BOG, Binance, Pusher, findip) and check whether `.env`/`error_log` are web-reachable (Q-041, Q-042) — urgent, independent of the rebuild.
2. Owner: answer Q-002…Q-048; provide production schema dump (Q-003), settings rows (Q-002), production `lang/` folder (Q-031).
3. product-analyst: write specs starting with vision priorities (gigs, projects/proposals, escrow, dual dashboard, chat/notifications) from features.md; money rules must wait for Q-004…Q-012, Q-037.
4. solution-architect: design a double-entry ledger (not string balances) and plan how legacy balances map (Q-008, Q-038, Q-039); keep URL patterns `/service/{slug}`, `/project/{pid}/{slug}`, `/profile/{username}`, `/categories/...`, `/page/{slug}` (Q-024).
5. security-reviewer: review risks-and-debt.md R-001…R-022.
## Open questions / risks
47 open questions (Q-002…Q-048). Critical risks R-001…R-006 (hard-coded secrets, forgeable BOG success, free wallet credit via cancel, points exploit). Incomplete areas: gig create/edit wizard details, admin component-by-component rules, blog/newsletter, search ranking/sorting, category/attribute filters, profile editing rules, portfolio, and seller earnings reports were only surveyed, not traced line-by-line; admin `/dashboard` pages were not compared with the live admin (no access). Route-by-route live verification was sampled, not exhaustive.

_Note: the code-archaeologist has read-only tools; the main session saved these files verbatim from its report._
