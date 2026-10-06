# @mytask/tokens
Design tokens for MyTask.ge web, admin and mobile. **`tokens.json` is the single source of truth**; only the ui-ux-designer changes it.
Full documentation (format, rationale, legacy mapping, light/dark tables, contrast results, usage rules): [`docs/05-design/tokens.md`](../../docs/05-design/tokens.md).

```sh
node packages/tokens/build.mjs          # tokens.json -> dist/ ; exits 1 on broken alias, theme mismatch or contrast failure
node packages/tokens/contrast.mjs       # WCAG AA check of every pair in contrast-pairs.json (both themes)
node packages/tokens/contrast.mjs --md  # the same as markdown tables
pnpm --filter @mytask/tokens test       # unit tests of the category colour function (node --test)
```
No dependencies and no install step (Node >= 22).

| Import | Gives |
|---|---|
| `@mytask/tokens/fonts.css` | `@font-face` FiraGO 400/500/600/700 (serve `packages/assets/fonts/woff2/` at `/fonts/`) |
| `@mytask/tokens/tokens.css` | `--mt-*` CSS variables; light on `:root`, dark on `[data-theme="dark"]`; `.mt-text-*` classes |
| `@mytask/tokens/web` | `vars` = CSS variable references for CSS-in-JS / Tailwind preset; `categoryStyle` |
| `@mytask/tokens/native` | `lightTheme`, `darkTheme` React Native theme objects; `categoryTheme` |
| `@mytask/tokens` | resolved `primitives` and `themes` |
| `@mytask/tokens/color` | the shared category colour function: `deriveCategoryColor`, `categoryStyle` (web), `categoryTheme` (native), `deltaE`, `findSimilar` / `findDuplicate` / `findReserved`, `nextStarterColor`, the starter palette (tokens.md 6.11) |
| `@mytask/tokens/tokens.json` | the raw source; the API reads `category.starter` (in key order) for the default category colour |

`dist/` is generated; commit it in sync with `tokens.json` (CI will check).
