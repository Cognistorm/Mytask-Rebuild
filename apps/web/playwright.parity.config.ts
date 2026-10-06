import { defineConfig, devices } from '@playwright/test';

// QA structure parity, pre-3X build vs 3X build (ROADMAP 3X.19). Both builds and the stand-in API must already run;
// see the header of e2e/qa/structure-parity.qa.ts. Not part of `test:e2e`.
export default defineConfig({
  testDir: 'e2e/qa',
  testMatch: '*.qa.ts',
  timeout: 120_000,
  workers: 2,
  use: { ...devices['Desktop Chrome'] },
});
