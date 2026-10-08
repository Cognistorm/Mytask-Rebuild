# Handoff: backend + web → QA (re-check) and orchestrator, 4.3.20a: slice 3 fixes, part a

## What I did
4.3.20 was split into a, b and c in `docs/ROADMAP.md` (backend/CI/security, then the card heart, then the web minor items). This is part a.

- **BUG-01 (major, CI red)**: `apps/api/test/content-language.test.ts` no longer has a static import of `@mytask/i18n`. That package is an ESM TypeScript package for the web and mobile bundlers, and the API's Node16 CommonJS typecheck cannot import it. The test now loads the package at run time with a variable specifier (Vitest resolves it, `tsc` does not) and types the three functions locally. The client/API parity test still runs, and root `pnpm typecheck` is green.
- **BUG-02**: ran prettier on `apps/admin/e2e/sidebar.spec.ts`.
- **SEC-80 (a)**: `sniff()` (`apps/api/src/modules/files/scan/magic.ts`) takes `{ pdfAtStart }`. The worker sets it for every purpose whose final bucket is `public_media` (`file-scan.service.ts`). A public file is a PDF only when `%PDF-` is at byte 0. Private files (appeals) keep the PDF readers' 1024-byte rule. The two polyglots of probe P1 (HTML, SVG) are regression cases in `files-scan-units.test.ts`, and end to end as `gig_document` (rejected `t_file_rejected_type`, nothing in `public_media`) in `files-scan.test.ts`.
- **SEC-80 (b)**: `ObjectStorage.copy` takes `CopyTarget.contentDisposition`. S3 sends `ContentDisposition` together with `MetadataDirective: 'REPLACE'`. The worker stores every file it keeps as uploaded with `attachmentDisposition(originalName)`, which uses the existing RFC 6266 helper (ASCII fallback + UTF-8 name). That covers gig documents and also private appeal files, where it does no harm. `head()` reports the header when it is set. The real-storage integration test proves that SeaweedFS stores it (`S3_INTEGRATION=1`, 6/6).
- **SEC-82**: `next` 16.3.7 → 16.3.8 in `apps/web` and `apps/admin`, plus `@next/eslint-plugin-next` 16.3.8 in `packages/config`. `pnpm audit --prod` lists no `next` advisory any more. The only advisory left on the next path is the known `source-map-js` one (I-55).
- **F-01**: `TemplateInput.fullName` was added. The outbox dispatcher passes the profile's `fullname`. EV-21 greets `fullname ?: username`, as `YourGigNeedsChanges.php:40` does. Other events are unchanged; their legacy classes are left for their own slices (the spec 15 note from QA).

## Files created/changed
- `apps/api/src/modules/files/scan/magic.ts`, `scan/file-scan.service.ts`, `src/platform/storage/storage.ts`, `src/platform/mail/templates.ts`, `src/worker/outbox.dispatcher.ts`
- `apps/api/test/content-language.test.ts`, `files-scan-units.test.ts`, `files-scan.test.ts`, `gigs-admin.test.ts`, `memory-storage.ts`, `storage.integration.test.ts`
- `apps/admin/e2e/sidebar.spec.ts` (format only)
- `apps/web/package.json`, `apps/admin/package.json`, `packages/config/package.json`, `pnpm-lock.yaml`
- `docs/ROADMAP.md` (split, 4.3.20a ticked), `docs/STATUS.md`, this handoff

## Checks run
- Root `pnpm format:check`, `pnpm typecheck`, `pnpm lint`: PASS (12/12 tasks).
- API: 777 passed / 6 skipped. The first run inside `pnpm test` had one failure, which did not repeat; details under Open questions.
- `S3_INTEGRATION=1` storage integration test against the local SeaweedFS: 6/6. The infra was stopped afterwards.
- Production builds of web + admin on Next.js 16.3.8. Web E2E: 285 passed + 3 skipped. Admin E2E: 77 passed + 7 skipped.
  - The first web run had one timing failure in `custom-code.spec.ts:80`. It passed alone and in a full re-run.

## What the next agent must do
- **4.3.20b (web + mobile):** BUG-03, the favourite heart on gig cards (see ROADMAP).
- **4.3.20c (web):** BUG-04 (+ N-14), BUG-05 and BUG-06. Then F-02 once the Owner has chosen the text.
- **QA re-check (report §14), after 4.3.20c:**
  - root typecheck + format:check;
  - EV-21 in Mailpit: the greeting uses the full name;
  - a gig PDF upload with an HTML prefix is refused;
  - a real PDF opens as a download (`/media/files/<id>` sends `Content-Disposition: attachment`).
- **Security:** the merge conditions SEC-80 (a)+(b) and SEC-82 are done. Review 10 says no re-review is needed; QA confirms the tests.

## Open questions / risks
- **Gig documents uploaded before this change** stay stored without the header. Only local and staging test data is affected. Real data arrives with the Phase 5 migration, which writes the objects through the new path.
- **Flaky tests seen once each (not changed here):**
  - `gigs-admin.test.ts` "is the queue with status=pending…" failed inside the turbo run but passed alone and in the next full run. It may depend on how many pending gigs other test files leave in the shared DB (it uses `limit: 200`) or on equal `submittedAt` times.
  - The web `custom-code.spec.ts:80` failure was a page-load timing issue.

  Worth hardening if either shows up in CI.
- SEC-80 (c) (media host / headers) and the architect's R-G11 ADR note remain Phase 6 items, as in review 10.
