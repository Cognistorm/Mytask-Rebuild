# Phase 2 gate: what the Owner approves
From: orchestrator · To: Owner · Date: 2026-09-30 · Branch: `feat/blueprint`

## What I did
Finished Steps 7 and 8 of the Phase 2 plan (`docs/03-architecture/phase-2-plan.md` §3):
- **Parity gaps G-1…G-3** closed by the product-analyst as PROPOSED P-135…P-137. These edits change specs you already approved, so they need your OK.
- **Step 7, P2-B4:** the API contract `docs/04-api/openapi.yaml` was written by the solution-architect in 8 runs (foundation, 6 domain groups, integration). It passes all lint and consistency checks with 0 errors, and **all 707 spec ACs are covered**.
- **Step 8, P2-B5:** the security review first returned FAIL on one High finding (SEC-01: which visitor IP address the system may trust). The architect fixed it along with 20 smaller findings. **The re-check verdict is PASS with conditions**, with no Critical or High finding open.

Nothing is merged to `main`, nothing is in production, and `/legacy` was not changed.

## Gate checklist (plan §4)
| # | Item | State | Where to look |
|---|---|---|---|
| 1 | Specs 00…17 approved | Done. **New:** P-135, P-136, P-137 need your OK (Q-111, Q-109, Q-110) | `docs/02-specs/`, `docs/01-discovery/open-questions.md` |
| 2 | Open questions answered | Q-058…Q-108 done. **New "Gate" questions below** | `open-questions.md`, last three sections |
| 3 | Parity master | Ready for you | `docs/06-qa/plans/00-parity-master.md` |
| 4 | Architecture + ADR-001…016 | Ready for you (ADR-002, 004, 008, 009, 010, 012, 013, 015 revised in Steps 7–8) | `docs/03-architecture/architecture.md`, `adr/` |
| 5 | Data model | Ready for you (now 122 entities; reconciliation tables PROPOSED with P-135) | `docs/03-architecture/data-model.md` |
| 6 | URL map | Ready for you | `docs/03-architecture/url-map.md` |
| 7 | API contract | Lint clean, 707/707 covered. **Approve as the contract** | `docs/04-api/README.md` (coverage table), `openapi.yaml`, `CONVENTIONS.md` |
| 8 | Design | Ready for you. One point to decide: the checkout column order | `docs/05-design/` (preview: `preview/index.html`; `screens/00-README.md`) |
| 9 | Security | **PASS with conditions** | `docs/06-qa/security/01-blueprint-recheck-2026-09-30.md` |

## Questions to answer at the gate
Each one has a recommendation and a safe default already in the contract. Answering "as recommended" is enough.

- **Q-109:** which characters Georgian gig and project texts may contain.
- **Q-110:** how "You may also like" decides that gigs are similar.
- **Q-111:** accept P-135 (nightly money check, S-128, default 03:00) and P-136 (Georgian-title character rule).
- **Q-112:** staff actions on their own account (log out, own profile, re-login) need no permission from the list.
- **Q-113:** who may see full IBANs on the withdrawals list. Recommendation: only staff who approve withdrawals.
- **Q-114:** refund threads are readable only with the refund-thread permission.
- **Q-115:** content moderators cannot open custom-offer attachments.
- **Q-117:** portfolio "reject" keeps a rejected state with a reason.
- **Q-119:** re-login before releasing or writing off old held balances.
- **Q-120:** a negative old held balance can only be written off.
- **Q-121:** "Refund buyer" is refused while a dispute is open.
- **Q-137:** which settings area owns S-128.
- **Q-144:** a withdrawal pause after an email, password or IBAN change. Recommendation: 24 h plus a flag for the approving staff member.
- **Q-145:** more re-login prompts for risky staff actions, and an email to the user when staff turn off their 2FA.
- **Q-146:** third-party script hosts in custom code.
- **Q-097** (still open): which old admin accounts move to the new admin panel, and with which roles. The safe default (P-115) is that they are imported disabled and without roles. Needed by Phase 5 at the latest.

These can wait for their slice: Q-116, Q-118, Q-122…Q-136, Q-138…Q-143, Q-148…Q-150. **Q-147** (how long personal data and KYC images are kept, a legal question) must be answered before the Phase 5 KYC import.

Technical limits chosen in the security fixes, for your information:
- login slows to 1 try per 30 s after 20 failures in an hour;
- 2FA locks after 10 wrong codes in an hour;
- each user may open 20 new conversations, send 20 offer requests and file 10 reports per hour.

## Owner action now (not a gate item)
**SEC-28:** revoke the Binance API key and the findip key, and remove the Binance trading bot from the legacy server. The new system does not depend on either.

## What the next agent must do (after the gate)
1. Orchestrator: record your answers, set the statuses to approved, and merge `feat/blueprint` into `main` (with your OK).
2. Before Phase 3 slice 01:
   - product-analyst: update specs 01, 02, 14 and 15 (emailed-code confirmation for accounts without a password; two new security emails);
   - solution-architect: fix SEC-30 (the login slow mode must not let an attacker lock out the real user);
   - backend: implement the ADR-013 §19 client-IP tests.
3. Later: SEC-31 in slice 05, and a social-login review before any provider is switched on.

## Files created/changed in Steps 7–8
- `docs/04-api/**`: contract, sources, scripts, coverage, CONVENTIONS, realtime, README
- `docs/03-architecture/`: data-model.md, url-map.md, architecture.md, ADR-002/004/008/009/010/012/013/015
- `docs/02-specs/`: 00, 04, 05, 10, 15, 16, README (P-135…P-137)
- `docs/06-qa/`: security/00 and 01, plans/00-parity-master.md §10
- `docs/01-discovery/open-questions.md`: Q-109…Q-150
- `docs/handoffs/`: 2026-09-29-* (P2-B4 runs, G-1…G-3) and 2026-09-30-* (security review, fixes, re-check, this file)
- `docs/STATUS.md`

## Open questions / risks
- `openapi.yaml` is large (477 operations). Type generation from it (`openapi-typescript`) is first tried in Phase 3.
- Redis is now security-critical (session deny-list and throttle counters) and must be monitored like the database.
- If you reject P-135 or P-136, the architect removes the four reconciliation operations and the Georgian-field error codes. The change is small and additive.
