import { test, expect } from '@playwright/test';
import { observeAudio, type BootWindow } from './boot-helpers.js';

const basePath = process.env.PEDROOS_STATIC ? (process.env.PEDROOS_TEST_BASE || '/PedroOS') : '';
const home = `${basePath}/`;

test('boot uses a black VGA console and enters the desktop without any interaction', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Exercise the API's rejection consistently across browser autoplay policies.
  await observeAudio(page, true);
  await page.goto(home);
  const screen = page.locator('#boot-screen');
  const log = page.locator('[data-boot-log]');
  await expect(screen).toHaveAttribute('data-boot-phase', 'logs');
  await expect(log).toBeVisible();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', true);
  await expect(screen.locator('button')).toHaveCount(0);
  const style = await log.evaluate(el => {
    const text = getComputedStyle(el), screen = getComputedStyle(document.getElementById('boot-screen')!);
    return { background: screen.backgroundColor, textBackground: text.backgroundColor, color: text.color,
      shadow: text.boxShadow, padding: text.padding, font: text.fontFamily, size: text.fontSize, line: text.lineHeight,
      fontLoaded: document.fonts.check('16px "PedroOS VGA"') };
  });
  expect(style).toMatchObject({ background: 'rgb(0, 0, 0)', textBackground: 'rgba(0, 0, 0, 0)',
    color: 'rgb(192, 192, 192)', shadow: 'none', padding: '0px', size: '16px', line: '16px', fontLoaded: true });
  expect(style.font).toContain('PedroOS VGA');
  await page.screenshot({ path: `test-results/boot-logs-${isMobile ? 'mobile' : 'desktop'}.png` });
  await expect(screen).toHaveAttribute('data-boot-phase', 'splash');
  await expect(screen).not.toContainText(/Pressione|toque|Enter|Iniciar com som/);
  const art = page.locator('.boot-artwork img');
  await expect(art).toHaveJSProperty('complete', true);
  expect(await art.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/boot-splash-${isMobile ? 'mobile' : 'desktop'}.png` });
  await expect(screen).toBeHidden({ timeout: 6500 });
  await expect(page.locator('#desktop')).toBeVisible();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', false);
  await expect.poll(() => page.evaluate(() => (window as unknown as BootWindow).bootError)).toBe('NotAllowedError');
  expect(await page.evaluate(() => (window as unknown as BootWindow).bootAttempts)).toBe(1);
  await page.locator('#start-button').click();
  expect(await page.evaluate(() => (window as unknown as BootWindow).bootAttempts)).toBe(1);
  await page.reload();
  await expect(screen).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('pedroos.boot.seen.v1'))).toBe('1');
  expect(await page.evaluate(() => (window as unknown as BootWindow).bootAttempts)).toBe(0);
  expect(errors).toEqual([]);
});

test('Escape skips immediately and preserves a direct application route', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.wav')) audioRequests.push(request.url()); });
  await page.goto(`${basePath}/projects/`);
  await page.keyboard.press('Escape');
  await expect(page.locator('#boot-screen')).toBeHidden();
  await expect(page.locator('.os-window[data-app-id="projects"]')).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/?$/);
  expect(audioRequests).toEqual([]);
});

test('unavailable storage and font still complete reduced-motion startup automatically', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/WebPlus_IBM_VGA_8x16.woff', route => route.abort());
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto(home);
  await expect(page.locator('#boot-screen')).toHaveAttribute('data-boot-phase', 'splash');
  expect(await page.locator('.boot-loading span').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('#boot-screen')).toBeHidden();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', false);
});

test('restarting replays the automatic boot and preserves the welcome preference', async ({ page }) => {
  await page.goto(home);
  await page.keyboard.press('Escape');
  await expect(page.locator('#boot-screen')).toBeHidden();
  const preference = await page.evaluate(() => localStorage.getItem('pedroos.welcome.v1'));
  await page.evaluate(() => {
    (window as unknown as { PedroOS: { wm: { open(id: string): void } } }).PedroOS.wm.open('shutdown');
  });
  await page.locator('[data-shutdown-form] label').filter({ hasText: 'Reiniciar o PedroOS' }).click();
  await page.locator('[data-shutdown-form] button[type="submit"]').click();
  await expect(page.locator('#boot-screen')).toBeVisible();
  await expect(page.locator('#boot-screen')).toBeHidden({ timeout: 6500 });
  expect(await page.evaluate(() => localStorage.getItem('pedroos.welcome.v1'))).toBe(preference);
});

test('SSR content remains readable with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(`${basePath}/projects/`);
    await expect(page.locator('#boot-screen')).toBeHidden();
    await expect(page.locator('#desktop')).toBeVisible();
    await expect(page.locator('.os-window[data-app-id="projects"]')).toBeVisible();
  } finally { await context.close(); }
});
