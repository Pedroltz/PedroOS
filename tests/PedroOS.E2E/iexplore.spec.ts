import { test, expect, type Page, type Locator } from './fixtures.js';

async function openBrowser(page: Page, mobile: boolean): Promise<Locator> {
  await page.goto('./');
  if (mobile) await page.locator('#icon-iexplore').click();
  else await page.locator('#icon-iexplore').dblclick();
  const app = page.locator('.os-window[data-app-id="iexplore"]').last();
  await expect(app.locator('[data-ie-viewport]')).toBeVisible();
  return app;
}
async function go(app: Locator, url: string): Promise<void> {
  const address = app.locator('[data-ie-address]');
  await address.fill(url); await address.press('Enter');
}
async function menu(app: Locator, name: string, action: string): Promise<void> {
  await app.locator(`[data-ie-menu="${name}"]`).click();
  await app.locator(`.ie-menu-popup:not([hidden]) [data-ie-action="${action}"]`).click();
}

test('internal pages, address safety, blank page, links and independent back/forward scroll', async ({ page, isMobile }) => {
  const app = await openBrowser(page, isMobile);
  const viewport = app.locator('[data-ie-viewport]');
  await go(app, 'projects');
  await expect(viewport).toContainText('Diretório de Projetos');
  await expect(viewport.locator('img.ie-project-preview').first()).toBeVisible();
  await viewport.evaluate(el => { el.scrollTop = 150; });
  const top = await viewport.evaluate(el => el.scrollTop);
  await go(app, 'skills');
  await expect(viewport).toContainText('Diretório de Competências');
  await expect(viewport).toContainText('Tool Calling');
  await go(app, 'resume');
  await expect(viewport).toContainText('Currículo');
  await expect(viewport).not.toContainText('PLACEHOLDER');
  await app.locator('[data-ie-back]').click();
  await app.locator('[data-ie-back]').click();
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBe(top);
  await go(app, 'about:blank');
  await expect(viewport).toBeEmpty();
  await expect(app.locator('[data-ie-forward]')).toBeDisabled();
  await go(app, 'javascript:alert(1)');
  await expect(viewport).toContainText('não pode abrir');
  await expect(viewport.locator('a[href^="javascript:"]')).toHaveCount(0);
  await go(app, 'pedroos://missing');
  await expect(viewport).toContainText('não está cadastrado');
  await go(app, 'https://example.com');
  const external = viewport.getByRole('link', { name: /Abrir https/ });
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', /noopener/);
  await go(app, 'about:mozilla');
  await expect(viewport).toContainText('O Livro do PedroOS');
});

