import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stage = process.argv[2] || 'final';
const base = process.env.PEDROOS_BASE_URL || 'http://localhost:5159';
const output = join('test-results', 'visual-audit', stage);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const measurements = [];
const baseline = stage === 'baseline';
async function newPage(width = 1024, height = 768, path = '/') {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base + path);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function capture(page, name) {
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(img => img.complete))).toBeTruthy();
  await page.screenshot({ path: join(output, name + '.png') });
}
async function address(win, path) {
  const input = win.locator('[data-exp-address]');
  await input.fill(path);
  await input.press('Enter');
  await expect(win.locator('[data-exp-pane-title]')).toContainText(path);
}
async function launch(page, id, mobile = false) {
  if (mobile) await page.locator('#icon-' + id).click();
  else await page.locator('#icon-' + id).dblclick();
  const win = page.locator(`.os-window[data-app-id="${id}"]`).last();
  await expect(win).toBeVisible();
  return win;
}
try {
  const page = await newPage();
  await capture(page, '01-desktop');
  await page.locator('#icon-projects').click();
  await capture(page, '02-desktop-selected');
  if (!baseline) await expect(page.locator('#icon-projects')).toHaveCSS('box-shadow', 'none');
  await page.locator('#start-button').click();
  await capture(page, '03-start-menu');
  await page.locator('#start-button').click();
  await launch(page, 'projects');
  await capture(page, '04-projects');
  await page.close();

  const explorerPage = await newPage();
  const win = await launch(explorerPage, 'explorer');
  await address(win, 'C:\\Projects');
  await capture(explorerPage, '05-large-icons');
  await address(win, 'C:\\Projects\\MoreProjects');
  await capture(explorerPage, '06-more-projects');
  for (const mode of ['small-icons', 'list', 'details']) {
    const button = win.locator(`.toolbar-btn[data-exp-view="${mode}"]`);
    if (baseline && !await button.count()) continue;
    await button.click();
    await capture(explorerPage, '07-' + mode);
    if (!baseline) {
      for (const img of await win.locator('[data-exp-items] img').all()) {
        expect(await img.evaluate(image => [image.width, image.height, image.naturalWidth, image.naturalHeight])).toEqual([16, 16, 16, 16]);
      }
    }
  }
  await win.locator('[data-node-path]').filter({ hasText: 'AnyComic.exe' }).click();
  await capture(explorerPage, '08-files-selected');
  if (!baseline) {
    await expect(win.locator('[data-exp-status-detail]')).toContainText('AnyComic.exe');
    await win.locator('[data-sort="name"]').click();
    expect(await win.locator('tbody [data-node-path]').first().textContent()).toContain('AutoApply.exe');
    await win.locator('.toolbar-btn[data-exp-view="icons"]').click();
    await address(win, 'C:\\Projects');
    await win.locator('[data-node-path]').filter({ hasText: 'Ofizzy.exe' }).dblclick();
    await expect(explorerPage.locator('[data-project-details="ofizzy"]')).toBeVisible();
    await capture(explorerPage, '09-ofizzy-details');
    await explorerPage.evaluate(() => window.PedroOS.wm.open('notepad'));
    await expect(explorerPage.locator('.os-window[data-app-id="notepad"]')).toBeVisible();
    await capture(explorerPage, '10-multiple-windows');
    const old = await win.boundingBox();
    await win.locator('.title-bar').click({ position: { x: 40, y: 6 } });
    await expect(win).toHaveClass(/active/);
    expect(await win.boundingBox()).toEqual(old);
    const windowId = await win.getAttribute('data-window-id');
    await explorerPage.evaluate(id => window.PedroOS.wm.move(id, 9999, 9999), windowId);
    const bounds = await win.boundingBox();
    expect(bounds.y + 18).toBeLessThan(740);
  }
  await explorerPage.close();

  for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [768, 1024], [390, 844], [360, 800]]) {
    const page = await newPage(width, height);
    await capture(page, `desktop-${width}x${height}`);
    const win = await launch(page, 'explorer', width <= 640);
    await address(win, 'C:\\Projects\\MoreProjects');
    await capture(page, `explorer-${width}x${height}`);
    const result = await page.evaluate(() => {
      const win = document.querySelector('.os-window');
      const r = win.getBoundingClientRect();
      const icons = [...win.querySelectorAll('[data-exp-items] img')].map(img => ({ rendered: [img.width, img.height], native: [img.naturalWidth, img.naturalHeight] }));
      return { viewport: [innerWidth, innerHeight], bounds: [r.x, r.y, r.width, r.height], documentWidth: document.documentElement.scrollWidth, icons };
    });
    measurements.push(result);
    if (!baseline) {
      expect(result.documentWidth).toBe(width);
      expect(result.bounds[0]).toBeGreaterThanOrEqual(0);
      expect(result.bounds[1]).toBeGreaterThanOrEqual(0);
      for (const icon of result.icons) expect(icon).toEqual({ rendered: [32, 32], native: [32, 32] });
      if (width <= 640) {
        expect(result.bounds).toEqual([0, 0, width, height - 28]);
        await page.evaluate(() => window.PedroOS.wm.open('notepad'));
        await expect(win).toBeHidden();
        await page.locator('.taskbar-item').filter({ hasText: 'Exploring' }).click();
        await expect(win).toBeVisible();
      }
    }
    await page.close();
  }
  expect(errors).toEqual([]);
  writeFileSync(join(output, 'measurements.json'), JSON.stringify({ errors, measurements }, null, 2));
  console.log(`Visual audit ${stage}: ${measurements.length} viewports, no browser/HTTP errors. Captures: ${output}`);
} finally {
  await browser.close();
}
