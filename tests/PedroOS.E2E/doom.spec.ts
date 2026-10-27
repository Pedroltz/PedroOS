import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';

async function openDoom(page: Page) {
  await page.goto('/');
  await page.locator('#start-button').click();
  await page.locator('#start-menu [data-open-app="run"]').click();
  await page.locator('[data-run-input]').fill('doom');
  await page.locator('[data-run-input]').press('Enter');
  const app = page.locator('.os-window[data-app-id="doom"]');
  await expect(app.locator('[data-doom-app]')).toBeVisible();
  return app;
}

test('Doom is lazy-loaded, renders a real game and pauses and disposes with its window', async ({ page, isMobile }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', req => { if (req.url().includes('/games/doom/')) requests.push(req.url()); });
  page.on('pageerror', err => errors.push(err.message));
  const app = await openDoom(page);
  expect(requests).toEqual([]);
  await page.screenshot({ path: `test-results/doom-launcher-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('[data-doom-start]').click();
  await expect(app.locator('[data-doom-status]')).toContainText('Clique ou toque', { timeout: 60_000 });
  const frame = app.frameLocator('[data-doom-frame]');
  await frame.locator('#canvas').click();
  await expect(app.locator('[data-doom-status]')).toContainText('Em execução');
  // Enter the new-game menu, select episode and difficulty.
  for (let i = 0; i < 4; i++) { await frame.locator('#canvas').press('Enter'); await page.waitForTimeout(200); }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `test-results/doom-game-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('[data-doom-pause]').click();
  await expect(frame.locator('#message')).toHaveText('Jogo pausado');
  await app.locator('[data-doom-pause]').click();
  await expect(frame.locator('#message')).toBeHidden();
  await app.locator('[data-doom-mute]').click();
  await expect(app.locator('[data-doom-mute]')).toHaveAttribute('aria-pressed', 'true');
  if (isMobile) {
    await expect(frame.getByRole('button', { name: 'Atirar', exact: true })).toBeVisible();
    await frame.getByRole('button', { name: 'Usar', exact: true }).click();
  }
  await app.locator('[data-win-action="minimize"]').click();
  const actualFrame = page.frames().find(item => item.url().includes('/doom/player.html'))!;
  expect(await actualFrame.locator('#message').textContent()).toBe('Jogo pausado');
  await page.locator('[data-taskbar-win-id]').click();
  await expect(frame.locator('#message')).toBeHidden();
  await app.locator('[data-win-action="close"]').click();
  await expect(app).toHaveCount(0);
  await expect.poll(() => actualFrame.isDetached()).toBe(true);
  expect(requests.some(url => url.includes('.wasm'))).toBe(true);
  expect(requests.some(url => url.includes('freedoom1.wad'))).toBe(true);
  expect(errors).toEqual([]);
});

test('invalid files are rejected and local IWADs can launch without fetching the default WAD', async ({ page }) => {
  const app = await openDoom(page);
  await app.locator('[data-doom-file]').setInputFiles({ name: 'invalid.wad', mimeType: 'application/octet-stream', buffer: Buffer.from('not a valid IWAD') });
  await expect(app.locator('[data-doom-status]')).toContainText('Arquivo inválido');
  await app.locator('[data-doom-file]').setInputFiles(resolve('src/PedroOS.Web/wwwroot/assets/games/doom/freedoom1.wad'));
  await expect(app.locator('[data-doom-start]')).toHaveText('Jogar WAD selecionado');
  const downloads: string[] = [];
  page.on('request', req => { if (req.url().endsWith('.wad')) downloads.push(req.url()); });
  await app.locator('[data-doom-start]').click();
  await expect(app.locator('[data-doom-status]')).toContainText('Clique ou toque', { timeout: 60_000 });
  await app.frameLocator('[data-doom-frame]').locator('#canvas').click();
  await expect(app.locator('[data-doom-status]')).toContainText('Em execução');
  expect(downloads).toEqual([]);
  await app.locator('[data-doom-default]').click();
  await expect(app.locator('[data-doom-start]')).toHaveText('Jogar Freedoom');
  await expect(app.locator('[data-doom-frame]')).toBeHidden();
});

test('unavailable engine assets give a recoverable error', async ({ page }) => {
  await page.route('**/websockets-doom.wasm', route => route.abort());
  const app = await openDoom(page);
  await app.locator('[data-doom-start]').click();
  await expect(app.locator('[data-doom-status]')).toContainText('Não foi possível iniciar', { timeout: 30_000 });
  await expect(app.locator('[data-doom-start]')).toBeEnabled();
  await expect(app.locator('[data-doom-launcher]')).toBeVisible();
});

test('WebAssembly is allowed only on the game player and the free assets and source are served locally', async ({ request }) => {
  const home = await request.get('/');
  expect(home.headers()['content-security-policy']).not.toContain('wasm-unsafe-eval');
  const player = await request.get('/assets/games/doom/player.html');
  expect(player.headers()['content-security-policy']).toContain('wasm-unsafe-eval');
  expect(player.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
  expect((await request.head('/assets/games/doom/websockets-doom.wasm')).headers()['content-type']).toContain('application/wasm');
  expect((await request.head('/assets/games/doom/freedoom1.wad')).status()).toBe(200);
  expect((await request.head('/assets/games/doom/chocolate-doom-source.tar.gz')).status()).toBe(200);
});
