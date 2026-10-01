# ADR-005: Configuration — settings register, Commission & Fee module, versioning
Date: 2026-09-28 | Status: accepted (Owner 2026-09-30)

> **Revised 2026-09-30 (Owner answer Q-155 (a)).** §8: each social-login row S-065…S-069 is one `structured` value `{isEnabled, clientId, clientSecret}` with a write-only secret, instead of one bare secret string. Contract 1.2.0 (additive): `SettingSocialProviderValue`, `SettingSocialProviderUpdate`, `SettingSecretStatus`; `adminUpdateSetting` and the `SettingEntry` / `SettingValue` / `SettingVersion` descriptions. Rules unchanged: EC-10, re-authentication, critical row / EV-124. Handoff: `docs/handoffs/2026-09-30-solution-architect-to-backend-engineer-social-settings-contract.md`.

## Context
- The Owner wants every fee, limit, timer and toggle editable in the admin panel without a developer (spec 00 user story; register S-001…S-122 approved).
- AC-8 audit log; AC-9 fee changes apply only to new transactions; AC-10 range validation; AC-11 toggles also block the API; AC-12 defaults on a new installation; EC-1/EC-2 in-progress items keep their values; rows marked **V** are versioned.
- Legacy: ~20 singleton settings tables cached forever via a `settings()` helper, many holding secrets (gateway credentials, SMTP) in plain database columns (`data-model.md` §1). Hard-coded values (2.5% surcharge, 24h award expiry, 2-day refund rule) caused R-013, R-032.
- Q-032: social login keys are entered in the admin panel. Q-042: all other keys in `.env`. Q-074: no runtime brand colours.
- Q-006: new Commission & Fee module to enable/disable/set fees in the future; Q-053/Q-064: promo codes only on platform services, never on fees.

## Decision
1. **Registry in code, values in the database.** `apps/api/src/modules/settings/registry.ts` declares each setting once: key (e.g. `escrow.auto_release.hours`), register id (`S-026`), type (boolean, integer, money_tetri, percent_bp, enum, list, email_list, localized_text, image, structured), validation (min/max, allowed values, non-empty list), default, permission area (e.g. `settings.escrow.write`), flags `versioned`, `secret`, `public` (exposed to clients). A startup check fails if the registry and the approved register in spec 00 diverge (a test compares the list of ids).
2. **Storage.** `settings` (current value per key) and `setting_versions` (key, value, effective_from, changed_by, reason) for every change; for versioned keys, readers can ask "value at time T". Values are JSON validated by the registry schema.
3. **Reading.** A `SettingsService.get(key)` served from an in-process cache backed by Redis; a change publishes an invalidation message (Redis pub/sub) so all API and worker processes see it within a second. No deployment needed (AC-6).
4. **Writing.** Only through `PATCH /api/v1/admin/settings/{key}` (permission from the registry): validate (AC-10), write the new version, write the **audit log** (who, when, old, new, IP; AC-8), invalidate cache. Bulk edits are one transaction.
5. **Snapshots (AC-9, EC-2).** Business code never re-reads a fee or timer later for an existing item. It stores what it used: fee amounts + fee-rule version ids on order items, project payments, offers, withdrawals and intents; timer deadlines as absolute timestamps (`auto_release_at`) computed at the triggering event. Toggles (S-025, S-034, S-021, …) are read at action time, and "OFF" blocks new items only (EC-1), except S-025, which is checked when the sweeper would release (EC-3, spec 00).
6. **Commission & Fee module.** `fee_rules` table: `code` (e.g. `withdrawal.standard`, `card_surcharge.bog`, `gig_order.commission`, `project.client_commission`, `project.freelancer_commission`, `project.posting_fee`, `custom_offer.buyer_fee`, `custom_offer.freelancer_fee`), `enabled`, `type` (percent_bp | fixed_tetri), `value`, `payer` (buyer | freelancer), `applies_to`, optional `plan` (standard | premium), `effective_from`, `created_by`. Rows are never edited in place; a change inserts a new effective version. One pure function `calculateFees(context) → breakdown` (context: purpose, amount, payer plan, time) is used by quotes, checkout, withdrawals and tests; it never changes the freelancer's price (spec 00 §4.2). Defaults seed S-010…S-018.
7. **Plan limits** (S-001…S-007) are settings with `null` = unlimited and `0` = not allowed (R-2.2), enforced by API policies at creation time only (R-2.3).
8. **Secrets in settings** (only S-065…S-069, social login). Each provider row is **one `structured` value** (Owner 2026-09-30, Q-155 (a)): `{ isEnabled: boolean, clientId: string | null, clientSecret }`, so the switch, the client ID and the secret change together as one version, one audit row and one EV-124 (the row stays critical and needs re-authentication).
   - **Storage:** `settings.value` / `setting_versions.value` = `{ isEnabled, clientId, clientSecret: { ciphertext, iv, keyId, updatedAt } | null }`. Only `clientSecret` is encrypted, with AES-256-GCM using `SETTINGS_ENCRYPTION_KEY` from `.env` (key id stored with the ciphertext so the key can be rotated); `isEnabled` and `clientId` are not secret.
   - **Read** (contract `SettingSocialProviderValue`): `{ isEnabled, clientId, clientSecret: { isSet, updatedAt } }` (`SettingSecretStatus`); `SettingEntry.isSet` mirrors `clientSecret.isSet`. The API never returns the secret, in the entry, the history or anywhere else.
   - **Update** (contract `SettingSocialProviderUpdate`): `isEnabled` and `clientId` are always sent; `clientSecret` omitted → the stored secret is kept; a string → replaces it; `null` → clears it.
   - **Audit:** `isEnabled` and `clientId` old/new; for the secret only `isSet` before/after and whether it was replaced — never the value (spec 16 AC-54).
   - **EC-10:** after applying the change, `isEnabled: true` without a `clientId` and a stored secret → `422 BUSINESS_RULE_VIOLATION`, nothing saved. Rows with a secret cannot be restored from history (`adminRestoreSettingVersion` → 422); staff enter the keys again.
   - Register type `secret` (a bare write-only string) stays in the contract enum for compatibility but no row uses it.
9. **Public config.** `GET /api/v1/config/public` returns only `public` settings (feature toggles, limits needed for UX messages, theme defaults, language switcher, upload limits) with an ETag; web caches it, mobile refreshes it on app start and foreground. Clients use it to hide entry points; the API still enforces (AC-11).
10. **Not settings:** infrastructure (storage driver, SMTP, keys) lives in `.env`; visual values live in `packages/tokens` (P-13, Q-074); fixed rules in spec 00 §4.18 stay constants in code.

## Alternatives considered
- **Environment variables for business settings** — needs a redeploy for every change. Rejected (Owner requirement).
- **One JSON document for all settings** — simple, but no per-key permissions, validation messages or versions. Rejected.
- **Feature-flag SaaS (LaunchDarkly, Unleash cloud)** — cost and an external dependency for what is a small table. Rejected; self-hosted Unleash is overkill.
- **Legacy singleton tables per area** — not versioned, not audited. Rejected.

## Consequences
- Easier: the Owner changes rules without developers; history explains every past transaction; tests can pin settings.
- Harder: every new rule needs a registry entry (small, intentional friction); snapshot fields must be added to every money-related table.
- Must change: data-model.md defines `settings`, `setting_versions`, `fee_rules`, `audit_log`; spec 16 describes the admin screens; openapi.yaml defines admin settings and public config endpoints with permission names.
