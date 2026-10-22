import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PEDROOS_BASE_URL || 'http://localhost:5159',
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
