# Handoff: orchestrator → Owner — Phase 2 (Blueprint) plan
Date: 2026-09-28

## What I did
- Read CLAUDE.md, vision, STATUS, all of docs/01-discovery (incl. Owner Answers + Follow-up answers Q-002…Q-057), the discovery handoff, the agent definitions and START-HERE.md. I also checked docs/02-06 and packages/: all of them are still empty kit folders. There is no monorepo yet, which is expected, because the kit schedules the scaffold for Phase 3.
- Wrote the Phase 2 plan. It has 15 agent tasks in 3 tracks (Product, Architecture, Design), plus Owner actions, a 9-step order with parallel pairs, the gate criteria, a Phase 3 preview and a Phase 4 slice order.
- Found 10 planning ambiguities (2 of them contradictions) and added them as Q-058…Q-067.
- Updated STATUS.md. The "Key Owner decisions" section is kept unchanged.
- No specs, architecture or code written. Nothing committed.

## Files created/changed
- `docs/03-architecture/phase-2-plan.md` (new)
- `docs/01-discovery/open-questions.md` (rows + detail section for Q-058…Q-067 appended)
- `docs/STATUS.md` (updated)
- `docs/handoffs/2026-09-28-orchestrator-to-owner-phase-2-plan.md` (this file)

## What the next agent must do
Owner first:
1. Read `docs/03-architecture/phase-2-plan.md` and say "go" (or adjust).
2. Answer Q-058…Q-067 in `docs/01-discovery/open-questions.md`. Q-058 matters for every spec.
3. Merge `feat/discovery` into `main`, then create `feat/blueprint`.

Then Step 1 (two sessions, can run in parallel):

**P2-A1**
> Use the product-analyst agent to do task P2-A1 from docs/03-architecture/phase-2-plan.md: write docs/02-specs/README.md (spec list 00–17 in build order with status) and docs/02-specs/00-platform-rules.md (dual role, Standard/Premium plans and admin-editable limits, the full admin-configurable settings register with default values and source Q-IDs, money glossary incl. HOLD/Pending, content i18n rules, list of removed features). Treat the "Answers" and "Follow-up answers" in docs/01-discovery/open-questions.md as authoritative over legacy behaviour; legacy /legacy/APP = production `main`. Mark NEW/CHANGE, cite Q-IDs, never invent rules — add questions after Q-067 instead. Write a handoff to the orchestrator when done.

**P2-C1**
> Use the ui-ux-designer agent to do task P2-C1 from docs/03-architecture/phase-2-plan.md: audit the live site https://mytask.ge and the legacy CSS/Blade/Tailwind files in /legacy/APP (read-only) and write docs/05-design/audit.md (per main screen: keep / inconsistencies / accessibility / mobile problems; extracted real colours, fonts, spacing). Save logos and icons into packages/assets/ with sources in packages/assets/SOURCES.md. Evolve, don't reinvent. Do not create tokens yet. Write a handoff to the orchestrator when done.

Step 2 (after A1):

**P2-A2**
> Use the product-analyst agent to do task P2-A2 from docs/03-architecture/phase-2-plan.md: write specs 01-auth, 02-profiles-and-dashboards, 03-categories-and-search, 04-gigs in docs/02-specs, following 00-platform-rules.md and the Owner answers in open-questions.md. Trace the areas discovery only surveyed (gig wizard, profile editing, portfolio, search/filters) in /legacy/APP. Every AC testable, Georgian texts with i18n keys, open items as new questions. Handoff to the orchestrator.

**P2-B1**
> Use the solution-architect agent to do task P2-B1 from docs/03-architecture/phase-2-plan.md: write docs/03-architecture/architecture.md and ADR-001…013 (list in the plan) in docs/03-architecture/adr/, status "proposed". Inputs: vision, docs/01-discovery, open-questions Answers/Follow-ups, docs/02-specs/00-platform-rules.md. Do not write data-model.md or openapi.yaml yet. Handoff to the orchestrator.

Later steps and their prompts follow the same pattern. Ask the orchestrator (`/status`) after each step.

## Open questions / risks
- Q-058…Q-067 are open. Two of them are contradictions: Q-058 (vision vs CLAUDE.md on English for new strings) and Q-065 (chat history: Q-015 vs Q-040). Until Q-058 is answered, agents follow CLAUDE.md.
- There is no production schema dump (accepted). The legacy→new mapping may miss schema drift. A local copy of the production DB will be needed for Phase 5.
- Several legacy areas were only surveyed in discovery. The product-analyst must trace them and raise questions rather than guess.
- Pro-plan budget: at most 2 agents in parallel, and a fresh session per task.
- Git: the caller reports branch `feat/discovery`. The session snapshot showed `main`. Please check which branch you are on before Phase 2 work starts.
