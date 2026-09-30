# Handoff: qa-engineer → orchestrator — P2-A6 QA parity master plan
Date: 2026-09-29

## What I did
- Wrote the parity master plan: `docs/06-qa/plans/00-parity-master.md` (Phase 2 gate item 3).
- Mapped all 69 legacy business rules BR-001…BR-122 to spec ACs: 22 kept, 42 changed (each with its Owner decision), 5 removed (each with its Owner decision). Also mapped the unnumbered legacy areas L (search/content/SEO), M (admin) and N (analytics).
- Mapped all 141 legacy notification items (79 email classes, 7 direct mailables, 55 in-app keys) through spec 15's accounting: 120 kept, 8 merged, 13 removed. Checked in both directions by script: every inventory row is accounted for, every event exists, and every owning AC cited by a kept/merged event exists.
- Listed the 20 removed features (X-01…X-20), each with its decision and an absence test.
- Listed the 34 legacy defects (R-xxx) that must not be reproduced, each with the spec/ADR that replaces the behaviour. The formal security verdict is left to P2-B5.
- Judged all 703 ACs for testability: 699 testable as written, 3 need a definition, 1 waits on Q-097 but has a testable default.
- Defined the parity method: the source-of-truth order, one test type per AC tag (parity / deviation / spec / absence), test levels from ADR-001, money invariants after every money test, per-slice report template, and a slice → rows table.
- Legacy code was not re-read. The specs' legacy citations were relied on (as instructed).

## Files created/changed
- `docs/06-qa/plans/00-parity-master.md` (new)

## What the next agent must do
- **product-analyst** — close these gaps before the named slice starts (none blocks the Phase 2 gate):
  - G-1: add ACs for the nightly ledger/BOG reconciliation job, its admin report and the EV-32 email (spec 05 or 16). Needed before Slice 4.
  - G-2: define "normal punctuation" in Georgian fields (spec 00 R-5.3, 04 AC-5, 10 AC-3) as an explicit character set. Legacy allowed `-_.,!?()` (BR-051). Needed before Slice 3.
  - G-3: define "similar title" for "You may also like" (04 AC-32) from the cited legacy code. Needed before Slice 3.
  - G-5 (optional): reword 16 AC-20…AC-29 in Given/When/Then.
  - If the legacy code does not settle G-2 or G-3, raise a Q-ID instead of deciding.
- **solution-architect (P2-B4)**: while writing the coverage table, cover the reconciliation endpoints once G-1 adds its AC.
- **qa-engineer (each slice)**: use §3.7 to pick the rows for the slice and write the parity report in `docs/06-qa/reports/`.
- **Owner**: Q-097 (legacy admin accounts) is needed before migration (G-4). No new Owner questions.

## Open questions / risks
- No new Q-IDs.
- Risk: gig-page and project-page parity checks on the live site are limited to public pages. Flows behind login are checked against legacy code citations only, unless the Owner allows observing them on the legacy staging site.
