# MyTask.ge Platform Rebuild — Project Rules

Every agent and every session reads this file first. These rules override any agent's own habits.

## Mission
Rebuild MyTask.ge (Georgian freelance marketplace) as an **API-first platform**:
one backend API, one web app, one mobile app (iOS + Android), one shared design system.
The new design is a **modernization of the current design, not a reinvention** — the owner considers
the current layout and flows the most user-friendly possible. Keep structure, flows and placement;
improve visual polish, spacing, consistency, accessibility and mobile behavior.

## Sources of truth
| What | Where |
|---|---|
| Old code (READ-ONLY, never modify) | `/legacy/` |
| Live site (reference for behavior, images, logos) | https://mytask.ge |
| Owner's goals and constraints | `docs/00-vision.md` |
| Everything the old platform does | `docs/01-discovery/` |
| Feature specs | `docs/02-specs/` |
| Architecture decisions | `docs/03-architecture/` |
| **API contract — the law** | `docs/04-api/openapi.yaml` |
| Design system | `docs/05-design/` + `packages/tokens` + `packages/ui` |
| Test plans and reports | `docs/06-qa/` |
| Current progress | `docs/STATUS.md` |
| Agent-to-agent handoffs | `docs/handoffs/` |

## Golden rules
1. **Documents are the memory.** Chat is forgotten; files are not. Every agent writes its results to the agreed path before finishing.
2. **The API contract is law.** Backend, web and mobile build against `docs/04-api/openapi.yaml`. Only the Architect changes it, and only with an ADR.
3. **Never modify `/legacy/`.** It is evidence. Read it, cite it (`legacy/path/file.php:123`), never edit it.
4. **Vertical slices.** One feature at a time through API → web → mobile → tests. Do not build all backend first.
5. **No agent approves its own work.** QA and Security review; the Owner approves phase gates.
6. **Never invent business rules.** If the old code and the live site disagree or are unclear, write the question into `docs/01-discovery/open-questions.md` and stop that item.
7. **Local first.** Everything runs on the owner's computer (`pnpm local`, no Docker — ADR-020). Nothing touches production until Phase 6 and explicit Owner approval.
8. **Secrets never go in files.** Use `.env` (git-ignored) and document only the variable names in `.env.example`.

## Languages (i18n)
- Two languages: **Georgian (`ka`, default)** and **English (`en`)**.
- All user-facing text goes through translation keys — never hard-coded strings.
- For every NEW key, write the **English value first**, matching the codebase format, and fill the **Georgian translation alongside it**. The Owner refines both language files by hand as needed. Existing legacy English values are kept. (Owner decision Q-058, 2026-09-28.)
- Translation files live in `packages/i18n/ka.json` and `packages/i18n/en.json` and are shared by web and mobile.
- Fonts must fully support Georgian script (Mkhedruli).

## Assets
Images, logos and icons come from the live site or `/legacy/`. Save them in `packages/assets/` with the source noted in `packages/assets/SOURCES.md`.

## Notifications
Keep every notification the old code sends (inventory in `docs/01-discovery/notifications.md`). New ones are allowed, but must be listed in the spec and marked `NEW`.

## Coding conventions
- TypeScript everywhere, `strict` mode.
- Shared types in `packages/types` are generated from the OpenAPI contract — never hand-written duplicates.
- Every endpoint has tests. Every screen has at least one end-to-end test for its main flow.
- Small commits, one purpose each, message format: `type(scope): summary` (e.g. `feat(tasks): create task endpoint`).
- Work on a branch per feature: `feat/<feature-name>`. Never commit directly to `main`.

## Definition of done (for any feature)
- [ ] Spec in `docs/02-specs/` approved
- [ ] Endpoint(s) match `openapi.yaml`, with tests passing
- [ ] Web screen(s) built with `packages/ui` components and design tokens only
- [ ] Mobile screen(s) built with the same tokens and i18n keys
- [ ] English and Georgian texts filled for every new key
- [ ] QA parity report: behaves like the old platform (or deviations listed and approved)
- [ ] Security review passed (if it touches auth, money, personal data, uploads or permissions)
- [ ] `docs/STATUS.md` updated

## Handoff format
When an agent finishes, it writes `docs/handoffs/YYYY-MM-DD-<from>-to-<to>-<topic>.md`:
```
## What I did
## Files created/changed
## What the next agent must do
## Open questions / risks
```

## Escalate to the Owner (stop and ask) when
- Business rule is unclear or old code contradicts the live site
- Anything touches real money, real user data, or production
- A decision cannot be undone
- An agent wants to change the API contract, the data model, or the design tokens outside its role
