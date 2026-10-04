// The web server's address for specs that need an absolute URL (cookies, share links). Port 3100 by default;
// `E2E_WEB_PORT` moves the whole run (config + specs) when 3100 is taken, e.g. by a running `pnpm local`.
export const PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
export const BASE = `http://localhost:${PORT}`;
/** `__Host-` cookies are Secure: Playwright adds them only for an https URL (the browser sends them to localhost). */
export const COOKIE_URL = `https://localhost:${PORT}`;
