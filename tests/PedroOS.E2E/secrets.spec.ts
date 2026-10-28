import { test, expect, type Page, type Locator } from './fixtures.js';

const secretPath = 'C:\\Segredos';
const diskPath = `${secretPath}\\Disquete`;
const node = (app: Locator, path: string) => app.locator(`[data-node-path=${JSON.stringify(path)}]`);
async function activate(item: Locator, mobile: boolean) {
  if (mobile) await item.click(); else await item.dblclick();
}
async function navigate(app: Locator, path: string) {
  await app.locator('[data-exp-address]').fill(path);
  await app.locator('[data-exp-address]').press('Enter');
}
async function konami(page: Page) {
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(key);
}

test('the recycle bin leads to hidden files, a touch-friendly theme and the disk', async ({ page, isMobile }) => {
  await page.goto('./');
  await expect(page.locator('#icon-secret-disk')).toBeHidden();
  await activate(page.locator('#icon-recycle'), isMobile);
  const app = page.locator('.os-window[data-app-id="explorer"]').last();
  await expect(app.locator('[data-exp-address]')).toHaveValue('C:\\Lixeira');
  await activate(node(app, 'C:\\Lixeira\\nao_apagar.txt'), isMobile);
  const notepad = page.locator('.os-window[data-app-id="notepad"]');
  await expect(notepad.locator('textarea')).toContainText('Exibir arquivos ocultos');
  await notepad.locator('[data-win-action="close"]').click();
  await navigate(app, 'C:\\');
  await expect(node(app, secretPath)).toHaveCount(0);
  await app.locator('[data-menu-trigger="view"]').click();
  await app.locator('[data-action="view-options"]').click();
  await activate(node(app, secretPath), isMobile);
  await expect(node(app, `${secretPath}\\Arcade.theme`)).toBeVisible();
  await activate(node(app, `${secretPath}\\Arcade.theme`), isMobile);
  await expect(page.locator('#desktop')).toHaveCSS('background-image', /arcade\.png/);
  await expect(page.locator('#icon-secret-disk')).toBeVisible();
  await activate(node(app, diskPath), isMobile);
  await expect(node(app, `${diskPath}\\NeonFist.exe`)).toBeVisible();
  await page.screenshot({ path: `test-results/secrets-disk-${isMobile ? 'mobile' : 'desktop'}.png` });
  await page.reload();
  await expect(page.locator('#icon-secret-disk')).toBeHidden();
  await expect(page.locator('#desktop')).not.toHaveCSS('background-image', /arcade\.png/);
});

test('Konami ignores text inputs, rejects wrong sequences and reveals exactly one disk', async ({ page, isMobile }) => {
  await page.goto('./');
  await activate(page.locator('#icon-msdos'), isMobile);
  await page.locator('[data-terminal-input]').focus();
  await konami(page);
  await expect(page.locator('#icon-secret-disk')).toBeHidden();
  await page.locator('.os-window[data-app-id="terminal"] [data-win-action="close"]').click();
  await page.locator('#desktop').click({ position: { x: isMobile ? 350 : 1100, y: 550 } });
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('a');
  await expect(page.locator('#icon-secret-disk')).toBeHidden();
  await konami(page);
  await expect(page.locator('#icon-secret-disk')).toBeVisible();
  await konami(page);
  await expect(page.locator('#icon-secret-disk')).toHaveCount(1);
  await expect(page.locator('#desktop')).toHaveCSS('background-image', /arcade\.png/);
});

test('terminal exploration reveals the disk without Konami and search respects hidden parents', async ({ page, isMobile }) => {
  await page.goto('./');
  await activate(page.locator('#icon-msdos'), isMobile);
  const input = page.locator('[data-terminal-input]');
  await input.fill('dir /a'); await input.press('Enter');
  await expect(page.locator('[data-terminal-output]')).toContainText('Segredos');
  await input.fill(`cd ${diskPath}`); await input.press('Enter');
  await expect(page.locator('#icon-secret-disk')).toBeVisible();
  await expect(page.locator('#desktop')).not.toHaveCSS('background-image', /arcade\.png/);
  const result = await page.evaluate(() => {
    const runtime = (window as unknown as { PedroOS: { vfs: { search(q: string, hidden?: boolean): unknown[] } } }).PedroOS;
    return [runtime.vfs.search('NeonFist').length, runtime.vfs.search('NeonFist', true).length];
  });
  expect(result).toEqual([0, 1]);
});

test('screen saver wakes without typing into the previous window and settings reset on reload', async ({ page, isMobile }) => {
  await page.clock.install();
  await page.goto('./');
  await activate(page.locator('#icon-readme'), isMobile);
  const text = page.locator('.notepad-textarea');
  await text.fill('Não altere este texto');
  await page.clock.fastForward(119_000);
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
  await page.clock.fastForward(3000);
  await expect(page.locator('[data-screen-saver]')).toBeVisible();
  await expect(page.locator('#desktop')).toHaveAttribute('inert', '');
  await page.keyboard.press('q');
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
  await expect(text).toHaveValue('Não altere este texto');
  await expect(text).toBeFocused();
  await page.clock.fastForward(600);
  await page.evaluate(() => {
    (window as unknown as { PedroOS: { wm: { open(id: string): void } } }).PedroOS.wm.open('display');
  });
  const display = page.locator('.os-window[data-app-id="display"]');
  await display.getByRole('tab', { name: 'Proteção de tela' }).click();
  await page.screenshot({ path: `test-results/saver-settings-${isMobile ? 'mobile' : 'desktop'}.png` });
  await display.getByText('Ativar proteção de tela', { exact: true }).click();
  await expect(display.locator('[data-saver-enabled]')).not.toBeChecked();
  await display.locator('[data-saver-minutes]').selectOption('5');
  await display.locator('[data-display-apply]').click();
  await page.clock.fastForward(301_000);
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
  await display.locator('[data-saver-preview]').click();
  await expect(page.locator('[data-screen-saver]')).toBeVisible();
  await page.screenshot({ path: `test-results/screen-saver-${isMobile ? 'mobile' : 'desktop'}.png` });
  await page.keyboard.press('Escape');
  await expect(display.locator('[data-saver-preview]')).toBeFocused();
  await page.reload();
  const settings = await page.evaluate(() => (window as unknown as { PedroOS: { secrets: { saver: unknown } } }).PedroOS.secrets.saver);
  expect(settings).toEqual({ enabled: true, minutes: 2 });
});