test('menus, keyboard, dialogs, search, favorites and persisted preferences', async ({ page, isMobile }) => {
  const app = await openBrowser(page, isMobile);
  await app.locator('[data-ie-menu="File"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(app.locator('[data-ie-action="open"]')).toBeFocused();
  await page.screenshot({ path: `test-results/ie-menu-${isMobile ? 'mobile' : 'desktop'}.png` });
  await page.keyboard.press('Escape');
  await menu(app, 'File', 'open');
  await app.locator('[data-ie-dialog-input]').fill('skills');
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(app.locator('[data-ie-address]')).toHaveValue('pedroos://skills');
  await menu(app, 'Edit', 'find');
  await app.locator('[data-ie-dialog-input]').fill('Python');
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(app.locator('mark').first()).toHaveText('Python');
  await menu(app, 'Favorites', 'add');
  await app.locator('[data-ie-dialog-input]').fill('Minhas competências');
  await page.screenshot({ path: `test-results/ie-dialog-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await menu(app, 'Favorites', 'organize');
  await app.locator('[data-ie-favorite]').selectOption({ label: 'Minhas competências' });
  await app.locator('[data-ie-rename]').fill('Tecnologias favoritas');
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await app.locator('.ie-toolbar [data-ie-action="favorites"]').click();
  await expect(app.locator('.ie-sidebar')).toContainText('Tecnologias favoritas');
  await page.screenshot({ path: `test-results/ie-sidebar-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('[data-ie-action="panel-close"]').click();
  await app.locator('.ie-toolbar [data-ie-action="search"]').click();
  await app.getByRole('textbox', { name: 'Pesquisar no portfólio' }).fill('ofizzy');
  await app.locator('[data-ie-search-form] button').click();
  await expect(app.locator('[data-ie-panel]')).toContainText('Ofizzy');
  await expect(app.locator('[data-ie-panel]')).not.toContainText('ZellaPedia');
  await page.keyboard.press('Escape');
  await menu(app, 'File', 'homepage');
  await app.locator('[data-ie-dialog-input]').fill('pedroos://skills');
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await menu(app, 'View', 'larger');
  await menu(app, 'View', 'toolbar');
  await expect(app.locator('[data-ie-toolbar]')).toBeHidden();
  await menu(app, 'View', 'toolbar');
  await page.reload();
  if (isMobile) await page.locator('#icon-iexplore').click(); else await page.locator('#icon-iexplore').dblclick();
  await expect(app.locator('[data-ie-address]')).toHaveValue('pedroos://skills');
  await expect(app.locator('[data-ie-viewport]')).toHaveAttribute('style', /1.2/);
  await menu(app, 'Favorites', 'favorites');
  await expect(app.locator('.ie-sidebar')).toContainText('Tecnologias favoritas');
  await menu(app, 'Favorites', 'organize');
  await app.locator('[data-ie-favorite]').selectOption({ label: 'Tecnologias favoritas' });
  await app.locator('.ie-remove-row label').click();
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(app.locator('.ie-sidebar')).not.toContainText('Tecnologias favoritas');
});

test('storage synchronizes favorites and preferences without replacing another window navigation', async ({ page, context, isMobile }) => {
  const first = await openBrowser(page, isMobile);
  const otherPage = await context.newPage();
  const second = await openBrowser(otherPage, isMobile);
  await go(first, 'projects');
  await menu(first, 'Favorites', 'add');
  await first.locator('[data-ie-dialog-input]').fill('Shared projects');
  await first.getByRole('button', { name: 'OK', exact: true }).click();
  await menu(second, 'Favorites', 'favorites');
  await expect(second.locator('.ie-sidebar')).toContainText('Shared projects');
  await expect(second.locator('[data-ie-address]')).toHaveValue('pedroos://home');
  await menu(first, 'View', 'larger');
  await expect(second.locator('[data-ie-viewport]')).toHaveAttribute('style', /1.2/);
  await go(first, 'links');
  await menu(second, 'View', 'status');
  await expect(first.locator('[data-ie-statusbar]')).toBeHidden();
  await expect(first.locator('[data-ie-address]')).toHaveValue('pedroos://links');
  await otherPage.close();
});

test('portal fits the desktop and mobile screen and visit storage stays bounded', async ({ page, isMobile }) => {
  const app = await openBrowser(page, isMobile);
  await expect(app.locator('.ie-site-header')).toBeVisible();
  await page.screenshot({ path: `test-results/ie-home-${isMobile ? 'mobile' : 'desktop'}.png` });
  await go(app, 'projects');
  await page.screenshot({ path: `test-results/ie-projects-${isMobile ? 'mobile' : 'desktop'}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (let i = 0; i < 105; i++) {
    await app.locator('[data-ie-address]').evaluate((el, i) => {
      (el as HTMLInputElement).value = `pedroos://home#${i}`;
      el.closest('form')!.requestSubmit();
    }, i);
  }
  const visits = await page.evaluate(() => JSON.parse(localStorage.getItem('pedroos.iexplore.v1')!).visits);
  expect(visits).toHaveLength(100);
  await menu(app, 'Help', 'about');
  await expect(app.locator('dialog')).toContainText('Edição Intranet');
  await app.locator('[data-ie-action="dialog-close"]').click();
  await menu(app, 'File', 'close');
  await expect(app).toHaveCount(0);
});

test('two IE windows keep independent navigation while sharing local favorites', async ({ page, isMobile }) => {
  const first = await openBrowser(page, isMobile);
  const firstId = await first.getAttribute('id');
  await go(first, 'projects');
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="run"]').click();
  await page.locator('[data-run-input]').fill('iexplore');
  await page.locator('[data-run-input]').press('Enter');
  const second = page.locator('.os-window[data-app-id="iexplore"]').last();
  await expect(page.locator('.os-window[data-app-id="iexplore"]')).toHaveCount(2);
  await go(second, 'skills');
  await menu(second, 'Favorites', 'add');
  await second.locator('[data-ie-dialog-input]').fill('Same desktop favorite');
  await second.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(second.locator('[data-ie-back]')).toBeEnabled();
  await menu(second, 'File', 'close');
  const remaining = page.locator(`[id="${firstId}"]`);
  await expect(remaining.locator('[data-ie-address]')).toHaveValue('pedroos://projects');
  await menu(remaining, 'Favorites', 'favorites');
  await expect(remaining.locator('.ie-sidebar')).toContainText('Same desktop favorite');
  await remaining.locator('[data-ie-action="panel-close"]').click();
  await remaining.locator('[data-ie-back]').click();
  await expect(remaining.locator('[data-ie-address]')).toHaveValue('pedroos://home');
  await remaining.locator('.ie-toolbar [data-ie-action="history"]').click();
  await expect(remaining.locator('.ie-sidebar')).toContainText('Competências');
});

test('corrupt storage recovers and unavailable storage still permits navigation', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('pedroos.iexplore.v1', '{broken'));
  const app = await openBrowser(page, isMobile);
  await expect(app.locator('[data-ie-address]')).toHaveValue('pedroos://home');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage denied'); };
    Storage.prototype.getItem = () => { throw new DOMException('Storage denied'); };
  });
  await go(app, 'skills');
  await menu(app, 'Favorites', 'add');
  await app.locator('[data-ie-dialog-input]').fill('Session favorite');
  await app.getByRole('button', { name: 'OK', exact: true }).click();
  await menu(app, 'Favorites', 'favorites');
  await expect(app.locator('.ie-sidebar')).toContainText('Session favorite');
});

test('copy, link status, keyboard navigation and external new-tab opening work', async ({ page, context, isMobile }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://example.com/**', route => route.fulfill({ body: '<p>External page</p>', contentType: 'text/html' }));
  const app = await openBrowser(page, isMobile);
  await menu(app, 'Edit', 'copy');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('pedroos://home');
  const skills = app.locator('.ie-site-header [data-ie-nav="pedroos://skills"]');
  await skills.hover();
  await expect(app.locator('[data-ie-status]')).toHaveText('pedroos://skills');
  await skills.click();
  await app.locator('[data-ie-viewport]').focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(app.locator('[data-ie-address]')).toHaveValue('pedroos://home');
  await page.keyboard.press('Alt+ArrowRight');
  await expect(app.locator('[data-ie-address]')).toHaveValue('pedroos://skills');
  await page.keyboard.press('Control+l');
  await expect(app.locator('[data-ie-address]')).toBeFocused();
  await go(app, 'https://example.com');
  const popupPromise = page.waitForEvent('popup');
  await app.locator('[data-ie-viewport] a[target="_blank"]').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://example.com/');
  await expect(popup.locator('body')).toContainText('External page');
  await popup.close();
  await menu(app, 'Help', 'help');
  await expect(app.locator('dialog')).toContainText('Ctrl+L');
  await page.keyboard.press('Escape');
  await expect(app.locator('dialog')).not.toBeVisible();
});
