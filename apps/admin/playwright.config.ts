import { defineConfig, devices } from '@playwright/test';

// Main-flow smoke test of the admin shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build; the API is optional (the page shows "unreachable" without it).
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3200' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
