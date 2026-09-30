## What I did
Closed parity gaps G-1, G-2 and G-3 (`docs/06-qa/plans/00-parity-master.md` §10) as PROPOSED additions to already-approved specs. Spec Status lines are unchanged. Every change is tagged with a new P-ID for Owner sign-off at the Phase 2 gate.

- **G-1 (P-135): nightly ledger/BOG reconciliation.** Added spec 05 AC-44…AC-47 and EC-11…EC-14:
  - AC-44 is the run. It starts daily at S-128 (new setting, PROPOSED, default 03:00 Georgian time, UTC+4) and checks the previous Georgian calendar day. There is one completed run per day, and the run only reads data.
  - AC-45 is the checks, C-1…C-9, taken from the invariants marked REC in data-model §6 (I-1, I-3, I-4, I-6, I-13, user counters, I-14, I-12, I-17) plus the optional BOG settlement report. Equality is exact to the tetri, and a 1-tetri gap is a difference.
  - AC-46 is EV-32. It goes to S-100 once per run that has 1 or more differences, with :count and :date, and never twice for the same day. A failed run triggers EV-125 instead.
  - AC-47 is the admin report (`payments.read`): a list of runs, run detail with links, and "Mark as reviewed" with a required note that is audited and moves no money.
  - 22 new admin i18n keys (`t_admin_recon_*`) in English and Georgian.
  - Spec 15: the EV-32 owning AC is now 05 AC-46, and the EV-125 row has the failed-run trigger added. Spec 16 AC-44 now points to 05 AC-44…AC-47.
- **G-2 (P-136): Georgian-field character set.** Spec 00 R-5.3a defines it once:
  - Normalisation, as legacy: remove tags, decode entities, turn NBSP / ZWSP / BOM into spaces, trim.
  - Allowed characters:
    - Georgian letters ა–ჰ (U+10D0–U+10F0)
    - ASCII Latin letters a–z and A–Z
    - ASCII digits 0–9
    - space, tab, LF and CR
    - exactly `- _ . , ! ? ( )`
  - At least one Georgian letter is still required (P-37).
  - New error key `t_validator_georgian_field_characters`.
  - Migrated texts are only checked at the next save.
  - Referenced from 04 AC-5 (+ EC-12) and 10 AC-3/AC-4.
  - The legacy code disagrees with itself: projects used this list, but gigs had no list. I raised Q-109.
- **G-3 (P-137): "You may also like".** 04 AC-32 now spells out the legacy rule from `legacy/APP/app/Livewire/Main/Service/ServiceComponent.php:136-162` (+ EC-13):
  - candidates, and match rules M1 (same sub-category), M2 (title contains title), M3 (description contains title) and M4 (description contains description)
  - case-insensitive substring match, random order, at most 40, no filling up when fewer match
  - these CHANGEs: page-language texts with Georgian fallback, English pages no longer require an English translation (Q-023), `%`/`_` are literal, and the section is hidden when nothing matches.
  - Legacy compared against the old `gigs.title`/`gigs.description` columns, which newer gigs leave empty. I raised Q-110.

## Files created/changed
- `docs/02-specs/05-payments-and-wallet.md`: tags line, AC-44…AC-47, notifications rows, admin screen row, new keys, EC-11…EC-14, P-135
- `docs/02-specs/00-platform-rules.md`: S-128 row (PROPOSED), R-5.3 pointer, R-5.3a, key `t_validator_georgian_field_characters`, P-135/P-136 note
- `docs/02-specs/04-gigs.md`: tags line, AC-5, AC-32, key reference, EC-12, EC-13, P-136/P-137
- `docs/02-specs/10-projects.md`: tags line, AC-3, AC-4, P-136 note
- `docs/02-specs/15-notifications.md`: EV-32 and EV-125 rows, P-135 note
- `docs/02-specs/16-admin-panel.md`: AC-44 reference
- `docs/02-specs/README.md`: pending P-135…P-137 note
- `docs/01-discovery/open-questions.md`: Q-109, Q-110 (open, each with a recommendation)
- `docs/06-qa/plans/00-parity-master.md`: §10 rows G-1…G-3 marked closed, pending the P-IDs

## What the next agent must do
- **Owner (Phase 2 gate):** accept or correct P-135, P-136 and P-137, and answer Q-109 and Q-110. The specs carry testable defaults that match the recommendations.
- **solution-architect (P2-B4, openapi + data-model):**
  - Add admin endpoints for reconciliation runs, differences and review (`payments.read`, audited). The contract has no file yet, so this goes in when openapi.yaml is written.
  - Add data-model tables for runs and differences, with a unique run per run day.
  - Add S-128 to the settings schema.
  - Update ADR-008 §5 "nightly" to "daily at S-128, Georgian time", with catch-up of missed days.
  - Add the R-5.3a validator as one shared rule. The API enforces it and returns the refused characters so clients can fill `:chars`. Add the error code for `t_validator_georgian_field_characters`.
  - Plan how the related-gigs query (M1–M4 substring match on descriptions) is indexed and cached, e.g. trigram indexes or caching per gig.
- **qa-engineer:** re-judge 04 AC-5, 04 AC-32, 10 AC-3/AC-4 and 05 AC-44…AC-47. Write the test vectors from R-5.3a (accepted: `Logo დიზაინი Photoshop-ში`; refused: `ფასი: 50₾` → `:`, `₾`).
- **orchestrator:** update `docs/STATUS.md` (G-1…G-3 done, pending the P-IDs).

## Open questions / risks
- Q-109 (open): if the Owner picks "no list for gigs" (option c) or "no list for descriptions" (option b), R-5.3a item 2 is narrowed in scope only. The validator code stays the same.
- Q-110 (open): if the Owner picks "same sub-category only", M2–M4 are removed from 04 AC-32.
- Risk (P-136): the strict set refuses characters that gig owners use today (`:`, `₾`, quotes). Migrated gig descriptions containing them must be cleaned at the next edit (04 EC-12).
- Risk (P-135): C-9 depends on BOG settlement reports being available (Q-087, lead developer). Until then C-9 is recorded as "not available", and only the internal checks C-1…C-8 run.
- Observation: approved 10 AC-3/AC-4 label the English project rule "LEGACY R-5.4", but legacy projects used a character list for English too (`ProjectValidator.php:36, 40`). This is raised inside Q-109 and not changed.
