import { defineConfig, devices } from '@playwright/test';

// `E2E_ADMIN_PORT` moves the run when 3200 is taken (e.g. by a running `pnpm local`).
const PORT = Number(process.env.E2E_ADMIN_PORT ?? 3200);
const BASE = `http://localhost:${PORT}`;

// Main-flow smoke test of the admin shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build; the API is optional (the page shows "unreachable" without it).
export default defineConfig({
  testDir: 'e2e',
  // The full-stack tests share the seeded owner account, and the Docker-free preview's PGlite serves one
  // connection at a time (concurrent queries interleave: 08P01). One worker keeps them deterministic.
  workers: 1,
  use: { baseURL: BASE },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: BASE,
    // Reusing a running server is opt-in (PW_REUSE=1, e.g. against `pnpm preview`): otherwise a busy port
    // fails loudly instead of silently testing another checkout's build (QA BUG-07).
    reuseExistingServer: process.env.PW_REUSE === '1',
    timeout: 120_000,
  },
});
