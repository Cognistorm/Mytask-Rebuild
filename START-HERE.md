# START HERE — MyTask.ge rebuild with Claude only

## Which Claude tool does what
| Tool | Use it for |
|---|---|
| **Claude Code** (in the Claude desktop app → "Code" tab, or the `claude` command in a terminal) | The real work: it runs on YOUR computer, reads/writes the project folder, runs code, and uses the agents in `.claude/agents/`. |
| **Claude.ai chat / Projects** | Thinking, reviewing documents, and answering the open questions. Optional. |

Everything is Claude. You need a paid Claude plan (Pro works; **Max is recommended** because this project is long).

## How the agent system works
- `CLAUDE.md` holds the project rules. Claude Code reads it automatically in every session.
- `.claude/agents/*.md` holds 12 agents. Each file = one role: a name, a description (when to use it), allowed tools, and its prompt. Claude Code loads them automatically.
- `.claude/commands/*.md` holds shortcuts: type `/status`, `/discovery`, `/feature 01-auth.md`, `/review`.
- `docs/` is the shared memory. Agents never rely on chat. They read and write these files.

You call an agent by name in plain language:
> Use the code-archaeologist agent to map how payments work in /legacy.

To edit or add an agent, open its `.md` file and change the text, or type `/agents` inside Claude Code.

---

## Setup — step by step (about 1 hour)

**1. Install tools** (one time)
- Claude desktop app → sign in → open the **Code** section. Or, in a terminal: `npm install -g @anthropic-ai/claude-code`.
- Git, Node.js 20+ LTS, pnpm (`npm i -g pnpm`), Docker Desktop.
- For the mobile app later: Expo Go app on your phone, plus Xcode (Mac, for iOS) and/or Android Studio.

**2. Create the new project**
- Create a NEW empty GitHub repo, e.g. `mytask-platform`. Keep the old repo untouched.
- Clone it to your computer and copy everything from this kit into it (including the hidden `.claude` folder and `.gitignore`).

**3. Add the old code** (see `legacy/README.md`)
- Copy or clone the old code into `legacy/app/`.
- Put the database structure dump in `legacy/db/schema.sql`. Structure only, no real data.
- List the env variable NAMES only in `legacy/env-names.txt`.

**4. Fill in `docs/00-vision.md`.** This is the most important input you give. Half a page is enough to start.

**5. Screenshots.** Optional, since agents can capture them from the live site. If you have time, add them to `docs/05-design/screenshots/`.

**6. First commit**
```
git add . && git commit -m "chore: project setup kit" && git push
```

**7. Start Claude Code in the project folder** and type:
```
/status
```
The orchestrator reads everything and tells you the next step.

---

## The workflow

| Phase | You type | Result | You approve |
|---|---|---|---|
| 1 Discovery | `/discovery` | `docs/01-discovery/*`: full map of the old platform | Answer `open-questions.md`, then confirm "this is everything my platform does" |
| 2 Blueprint | "Use product-analyst to write all specs" → "Use solution-architect to design architecture, data model and openapi.yaml" → "Use ui-ux-designer to create the design system and preview page" | Specs, API contract, design preview | Read the specs. Open `docs/05-design/preview/index.html` in a browser. |
| 3 Foundation | "Use devops-engineer to scaffold the monorepo and docker" → `/feature 01-auth.md` | `docker compose up` + `pnpm dev` runs everything; login works on web AND the app | Log in on both |
| 4 Features | `/feature 02-...md`, then the next, one at a time | Each feature on web + mobile + tests | QA report says PASS; you click through it |
| 5 Migration | "Use data-migration-engineer to migrate a copy of the DB" | Migration report: counts and money match | Numbers match |
| 6 Launch | "Use devops-engineer to prepare staging" … | Live site + store submissions | Final go |

Start every work session with `/status` and end it with `/status`.

## Rules for you (the Owner)
1. One feature at a time. Let a slice finish before starting the next.
2. Answer open questions in the file, not only in chat, so the agents remember.
3. Commit after every finished step: `git add . && git commit -m "..."`. Git is your undo button.
4. Start a fresh Claude Code session (`/clear`) for each new task. The memory lives in `docs/`, so nothing is lost.
5. Never paste real passwords, API keys or customer data into chat or files.
6. Strongly recommended: have a human senior developer review payments, security and migration before launch.

## Repo structure: what each folder is for
```
mytask-platform/
├── CLAUDE.md                 rules for all agents (you rarely edit)
├── START-HERE.md             this guide
├── .claude/agents/           the 12 agent prompts
├── .claude/commands/         shortcuts: /status /discovery /feature /review
├── legacy/                   OLD code + DB schema, read-only evidence
├── docs/
│   ├── 00-vision.md          YOU write: goals, rules, priorities
│   ├── STATUS.md             orchestrator: where we are
│   ├── 01-discovery/         archaeologist: what the old platform does
│   ├── 02-specs/             analyst: one spec per feature
│   ├── 03-architecture/      architect: design + decisions (adr/)
│   ├── 04-api/openapi.yaml   architect: THE contract web+app share
│   ├── 05-design/            designer: tokens, components, screens, preview
│   ├── 06-qa/                QA + security + migration reports
│   └── handoffs/             notes passed from one agent to the next
│
│   (created later by devops-engineer in Phase 3)
├── apps/api/                 backend (NestJS)
├── apps/web/                 website (Next.js)
├── apps/mobile/              iOS + Android app (Expo)
├── packages/types/           shared data types (generated from openapi)
├── packages/api-client/      shared API client for web + app
├── packages/tokens/          design tokens (colors, fonts, spacing)
├── packages/ui/              shared components
├── packages/i18n/            ka.json (filled) + en.json ("" values)
├── packages/assets/          logos and images from the live site
├── tools/migration/          old DB → new DB scripts
└── docker-compose.yml        local database, storage, email catcher
```
