import { defineConfig, devices } from '@playwright/test';
import { BASE, PORT } from './e2e/base';

// Main-flow smoke test of the web shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build against e2e/fake-api.mjs for the server's own API calls (custom code, health);
// browser API calls are routed per test. Full-stack runs reuse `pnpm preview` instead (PW_REUSE=1).
const reuse = process.env.PW_REUSE === '1';
const VISUAL = /(visual-screens|contrast)\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e',
  // CI: failures as GitHub annotations (readable without the logs) + the HTML report the workflow uploads.
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE },
  // One `next start` server serves every worker: past 4 local workers page loads queue up and time out (4.3.12c: 7 of
  // 204 timed out with the default 8, none with 4, and the run is twice as fast). CI keeps Playwright's default.
  workers: process.env.CI ? undefined : 4,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: VISUAL },
    // 3X.18b/c: the full-page screenshot and contrast passes are heavy; they run after the flow tests, never beside
    // them, so the flow tests' client navigations do not wait on a busy server.
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      testMatch: VISUAL,
      dependencies: ['chromium'],
    },
  ],
  webServer: [
    {
      command: 'node e2e/fake-api.mjs',
      url: 'http://localhost:3199/api/v1/health',
      reuseExistingServer: reuse,
      timeout: 30_000,
    },
    {
      command: `pnpm exec next start --port ${PORT}`,
      url: BASE,
      // Reusing a running server is opt-in (PW_REUSE=1, e.g. against `pnpm preview`): otherwise a busy port
      // fails loudly instead of silently testing another checkout's build (QA BUG-07).
      reuseExistingServer: reuse,
      // Uploads go to a routed storage host in e2e/restricted-appeal.spec.ts (CSP connect-src).
      env: {
        API_INTERNAL_URL: 'http://localhost:3199/api/v1',
        S3_PUBLIC_ENDPOINT: 'http://storage.test',
        // Profile and portfolio images in e2e/profile.spec.ts (CSP img-src).
        PUBLIC_MEDIA_BASE_URL: 'http://media.test/public-media',
      },
      timeout: 120_000,
    },
  ],
});
