# ADR-010: Admin app placement and staff RBAC
Date: 2026-09-28 | Status: proposed

## Context
- Legacy has two admin panels (Livewire `/dashboard` and Filament `/console`, duplicated panel ids, `canAccessPanel` always true, R-034), no roles (`roles-and-permissions.md`), all admin emails to the first admin, direct balance editing.
- Vision NEW: flexible RBAC for staff with tailored permissions (Customer Support, Financial Manager, Content Moderator). Spec 16 proposes the default matrix for Owner approval.
- Owner: staff accounts separate from user accounts (spec 00 Roles), staff 2FA toggle S-060, staff IP ban S-064 (Q-057), admin chat visibility is a permission (Q-015), logs viewable only in the admin panel (Q-054), balance corrections only as ledger adjustments (P-12).
- The admin must be served by the same API as web and mobile (no second backend).

## Decision
1. **Placement.** A separate front-end app `apps/admin` (Next.js, client-rendered, `noindex`) at its own origin `admin.mytask.ge`, calling the same API through the same-origin path `admin.mytask.ge/api/v1/…` (proxied). Admin endpoints live under `/api/v1/admin/*` in the same NestJS app, in their own modules, and accept only `staff`-audience tokens.
   - Why separate: separate cookies and CSP, no admin code in public web bundles, the option to restrict the admin origin by IP/VPN later, and a smaller attack surface on the public site.
2. **Staff identity.** `staff` accounts (migrated from legacy `admins`, bcrypt verify-and-rehash per ADR-002), email 2FA per S-060, IP ban per S-064, session lifetime 12 h, re-authentication (password or 2FA code) required for high-risk actions (changing roles, fee rules, secrets, approving withdrawals above a threshold if spec 16 defines one).
3. **RBAC model.**
   - **Permissions** are a fixed catalogue in code, named `area.action` (e.g. `users.read`, `users.restrict`, `users.ban`, `users.impersonate` (only if spec 16 wants it), `gigs.moderate`, `projects.moderate`, `proposals.moderate`, `offers.moderate`, `reviews.moderate`, `kyc.review`, `refunds.resolve`, `unblock.resolve`, `escrow.release_manual`, `withdrawals.approve`, `ledger.adjust`, `payments.read`, `payments.offline.approve`, `points.adjust`, `promo_codes.write`, `settings.<area>.write`, `fees.write`, `translations.write`, `content.write`, `chat.read`, `analytics.read`, `system.logs.read`, `system.queues.read`, `staff.manage`, `audit.read`).
   - **Roles** are data (`roles`, `role_permissions`, `staff_roles`), created and edited by staff with `staff.manage`. Seeded roles: Super-admin (all permissions, cannot be edited), Customer Support, Financial Manager, Content Moderator, with the default permissions approved in spec 16.
   - Rules: at least one active Super-admin must exist (the last one cannot be demoted, disabled or deleted); staff cannot change their own roles.
4. **Enforcement in the API only.** Every admin endpoint declares `@RequirePermission('withdrawals.approve')`; a global guard denies by default (an admin endpoint without a declared permission fails a startup check). The admin UI hides what the staff member cannot do, using `GET /api/v1/admin/me` (permissions list), but that is cosmetic. openapi.yaml lists the permission name for every admin operation.
5. **Audit log.** Every staff mutation and every read of sensitive data (chat, KYC, personal data export, secret "is set" changes) writes `audit_log` (staff id, permission used, action, target, before/after or diff, reason, IP, user agent, request id). Money actions also carry the ledger journal id. The audit log is append-only and viewable with `audit.read`.
6. **Money actions** are domain operations, never raw edits: approve/reject withdrawal, resolve refund/dispute (one implementation for gig/project/offer refunds, Q-037), manual escrow release (P-5), ledger adjustment with reason (P-12), points add/deduct (Q-016). Each uses the same service method as the user/system path.
7. **Moderation queues** (gigs, portfolio, projects, proposals, offers when S-035 is ON, reviews, blog comments, KYC, reports, appeals) are list endpoints filtered by status, shared by the admin UI; approving/rejecting triggers the legacy notifications.

## Alternatives considered
- **Admin inside `apps/web` under `/admin`** — one app less, but shares cookies/CSP with the public site and ships admin code paths into the public build. Rejected.
- **Off-the-shelf admin (Filament, Django admin, Retool, Directus) on the database** — bypasses the API and its rules (exactly the legacy failure). Rejected.
- **Generic admin framework on top of the API (react-admin, Refine)** — could speed up CRUD screens; may be used inside `apps/admin` as a library if P2-C2/spec 16 find it helpful, as long as it only talks to the API.
- **Hard-coded roles** — does not meet "flexible" RBAC. Rejected.
- **Policy engine (OPA, Casbin)** — unnecessary for a permission list; permission checks stay simple code.

## Consequences
- Easier: least privilege for staff; every action traceable; the admin is just another API client (no hidden backend).
- Harder: one more deployable app; every admin endpoint must name its permission (enforced by a startup check and contract lint).
- Must change: spec 16 approves the default role matrix; data-model.md adds `staff`, `roles`, `permissions` (catalogue mirror), `role_permissions`, `staff_roles`, `audit_log`; url-map.md 301s legacy `/dashboard/*` and `/console/*` to `admin.mytask.ge` (or 404 them, spec 16/17 decide).
