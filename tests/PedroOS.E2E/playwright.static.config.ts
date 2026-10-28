import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from './playwright.config.js';

const root = resolve(import.meta.dirname, '../..');
const path = process.env.PEDROOS_TEST_BASE || '/PedroOS';
const origin = 'http://127.0.0.1:5170';
export default defineConfig({
  ...base,
  testDir: '.',
  outputDir: '../../test-results/static',
  use: { ...base.use, baseURL: origin + path + '/', storageState: { cookies: [], origins: [{ origin,
    localStorage: [{ name: 'pedroos.welcome.v1', value: '{"showOnStartup":false}' }] }] } },
  webServer: {
    command: `node scripts/serve-static.mjs --base ${path}`, cwd: root,
    url: origin + path + '/', reuseExistingServer: false, timeout: 30_000,
  },
});
