# 4.3.10e Web: gig wizard phone step mode + visual baselines
From: web-engineer · To: web-engineer (4.3.11), qa-engineer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

This finishes 4.3.10 (a–e). The web gig wizard is complete: create, edit, desktop and phone.

## What I did
**Phone step mode** (below 768 px; screen 03 "Mobile web (360)")
- There are 5 steps, each on its own screen:
  1. Overview;
  2. Pricing;
  3. Upgrades + FAQ (both optional);
  4. Gallery;
  5. Review & publish (when editing: "Review & save").
- The blocks of the other steps get `hidden`; they are never unmounted. Typed text, uploads that are still running and scans all carry on across steps.
- **Position:** a compact Stepper at the top reads "Step 2 of 5", with a progress bar named by that text. This is the new `@mytask/ui/web` `CompactStepper` (§6.12 "compact").
- **Action bar:** a StickyActionBar at the bottom has Back (from step 2 on) and Next, or Create / Save changes on the last step.
  - The two right-hand buttons have distinct React keys. With one shared DOM node, the "Next" click turned into a form submit when its own re-render switched the button's type.
- **Next** checks only the current step. It shows that step's errors and focuses the first invalid field. Otherwise it moves on, scrolls to the top and focuses the step's heading.
- **Enter** in a field of an earlier step acts as Next.
- **Create / Save** checks everything. With errors, it jumps to the first step that has one and focuses that field. Server field errors do the same (for example `title.ka` → step 1).
- **Review & publish:**
  - every block with its status in words and an "Edit: <block>" button that jumps to its step;
  - the SEO fields inline, with no dialog. Their both-or-none error is the focus target.
- The desktop side summary is hidden on phones. The "has errors" summary Alert at the top stays.
- **3 new keys (en + ka):** `t_ui_step_of`, `t_ui_review_and_publish`, `t_ui_review_and_save`. "Back", "Next" and "Edit" are the legacy `t_back`, `t_next`, `t_edit`.

**Shared fix:** `@mytask/ui` `Alert` slid in even under `prefers-reduced-motion: reduce`. The wizard's info notice exposed it in the reduced-motion check. Under reduced motion the animation is now `none`, so it simply appears. No existing baseline changed: the visual project ran 75/75 with the old files.

**Baselines (`e2e/screens.ts`):**
- New screens:
  - `gig-create` (`/create`);
  - `gig-edit` (`/seller/gigs/{uid}/edit`, a rejected gig with the reason, stored upgrade/FAQ rows and gallery previews).
- Both are appended at the end, so `contrast.spec.ts`'s `SCREENS[5]` (login) is unchanged.
- 8 new pixel baselines (light/dark × desktop/phone), made on the production build with `--update-snapshots=all`. They also run in the contrast and reduced-motion passes.

## Files created/changed
- `apps/web/src/components/gig-wizard/gig-wizard.tsx` (step mode: `usePhone`, `PHONE_STEPS`, `next`/`goStep`, review list, inline SEO, action bar), `gig-wizard.css`
- `packages/ui/src/web/stepper.tsx`, `stepper.css` (`CompactStepper`), `index.ts`; `form.css` (Alert reduced motion)
- `packages/i18n/en.json`, `ka.json` (+3 keys)
- `apps/web/e2e/gig-wizard.spec.ts`: +1 phone test (all 5 steps, Back, Enter = Next, gallery on step 4, review + Edit, server error jumps to step 1, axe)
- `apps/web/e2e/screens.ts` (+2 screens and their routed data)
- `apps/web/e2e/visual-screens.spec.ts-snapshots/gig-*` (8 new)
- `docs/ROADMAP.md`, `docs/STATUS.md`

**Checks:**
- web typecheck, lint and prettier are green; ui typecheck and lint are green; the i18n checker is OK.
- `gig-wizard.spec.ts`: 22/22.
- Full web e2e:
  - chromium: 169 passed, 3 skipped, 1 timing flake. The flake was `portfolio-edit.spec.ts` "list from the Selling nav"; it passed 24/24 when run alone.
  - visual: 75/75.

## What the next agent must do
- **4.3.11:** the gig page (`/service/{slug}`). The wizard's "View gig" links there.
- **4.3.15 (mobile):** follows the same 5 steps; `onProgress` is ready in `uploadFile`.

## Open questions / risks
- **Existing test data (not fixed here, for the Owner / QA):** the shared 1×1 `PNG` in `e2e/screens.ts` cannot be decoded by browsers. Every media image in the older baselines (category, search and home cards, profile) shows as an empty grey box.
  - The baselines are stable, so they still catch layout regressions, but they do not show images.
  - The gig screens use a valid PNG instead.
  - Fixing the shared one would change about 24 existing baselines. That needs a look-check, so it should be its own small task.
- **Phone screenshots:** the bottom-sticky action bar appears at the first screen's lower edge in full-page screenshots, not at the end of the page. That is how full-page capture draws sticky elements; on a real phone it stays at the bottom of the screen.
- Screen 03 also shows a "✕" close button in the phone header that asks "Discard changes?". I did not add it: the site header stays on the page, and its links already ask through the 4.3.10c leave guard. QA may list it as a deviation.
- **QA (4.3.18):** compare the phone flow with the legacy wizard on a phone. Legacy had no step mode, just the long page.
