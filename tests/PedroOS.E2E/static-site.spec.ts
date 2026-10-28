import { test, expect } from '@playwright/test';

test.skip(!process.env.PEDROOS_STATIC, 'Checks the actual static artifact, without ASP.NET.');

test('cold startup stays under 1 MiB and never contacts a backend or downloads games', async ({ page, baseURL }, info) => {
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [], errors: string[] = [], sockets: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  page.on('websocket', socket => sockets.push(socket.url()));
  await page.goto('./');
  await expect(page.locator('#pedroos-boot-data')).not.toContainText('2091');
  await page.getByRole('button', { name: 'Iniciar com som', exact: true }).click();
  await expect(page.locator('#boot-screen')).toBeHidden({ timeout: 12_000 });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#start-button')).toBeVisible();
  const resources = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
    .map(entry => ({ url: entry.name, bytes: entry.toJSON().decodedBodySize || 0 })));
  const bytes = resources.reduce((n, entry) => n + entry.bytes, 0);
  await info.attach('startup-resources', { body: JSON.stringify({ bytes, resources }, null, 2), contentType: 'application/json' });
  expect(bytes).toBeLessThanOrEqual(1024 * 1024);
  expect(requests.filter(url => new URL(url).origin !== origin || /\/api\/|trycloudflare|\/assets\/games\//.test(url))).toEqual([]);
  expect(sockets).toEqual([]);
  expect(errors).toEqual([]);
});

test('static PDF, removed routes and source/license downloads work without an API', async ({ request }) => {
  const pdf = await request.get('./resume/Pedro-Tunin-Resume.pdf');
  expect(pdf.ok()).toBe(true);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
  for (const path of ['./projects/2091-retrogame/', './api/game2091/status', './assets/games/2091/title.mp3']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  for (const file of ['doom/chocolate-doom-source.tar.gz', 'skifree/source.tar.gz', 'opentyrian/source.tar.gz', 'omf2097/source.tar.gz']) {
    expect((await request.head('./assets/games/' + file)).ok()).toBe(true);
  }
});

test('galleries load small previews first and original pixels only when enlarged', async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('pedroos.boot.seen.v1', '1'); });
  const shots: string[] = [];
  page.on('request', request => { if (request.url().includes('/screenshots/')) shots.push(request.url()); });
  await page.goto('./projects/rdp-session-manager/');
  const preview = page.locator('[data-project-preview-image]');
  await expect(preview).toHaveAttribute('src', /\.preview\.webp$/);
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(shots.every(url => url.endsWith('.webp'))).toBe(true);
  await page.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
  await expect.poll(() => shots.some(url => url.endsWith('rdp-session-manager-header.png'))).toBe(true);
  await expect(page.locator('[data-project-viewer-image]')).toHaveAttribute('src', /header\.png$/);
});
