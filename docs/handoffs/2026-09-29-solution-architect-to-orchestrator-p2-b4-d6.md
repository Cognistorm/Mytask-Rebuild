# Handoff: solution-architect → orchestrator — P2-B4 group run D6 (specs 15, 16)
Date: 2026-09-29 | Task: P2-B4 part 2, group D6 (notifications + admin platform)

## What I did
- Wrote the D6 part of the API contract following `docs/04-api/CONVENTIONS.md` §18: **67 paths, 79 operations**, 131 schemas plus `D6ErrorCode` (19 domain codes), 5 realtime events.
- User side (spec 15): notification centre (`listNotifications`, `getNotificationUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`), preferences (`getNotificationPreferences`, `updateNotificationPreferences`, public one-click `unsubscribeNotificationEmail` that also works as the RFC 8058 `List-Unsubscribe` target), push tokens (`putPushToken`, `deletePushToken`), the SendGrid Event Webhook (`handleSendGridWebhook`, signed), analytics ingestion (`ingestAnalyticsEvents`).
- Admin platform (spec 16): staff auth with 2FA, refresh, logout, re-authentication (password, or emailed code when S-060 is ON), invitation / reset set-password, email-change confirmation; own profile (`/admin/me`); staff accounts (invite, roles, disable/enable, re-send invitation, end sessions, reset devices); roles and the permission catalogue; audit log (list, entry, CSV export); dashboard (queue counters, KPIs, money KPIs); the single reports queue (grouped by item, entries, dismiss, resolve); settings register (list, get, update, history, restore); S-100 test email; notification delivery log + retry; Commission & Fee module (list, get, create OFF, preview on 100.00 GEL, new version, versions, restore); translations (search, put, reset, export); analytics widgets + CSV; system logs, health, cache refresh, maintenance (get, put, preview link).
- All 10 reserved D6 operations written exactly: `adminLogin`, `adminRefreshSession`, `adminLogout`, `adminReauthenticate`, `adminGetMe`, `adminListSettings`, `adminUpdateSetting` (PATCH `/admin/settings/{key}`), `adminListReports`, `listNotifications`, `ingestAnalyticsEvents`.
- High-risk operations carry `x-permission.stepUp: true` (spec 16 AC-7): staff create/roles/disable/enable/end-sessions/reset-devices, role create/update/delete, fee-rule create/update/restore, audit export. `adminUpdateSetting` / `adminRestoreSettingVersion` use a row-conditional `stepUpFor: [S-065…S-069, S-100, S-110, S-127]` and document 403.
- Custom code (S-110 with `enabled` switch, S-127 allowed hosts) is edited through the generic settings endpoint with `settings.custom_code.write` (schema `CustomCodeValue`, error `CUSTOM_CODE_HOST_NOT_ALLOWED`); proposed S-128 appears in the register with `registerStatus: proposed`.
- Coverage files written. `npm run verify:group -- D6` → **PASSED** (sources and bundle lint 0 errors/0 warnings; check-contract 0/0; check-coverage 0 errors, 8 warnings = reserved operations of D1/D4/D5 not yet in the sandbox).

### Coverage totals
| Spec | ACs | API | NOT-API | DELEGATED |
|---|---|---|---|---|
| 15 | 39 | 19 | 20 | 0 |
| 16 | 78 | 38 | 6 | 34 (D1: 19, 21, 27, 29–35; D2: 20, 25, 26, 60–63; D3: 36, 37, 42–45, 57–59; D4: 24, 38–41; D5: 22, 23, 65) |

Shared ACs 19, 31, 32, 38 are single `DELEGATED` rows naming the first delegate and listing the others (the checker accepts one group per row); D6's own contribution is named in the row (reports queue for AC-19; History tab and reports-by/about-user for AC-31). AC-8 is covered per the P-115 default (legacy admins imported disabled without roles; the Owner's list is applied with `adminEnableStaff` / `adminReplaceStaffRoles`) until Q-097 is answered.

## Files created/changed
- `docs/04-api/src/paths/d6-notifications-admin.yaml` (written)
- `docs/04-api/src/schemas/d6.yaml` (written; stub removed)
- `docs/04-api/src/events/d6.yaml` (5 events)
- `docs/04-api/coverage/15.md`, `docs/04-api/coverage/16.md` (new)
- this handoff. Nothing committed; no shared, spec, ADR or legacy file touched.

