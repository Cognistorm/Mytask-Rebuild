# @mytask/api-client

Typed client for the MyTask.ge API (ADR-014 §2): [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) typed by `@mytask/types`, plus a thin wrapper for headers. **No business logic.**

```ts
import { createApiClient, createIdempotencyKey } from '@mytask/api-client';

const api = createApiClient({
  baseUrl: '/api/v1',
  client: 'web',
  locale: 'ka',
  credentials: 'same-origin',
});
const { data, error } = await api.GET('/health'); // data: { status: 'ok' } | error: ApiError
```

| Option           | Header                                                                    | Used by                                         |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| `locale`         | `Accept-Language` (default `ka`)                                          | all                                             |
| `client`         | `X-MyTask-Client` (`web`, `admin`, `ios`, `android`)                      | all (CSRF defence for cookie calls, ADR-002 §2) |
| `getAccessToken` | `Authorization: Bearer`                                                   | mobile, SSR                                     |
| `headers`        | fixed extra headers, e.g. `X-MyTask-Service-Auth` + `X-MyTask-Visitor-IP` | SSR only (ADR-013 §17)                          |

Money operations (`x-money` in the contract; list generated in `src/generated/operations.ts`) must carry an `Idempotency-Key`: create one per user intent with `createIdempotencyKey()` and reuse it when retrying. The client throws `MissingIdempotencyKeyError` when it is missing.

Token refresh (`refreshSession`) is added in slice 01.
