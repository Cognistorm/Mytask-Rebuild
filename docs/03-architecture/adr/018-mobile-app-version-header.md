# ADR-018: Mobile app version header for the minimum-version gate
Date: 2026-09-30 | Status: **accepted** (Owner 2026-09-30, Q-153 (a)) | Amends: ADR-014 §5, contract 1.0.0 (additive), spec 00 register (new row)

## Context
- ADR-014 §5 and the contract ("Global rules") say: responses carry `X-Min-App-Version`, and an app older than that gets `426 APP_VERSION_UNSUPPORTED` so it can ask the user to update. Store apps cannot be updated instantly, so this gate is how we retire an old API behaviour safely.
- Gap found in Phase 3 (handoff `2026-09-30-devops-engineer-to-orchestrator-p3-platform-core.md`): **no request header tells the API which app version is calling**, so the API cannot decide 426. The contract only has `X-MyTask-Client` (`web`, `admin`, `ios`, `android`).
- ADR-014 says the minimum version comes "from a setting", but the settings register (spec 00, S-001…S-129) has no such row.
- `push_tokens.app_version` already exists in the data model (spec 15 AC-20); it is filled at push registration only, not per request.

## Decision
1. **Header.** The mobile app sends `X-MyTask-App-Version: <major>.<minor>.<patch>` (the store version, from `expo-constants` `nativeApplicationVersion`) on **every** request, next to `X-MyTask-Client: ios|android`. `packages/api-client` adds it when the app passes `appVersion`; web and admin never send it.
2. **Setting.** New register row **S-130 `mobile.min_app_version`**: `{ ios: "x.y.z", android: "x.y.z" }`, default `{ ios: "0.0.0", android: "0.0.0" }` (gate effectively OFF), edited in the admin settings (spec 16, `settings.system.write`), versioned and audited like every setting (ADR-005).
3. **Rule (API, one middleware).** Only when `X-MyTask-Client` is `ios` or `android`:
   - every response carries `X-Min-App-Version: <S-130 value for that platform>`;
   - if `X-MyTask-App-Version` is present, valid semver and **lower** than S-130 → `426 APP_VERSION_UNSUPPORTED`, `details: { minVersion, platform }`, message key `t_app_update_required` (NEW, en + ka);
   - if the header is missing or malformed → the request is served (never lock out a client because of a parsing problem), and a warning is logged at most once per minute.
   - Exempt (always served, so an outdated app can still show the update screen and legal texts): `getHealth`, the public config and i18n operations (spec 00, ADR-005 §9, ADR-006 §4), and the BOG webhook.
4. **Contract change (additive, v1-compatible, ADR-014 §5).** Add the optional header parameter `XMyTaskAppVersion` (pattern `^\d+\.\d+\.\d+$`) to the shared parameters and document it in "Global rules"; add `X-Min-App-Version` to the shared response headers; add `details.minVersion` / `details.platform` to the `APP_VERSION_UNSUPPORTED` description. No operation's request or response body changes. The solution-architect makes the edit after approval and hands it off to the backend, web and mobile engineers.
5. **Mobile behaviour.** On 426 the app shows a full-screen "update required" view with a button to its store page and stops making calls, except the exempt ones.

## Alternatives considered
- **Put the version in `User-Agent`** — parsing is brittle across Expo/React Native versions and proxies. Rejected.
- **Version only in the push-token registration** — too late (the gate must work before login) and not on every call. Rejected.
- **Make the header required for mobile and refuse missing ones** — safer against spoofing, but spoofing gains nothing (an attacker can always claim a new version), and a bug in the header would lock every user out. Rejected.
- **Separate `/app/compat` endpoint checked at start-up** — works, but only once per launch and doubles the logic; the header gives the same result on every call. Rejected.

## Consequences
- Easier: the API can retire old behaviour safely (ADR-014 §5); the Owner raises S-130 in the admin panel without an app release.
- Harder: one more header and middleware; S-130 must be kept in sync with store releases (Phase 6 release checklist).
- Must change after approval: spec 00 register (+S-130), contract (point 4), `packages/api-client` (`appVersion` option), the API middleware + tests, the mobile update screen, i18n key `t_app_update_required`.