test('screen saver respects reduced motion, active games and the blue screen', async ({ page, isMobile }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.clock.fastForward(121_000);
  const logo = page.locator('[data-saver-logo]');
  const before = await logo.evaluate(element => element.style.transform);
  await page.clock.fastForward(10_000);
  expect(await logo.evaluate(element => element.style.transform)).toBe(before);
  if (isMobile) await page.touchscreen.tap(20, 20);
  else await page.mouse.move(20, 20);
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
  await page.clock.fastForward(600);
  await page.evaluate(() => (window as unknown as { PedroOS: { wm: { open(id: string): void } } }).PedroOS.wm.open('doom'));
  await page.clock.fastForward(181_000);
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
  await page.locator('.os-window[data-app-id="doom"] [data-win-action="close"]').click();
  await page.keyboard.press('Control+Alt+b');
  await expect(page.locator('#bsod-overlay')).toBeVisible();
  await page.clock.fastForward(181_000);
  await expect(page.locator('[data-screen-saver]')).toBeHidden();
});

test('Neon Fist plays against CPU offline, pauses with its window and disposes cleanly', async ({ page, context, isMobile }) => {
  const errors: string[] = [], backend: string[] = [], gameRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('/api/')) backend.push(request.url());
    if (request.url().includes('/games/neon-fist/')) gameRequests.push(request.url());
  });
  page.on('websocket', socket => backend.push(socket.url()));
  await page.goto('./');
  expect(gameRequests).toEqual([]);
  await activate(page.locator('#icon-recycle'), isMobile);
  const explorer = page.locator('.os-window[data-app-id="explorer"]').last();
  await navigate(explorer, diskPath);
  await activate(node(explorer, `${diskPath}\\NeonFist.exe`), isMobile);
  const app = page.locator('.os-window[data-app-id="neon-fist"]');
  await expect(app.locator('[data-neon-status]')).toContainText('Pronto', { timeout: 30_000 });
  const frame = app.frameLocator('[data-neon-frame]');
  const actualFrame = page.frames().find(item => item.url().includes('/neon-fist/player.html'))!;
  await context.setOffline(true);
  try {
    await frame.getByRole('button', { name: 'Jogar', exact: true }).click();
    await expect(app.locator('[data-neon-status]')).toContainText('Em execução');
    await expect(frame.locator('#topbar')).toHaveCount(0);
    await expect(frame.locator('#n2')).toHaveText('CPU');
    await expect.poll(async () => actualFrame.evaluate(() => (window as unknown as { NEON: { Game: { phase: string } } }).NEON.Game.phase)).toBe('fight');
    const cpuX = await actualFrame.evaluate(() => (window as unknown as { NEON: { P2: { x: number } } }).NEON.P2.x);
    await expect.poll(async () => actualFrame.evaluate(() => (window as unknown as { NEON: { P2: { x: number } } }).NEON.P2.x)).not.toBe(cpuX);
    if (isMobile) {
      await expect(frame.getByText('SOCO', { exact: true })).toBeVisible();
      await frame.getByText('SOCO', { exact: true }).tap();
    } else {
      const playerX = await actualFrame.evaluate(() => (window as unknown as { NEON: { P1: { x: number } } }).NEON.P1.x);
      await frame.locator('#game').press('d', { delay: 200 });
      expect(await actualFrame.evaluate(() => (window as unknown as { NEON: { P1: { x: number } } }).NEON.P1.x)).toBeGreaterThan(playerX);
      await frame.locator('#game').press('j');
    }
    await expect.poll(async () => actualFrame.evaluate(() => (window as unknown as { NEON: { Game: { frame: number } } }).NEON.Game.frame)).toBeGreaterThan(5);
    await page.screenshot({ path: `test-results/neon-fist-${isMobile ? 'mobile' : 'desktop'}.png` });
    await app.locator('[data-win-action="minimize"]').click();
    await expect(app.locator('[data-neon-status]')).toHaveText('Pausado');
    const stopped = await actualFrame.evaluate(() => (window as unknown as { NEON: { Game: { frame: number } } }).NEON.Game.frame);
    await page.waitForTimeout(150);
    expect(await actualFrame.evaluate(() => (window as unknown as { NEON: { Game: { frame: number } } }).NEON.Game.frame)).toBe(stopped);
    await page.locator('[data-taskbar-win-id]').filter({ hasText: 'Neon Fist' }).click();
    await expect(app.locator('[data-neon-status]')).toContainText('Em execução');
    await app.locator('[data-win-action="close"]').click();
    await expect.poll(() => actualFrame.isDetached()).toBe(true);
    expect(backend).toEqual([]);
    expect(errors).toEqual([]);
  } finally { await context.setOffline(false); }
});
