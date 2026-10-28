import { test, expect, type Page } from './fixtures.js';
import type { IWindowManager } from '../../src/PedroOS.Web/Client/types/index.js';

type DesktopDebug = { wm: IWindowManager; store: { getAllWindows(): { id: string }[] } };
async function openWindows(page: Page, count: number) {
  await page.evaluate(count => {
    const { wm } = (window as unknown as { PedroOS: DesktopDebug }).PedroOS;
    for (let i = 0; i < count; i++) wm.open('explorer');
  }, count);
}

test('window pressure starts at four, preserves applications and respects the recovery interval', async ({ page, isMobile }) => {
  await page.clock.install();
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('./');
  const overlay = page.locator('#bsod-overlay');
  await openWindows(page, 3);
  await expect(overlay).toBeHidden();
  await openWindows(page, 1);
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeFocused();
  await expect(overlay.locator('[data-bsod-message]')).toHaveText('Memória insuficiente para executar esta operação.');
  await expect(overlay.locator('[data-bsod-windows]')).toHaveText('Aplicativos abertos: 4.');
  await expect(page.locator('#desktop-windows')).toHaveJSProperty('inert', true);
  await expect(overlay).not.toContainText(/Campo Minado|segredo|sessão.*segur/i);
  await page.screenshot({ path: `test-results/bsod-memory-${isMobile ? 'mobile' : 'desktop'}.png` });
  await page.keyboard.press('Alt+F4');
  await expect(overlay).toBeHidden();
  await expect(page.locator('.os-window')).toHaveCount(4);
  await expect(page.locator('#desktop-windows')).toHaveJSProperty('inert', false);
  await openWindows(page, 1);
  await expect(overlay).toBeHidden();
  await page.clock.fastForward(60_001);
  await openWindows(page, 1);
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('[data-bsod-windows]')).toHaveText('Aplicativos abertos: 6.');
  await overlay.click();
  await expect(overlay).toBeHidden();
  await page.evaluate(() => {
    const { wm, store } = (window as unknown as { PedroOS: DesktopDebug }).PedroOS;
    for (const record of store.getAllWindows().slice(0, 4)) wm.close(record.id);
  });
  await page.clock.fastForward(60_001);
  await openWindows(page, 1);
  await expect(page.locator('.os-window')).toHaveCount(3);
  await expect(overlay).toBeHidden();
});

test('a large window count is a probability, and focusing an existing app is not a new allocation', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('./skills');
  await openWindows(page, 15);
  await expect(page.locator('#bsod-overlay')).toBeHidden();
  await page.evaluate(() => { Math.random = () => 0; });
  await page.evaluate(() => { (window as unknown as { PedroOS: DesktopDebug }).PedroOS.wm.open('sysprops'); });
  await expect(page.locator('#bsod-overlay')).toBeHidden();
  await expect(page.locator('.os-window')).toHaveCount(16);
  await openWindows(page, 1);
  await expect(page.locator('#bsod-overlay')).toBeVisible();
});

test('manual diagnostics use the same classic screen with different system errors', async ({ page }) => {
  await page.goto('./');
  const overlay = page.locator('#bsod-overlay');
  for (const [random, code] of [[0, 'MEMORY_ALLOCATION_FAILURE'], [.4, 'SYSTEM_RESOURCES_EXHAUSTED'], [.8, 'VIRTUAL_MEMORY_ERROR']] as const) {
    await page.evaluate(random => { Math.random = () => random; }, random);
    await page.keyboard.press('Control+Alt+b');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('[data-bsod-code]')).toHaveText(code);
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  }
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="run"]').click();
  await page.locator('[data-run-input]').fill('bsod');
  await page.locator('[data-run-input]').press('Enter');
  await expect(overlay).toBeVisible();
  await overlay.click();
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="about"]').click();
  const about = page.locator('.os-window[data-app-id="about"]');
  await about.getByRole('tab', { name: 'Créditos' }).click();
  const trigger = about.getByRole('button', { name: 'Testar tela azul' });
  await trigger.click();
  await expect(overlay).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(overlay).toBeHidden();
  await expect(trigger).toBeFocused();
});
