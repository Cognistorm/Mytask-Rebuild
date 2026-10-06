# ADR-021: No country in account settings
Date: 2026-10-02 | Status: **accepted** (Owner 2026-10-02, Q-162: "remove the Country field completely from the Account Settings form and API response where applicable … the platform operates specifically for Georgia") | Amends: spec 02 AC-29, contract 1.3.0 → 1.3.1

## Context
- Spec 02 AC-29 lists an optional country (active country list) in account settings. Legacy had the field commented out in `account/settings/settings.blade.php`. Only Georgia is active (4.1.7).
- The Owner wants no country field: the platform serves Georgia only.
- `countryCode` is a required property of the `Me` response and an optional property of `MeUpdateRequest`. ADR-014 §5 allows only additive changes in `/api/v1`; removing a property is a breaking change (CI `oasdiff`). Mobile and other clients may already read `Me`.

## Decision
1. Web and mobile account settings have **no country field**, and the edit-profile card shows no country.
2. Contract **1.3.1**: `Me.countryCode` and `MeUpdateRequest.countryCode` are marked `deprecated: true`. Clients neither show nor send them. The API still returns the stored value (legacy data or `null`) and still accepts the field, so v1 stays compatible.
3. The properties are removed in `/api/v2`, or before launch if the Owner approves a breaking change to v1 while no client is released.
4. Out of scope (the Owner named account settings): the `countryCode` in `UserSummary`, project client cards, billing and staff schemas, the `countries` table, `listCountries` (used by billing in spec 05) and the staff country screens (spec 16).

## Alternatives
- Remove the properties from v1 now. This breaks ADR-014 §5 and the CI breaking-change check, so it needs an explicit Owner exception.
- Keep the field hidden in the client only, with no contract note. Rejected: mobile would not know the field is retired.

## Consequences
- The legacy `country_id` values stay in the database (data model unchanged) and are migrated as before.
- `updateMe` keeps its country check for old clients. There is no new test; the existing API tests still cover it.
