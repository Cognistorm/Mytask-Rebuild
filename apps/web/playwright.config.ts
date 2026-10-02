import { defineConfig, devices } from '@playwright/test';

// Main-flow smoke test of the web shell (CLAUDE.md: every screen has an E2E test).
// Starts the production build against e2e/fake-api.mjs for the server's own API calls (custom code, health);
// browser API calls are routed per test. Full-stack runs reuse `pnpm preview` instead (PW_REUSE=1).
const reuse = process.env.PW_REUSE === '1';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:3100' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/fake-api.mjs',
      url: 'http://localhost:3199/api/v1/health',
      reuseExistingServer: reuse,
      timeout: 30_000,
    },
    {
      command: 'pnpm start',
      url: 'http://localhost:3100',
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
