# ADR-006: Internationalization — `/en/` URL prefix, shared UI strings, content translations ready for AI, Georgian fallback
Date: 2026-09-28 | Status: proposed

## Context
- Two languages: Georgian `ka` (default) and English `en` (CLAUDE.md, S-103).
- Legacy: language by `?locale=` and session with identical URLs (SEO-weak, `i18n.md`); UI strings in PHP arrays edited on the server by an admin translation editor; content in `*_translations` tables; English pages 404 when English content is missing (BR-054).
- Owner: `/en/` prefix with 301s from old URLs (Q-024); Georgian fallback instead of 404 (Q-023); Latin allowed in Georgian fields (Q-022); keep legacy English values (Q-031); new keys English first + Georgian alongside (Q-058); AI auto-translation of listings and chat later (vision).
- Mobile has no URLs but must use the same strings and the same content rules.

## Decision
1. **URLs (web).** Georgian unprefixed (`/service/{slug}`), English under `/en/` (`/en/service/{slug}`). Next.js middleware resolves the locale from the path only (not from cookies or `Accept-Language`) so every URL has exactly one language, which is what search engines need. Every public page outputs `<link rel="alternate" hreflang="ka|en|x-default">` and a canonical. For English pages whose content falls back to Georgian, canonical/hreflang rules are set in `url-map.md` (P2-B3). The language switcher links to the same page in the other language. Legacy `?locale=en` and all other legacy URL forms 301 per `url-map.md`. User dashboards follow the same prefix rule (not indexed).
2. **API.** Clients send `Accept-Language: ka|en` (default `ka`, anything else → `ka`). The API localizes error `message`s and content fields. The user's preferred `locale` is stored on the account and used for emails and push (not the sender's locale).
3. **UI strings.** `packages/i18n/ka.json` and `en.json`, flat keys `t_*` (legacy keys kept, so the legacy translation work is reused). i18next in web, admin and mobile. The legacy `:param` placeholders are converted once to i18next `{{param}}` by an import script (Phase 3). No HTML inside strings (audit §4.12, fixes the broken curly-quote links); links are passed as components.
4. **Runtime translation overrides.** The admin translation editor (spec 16) stores overrides in the database (`translation_overrides`: locale, key, value, updated_by). `GET /api/v1/i18n/{locale}` returns overrides with a version hash; web merges them at render time (cached, revalidated on change), mobile downloads them at start and caches them. The JSON files in git remain the base; a periodic export lets the Owner commit admin edits back into `packages/i18n`.
5. **Content translations.** Each translatable entity (gig, project, category/subcategory/childcategory, project category, skill, page, blog article, plan) has one translation row per locale with: fields (title, description, …), `source` (`human` | `machine`), `source_locale`, `source_hash` (hash of the text it was translated from), `updated_at`. Later, the AI-translation worker fills missing or stale rows with `source = machine` without schema changes; a human edit sets `source = human`.
6. **Fallback.** If the requested locale has no row (or empty fields), the API returns the Georgian text and `contentLocale: "ka"` on that resource; clients show `t_content_shown_in_georgian` (AC-22). Pages return 200, never 404 (Q-023).
7. **Validation** (in the API only): Georgian fields required for gigs/projects, allowing Georgian + Latin + digits + normal punctuation (R-5.3); English fields optional, rejecting Georgian letters (R-5.4).
8. **Slugs.** Gig slug = slug of the Georgian title + `-` + uid (R-5.9, legacy BR-024); the English URL reuses the same slug under `/en/` (EC-8). A transliteration table for Georgian → Latin slugs follows the legacy behaviour (checked in slice 04).
9. **Formatting.** Dates and numbers are formatted by the clients with `Intl` in the active locale and `Asia/Tbilisi`; money via one `Price` component (`₾1,000.00`).

## Alternatives considered
- **Keep identical URLs with `?locale=`** — the Owner chose prefixes (Q-024); query-based languages are weak for SEO.
- **Prefix both languages (`/ka/`, `/en/`)** — would change every existing Georgian URL and cost SEO; Georgian stays unprefixed.
- **Subdomain `en.mytask.ge`** — splits domain authority and cookies. Rejected.
- **Locale columns on the main table (`title_ka`, `title_en`)** — simple for two languages but no room for machine/human provenance. Rejected.
- **Translation SaaS (Lokalise, Crowdin)** — cost; the Owner edits by hand. Can be added later on top of the JSON files.

## Consequences
- Easier: SEO-correct language URLs; web and mobile share every string; AI translation drops in later.
- Harder: every public link must be built with a locale-aware helper; hreflang logic for fallback pages needs care (url-map.md).
- Must change: url-map.md (P2-B3) defines every 301; data-model.md defines translation tables with `source` fields and `user.locale`; spec 17 covers hreflang/canonical; a Phase 3 script imports `lang/{en,ka}/messages.php` into JSON (59 keys missing in ka and 9 missing in en are reported, `i18n.md`).
