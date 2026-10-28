import { test, expect } from './fixtures.js';

const games = [
  { id: 'skifree', file: 'SkiFree.exe', title: 'SkiFree', asset: 'engine.js' },
  { id: 'opentyrian', file: 'OpenTyrian.exe', title: 'OpenTyrian', asset: 'index.wasm' },
  { id: 'omf2097', file: 'OneMustFall2097.exe', title: 'One Must Fall 2097', asset: 'wdosbox.wasm' },
];
const canvasFingerprint = () => {
  const value = document.querySelector('canvas')!.toDataURL();
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
};

for (const game of games) {
  test(`${game.title} launches from Games, plays locally, pauses and disposes`, async ({ page, context, isMobile, baseURL }) => {
    test.setTimeout(90_000);
    const errors: string[] = [], requests: string[] = [], forbidden: string[] = [];
    const origin = new URL(baseURL!).origin;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      requests.push(request.url());
      if (request.url().includes('/api/') || new URL(request.url()).origin !== origin) forbidden.push(request.url());
    });
    page.on('websocket', socket => forbidden.push(socket.url()));
    await page.goto('./');
    expect(requests.some(url => url.includes(`/games/${game.id}/`))).toBe(false);
    const icon = page.locator('#icon-my-computer');
    if (isMobile) await icon.click(); else await icon.dblclick();
    const explorer = page.locator('.os-window[data-app-id="explorer"]').last();
    await explorer.locator('[data-exp-address]').fill('C:\\Jogos');
    await explorer.locator('[data-exp-address]').press('Enter');
    for (const item of games) await expect(explorer.locator(`[data-node-path=${JSON.stringify('C:\\Jogos\\' + item.file)}]`)).toBeVisible();
    const item = explorer.locator(`[data-node-path=${JSON.stringify('C:\\Jogos\\' + game.file)}]`);
    if (isMobile) await item.click(); else await item.dblclick();
    const app = page.locator(`.os-window[data-app-id="${game.id}"]`);
    await expect(app.locator('[data-retro-status]')).toContainText('Clique em Jogar');
    expect(requests.some(url => url.endsWith('/' + game.asset))).toBe(false);
    const frame = app.frameLocator('[data-retro-frame]');
    const actualFrame = page.frames().find(value => value.url().includes(`/games/${game.id}/player.html`))!;
    await frame.getByRole('button', { name: 'Jogar', exact: true }).click();
    await expect(app.locator('[data-retro-status]')).toHaveText('Em execução', { timeout: 60_000 });
    await expect(frame.locator('html')).toHaveAttribute('data-game-state', 'running');
    expect(requests.some(url => url.endsWith('/' + game.asset))).toBe(true);
    await context.setOffline(true);
    try {
      const canvas = frame.locator('canvas');
      await page.waitForTimeout(700);
      if (game.id === 'skifree') {
        if (isMobile) {
          const bounds = (await canvas.boundingBox())!;
          await canvas.tap({ position: { x: bounds.width * 0.55, y: bounds.height * 0.85 } });
        }
        else await canvas.press('s');
      } else {
        for (let i = 0; i < 8; i++) { await canvas.press('Enter', { delay: 100 }); await page.waitForTimeout(250); }
        await canvas.press('ArrowRight', { delay: 200 });
        if (isMobile) await expect(frame.locator('#touch')).toBeVisible();
      }
      await page.waitForTimeout(500);
      const rendered = await canvas.screenshot();
      expect(rendered.length).toBeGreaterThan(1500);
      await page.screenshot({ path: `test-results/${game.id}-${isMobile ? 'mobile' : 'desktop'}.png` });
      await expect(app.locator('[role="toolbar"]')).toHaveCount(0);
      await app.locator('[data-win-action="minimize"]').click();
      await expect(frame.locator('html')).toHaveAttribute('data-game-state', 'paused');
      // Compare the canvas directly; window chrome can change while minimized.
      const snapshot = await actualFrame.evaluate(canvasFingerprint);
      await page.waitForTimeout(200);
      expect(await actualFrame.evaluate(canvasFingerprint)).toBe(snapshot);
      await page.locator('[data-taskbar-win-id]').filter({ hasText: game.title }).click();
      await expect(app.locator('[data-retro-status]')).toHaveText('Em execução');
      await expect(frame.locator('html')).toHaveAttribute('data-game-state', 'running');
      await app.locator('[data-win-action="close"]').click();
      await expect.poll(() => actualFrame.isDetached()).toBe(true);
      expect(errors).toEqual([]);
      expect(forbidden).toEqual([]);
    } finally { await context.setOffline(false); }
  });
}

test('WASM permissions are scoped to the players and game loading errors are recoverable', async ({ page, request, isMobile }) => {
  if (!process.env.PEDROOS_STATIC) {
    const home = await request.get('./');
    expect(home.headers()['content-security-policy']).not.toContain('wasm-unsafe-eval');
    for (const game of ['omf2097', 'opentyrian']) {
      const response = await request.get(`./assets/games/${game}/player.html`);
      expect(response.headers()['content-security-policy']).toContain('wasm-unsafe-eval');
      expect(response.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
    }
  }
  await page.route('**/skifree/engine.js', route => route.abort());
  await page.goto('./');
  const icon = page.locator('#icon-my-computer');
  if (isMobile) await icon.click(); else await icon.dblclick();
  const explorer = page.locator('.os-window[data-app-id="explorer"]').last();
  await explorer.locator('[data-exp-address]').fill('C:\\Jogos'); await explorer.locator('[data-exp-address]').press('Enter');
  const item = explorer.locator(`[data-node-path=${JSON.stringify('C:\\Jogos\\SkiFree.exe')}]`);
  if (isMobile) await item.click(); else await item.dblclick();
  const app = page.locator('.os-window[data-app-id="skifree"]');
  await app.frameLocator('[data-retro-frame]').getByRole('button', { name: 'Jogar', exact: true }).click();
  await expect(app.locator('[data-retro-status]')).toContainText('Não foi possível iniciar');
  await app.locator('[data-win-action="close"]').click();
  await expect(explorer).toBeVisible();
});
