# @mytask/types

**Generated** TypeScript types of the API contract `docs/04-api/openapi.yaml` (ADR-014). Never edit `src/generated/` by hand; CI regenerates and fails on any difference.

```sh
pnpm gen            # from the repo root: regenerates types and api-client
```

```ts
import type { paths, components, Schema, RealtimeEvents } from '@mytask/types';
type Gig = Schema<'GigDetail'>;
```

- `openapi.ts` — `paths`, `components`, `operations` (openapi-typescript).
- `realtime.ts` — `RealtimeEvents` (event name → payload schema) from `docs/04-api/src/events/*.yaml`.
