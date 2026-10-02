// Stand-in for the API's server-side calls during the web E2E run (the browser's own API calls are routed
// per test with page.route). It answers getWebCustomCode with custom code that leaves markers on `window`
// (ADR-019 §2 test, e2e/custom-code.spec.ts) until the API implements it in slice 17, plus getHealth.
// The public profile pages' server calls answer from e2e/fake-profiles.mjs.
// Everything else is 404, so pages fall back to their defaults as when the API is down.
import { createServer } from 'node:http';
import { profileRoute } from './fake-profiles.mjs';

const port = Number(process.env.FAKE_API_PORT ?? 3199);

export const CUSTOM_CODE_HOST = 'cdn.custom-code-vendor.test';

const routes = {
  '/api/v1/health': { status: 'ok' },
  '/api/v1/config/web-custom-code': {
    enabled: true,
    head: '<script>window.__mtCustomCodeHead = (window.__mtCustomCodeHead || 0) + 1;</script>',
    footer: '<script>window.__mtCustomCodeFooter = true;</script>',
    allowedHosts: [CUSTOM_CODE_HOST],
  },
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const fixed = routes[url.pathname];
  const [status, body] = fixed
    ? [200, fixed]
    : (profileRoute(url, req) ?? [404, { code: 'NOT_FOUND' }]);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}).listen(port, () => console.log(`fake API on ${port}`));
