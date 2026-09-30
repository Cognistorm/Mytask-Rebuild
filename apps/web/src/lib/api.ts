// API access for server components (architecture §5.1): the internal URL, Bearer auth from the cookie
// (slice 01), and the visitor IP only with the service credential (ADR-013 §17, added with slice 01).
import 'server-only';
import { createApiClient, type Locale } from '@mytask/api-client';

export function serverApi(locale: Locale) {
  return createApiClient({
    baseUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:3000/api/v1',
    client: 'web',
    locale,
  });
}