## What the next agent must do
### Requests to the integration run
1. **`check-contract.mjs`**: validate `x-permission.permissionByArea` values against the catalogue like `permissionByPurpose` (used by `adminUpdateSetting`, `adminRestoreSettingVersion`); optionally accept `stepUpFor` (row-conditional step-up) as documented in CONVENTIONS §6.1.
2. **`realtime.md` §6**: add the D6 events — `notification.created`, `notification.read`, `badge.updated` (room `user:{userId}`), `admin.queue_counters_updated` (room `staff-permission:{permission}`), `admin.permissions_changed` (room `staff:{staffId}`). The worker-emitted names use `job:notification-dispatch`, `job:conversation-read-state` (D5's read-state change must trigger `badge.updated`), `job:admin-queue-counters`.
3. **Cross-group x-covers / coverage rows** to request:
   - D1: name `adminUpdateSetting` for spec 00 AC-8 and AC-10, `adminUpdateFeeRule` for 00 AC-9 (both list them in `x-covers`); name `adminLogin`/`adminVerifyTwoFactor`/`adminResendTwoFactorCode` for spec 01 AC-29 and `adminLogin` for 01 AC-51 (`DELEGATED:D6` or direct API rows).
   - D3: name `adminUpdateFeeRule` for spec 05 AC-39.
   - D1: `AdminUser` must expose the email-deliverability warning (`emailUndeliverable`, `emailUndeliverableSince`, spec 15 AC-11 / 16 AC-31), and D1's ban, delete and "end all sessions" operations must remove the user's push tokens (spec 15 AC-21). D1's `logout` may accept an optional `installationId` so mobile logout removes the token in one call.
   - D1: public config — S-101 (push), and the custom-code value S-110 + S-127 hosts for the **web server only** (not the mobile app, spec 16 AC-73); either a web-only field in `getPublicConfig` or a new `/config/…` operation. D6 has no public prefix for it.
   - D5: report creation for projects/proposals and D1/D2 for users/gigs write the `reports` rows the D6 queue reads (CONVENTIONS §5.5); the queue expects `ReportTargetType` and a 1,000-character note on decisions.
   - Every group with admin operations: `x-audit` on all staff mutations and sensitive reads, `stepUp: true` on the spec 16 AC-7 list (balance/points adjustments, withdrawal mark-paid/reject, dispute decisions, release funds, refund buyer, unblock approval, user deletion, exports with personal data).
4. **Data-model follow-ups** (for the architect, not changed here): `reports.status` has `pending, seen, resolved`; spec 16 AC-28 needs `dismissed` (contract uses `pending, dismissed, resolved` + decision note/staff/time columns); legacy `seen` mapping is question D6-Q5. `fee_rules` needs a `name` (ka/en) column for rules added later (AC-46). S-121 needs storage for headline/message ka/en (register row is boolean). `notification_deliveries` needs `suppression_reason`.
5. No new shared schemas, prefixes, reserved operations or file purposes needed.

## Open questions / risks
- **D6-Q1 (for the Owner, spec 16 AC-9 vs `@self`).** AC-9 says every admin operation needs exactly one permission. Operations where a staff member acts only on their own session or profile have no catalogue permission and are marked `permission: '@self'` (any active staff member, only on themselves): `adminLogout`, `adminReauthenticate`, `adminRequestReauthCode`, `adminGetMe`, `adminUpdateMe`, `adminChangeMyPassword`, `adminRequestMyEmailChange`, `adminCreateMaintenancePreviewLink` (AC-70 says any logged-in staff member may preview), plus F0's `adminGetFile` / `adminCompleteFileUpload` (own uploads). Pre-login operations (`adminLogin`, 2FA verify/resend, refresh, password reset/set, email confirm) are public by nature. They are still deny-by-default in code (explicit `@self` guard), audited where they change something, and cannot touch anyone else. Owner: confirm this reading of AC-9 (alternative: a new always-granted permission such as `self.manage`, which changes the catalogue).
- **D6-Q2 S-128 area/permission.** Spec 16 "Settings areas" has no area for S-128 `ledger.reconciliation.run_time` (PROPOSED P-135). Safest reading used: area `system` (`settings.system.write`, Super-admin only by default). Owner/product-analyst: assign the area (e.g. payments) when P-135 is accepted.
- **D6-Q3 Staff notifications missing from the spec 15 catalogue.** The staff password reset (spec 16 EC-2) and the staff email-change confirmation link (AC-6) send emails that have no EV row (EV-04 and EV-11 are for users). The contract assumes they reuse the user templates `PasswordReset` / `EmailChangeConfirm` with staff links; the product-analyst should add or extend catalogue rows (CLAUDE.md notification rule).
- **D6-Q4 "Retry" permission.** Spec 16 AC-69 gives the delivery-log "Retry" to `system.health.read` (a read permission guarding a mutation); ADR-008 §7 names `system.queues.write`, which is not in the approved catalogue. Contract follows the approved spec (catalogue); the ADR text is out of date — confirm.
- **D6-Q5 Report status migration.** Legacy report "mark" (`seen`) has no equivalent in the new Dismiss/Resolve flow. Proposed: import `seen` as `pending` so nothing is lost (safest); Owner to confirm.
- **D6-Q6 Re-authentication method.** AC-7 says "password (or the 2FA code, when 2FA is ON)". The contract accepts either the password or, when S-060 is ON, an emailed code. If the Owner meant "code only when 2FA is ON", `adminReauthenticate` refuses the password branch — no contract shape change.
- **D6-Q7 Empty role list.** `adminReplaceStaffRoles` allows an empty list (access removed without disabling); AC-3 requires at least one role only at creation. Confirm, or the API will require ≥ 1.
- **D6-Q8 Editing a role you hold.** AC-5 forbids changing one's own roles; the contract also refuses `adminUpdateRole` on a role the caller holds (it would change their own permissions). Confirm.
- **Conflict note:** ADR-008 §6 says the sitemap is not a job, while spec 16 AC-69 lists "sitemap" among job-health tiles. `JobHealth.job` is a free string, so the health screen shows whatever jobs exist; no contract impact.
- Security review (P2-B5) should look at: body tokens returned to non-admin Bearer clients on staff login (`AdminAuthSession`), the maintenance preview bypass link/cookie, the unsubscribe token (30 days, no login), and the unauthenticated analytics ingestion (rate limit, forwarded IP headers trusted only from the web server).
