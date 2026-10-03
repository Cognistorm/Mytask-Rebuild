# ADR-022: Rate limit on portfolio saves
Date: 2026-10-03 | Status: **accepted** (architect, ROADMAP 4.2.0c; security reviews 06 SEC-69 and I-31, 07 §6) | Amends: contract 1.3.1 → 1.3.2 (additive)

## Context
- With S-071 OFF (the default), every `createPortfolioItem` and every `updatePortfolioItem` sends EV-14 `Admin/PendingPortfolio` to every S-100 address (spec 02 AC-25, AC-27; legacy behaves the same).
- Nothing limits portfolio saves per user. Only the global write limiter applies (120 per minute per IP, ADR-013), so one user saving in a loop can send up to 120 admin emails per minute to every admin address: mailbox flooding, SMTP cost, damage to the sender reputation (SEC-69).
- The shared report limit (10 per user per hour, SEC-23) counts every attempt before the target check (`profiles.service.ts`). The contract text did not say so (I-31).

## Decision
1. `createPortfolioItem` and `updatePortfolioItem` share one limit: **30 saves per user per hour**. Every attempt counts, also one refused with 400, 404 or 422, so probing costs the same as saving. Over the limit: `429 RATE_LIMITED` with `Retry-After` (CONVENTIONS §14). The key is the user id (the operations need a signed-in user). 30 per hour is far above what a person editing a portfolio needs, and caps EV-14 at 30 per user per hour.
2. `deletePortfolioItem` is not limited beyond the global limiter: it sends no email.
3. The shared report limit text now says "every attempt counts, before the target check" on all four report operations (I-31). Behaviour is unchanged.
4. Whether EV-14 is sent again when an item that is already `pending` is saved (the other half of SEC-69) is a business rule: legacy sends it on every save. **Owner answer 2026-10-03, Q-166 (a):** EV-14 only when the item enters `pending` (a new item, or an edit of an `active` or `rejected` item); the `updatePortfolioItem` description says so (contract 1.3.2).

## Alternatives
- Per-IP limit only: does not stop a user with several IPs, and punishes users behind a shared IP.
- A limit on EV-14 emails instead of on saves: hides admin emails a real user should cause and still lets the database writes run unbounded.
- A register setting for the number: not needed now. It can be added later without a contract change to the operations.

## Consequences
- Backend (ROADMAP 4.2.0d): a Redis counter per user shared by both operations, checked first in the handlers; tests for the 31st save and for the shared key.
- A request refused by the contract validator (malformed body) never reaches the handler, so it is not counted here; the global limiter covers it (the same holds for the report limit).
- Web and mobile: the existing `429` handling (toast with `Retry-After`) covers it; no new i18n key.
- `x-covers` and coverage tables are unchanged (no new AC).
