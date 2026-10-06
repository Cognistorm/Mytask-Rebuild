# Handoff — web-engineer → qa-engineer, security-reviewer (ROADMAP 4.0.2)
Date: 2026-10-02 | ADR: ADR-019 §2 (accepted, Owner Q-158 (a)); ADR-013 §5, §7 | Branch: `feat/adr-019-followups`

## What I did
- **Two root layouts** in `apps/web/src/app/[locale]`: `(public)` (home today; the spec 16 AC-73 allow-list as slices add pages) and `(private)` (auth, account, restricted, app-return; later seller, cart, checkout, payment, inbox). No layout above them, so every navigation between the two is a full document load (Next.js multiple root layouts). Both render the shared `components/document.tsx` (fonts, tokens, `styles/globals.css`, moved from `app/[locale]/globals.css`).
- **CSP on every page** (there was none before): `src/proxy.ts` makes a fresh nonce per request and sends `Content-Security-Policy` on the response and on the request, so Next.js puts the nonce on its own scripts. Strict policy (`lib/csp.ts`): `default-src 'self'`, `script-src 'self' 'nonce-…'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `font-src 'self'`, `connect-src 'self'`, `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`; `next dev` only adds `'unsafe-eval'` and `ws:`. Public paths (`lib/zones.ts`) add the S-127 hosts (`https://<host>`, malformed names dropped) to script/img/connect/frame sources; private paths never do. No `'strict-dynamic'` (it would ignore the host list).
- **Custom code** only in the public root layout: `lib/custom-code.ts` reads `getWebCustomCode` (60 s cache per process; any failure or `enabled: false` = no code and no extra hosts), adds the page nonce to every `<script` tag, renders the head slot first in `<body>` (React cannot put raw HTML in `<head>`) and the footer slot last.
- All pages are now rendered per request (needed for nonces); 404s keep working (strict CSP).
- Placeholder home: Login + Account settings links (existing keys `t_login`, `t_account_settings`) until the real header (slice 02).
- **E2E** `e2e/custom-code.spec.ts` (4): public page runs the custom code with the nonce, CSP lists the S-127 host, no CSP console errors; clicking to `/auth/login` and to `/account` is a document load, the marker is gone and the CSP has no S-127 host; `/en/auth/login` → "Back to homepage" is a document load and the code starts fresh; every `page.tsx` under `(public)` is public in `zones.ts` and every other one is private. `e2e/fake-api.mjs` (port 3199) stands in for the server's API calls (custom code, health); Playwright starts it and points `API_INTERNAL_URL` at it. The spec skips with `PW_REUSE=1` (the real API serves custom code from slice 17).
- Results: web E2E 39 passed / 3 skipped (stack-only); typecheck/lint 9/9; format OK; build OK. Run on a temporary port 3101 because the Owner's `next dev` held 3100 (`social.spec.ts` hard-codes the 3100 origin, so it ran as a port-adjusted copy, 10/10). Dev mode checked against the running `next dev`: no CSP violations, login page hydrates.

## Files created/changed
- `apps/web/src/app/[locale]/(public)/layout.tsx`, `(public)/page.tsx`, `(private)/layout.tsx`, `(private)/**` (moved pages; relative imports one level deeper)
- `apps/web/src/components/document.tsx`, `src/lib/{csp,custom-code,zones}.ts`, `src/proxy.ts`, `src/styles/globals.css` (moved)
- `apps/web/e2e/custom-code.spec.ts`, `e2e/fake-api.mjs`, `playwright.config.ts`
- `docs/SETUP-LOCAL.md` (port 3199 note)

## What the next agent must do
- **Every slice that adds a public page** (AC-73 list): put it under `(public)` and add its pattern to `src/lib/zones.ts` (the E2E fails otherwise).
- **Slice 17 (4.15.14):** the API's `getWebCustomCode`; the path-scoped vendor table (ADR-019 §4, e.g. `https://www.googletagmanager.com/gtag/`) belongs in `lib/csp.ts`; then the custom-code spec can also run full stack.
- **Security review (slice 17 or earlier):** check the CSP directives above, especially `style-src 'unsafe-inline'` (React style attributes) and the head slot being emitted in `<body>`.
- **Later:** reCAPTCHA on web (S-061, I-26) needs `www.google.com` / `www.gstatic.com` in `script-src`/`frame-src` when it is built; BOG checkout redirects are navigations (not affected by `form-action` unless a form posts to BOG — check in slice 05).

## Open questions / risks
- The head slot sits in `<body>`, not `<head>`. Scripts (GA4, Clarity) behave the same; `<meta>` verification tags in S-110 would not work there. If the Owner needs such tags, slice 17 adds a parser that puts them in `<head>`.
- Every page is now rendered per request (nonce CSP). That is fine at today's size; slice 03/04 public pages should still cache their data fetches.
