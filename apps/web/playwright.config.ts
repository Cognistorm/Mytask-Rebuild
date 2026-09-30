import { defineConfig, devices } from '@playwright/test';

// Main-flow smoke test of the web shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build; the API is optional (the page shows "unreachable" without it).
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3100' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3100',
    // Reusing a running server is opt-in (PW_REUSE=1, e.g. against `pnpm preview`): otherwise a busy port
    // fails loudly instead of silently testing another checkout's build (QA BUG-07).
    reuseExistingServer: process.env.PW_REUSE === '1',
    timeout: 120_000,
  },
});
