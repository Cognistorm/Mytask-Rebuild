## What I did
ROADMAP 3.17b (security review 04 SEC-59, SEC-60; SEC-57 point 4 architect note).
- **SEC-60:** every IP is canonicalised in one helper (`normalizeIp`, `apps/api/src/platform/client-ip/client-ip.resolver.ts`): IPv6 lower case and compressed, IPv4-mapped IPv6 → IPv4, zone id dropped. Used for request IPs, manual ban create and ban delete. Delete also accepts an automatic IPv6 `/64` ban (URL-encoded) in any spelling (`normalizeBanKey`); anything else → 404.
- **SEC-59:** audit names now equal the contract `x-audit`: `setting.update`, `ip_ban.create`, `ip_ban.delete`, `staff.reauth`; `adminLogout` writes `staff.logout`. The automatic ban is `ip_ban.auto` (a side effect of `adminLogin`). The new `apps/api/test/audit-names.test.ts` fails if any audit action written in `apps/api/src` is not a contract `x-audit` name or a listed side effect.
- **Architect (ADR-002 §6 Staff):** recorded how SEC-57 is enforced (3.17a) and decided point 4 for slice 16: staff get the users' SEC-02 slow mode (20 failures/hour → one evaluated attempt per 30 s for unknown devices, trusted devices exempt, no hard lock, EV-128 to the staff member).
- **Contract 1.2.1** (descriptions only, no schema change): `IpBan.ip` and the `{ip}` path may be an IPv6 /64 prefix; addresses in canonical form.

## Files created/changed
- `apps/api/src/platform/client-ip/client-ip.resolver.ts`, `apps/api/src/modules/staff/{admin-security.service,admin-settings.service,staff-auth.service,staff.controllers}.ts`
- `apps/api/test/staff.test.ts`, `apps/api/test/audit-names.test.ts` (new)
- `docs/04-api/src/{openapi.base.yaml,paths/d1-platform-auth-profiles.yaml,schemas/d1.yaml}` → bundled `docs/04-api/openapi.yaml` 1.2.1; regenerated `packages/types`, `packages/api-client`
- `docs/03-architecture/adr/002-auth-sessions-legacy-passwords-2fa.md`, `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **backend-engineer:** ROADMAP 3.17c (staff emailed re-auth code). Use contract names for any new audit row (`staff.reauth_code.request`); the table test enforces it.
- **web/admin:** nothing required; the admin ban list (`apps/admin/src/app/security/page.tsx`) may now show `…::/64` entries, and deleting one works because `openapi-fetch` URL-encodes path params.
- **product-analyst (slice 16 spec):** add the staff slow mode (ADR-002 §6) to spec 16 and EV-128 for staff in spec 15, marked NEW.

## Open questions / risks
- Existing rows written before this change keep their old spelling; local data only, legacy ETL (Phase 5) must canonicalise `banned_ips.ip_address` with the same helper.
- `adminListIpBans` `q` still does a `contains` on the inet column (unchanged).
