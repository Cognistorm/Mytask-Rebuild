# Handoff: web engineer → QA, 4.3.17 slice 3 E2E

## What I did
- **New full-stack main flow `apps/admin/e2e/gigs-main-flow.spec.ts`**, in the same style as slice 1's `profiles-main-flow` and slice 2's `catalog-main-flow`. It runs on the real API, storage and worker, and covers:
  1. **Create**: a seller (registered through the API, signed in on the website) creates a gig in the web wizard. It has both titles, the seeded branch Graphics & Design → Packaging & Covers → Book Design, a Georgian description, price 250, 3 days, 2 revisions, one upgrade, one FAQ, a thumbnail and 2 images uploaded through the real storage and worker. The result is "Gig created". My gigs shows it as Pending, and a guest gets 404 on its page.
  2. **Reject**: staff open the admin `/gigs` Pending tab (filtered by owner ID) and look at the details (the upgrade is shown). They reject the gig with a reason. The seller's My gigs then shows "Needs changes" with the reason, and the editor shows the reason on top (AC-18).
  3. **Edit and approve**: the seller edits the English title and saves, which gives "Service updated" and Pending again (AC-21, AC-22). Staff approve, and the gig becomes Active.
  4. **Guest**: the gig is listed on the Book Design category page and its title link opens `/en/service/{slug}`. The page shows the h1, ₾250.00, the upgrade checkbox, "2 revisions included" and the FAQ tab, with no "Edit gig".
  5. **Buyer**: a second account adds the gig to favourites (legacy message) and reports it ("Thank you! …"). `/en/account/favorite` lists it.
  6. **Staff remove and restore**: staff remove it from the Active tab with an internal reason. The page is 404 and the buyer's favourites show the empty state (EC-11). Staff restore it from the Deleted tab. It answers 200 again and is back in the favourites (ADR-024).
  7. **Owner delete**: the seller deletes it from My gigs, with the confirm and "Gig has been successfully deleted" (AC-24). The page is 404. The admin Deleted tab shows it without Restore.
  - The review loop (steps 2–3) runs only while S-070 auto-approve is OFF, the default. With S-070 ON, the test checks Active at once and goes on, as the profiles flow does for portfolio.
  - It is skipped without `ADMIN_E2E_LOG`.
- **Run here, on a throw-away database.** No `pnpm local` was running, so I started one with `LOCAL_PGLITE_DIR=<empty scratch folder>` and its log, then ran with `PW_REUSE=1`:
  - **all three full-stack flows passed together** (profiles, catalog, gigs: 3/3 in 49 s);
  - the first two runs of the new spec failed on test mistakes only, now fixed. One clicked the card's middle, which hit the seller link, so it now clicks the title link. The other looked for the FAQ before opening its tab.
  - The stack was then stopped; its leftover processes were ended by PID.
- **Per-screen suites, production builds**:
  - web E2E: 285 passed / 3 skipped (incl. visual 84);
  - admin E2E: 77 passed / 7 skipped (the 7 skipped are the full-stack ones without the log; they passed above).
  - The web server log shows "The destination stream closed early" for page loads that tests leave mid-stream. This is noise, not a failure.
- **Mobile**: as in slices 1–2, the app has no E2E harness yet (Owner decision since 4.1.25). SETUP-LOCAL §4 now has manual **steps 19–20**:
  - step 19: wizard → My gigs → admin reject → Needs changes + Edit → approve → gig screen → Analytics (website) → Delete;
  - step 20: second account → heart and Report on the gig screen → Buying "Favorite list" → staff remove / restore.
- SETUP-LOCAL §5 lists the new spec.

## Files created/changed
- `apps/admin/e2e/gigs-main-flow.spec.ts` (new)
- `docs/SETUP-LOCAL.md` (§4 steps 19–20, §5)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **QA 4.3.18**:
  - run every suite, including the three full-stack flows on a throw-away database (SETUP-LOCAL §5);
  - check parity against the legacy gig flows (spec 04, spec 16 AC-20);
  - on a phone, follow SETUP-LOCAL §4 steps 19–20. The mobile screens of 4.3.14–4.3.16 have never run on a device.

## Open questions / risks
- The flow does not check emails or in-app notifications. These are rejection, approval, removal and EV-130 restore. The API tests cover them. QA can look in Mailpit (http://localhost:8025) during the run.
- Documents (PDF, S-080) and the SEO texts are not in the full-stack flow. The web per-screen E2E covers them on the stand-in API.
- The app's Analytics button opens the website page; the Owner decision is still open (4.3.16 handoff).
