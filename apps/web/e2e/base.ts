import type { Page } from '@playwright/test';

// The web server's address for specs that need an absolute URL (cookies, share links). Port 3100 by default;
// `E2E_WEB_PORT` moves the whole run (config + specs) when 3100 is taken, e.g. by a running `pnpm local`.
export const PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
export const BASE = `http://localhost:${PORT}`;
/** `__Host-` cookies are Secure: Playwright adds them only for an https URL (the browser sends them to localhost). */
export const COOKIE_URL = `https://localhost:${PORT}`;

/**
 * Waits until the Next.js app router has mounted on the current document (it marks its history entry with `__NA`).
 * A plain form submit (e.g. the catalog Filter button before hydration) loads a new document; a click on a JS-only
 * control (a menu) before that point can be lost under a loaded test run (3X.18a).
 */
export const hydrated = (page: Page) =>
  page.waitForFunction(() => (history.state as { __NA?: boolean } | null)?.__NA === true);
