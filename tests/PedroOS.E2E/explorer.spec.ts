import { test, expect, type Locator, type Page } from './fixtures.js';

async function openExplorer(page: Page, mobile: boolean): Promise<Locator> {
  await page.goto('./');
  const icon = page.locator('#icon-explorer');
  if (mobile) await icon.click(); else await icon.dblclick();
  const app = page.locator('.os-window[data-app-id="explorer"]');
  await expect(app.locator('[data-exp-items]')).toBeVisible();
  return app;
}
async function menu(app: Locator, id: string): Promise<Locator> {
  const trigger = app.locator(`[data-menu-trigger="${id}"]`);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  return app.locator(`[data-menu="${id}"] [role="menu"]`);
}
async function go(app: Locator, path: string): Promise<void> {
  await app.locator('[data-exp-address]').fill(path);
  await app.locator('[data-exp-address]').press('Enter');
}

test('classic dropdowns keep labels, shortcuts, disabled items and hover colors aligned', async ({ page, isMobile }) => {
  const app = await openExplorer(page, isMobile);
  const file = await menu(app, 'file');
  const disabled = file.locator('[data-action="file-open"]');
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveCSS('color', 'rgb(128, 128, 128)');
  const properties = file.locator('[data-action="file-properties"]');
  await properties.hover();
  await expect(properties).toHaveCSS('background-color', 'rgb(0, 0, 128)');
  await expect(properties).toHaveCSS('color', 'rgb(255, 255, 255)');
  const row = await properties.boundingBox(); const popup = await file.boundingBox();
  expect(row!.width).toBeGreaterThan(popup!.width - 10);
  expect(await properties.locator('u').evaluate(el => getComputedStyle(el).display)).toBe('inline');
  await page.screenshot({ path: `test-results/explorer-file-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('[data-menu-trigger="edit"]').hover();
  await expect(app.locator('[data-menu-trigger="edit"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(file).toBeHidden();
  await expect(app.locator('[data-action="edit-copy"] .shortcut-key')).toHaveCSS('float', 'right');
  await app.locator('[data-exp-status-count]').click();
  await expect(app.locator('.win95-menu-dropdown.open')).toHaveCount(0);
  await menu(app, 'view');
  await expect(app.locator('[data-check="icons"]')).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: `test-results/explorer-view-${isMobile ? 'mobile' : 'desktop'}.png` });
});

test('keyboard menus skip disabled entries, switch menus, use mnemonics and close outside', async ({ page, isMobile }) => {
  const app = await openExplorer(page, isMobile);
  await app.locator('[data-exp-viewport]').focus();
  await page.keyboard.press('Alt+a');
  await expect(app.locator('[data-action="file-properties"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(app.locator('[data-action="file-close"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(app.locator('[data-action="file-properties"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(app.locator('[data-action="edit-select-all"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(app.locator('[data-menu-trigger="edit"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(app.locator('[data-menu-trigger="view"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('d');
  await expect(app.locator('[data-exp-items]')).toHaveClass(/view-details/);
  await expect(app.locator('.win95-menu-dropdown.open')).toHaveCount(0);
  await menu(app, 'help');
  await page.locator('#start-button').click();
  await expect(app.locator('.win95-menu-dropdown.open')).toHaveCount(0);
});

test('folder navigation, views, selection, properties and classic error dialogs work', async ({ page, isMobile }) => {
  const app = await openExplorer(page, isMobile);
  await go(app, 'C:\\Projetos');
  await expect(app.locator('[data-exp-items]')).toContainText('Ofizzy');
  await expect(app.locator('[data-exp-go-back]')).toBeEnabled();
  await expect(app.locator('[data-exp-go-fwd]')).toBeDisabled();
  for (const view of ['small-icons', 'list', 'details', 'icons']) {
    await menu(app, 'view');
    await app.locator(`.win95-menu-dropdown [data-exp-view="${view}"]`).click();
    await expect(app.locator(`[data-check="${view}"]`)).toHaveAttribute('aria-checked', 'true');
  }
  await app.locator('[data-exp-viewport]').focus();
  await page.keyboard.press('ArrowDown');
  await menu(app, 'file');
  await expect(app.locator('[data-action="file-open"]')).toBeEnabled();
  await app.locator('[data-action="file-properties"]').click();
  await expect(app.locator('dialog')).toBeVisible();
  await expect(app.locator('dialog')).toContainText('Conteúdo do portfólio somente para leitura');
  await page.screenshot({ path: `test-results/explorer-properties-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('dialog button[value="ok"]').click();
  await go(app, 'C:\\missing');
  await expect(app.locator('dialog')).toContainText('Não foi possível encontrar');
  await page.keyboard.press('Escape');
  await expect(app.locator('[data-exp-address]')).toHaveValue('C:\\missing');
  await go(app, 'C:\\Projetos');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(app.locator('[data-exp-address]')).toHaveValue('C:\\');
  await page.keyboard.press('Alt+ArrowRight');
  await expect(app.locator('[data-exp-address]')).toHaveValue('C:\\Projetos');
  await app.locator('[data-exp-folders]').click();
  await expect(app.locator('[data-exp-tree-pane]')).toBeHidden();
  await app.locator('[data-exp-folders]').click();
  await expect(app.locator('[data-exp-tree-pane]')).toBeVisible();
  await page.screenshot({ path: `test-results/explorer-main-${isMobile ? 'mobile' : 'desktop'}.png` });
});

test('context menu opens at the pointer, stays inside the window and changes views', async ({ page, isMobile }) => {
  const app = await openExplorer(page, isMobile);
  const viewport = app.locator('[data-exp-viewport]');
  const box = await viewport.boundingBox();
  await viewport.click({ button: 'right', position: { x: box!.width - 8, y: box!.height - 8 } });
  const popup = app.locator('[data-exp-context-menu]');
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox(); const window = await app.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(window!.x);
  expect(bounds!.y).toBeGreaterThanOrEqual(window!.y);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(window!.x + window!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(window!.y + window!.height);
  await page.screenshot({ path: `test-results/explorer-context-${isMobile ? 'mobile' : 'desktop'}.png` });
  await popup.locator('[data-exp-view="details"]').click();
  await expect(popup).toBeHidden();
  await expect(app.locator('[data-exp-items]')).toHaveClass(/view-details/);
  await viewport.click({ button: 'right', position: { x: 6, y: box!.height - 8 } });
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
});

test('tree arrows move focus, expand folders and open a selected directory', async ({ page, isMobile }) => {
  const app = await openExplorer(page, isMobile);
  const computer = app.locator('[data-tree-path]').first();
  await computer.focus();
  await page.keyboard.press('End');
  const focused = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.treePath);
  expect(focused).toBeTruthy();
  await page.keyboard.press('Enter');
  await expect(app.locator('[data-exp-address]')).toHaveValue(focused!);
  await expect(app.locator('[data-exp-tree] [data-tree-path]:focus')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
