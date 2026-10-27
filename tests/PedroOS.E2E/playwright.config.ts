import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PEDROOS_BASE_URL || 'http://localhost:5159';

export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    // Existing navigation suites start with the welcome preference disabled.
    // welcome.spec.ts overrides this to exercise the real first-visit behavior.
    storageState: { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'pedroos.welcome.v1', value: '{"showOnStartup":false}' }] }] },
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.PEDROOS_NO_SERVER
    ? undefined
    : {
        command: 'dotnet run --project ../../src/PedroOS.Web/PedroOS.Web.csproj --urls http://localhost:5159',
        url: 'http://localhost:5159/healthz',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
