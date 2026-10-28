import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5170/PedroOS/';
const output = process.argv[3] || 'test-results/startup-after.json';
const browser = await chromium.launch();
try {
  const results = [];
  for (const [device, options] of [['desktop', { viewport: { width: 1280, height: 720 } }], ['mobile', devices['Pixel 5']]]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const requests = [], errors = [];
    page.on('request', r => requests.push(r.url()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.getByRole('button', { name: 'Iniciar com som', exact: true }).click();
    await page.locator('#boot-screen').waitFor({ state: 'hidden', timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    const resources = await page.evaluate(() => {
      const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')];
      return entries.map(e => ({ url: e.name, bytes: e.toJSON().decodedBodySize || 0 }));
    });
    results.push({ device, bytes: resources.reduce((n, e) => n + e.bytes, 0), requests: requests.length, errors, resources });
    await context.close();
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results.map(({ device, bytes, requests, errors }) => ({ device, bytes, requests, errors }))));
} finally { await browser.close(); }
