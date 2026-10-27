import { test, expect, type Page, type Locator } from '@playwright/test';

async function openProject(page: Page, slug = 'ofizzy'): Promise<Locator> {
  await page.goto(`/projects/${slug}`);
  const app = page.locator(`.os-window[data-instance-key="project:${slug}"]`);
  await expect(app.locator('[data-project-details]')).toBeVisible();
  return app;
}

test('project windows are centered and their preview images load at a useful size', async ({ page, isMobile }) => {
  const app = await openProject(page);
  const preview = app.locator('[data-project-preview-image]');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1920);
  const image = await preview.boundingBox();
  expect(image!.width).toBeGreaterThan(isMobile ? 250 : 450);
  const window = await app.boundingBox();
  if (!isMobile) expect(Math.abs(window!.x + window!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(app.locator('[data-project-shot]')).toHaveCount(5);
  await expect(app.getByRole('button', { name: 'Ampliar imagem', exact: true })).toBeInViewport();
  const body = await app.locator('.project-details-body').boundingBox();
  expect(image!.y + image!.height).toBeLessThanOrEqual(body!.y + body!.height + 1);
  await page.screenshot({ path: `test-results/project-ofizzy-${isMobile ? 'mobile' : 'desktop'}.png` });
  await app.locator('.project-technology-list').scrollIntoViewIfNeeded();
  await expect(app.getByRole('button', { name: 'Competências relacionadas' })).toBeVisible();
  await page.screenshot({ path: `test-results/project-details-${isMobile ? 'mobile' : 'desktop'}.png` });
});

test('the image viewer fits screenshots, exposes original resolution and supports arrows and focus return', async ({ page, isMobile }) => {
  const app = await openProject(page);
  const enlarge = app.getByRole('button', { name: 'Ampliar imagem', exact: true });
  await enlarge.click();
  const viewer = app.locator('[data-project-viewer]');
  const image = viewer.locator('[data-project-viewer-image]');
  const stage = viewer.locator('.project-viewer-stage');
  await expect(viewer).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1920);
  const fitted = await image.boundingBox(); const frame = await stage.boundingBox();
  expect(fitted!.width).toBeLessThanOrEqual(frame!.width);
  expect(fitted!.height).toBeLessThanOrEqual(frame!.height);
  await expect(viewer.locator('[data-project-viewer-counter]')).toHaveText('1 de 5');
  await viewer.locator('[data-project-zoom]').click();
  await expect(image).toHaveJSProperty('width', 1920);
  expect(await stage.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await expect(viewer.locator('[data-project-original]')).toHaveAttribute('target', '_blank');
  await expect(viewer.locator('[data-project-original]')).toHaveAttribute('href', /dashboard.png$/);
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('[data-project-viewer-counter]')).toHaveText('2 de 5');
  await expect(viewer.locator('[data-project-zoom]')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('End');
  await expect(image).toHaveAttribute('src', /mobile.png$/);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(844);
  const portrait = await image.boundingBox(); const viewport = await stage.boundingBox();
  expect(portrait!.height).toBeLessThanOrEqual(viewport!.height);
  await page.screenshot({ path: `test-results/project-viewer-${isMobile ? 'mobile' : 'desktop'}.png` });
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(enlarge).toBeFocused();
  await expect(app.locator('[data-project-counter]')).toHaveText('5 de 5');
});

test('thumbnails and gallery buttons stay in sync and navigate with the keyboard', async ({ page }) => {
  const app = await openProject(page);
  await app.locator('[data-project-shot="2"]').click();
  await expect(app.locator('[data-project-preview-image]')).toHaveAttribute('src', /work-order-editor.png$/);
  await expect(app.locator('[data-project-caption]')).toContainText('Editor de OS');
  await expect(app.locator('[data-project-shot="2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(app.locator('[data-project-shot="3"]')).toBeFocused();
  await expect(app.locator('[data-project-counter]')).toHaveText('4 de 5');
  await app.locator('[data-project-gallery] > .project-gallery-controls [data-project-next]').click();
  await expect(app.locator('[data-project-counter]')).toHaveText('5 de 5');
  await app.locator('[data-project-gallery] > .project-gallery-controls [data-project-next]').click();
  await expect(app.locator('[data-project-counter]')).toHaveText('1 de 5');
  await app.locator('a[data-project-enlarge]').click();
  await expect(app.locator('[data-project-viewer]')).toBeVisible();
  await app.locator('[data-project-viewer-close]').click();
  await expect(app.locator('a[data-project-enlarge]')).toBeFocused();
});

test('the same layout supports other projects and a meaningful state without screenshots', async ({ page, isMobile }) => {
  const app = await openProject(page, 'rdp-session-manager');
  await expect(app.locator('[data-project-shot]')).toHaveCount(1);
  await expect(app.locator('[data-project-preview-image]')).toHaveAttribute('src', /rdp-session-manager-header.png$/);
  await expect(app.locator('img[src$="RDPSM.png"]')).toHaveCount(0);
  await app.getByRole('button', { name: 'Ampliar imagem' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(app.locator('[data-project-viewer-image]')).toHaveAttribute('src', /rdp-session-manager-header.png$/);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `test-results/project-rdp-${isMobile ? 'mobile' : 'desktop'}.png` });
  const empty = await openProject(page, 'taskproj');
  await expect(empty.locator('.project-gallery-empty')).toContainText('ainda não possui capturas públicas');
  await expect(empty.locator('[data-project-viewer]')).toHaveCount(0);
  await expect(empty).toContainText('Problema Abordado');
  await expect(empty).toContainText('Solução Desenvolvida');
  await page.screenshot({ path: `test-results/project-empty-${isMobile ? 'mobile' : 'desktop'}.png` });
});

test('reopening a project keeps one gallery controller and image navigation per project', async ({ page, isMobile }) => {
  const first = await openProject(page);
  await first.locator('[data-project-shot="1"]').click();
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="run"]').click();
  await page.locator('[data-run-input]').fill('ofizzy');
  await page.locator('[data-run-input]').press('Enter');
  await expect(page.locator('.os-window[data-app-id="project"]')).toHaveCount(1);
  await first.getByRole('button', { name: 'Ampliar imagem' }).click();
  await first.locator('[data-project-viewer] [data-project-next]').click();
  await expect(first.locator('[data-project-viewer-counter]')).toHaveText('3 de 5');
  await page.keyboard.press('Escape');
  await first.getByRole('button', { name: 'Fechar', exact: true }).click();
  if (isMobile) await page.locator('#icon-rdp').click(); else await page.locator('#icon-rdp').dblclick();
  const second = page.locator('.os-window[data-app-id="project"]');
  await expect(second.locator('[data-project-counter]')).toHaveText('1 de 1');
  if (!isMobile) { const bounds = await second.boundingBox(); expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2); }
});

test('unavailable images show a recovery message while the project remains usable', async ({ page }) => {
  await page.route('**/assets/screenshots/ofizzy/dashboard.png', route => route.fulfill({ status: 404, body: 'missing' }));
  const app = await openProject(page);
  await expect(app.locator('[data-project-preview-error]')).toBeVisible();
  await app.getByRole('button', { name: 'Ampliar imagem' }).click();
  await expect(app.locator('[data-project-viewer-error]')).toBeVisible();
  await app.locator('[data-project-viewer] [data-project-next]').click();
  await expect(app.locator('[data-project-viewer-image]')).toBeVisible();
  await expect.poll(() => app.locator('[data-project-viewer-image]').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(app.locator('[data-project-viewer-error]')).toBeHidden();
});
