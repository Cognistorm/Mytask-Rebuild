# 3X visual refresh — page speed before / after (ROADMAP 3X.18d)

Spec 3X **AC-14**: no layout shift from the new styles or motion. Lighthouse CLS and INP must be no worse than before 3X on home, category page and search (R-4.4).

**Result:**
- **CLS: no worse** on all three pages, mobile and desktop.
- **TBT** (Lighthouse's lab stand-in for INP): 0 ms everywhere, before and after.
- **Measured INP:** category and search are no worse. **Home is worse**, because of the theme switch: 24 → 88 ms with the CPU slowed 4×. That is still under the 200 ms "good" limit. Logged as **F-3X18-1** for 3X.21.

## Set-up

- **Before:** `main` at 61c4e777 (no 3X code), in a worktree `../mt-pre3x`, production build, port 3101.
- **After:** `feat/visual-refresh` at 97157b75, production build, port 3100.
- Both builds use the same stand-in API (`apps/web/e2e/fake-api.mjs`, port 3199), so they get the same data.
- Same PC, with the builds alternated run by run so background load falls on both alike.
- Pages: `/` (home), `/categories/design`, `/search?q=logo`. Georgian, light theme.
- Scripts (re-runnable):
  - `docs/06-qa/perf/3x-lighthouse.mjs`: Lighthouse 12.8.2, mobile and desktop presets, median of 5 runs.
  - `docs/06-qa/perf/3x-inp.mjs`: Event Timing (as browsers compute INP), median of 5 runs.

## Lighthouse (median of 5)

| Preset | Page | Build | CLS | TBT ms | LCP ms | FCP ms |
|---|---|---|---|---|---|---|
| mobile | home | pre-3X | 0.004 | 0 | 8334 | 6310 |
| mobile | home | 3X | 0.005 | 0 | 8560 | 6460 |
| mobile | category | pre-3X | 0.001 | 0 | 8484 | 6459 |
| mobile | category | 3X | 0.000 | 0 | 8633 | 6608 |
| mobile | search | pre-3X | 0.000 | 0 | 8483 | 6459 |
| mobile | search | 3X | 0.000 | 0 | 8557 | 6608 |
| desktop | home | pre-3X | 0.001 | 0 | 1469 | 1171 |
| desktop | home | 3X | 0.004 | 0 | 1509 | 1209 |
| desktop | category | pre-3X | 0.003 | 0 | 1491 | 1211 |
| desktop | category | 3X | 0.007 | 0 | 1512 | 1210 |
| desktop | search | pre-3X | 0.005 | 0 | 1492 | 1212 |
| desktop | search | 3X | 0.007 | 0 | 1510 | 1211 |

**Verdict:**
- **CLS:** OK on all 6 pairs. "No worse" here means within 0.01; every value stays at or under 0.007, far under the 0.1 "good" limit.
- **TBT:** OK on all 6 pairs (0 ms).

**Note, outside AC-14:** on mobile, first paint (FCP) is about 150 ms later and LCP 75–225 ms later. This is the larger 3X stylesheet on Lighthouse's slow-4G simulation.
- The absolute mobile values (6–8 s) are high on both builds. That is the stand-in set-up (no CDN, no compression, `next start` on Windows) under Lighthouse's throttling, not something 3X changed.
- Worth keeping in mind when the CSS is split per route in Phase 4.

## Interactions (INP, measured)

Same clicks on both builds after hydration, CPU 4× slower. The number is the worst interaction per page load, in ms (median of 5).

| Page | Interactions | pre-3X | 3X | Verdict |
|---|---|---|---|---|
| home | Explore menu open, close; Dark mode switch | 24 | 88 | **worse** (under 200) |
| category | sort menu open, close; "4+ stars" filter | 24 | 32 | OK |
| search | sort menu open, close; "4+ stars" filter | 24 | 32 | OK |

**Per click on home** (4 runs):
- The theme switch costs 80–96 ms on 3X, against 24–32 ms before.
- Opening the Explore menu costs 24–32 ms on 3X, against 16 ms before.

### F-3X18-1 — theme switch is slower (for 3X.21)

**Trace of the click** (devtools timeline, CPU 4×, average of 3 runs, 600 ms window):

| Build | Style recalculation | Paint | Pre-paint | Layerize | Layout |
|---|---|---|---|---|---|
| pre-3X | 10.8 ms | 4.5 ms | 1.4 ms | 1.3 ms | 2.3 ms |
| 3X | 69.6 ms | 52.8 ms | 12.0 ms | 9.3 ms | 2.7 ms |

**Cause:** switching `data-theme` on `<html>` re-resolves every token and repaints every gradient surface. No single 3X feature is the cause. Switching each one off saves only 0–16 ms:

| Switched off | Theme-switch cost (median) |
|---|---|
| nothing | 96 ms |
| all transitions | 80 ms |
| hero drift | 88 ms |
| shadows | 88 ms |
| backdrop blur | 96 ms |
| page canvas | 96 ms |

**Layout is unchanged** (no shift).

**Options for 3X.21 (Owner/Designer to choose):**
1. Accept it. The switch is a rare, deliberate click, and it stays well under 200 ms even on a 4× slower CPU.
2. Suppress transitions for the one frame of the switch: add a `data-theme-switching` attribute that sets `transition: none` and remove it on the next frame. This saves about 16 ms.
3. Reduce the style cost further: fewer `:is()`/`:has()` selectors on the surfaces, and fewer layered gradients per card.

### F-3X18-1 — re-measured after 3X.21d (2026-10-06)

The Owner chose option 2. `applyTheme` (`apps/web/src/lib/theme-client.ts`) now sets `data-theme-switching` on `<html>` together with the new theme and removes it two frames later; `foundation.css` turns every transition off while it is set. Same set-up as above (3X build with the change, pre-3X `../mt-pre3x`), `node docs/06-qa/perf/3x-inp.mjs 7`:

| Page | pre-3X | 3X before 3X.21d | 3X after 3X.21d |
|---|---|---|---|
| home (theme switch) | 24 ms | 88 ms (80–96) | **80 ms (64–80)** |
| category | 24 ms | — | 32 ms (OK) |
| search | 24 ms | — | 32 ms (OK) |

As the trace predicted, this wins about 8–16 ms. The rest is style recalculation and paint of the gradient surfaces (option 3). Home stays well under the 200 ms "good" limit. Going further means option 3 (lighter surfaces), which changes the approved look.

## Re-run

```
node apps/web/e2e/fake-api.mjs
# 3X build (apps/web):         API_INTERNAL_URL=http://localhost:3199/api/v1 S3_PUBLIC_ENDPOINT=http://storage.test PUBLIC_MEDIA_BASE_URL=http://media.test/public-media npx next start --port 3100
# pre-3X build (../mt-pre3x/apps/web): same, --port 3101
node docs/06-qa/perf/3x-lighthouse.mjs 5
node docs/06-qa/perf/3x-inp.mjs 5
```
