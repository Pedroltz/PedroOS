import { test, expect } from '@playwright/test';
import { observeAudio, type BootWindow } from './boot-helpers.js';

const basePath = process.env.PEDROOS_STATIC ? (process.env.PEDROOS_TEST_BASE || '/PedroOS') : '';
const home = `${basePath}/`;

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

test('the original chime plays over the ready desktop without a click', async ({ page }) => {
  await observeAudio(page);
  await page.goto(home);
  await expect(page.locator('#boot-screen')).toBeHidden({ timeout: 6500 });
  await expect(page.locator('#start-button')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const audio = (window as unknown as BootWindow).bootAudio;
    return !!audio && audio.currentTime > 0 && !audio.paused;
  })).toBe(true);
  expect(await page.evaluate(() => (window as unknown as BootWindow).bootAudio!.duration)).toBeCloseTo(6.12, 1);
  await expect.poll(() => page.evaluate(() => (window as unknown as BootWindow).bootEnded), { timeout: 8000 }).toBe(true);
});

test('the tray mute stops the startup recording', async ({ page }) => {
  await observeAudio(page);
  await page.goto(home);
  await expect(page.locator('#boot-screen')).toBeHidden({ timeout: 6500 });
  await expect.poll(() => page.evaluate(() => (window as unknown as BootWindow).bootAudio?.paused)).toBe(false);
  await page.locator('#tray-sound-toggle').click();
  expect(await page.evaluate(() => (window as unknown as BootWindow).bootAudio!.paused)).toBe(true);
  await expect(page.locator('#tray-sound-icon')).toHaveAttribute('alt', 'Som mudo');
});

for (const state of ['missing', 'slow'] as const) {
  test(`${state} audio cannot hold the desktop behind the boot screen`, async ({ page }) => {
    await page.route('**/windows-95-startup.wav', route => {
      if (state === 'missing') return route.fulfill({ status: 404, body: '' });
      // Deliberately leave the media response pending; context disposal aborts it.
    });
    await page.goto(home);
    await expect(page.locator('#boot-screen')).toBeHidden({ timeout: 6500 });
    await expect(page.locator('#desktop')).toBeVisible();
    await page.locator('#start-button').click();
    await expect(page.locator('#start-menu')).toBeVisible();
  });
}
