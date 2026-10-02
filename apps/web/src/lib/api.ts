// API access for server components (architecture §5.1): the internal URL, Bearer auth from the cookie
// (ADR-002 §2), and the visitor IP only with the service credential (ADR-013 §17).
import 'server-only';
import { cookies, headers } from 'next/headers';
import { createApiClient, type Locale } from '@mytask/api-client';

const baseUrl = () => process.env.API_INTERNAL_URL ?? 'http://localhost:3000/api/v1';

export function serverApi(locale: Locale) {
  return createApiClient({ baseUrl: baseUrl(), client: 'web', locale });
}

/** Host-only web cookies set by the API (ADR-002 §2): the access token and the long-lived device id. */
const COOKIE_ACCESS = '__Host-mt_at';
const COOKIE_DEVICE = '__Host-mt_did';

/**
 * The API as the visitor of this request, for pages whose answer depends on the viewer (public profile:
 * "Edit profile" vs "Contact me", the owner's pending portfolio items). An expired or missing access cookie
 * means a guest view (optional-user operations never answer 401).
 *
 * `hasSession`: an access cookie came with the request (it may still have expired).
 * `mayHaveSession`: no access cookie, but this browser has signed in before (device cookie). The page then
 * lets the browser refresh the session once (`SessionRefresh`) and renders again.
 *
 * The visitor IP goes along only when Caddy set `X-MyTask-Client-IP` (ADR-013 §15: it strips any copy sent
 * by the caller) and the service credential is configured; otherwise the API keys this call by the user or
 * the web server's address.
 */
export async function viewerApi(locale: Locale) {
  const [jar, incoming] = await Promise.all([cookies(), headers()]);
  const token = jar.get(COOKIE_ACCESS)?.value;
  const extra: Record<string, string> = {};
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  const visitorIp = incoming.get('x-mytask-client-ip');
  if (serviceToken && visitorIp) {
    extra['X-MyTask-Service-Auth'] = serviceToken;
    extra['X-MyTask-Visitor-IP'] = visitorIp;
    const ua = incoming.get('user-agent');
    if (ua) extra['X-MyTask-Visitor-UA'] = ua;
  }
  const api = createApiClient({
    baseUrl: baseUrl(),
    client: 'web',
    locale,
    getAccessToken: () => token,
    headers: extra,
  });
  return { api, hasSession: Boolean(token), mayHaveSession: !token && jar.has(COOKIE_DEVICE) };
}
