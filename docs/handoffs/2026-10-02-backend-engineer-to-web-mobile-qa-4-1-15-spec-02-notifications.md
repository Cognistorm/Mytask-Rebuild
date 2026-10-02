## What I did
ROADMAP 4.1.15 — checked the spec 02 email notifications (spec 15 EV-11…EV-18, EV-126) end to end:
template in `apps/api/src/platform/mail/templates.ts`, the outbox enqueue in the owning service, and every
i18n key in both `en.json` and `ka.json` with matching placeholders.

| Event | Template | Queued in | Recipient |
|---|---|---|---|
| EV-11 EmailChangeConfirm | ✓ | `account-settings.service.ts` (updateMe) | new address |
| EV-12 EmailChangeNotice | ✓ | `account-settings.service.ts` (updateMe) | old address (**fixed**) |
| EV-13 Admin/ProfileReported | ✓ | `profiles.service.ts` (createUserReport) | S-100 |
| EV-14 Admin/PendingPortfolio | ✓ | `portfolio.service.ts` (create/edit, S-071 OFF) | S-100 |
| EV-15 PortfolioPublished | ✓ | `portfolio.service.ts` (staff approve) | owner |
| EV-16 Admin/NewIdVerificationPending | ✓ | `kyc.service.ts` (submit) | S-100 |
| EV-17 VerificationApproved | ✓ | `kyc.service.ts` (staff approve) | user |
| EV-18 VerificationDeclined | ✓ | `kyc.service.ts` (staff decline) | user |
| EV-126 PortfolioRejected (NEW) | ✓ | `portfolio.service.ts` (staff reject) | owner |

**Fix (EV-12):** the notice was queued with `userId`, and the worker reads the user's email when it sends.
If the send was delayed (SMTP retry) and the user confirmed the new address first, the "your email is being
changed" notice went to the new address instead of the old one (AC-30). It is now queued with
`to: [current email]`, the user's locale and `username`.

## Files created/changed
- `apps/api/src/modules/auth/account-settings.service.ts` — EV-12 payload pinned to the old address
- `apps/api/test/account-settings.test.ts` — asserts EV-12 goes to the old address, without `userId`
- `apps/api/test/profiles-emails.test.ts` — NEW: all 9 events render in ka + en with the params their service
  queues; no untranslated key or empty `{placeholder}`; links (ka unprefixed, `/en` for English; admin links);
  HTML escaping of user text

## What the next agent must do
- Web (4.1.16+): no email work; the link targets used are `/auth/email-change?token=`, `/seller/portfolio`,
  `/account/verification` (web) and `/reports`, `/portfolio`, `/kyc` (admin) — keep those routes.
- In-app + push of EV-15/17/18/126 are slice 15 (ROADMAP 4.14), not done here.
- QA: include EV-12 delayed-send scenario in the parity report.

## Open questions / risks
- None new. Admin emails (EV-13/14/16) are sent in Georgian (`locale: 'ka'`), as for EV-02/EV-08.
