## What I did
- Security review 10 of slice 3 (gigs) on `feat/gigs` @ `fa2a1d3b`, uploads first: the three gig purposes, the worker path for gig images and PDFs, attaching files to gigs, purge/clean-up, the public serving path, plus ownership, staff moderation, reports, emails, analytics privacy and the new client upload code.
- Probes: the real magic-byte check on PDF/HTML/SVG polyglots (P1), the serving config (P2), the gig and file API suites (15 files, 194 tests passed), `pnpm audit --prod`.
- Verdict: **PASS with conditions**. 0 Critical, 0 High, 1 Medium (SEC-80), 4 Low (SEC-81…84), 5 Info (I-57…61).

## Files created/changed
- `docs/06-qa/security/10-slice-04-gigs-uploads-2026-10-08.md` (new: the review)
- `docs/ROADMAP.md` (4.3.19 ticked; 4.3.20 names the security items)
- `docs/STATUS.md` (log line, next micro-task 4.3.20)
- No product code changed.

## What the next agent must do
- **4.3.20, before merge:**
  - backend-engineer: SEC-80 (a). For `gig_document`, accept a PDF only when `%PDF-` starts at byte 0. Add the two P1 polyglots (HTML and SVG followed by `%PDF-`) as regression cases.
  - backend-engineer: SEC-80 (b). Store gig documents with `Content-Disposition: attachment` and the cleaned original name: add it to `StorageService.copy`, and add a test.
  - web-engineer: SEC-82. Upgrade Next.js from 16.3.7 to 16.3.8 in `apps/web` and `apps/admin`, then re-run the web and admin E2E suites.
  - The QA bugs BUG-01…06 and F-01, as in the QA report.
- After 4.3.20, no security re-review is needed for the merge. QA confirms the new tests pass.
- **Later:**
  - SEC-81, together with SEC-79 / SEC-73 / SEC-74.
  - Before Phase 6: SEC-83 (cap on visit counts per IP) and SEC-84 (maximums for S-077/078/081/082).
  - Phase 6, devops: SEC-80 (c), a media host or headers.
  - Architect: an ADR note that R-G11 puts gig documents in `public-media`.

## Open questions / risks
- Owner, when convenient:
  - I-57: should a staff removal take the gig's images and PDFs offline until a restore? Today they stay reachable by direct URL, as in legacy.
  - I-58: PDF file names are shown publicly. Should the wizard show a hint about this?
- Risk if SEC-80 (a)+(b) are skipped: raw user files on the site's own origin are protected by a single response header, which a later CDN or proxy change could drop.
