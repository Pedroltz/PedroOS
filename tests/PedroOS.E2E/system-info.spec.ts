import { test, expect } from './fixtures.js';

test('system properties has readable summary, accessible keyboard tabs and category shortcuts', async ({ page, isMobile }) => {
  await page.goto('./skills');
  const app = page.locator('.os-window[data-app-id="sysprops"]');
  await expect(app.locator('[data-info-panel="general"]')).toBeVisible();
  await expect(app.locator('.system-summary')).toContainText('competências');
  await expect(app.getByRole('button', { name: 'Fechar janela' })).toBeInViewport();
  await page.screenshot({ path: `test-results/system-general-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.getByRole('tab', { name: 'Geral', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  const devices = app.getByRole('tab', { name: 'Gerenciador de Dispositivos' });
  await expect(devices).toBeFocused();
  await expect(devices).toHaveAttribute('aria-selected', 'true');
  await expect(app.locator('[data-info-panel="dev-manager"]')).toBeVisible();
  await page.keyboard.press('End');
  await expect(app.getByRole('tab').last()).toBeFocused();
  await page.keyboard.press('Home');
  await app.locator('[data-info-go="development"]').click();
  await expect(app.getByRole('tab', { name: 'Desenvolvimento' })).toHaveAttribute('aria-selected', 'true');
  await expect(app.locator('[data-info-panel="development"]')).toContainText('C# e .NET');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('device manager selects actual experience, collapses groups and opens related projects', async ({ page, isMobile }) => {
  await page.goto('./skills');
  const app = page.locator('.os-window[data-app-id="sysprops"]');
  await app.getByRole('tab', { name: 'Gerenciador de Dispositivos' }).click();
  const inspector = app.locator('[data-skill-inspector]');
  await expect(inspector).toContainText('C# e .NET');
  await app.locator('[data-skill-select="python"]').click();
  await expect(inspector.getByRole('heading', { name: 'Python', exact: true })).toBeVisible();
  await expect(app.locator('[data-skill-select="python"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(inspector).toContainText('FastAPI');
  await expect(inspector.locator('[data-arg-slug="rdp-session-manager"]')).toBeVisible();
  await app.locator('.system-device-tree summary').first().click();
  await expect(app.locator('[data-skill-select="python"]')).toBeHidden();
  await app.locator('.system-device-tree summary').first().click();
  await app.locator('[data-skill-select="python"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(app.locator('[data-skill-select="python"]')).not.toBeFocused();
  await page.screenshot({ path: `test-results/system-devices-${isMobile ? 'mobile' : 'desktop'}.png` });
  await inspector.locator('[data-arg-slug="rdp-session-manager"]').click();
  await expect(page.locator('.os-window[data-instance-key="project:rdp-session-manager"]')).toBeVisible();
});

test('about dialog has architecture, credits, licenses and a working close action', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="about"]').click();
  const app = page.locator('.os-window[data-app-id="about"]');
  await expect(app.getByRole('heading', { name: 'PedroOS 95', exact: true })).toBeVisible();
  await expect(app.locator('[data-info-panel="general"]')).toContainText('Pedro Tunin');
  await page.screenshot({ path: `test-results/about-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.getByRole('tab', { name: 'Componentes' }).click();
  await expect(app.getByRole('tabpanel')).toContainText('ASP.NET Core');
  await app.getByRole('tab', { name: 'Créditos' }).click();
  await expect(app.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank');
  await app.getByRole('button', { name: 'Licenças de terceiros' }).click();
  const notepad = page.locator('.os-window[data-app-id="notepad"]');
  await expect(notepad).toBeVisible();
  await notepad.locator('[data-win-action="close"]').click();
  await app.getByRole('button', { name: 'Fechar janela' }).click();
  await expect(app).toHaveCount(0);
});

test('reopening system properties keeps one tab controller', async ({ page }) => {
  await page.goto('./skills');
  const system = page.locator('.os-window[data-app-id="sysprops"]');
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="about"]').click();
  const about = page.locator('.os-window[data-app-id="about"]');
  await about.getByRole('button', { name: 'Propriedades do sistema', exact: true }).click();
  await expect(system).toHaveCount(1);
  await system.getByRole('tab', { name: 'Geral', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(system.getByRole('tab', { name: 'Gerenciador de Dispositivos' })).toBeFocused();
  await system.getByRole('button', { name: 'Fechar janela' }).click();
  await expect(system).toHaveCount(0);
});
