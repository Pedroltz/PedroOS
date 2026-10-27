import { test, expect, type Page } from '@playwright/test';
import type { IWindowManager } from '../../src/PedroOS.Web/Client/types/index.js';

test.use({ storageState: { cookies: [], origins: [] } });
const selector = '.os-window[data-app-id="welcome"]';
async function reopen(page: Page) {
  await page.locator('#start-button').click();
  await page.locator('#start-menu [data-open-app="welcome"]').click();
  await expect(page.locator(`${selector} [data-welcome-app]`)).toBeVisible();
}

test('first visit presents a centered classic portfolio window and all six tips', async ({ page, isMobile }) => {
  await page.goto('/');
  const app = page.locator(selector);
  await expect(app.locator('[data-welcome-app]')).toBeVisible();
  await expect(app).toContainText('portfólio interativo de Pedro Tunin');
  await expect(app).not.toContainText('Windows 95');
  await expect(app.getByRole('checkbox', { name: 'Mostrar esta tela ao iniciar' })).toBeChecked();
  await expect(page.locator('[data-taskbar-win-id]')).toHaveCount(1);
  if (!isMobile) {
    const box = (await app.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  }
  await expect(app.locator('[data-welcome-tip-title]')).toHaveText('Explore o desktop');
  await page.screenshot({ path: `test-results/welcome-${isMobile ? 'mobile' : 'desktop'}.png` });
  const next = app.getByRole('button', { name: 'Próxima dica' });
  for (const title of ['Projetos em destaque', 'Uma aventura no terminal', 'Um endereço diferente', 'Um segredo no Campo Minado', 'Recursos do sistema', 'Explore o desktop']) {
    await next.focus(); await page.keyboard.press('Enter');
    await expect(app.locator('[data-welcome-tip-title]')).toHaveText(title);
    await expect(next).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await app.locator('[data-win-action="close"]').click();
  await page.reload();
  await expect(page.locator(`${selector} [data-welcome-app]`)).toBeVisible();
  await page.locator(`${selector} [data-close-fragment]`).click();
  await reopen(page);
  await page.evaluate(() => { (window as unknown as { PedroOS: { wm: IWindowManager } }).PedroOS.wm.open('welcome'); });
  await expect(page.locator(selector)).toHaveCount(1);
  await expect(page.locator(`${selector} [data-welcome-tip-title]`)).toHaveText('Explore o desktop');
});

test('startup preference persists, can be reenabled and closing does not change it', async ({ page }) => {
  await page.goto('/');
  const app = page.locator(selector);
  await app.locator('[data-welcome-startup-label]').click();
  await expect(app.getByRole('checkbox')).not.toBeChecked();
  await app.locator('[data-win-action="close"]').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pedroos.welcome.v1')!))).toEqual({ showOnStartup: false });
  await page.reload();
  await expect(page.locator('#start-button')).toBeVisible();
  await expect(page.locator(selector)).toHaveCount(0);
  await reopen(page);
  await expect(app.getByRole('checkbox')).not.toBeChecked();
  await app.getByRole('checkbox').focus();
  await page.keyboard.press('Space');
  await expect(app.getByRole('checkbox')).toBeChecked();
  await app.locator('[data-close-fragment]').click();
  await page.reload();
  await expect(app.locator('[data-welcome-app]')).toBeVisible();
});

for (const [label, id, route] of [['Explorar projetos', 'projects', '/projects'], ['Ver currículo', 'resume', '/resume'], ['Competências', 'sysprops', '/skills']]) {
  test(`${label} closes the welcome window before opening its application`, async ({ page }) => {
    await page.goto('/');
    await page.locator(selector).getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator(selector)).toHaveCount(0);
    await expect(page.locator(`.os-window[data-app-id="${id}"]`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await page.goBack();
    await expect(page.locator('#start-button')).toBeVisible();
    await expect(page.locator(selector)).toHaveCount(0);
    await page.goForward();
    await expect(page.locator(selector)).toHaveCount(0);
  });
}

test('direct links and missing pages do not auto-open welcome', async ({ page }) => {
  for (const path of ['/projects', '/projects/ofizzy', '/resume', '/skills', '/not-found']) {
    await page.goto(path);
    await expect(page.locator('#start-button')).toBeVisible();
    await expect(page.locator(selector)).toHaveCount(0);
  }
});

test('unavailable storage retains preference for the current visit', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } }); });
  await page.goto('/');
  await page.locator(`${selector} [data-welcome-startup-label]`).click();
  await page.locator(`${selector} [data-close-fragment]`).click();
  await reopen(page);
  await expect(page.locator(selector).getByRole('checkbox')).not.toBeChecked();
  await page.locator(selector).getByRole('button', { name: 'Explorar projetos', exact: true }).click();
  await expect(page.locator('.os-window[data-app-id="projects"]')).toBeVisible();
});

test('a short narrow screen keeps welcome actions accessible without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 420 });
  await page.goto('/');
  const app = page.locator(selector);
  await expect(app.locator('[data-welcome-app]')).toBeVisible();
  await expect(app.getByRole('checkbox')).toBeInViewport();
  await expect(app.locator('[data-close-fragment]')).toBeInViewport();
  await app.getByRole('button', { name: 'Próxima dica' }).click();
  await expect(app.locator('[data-welcome-tip-title]')).toHaveText('Projetos em destaque');
  expect(await app.locator('[data-welcome-app]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/welcome-narrow.png' });
});
