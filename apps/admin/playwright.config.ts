import { defineConfig, devices } from '@playwright/test';

// Main-flow smoke test of the admin shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build; the API is optional (the page shows "unreachable" without it).
export default defineConfig({
  testDir: 'e2e',
  // The full-stack tests share the seeded owner account, and the Docker-free preview's PGlite serves one
  // connection at a time (concurrent queries interleave: 08P01). One worker keeps them deterministic.
  workers: 1,
  use: { baseURL: 'http://localhost:3200' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3200',
    // Reusing a running server is opt-in (PW_REUSE=1, e.g. against `pnpm preview`): otherwise a busy port
    // fails loudly instead of silently testing another checkout's build (QA BUG-07).
    reuseExistingServer: process.env.PW_REUSE === '1',
    timeout: 120_000,
  },
});
