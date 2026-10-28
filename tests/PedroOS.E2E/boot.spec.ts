import { test, expect } from '@playwright/test';

const basePath = process.env.PEDROOS_STATIC ? (process.env.PEDROOS_TEST_BASE || '/PedroOS') : '';
const home = `${basePath}/`;

test('boot shows DOS logs, branded art and plays the original chime only after interaction', async ({ page, isMobile }) => {
  const errors: string[] = [];
  const sounds: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('windows-95-startup.wav')) sounds.push(request.url()); });
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.dataset.bootAudio = 'observed';
      // Retain only for checking actual browser media playback, not a mock.
      (window as unknown as { bootAudio: HTMLMediaElement }).bootAudio = this;
      return play.call(this);
    };
  });
  await page.goto(home);
  const screen = page.locator('#boot-screen');
  await expect(screen).toHaveAttribute('data-boot-phase', 'logs');
  await expect(page.locator('#desktop')).toBeHidden();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', true);
  await expect(page.locator('[data-boot-log]')).toContainText('Verificando memória');
  await page.screenshot({ path: `test-results/boot-logs-${isMobile ? 'mobile' : 'desktop'}.png` });
  await expect(screen).toHaveAttribute('data-boot-phase', 'splash');
  await expect(page.locator('[data-boot-log]')).toContainText('PEDROOS.SYS');
  expect(sounds).toHaveLength(0);
  const art = page.locator('.boot-artwork img');
  await expect(art).toHaveJSProperty('complete', true);
  expect(await art.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/boot-splash-${isMobile ? 'mobile' : 'desktop'}.png` });
  if (isMobile) await page.getByRole('button', { name: 'Iniciar com som', exact: true }).tap();
  else await page.keyboard.press('Enter');
  await expect(screen).toHaveAttribute('data-boot-phase', 'sound');
  await expect.poll(() => page.evaluate(() => {
    const audio = (window as unknown as { bootAudio: HTMLMediaElement }).bootAudio;
    return audio.currentTime > 0 && !audio.paused;
  })).toBe(true);
  await expect(screen).toBeHidden({ timeout: 10_000 });
  expect(sounds.length).toBeGreaterThan(0);
  expect(sounds.every(url => new URL(url).pathname === `${basePath}/assets/boot/windows-95-startup.wav`)).toBe(true);
  const playback = await page.evaluate(() => {
    const audio = (window as unknown as { bootAudio: HTMLMediaElement }).bootAudio;
    return { ended: audio.ended, duration: audio.duration, paused: audio.paused };
  });
  expect(playback.ended).toBe(true);
  expect(playback.duration).toBeCloseTo(6.12, 1);
  await expect(page.locator('#desktop')).toBeVisible();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', false);
  await page.reload();
  await expect(screen).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('pedroos.boot.seen.v1'))).toBe('1');
  expect(errors).toEqual([]);
});

test('Escape skips immediately and preserves a direct application route', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.wav')) audioRequests.push(request.url()); });
  await page.goto(`${basePath}/projects/`);
  await expect(page.locator('#boot-screen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#boot-screen')).toBeHidden();
  await expect(page.locator('.os-window[data-app-id="projects"]')).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/?$/);
  expect(audioRequests).toEqual([]);
});

test('storage unavailable, reduced motion and denied audio still reach the desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
  });
  await page.goto(home);
  await expect(page.locator('[data-boot-start]')).toBeVisible();
  expect(await page.locator('.boot-loading span').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Iniciar com som', exact: true }).click();
  await expect(page.locator('#boot-screen')).toBeHidden();
  await expect(page.locator('#desktop')).toBeVisible();
  await expect(page.locator('#desktop')).toHaveJSProperty('inert', false);
});

test('missing sound file cannot strand the user at startup', async ({ page }) => {
  await page.route('**/windows-95-startup.wav', route => route.fulfill({ status: 404, body: '' }));
  await page.goto(home);
  await page.getByRole('button', { name: 'Iniciar com som', exact: true }).click();
  await expect(page.locator('#boot-screen')).toBeHidden();
  await expect(page.locator('#start-button')).toBeVisible();
});

test('restarting PedroOS replays boot without changing the welcome preference', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Entrar sem som (Esc)', exact: true }).click();
  await expect(page.locator('#boot-screen')).toBeHidden();
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
