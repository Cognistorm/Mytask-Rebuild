# 4.1.25 E2E main flows — slice 1 (spec 02 Profiles)

## What I did
- **Full-stack main-flow test** `apps/admin/e2e/profiles-main-flow.spec.ts` (website + admin, real API, SeaweedFS and worker, no routed API):
  1. Register a new user (API) and sign in on the website.
  2. Edit profile (AC-15…AC-23): avatar upload (presigned POST → worker → WebP variants → `putMyAvatar`, the image must load), headline, About me, skill (Expert), language (ქართული, Native), availability (earliest date + message).
  3. Portfolio (AC-24, AC-25): create with thumbnail + gallery, both uploads `ready`, "successfully added"; pending when S-071 is OFF.
  4. Verification centre (AC-36, AC-38): passport → front → selfie → "Verification pending".
  5. Staff (spec 16 AC-19, AC-27): `owner` signs in to the admin, approves the work (filtered by user ID) and the documents (legacy confirm).
  6. User sees the work "Active" and "Account verified".
  7. Guest (AC-8…AC-13, AC-28): public profile shows the name, headline, avatar image, ID verified, language, availability notice, About me, skill, no "Edit profile"; the preview card opens the work page (title, gallery images, no pending note).
  - Skipped without `ADMIN_E2E_LOG` (same pattern as `restrictions.spec.ts`).
- **Bug found and fixed (local storage):** under `pnpm local` every public image (avatars, portfolio, on web **and** app) answered **403**. SeaweedFS had no anonymous access, and the "CDN or proxy" path of ADR-009 / ADR-017 was never set up locally. Fix: an `anonymous` identity in the generated S3 config with **`Read:public-media` only**. This matches ADR-009: public read of processed variants only, no listing. Checked: an image gives 200; listing `public-media/`, the root and `kyc/` give 403. `docker-compose.yml` got the same identity (reference / CI). Each `pnpm local` start rewrites `.local/s3.json`, so restarting is enough.
- **`LOCAL_PGLITE_DIR`** (optional) in `scripts/local.mjs`: starts the platform on a throw-away database folder. It gets a fresh seed and prints the Super-admin password, and the Owner's `apps/api/.pglite` is not touched. Documented in SETUP-LOCAL §5.
- **Mobile E2E decision:** the app keeps the **manual** SETUP-LOCAL §4 steps 10–16 for slice 1. No harness was added. Maestro (the lighter option compared with Detox) needs an Android emulator or iOS simulator plus Java on the Owner's computer, and it does not run against Expo Go. That is a tooling and setup choice for the Owner/DevOps (see open questions). Until then the web and admin E2E cover the API behaviour the app shares.

## Results
- Admin E2E against the stack (`PW_REUSE=1`, fresh DB): **17/17 passed** (the new test in 34 s, incl. the pending → approve path).
- `@mytask/admin` typecheck and lint clean; prettier clean on the changed files.
- The web suite was not re-run: no web code changed. It starts its own build on :3100.

## Files created/changed
- `apps/admin/e2e/profiles-main-flow.spec.ts` (new)
- `scripts/local.mjs` (anonymous read on public-media; `LOCAL_PGLITE_DIR`)
- `docker-compose.yml` (same anonymous identity, `S3_BUCKET_PUBLIC` env)
- `docs/SETUP-LOCAL.md` §5 (full-stack tests)

## What the next agent must do
- **4.1.26 QA parity report** (qa-engineer): run the new flow as part of the plan. Images now load locally, so re-check every image-showing screen on web and app: avatar, profile card, portfolio grid/item, admin portfolio queue.
- Security (4.1.27): review the anonymous `Read:public-media` identity. It is local only; production reads go through the CDN (ADR-009). Confirm that nothing private is ever written to `public_media`: today only processed avatar / portfolio / staff image variants are.

## Open questions / risks
- **Owner/DevOps:** add a mobile E2E harness (Maestro on an Android emulator, dev build instead of Expo Go) in a later slice, or keep the manual steps until Phase 6 store preparation? CLAUDE.md asks for one E2E test per screen, so mobile is the gap.
- Report user (AC-14) and the dashboards are covered only by the routed web tests, not by the full-stack flow.
