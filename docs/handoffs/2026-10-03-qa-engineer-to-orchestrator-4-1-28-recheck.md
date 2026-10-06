## What I did
This is the QA re-check of slice 02 (spec 02 Profiles) after the 4.1.28 fixes: ROADMAP 4.1.28, last step. It was an independent session; QA did not write the fixes.

**Verdict: PASS with notes.** No blocker or major bug is open.

### Two runs
- Run A was at `b7db76ac`.
- During run A, `76423d63`, `505e86d5` (files: SEC-73, I-38) and `b8496e79` (Prettier) landed. QA repeated the product and stack checks at **`b8496e79`** (run B).

### Suites
- **`turbo lint typecheck test --force`:** 22/22. API: 421 passed + 6 skipped.
- **Generated code:** `gen:check` passes.
- **i18n:** `i18n:check` passes (en 3009 / ka 3015).
- **Formatting:** `format:check` failed at `b7db76ac` and passes at `b8496e79` (BUG-07, now closed).
- **Web E2E:** production build, 110 passed + 3 skipped (the slice-01 full-stack auth tests, as before).
- **Admin E2E on the full stack:** 17/17 in both runs, including `profiles-main-flow`.
- **App:** `expo export` passes (iOS 1316 / Android 1450 modules).
- **S3:** `storage.integration` with `S3_INTEGRATION=1` passes 6/6 in both runs, including the new SEC-63 test.

### Browser checks on `pnpm local` (throw-away PGlite DB): 70/70 in both runs
- **BUG-01:** 6 cases × ka/en × 1280/390 px:
  - cases: unknown profile, unknown profile portfolio, pending and rejected work opened as a guest, unknown URL, unknown `/account/...` URL;
  - each one: HTTP 404, the right `html lang`, the legacy texts in ka/en, the title "გვერდი ვერ მოიძებნა | MyTask" / "Page not found | MyTask", `noindex`, and a link home to `/` or `/en` that works;
  - the same page signed in;
  - the `[...missing]` catch-all hides no existing route.
- **BUG-03:** at 390 px the content comes first and the account card (with the theme switch) comes below it; at 1280 px they stay side by side.
- **BUG-04:** one full stop after a reason that ends in ".", in the web list, edit and item pages (ka + en) and in the EV-126 email in Mailpit. The app uses the same `inSentence`.
- **BUG-05** and **F-04:** the doc lines are fixed.
- **BUG-02** and **BUG-06:** closed as DEV-P1 (Owner-approved), and not re-tested.

### Upload regression on the real stack after SEC-62…65, SEC-70a, SEC-73, I-38: 26/26
- **Avatar:** 3 public WebP variants. The POST policy now lasts 10 min.
- **SEC-63:** a re-POST after the scan does not change the ready file. The late-quarantine Redis set is filled.
- **Portfolio images:** approve, reject and pending all behave as before, and only approved works are public.
- **KYC:** the signed object now answers `Cache-Control: private, no-store`. Without the signature it answers 403; for another user, 404.
- **Appeal file** (the ETag-conditional copy on SeaweedFS): upload → appeal 201 → staff download returns the same bytes.
- **SEC-62:** the filer :8888 answers 404 to every read, list and write, on 127.0.0.1 only.
- **SEC-65:** Caddyfile checked by reading + the unit test (no Caddy locally).

### Clean-up
Every process I started is stopped; no listener is left on the stack ports. Two `bash` loops that wait for this handoff belong to the orchestrator and were left alone.

## Files created/changed
- `docs/06-qa/reports/02-profiles-2026-10-03.md`: the top verdict is now "PASS with notes", and the new **§16 Re-check after 4.1.28** sits at the end.
- `docs/handoffs/2026-10-03-qa-engineer-to-orchestrator-4-1-28-recheck.md` (this file).
- No product code was changed and nothing was committed. ROADMAP.md and STATUS.md were not touched. Their working-tree changes and the `open-questions.md` change come from other agents.
- The QA scripts and screenshots stay in the session scratchpad (`…/scratchpad/qa28/`).

## What the next agent must do
- **Orchestrator:**
  - mark 4.1.28 done (QA PASS with notes);
  - commit the report and the handoff;
  - track the two minor items below.
- **web-engineer (minor, can wait):**
  - **BUG-08:** on the 404 page below 640 px, "404" and the text are about 300 px apart. Cause: `apps/web/src/components/not-found/not-found.css`, `.mt-not-found` is flex-wrap with `min-height:100vh` and no `align-content`. Suggested fix: `align-content: center`. Repro: open `/no/such/page` at 390×844.
  - **F-05:** the legacy 404 page also has a "Contact us" button (`t_contact_us` → `/help/contact`). Add it when the spec 17 contact page exists, or the Owner accepts dropping it.
- **devops/backend (N-13):** a parallel `turbo run lint typecheck test` can fail once with `EEXIST … src/generated/prisma/models`, because two tasks run `prisma generate` at once. CI could flake on it.
- **docs (N-12, optional):** SETUP-LOCAL says port 8888 is "switched off". It still listens on 127.0.0.1 but answers 404 to everything, and 18888 and 19333 also listen locally.

## Open questions / risks
- **For the Owner:** accept F-05 (no "Contact us" button on the 404 page until the contact page exists) or keep it as a small fix for later.
- F-02 is still open: with `LOCAL_PGLITE_DIR`, Redis, SeaweedFS and Mailpit are still shared with the Owner's normal stack. This run added test users' files and emails there; nothing in the Owner's database was touched.
- The app was checked by build only (no device). The phone steps of SETUP-LOCAL §4 (§13 of the report) stay with the Owner.
