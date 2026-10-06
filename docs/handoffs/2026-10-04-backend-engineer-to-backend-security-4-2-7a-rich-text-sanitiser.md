# 4.2.7a: the one HTML sanitiser (CONVENTIONS §19, SEC-22)

## What I did
- 4.2.7 was split into **4.2.7a** (this) and **4.2.7b** (the 5 admin category ops). The sanitiser of CONVENTIONS §19 was planned for Phase 3 but did not exist, and the category SEO texts (`contentTop`/`contentBottom`, profile `staff_content`) need it.
- New shared package **`@mytask/rich-text`** (`packages/rich-text`): `allow-list.json` is the one allow-list (profiles `user_text`, `user_text_links`, `staff_content` exactly as the §19 table, plus the `dropWithContent` list); `src/index.ts` exports it typed (`richTextAllowList`, `RichTextProfile`) for the web and mobile renderers. The API imports the JSON directly (it is CommonJS, like its use of `@mytask/i18n`).
- New API module `apps/api/src/platform/rich-text/rich-text.ts` (global `RichTextModule`, registered in `app.module.ts`):
  - `RichText.sanitize(html, profile)`: inject it in every write of a "sanitised HTML" field. `sanitizeRichText(html, profile, mediaBaseUrl)` is the same thing as a plain function (Phase 5 ETL, tests).
  - `RichText.plainText(html)` / `richTextPlainText`: the text content, for the owning spec's length and letter rules (entities decoded, whitespace collapsed).
  - Built on `sanitize-html` **2.17.5** (2.18.0 is 4 days old, below the workspace minimum release age) + `@types/sanitize-html` 2.16.2.
- Rules (§19):
  - Elements and attributes per profile; everything else is removed and its text kept.
  - Comments and the `dropWithContent` elements are removed **with** their content. Besides the §19 list this includes `textarea`, `title`, `template`, `noscript`, `xmp`, `noembed`, `noframes`, `plaintext`, `select`, `option` and `applet`, against parser differentials.
  - No `style`, `class`, `id`, `on*` or `data-*` attributes.
  - `href` is checked after entity decoding and after stripping C0/C1 controls and Unicode spaces/invisibles.
    - Allowed: `http`/`https` (+ `mailto` in `staff_content`); site paths `/…` and `#…` only in `staff_content`.
    - Refused (link removed, text kept): protocol-relative `//`, any backslash, `javascript:`/`data:`/`vbscript:`, bare relative paths.
  - `rel` is always written by the server (`noopener` / `nofollow ugc noopener noreferrer`); a `rel` given in the input is replaced.
  - `img src` is **parsed**: it must match the scheme, host and port of `PUBLIC_MEDIA_BASE_URL`, with the path under its base path + `/` (SEC-32(d)). Without that variable every image is removed (fail closed).
  - `width`/`height`/`colspan`/`rowspan` are kept only as 1–4 digit numbers.
- Extra hardening (not in §19, please confirm): URLs with user info (`https://mytask.ge@evil.example`) are refused, as phishing.
- `test/rich-text.test.ts` (49 tests):
  - profile rules;
  - 23 refused link forms and 13 refused image URLs;
  - an XSS corpus of 72 OWASP cheat-sheet and mutation-XSS vectors, run against all three profiles. The output may contain only allow-listed elements and attributes and no script URLs, and a second pass must change nothing.
- Found and worked around a **sanitize-html 2.17.5 bug**. Renaming a refused tag to a forbidden one made the library close the *next* sibling with that name (`<a …>c</mt-unwrap>`), because its rename map is not cleared for skipped tags. Now a refused link or image loses its `href`/`src` and is removed by `exclusiveFilter: 'excludeTag'`. Regression test: "a refused link or image does not change the elements after it".
- API 561 passed / 6 skipped; lint + typecheck green (api, rich-text); `nest build` output smoke-tested.

## Files created/changed
- `packages/rich-text/` (new: `package.json`, `allow-list.json`, `src/index.ts`, `tsconfig.json`, `eslint.config.mjs`)
- `apps/api/src/platform/rich-text/rich-text.ts` (new), `apps/api/src/app.module.ts`, `apps/api/package.json`, `pnpm-lock.yaml`
- `apps/api/test/rich-text.test.ts` (new)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.2.7b (backend)**: inject `RichText` and call `sanitize(value, 'staff_content')` on `contentTop`/`contentBottom` (both languages) in `adminCreateCategory`/`adminUpdateCategory`; store `null` when the sanitised text is empty.
- Web (4.2.9b) and mobile (4.2.15): render stored HTML only from API output; mobile uses `richTextAllowList.profiles.staff_content`.
- Later slices use the same module, never a second sanitiser: gig description (`user_text`, slice 3), order requirements (`user_text_links`, slice 5), CMS pages and blog (`staff_content`, slices 16/17).

## Open questions / risks
- **AC-47 is not applied yet.** External links in `staff_content` are stored as plain `https://…` hrefs. The contract says staff HTML is *returned* with external links rewritten to the signed `/redirect`. That rewrite must be done on read once the signer exists (`createOutboundLinkSignatures`/`verifyOutboundLink`, slices 16/17), and the category reads (`getCategory`, `lookupCategory`) must then use it. Until then, links in category SEO texts go straight to the external site (staff-written content only).
- `plainText` joins block elements without a space (`<h2>a</h2><p>b</p>` → `ab`), like legacy `strip_tags`. That is fine for length limits; recheck it if a spec counts words.
- Security reviewer: please include the corpus and the URL rules in the slice 2 review (SEC-22, SEC-32(d)).
