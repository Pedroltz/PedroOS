import { test, expect } from '@playwright/test';

async function openGame(page: import('@playwright/test').Page, isMobile: boolean) {
  await page.goto('/');
  const icon = page.locator('#icon-minesweeper');
  if (isMobile) await icon.click(); else await icon.dblclick();
  return page.locator('.os-window[data-app-id="minesweeper"]');
}

test('every difficulty keeps square cells, a visible header and reachable board edges', async ({ page, isMobile }) => {
  const app = await openGame(page, isMobile);
  const scroller = app.locator('[data-mine-grid-container]');
  for (const [difficulty, rows, cols, mines] of [['beginner', 9, 9, '010'], ['intermediate', 16, 16, '040'], ['expert', 16, 30, '099'], ['beginner', 9, 9, '010']] as const) {
    await app.locator('[data-mine-diff]').selectOption(difficulty);
    await expect(app.locator('.mine-cell')).toHaveCount(rows * cols);
    await expect(app.locator('[data-mine-counter]')).toHaveText(mines);
    await expect(app.locator('[data-mine-face]')).toBeInViewport();
    const first = app.locator('.mine-cell').first();
    const last = app.locator('.mine-cell').last();
    const bounds = await first.boundingBox();
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.width).toBeLessThanOrEqual(16);
    expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThan(.1);
    expect(await scroller.evaluate(el => el.clientWidth)).toBeGreaterThan(100);
    await expect.poll(() => scroller.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    const frame = (await scroller.boundingBox())!;
    for (const cell of [first, last]) {
      const edge = (await cell.boundingBox())!;
      expect(edge.x).toBeGreaterThanOrEqual(frame.x);
      expect(edge.y).toBeGreaterThanOrEqual(frame.y);
      expect(edge.x + edge.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(edge.y + edge.height).toBeLessThanOrEqual(frame.y + frame.height);
    }
    await app.locator('[data-mine-flag-toggle]').click();
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await expect(last).toHaveClass(/flagged/);
    await expect(app.locator('[data-mine-counter]')).toHaveText(String(Number(mines) - 1).padStart(3, '0'));
    await last.click();
    await app.locator('[data-mine-flag-toggle]').click();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(first).toHaveClass(/revealed/);
    await app.locator('[data-mine-face]').click();
    await expect(app.locator('[data-mine-timer]')).toHaveText('000');
    await expect(app.locator('[data-mine-counter]')).toHaveText(mines);
    if (difficulty !== 'beginner') await page.screenshot({ path: `test-results/minesweeper-${difficulty}-${isMobile ? 'mobile' : 'desktop'}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('expert board fits narrow and landscape screens without scrolling or clipping', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const app = await openGame(page, true);
  await app.locator('[data-mine-diff]').selectOption('expert');
  const viewport = app.locator('[data-mine-grid-container]');
  const first = app.locator('[data-row="0"][data-col="0"]');
  const last = app.locator('[data-row="15"][data-col="29"]');
  for (const size of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => viewport.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    await app.locator('[data-mine-flag-toggle]').click();
    await last.click(); await expect(last).toHaveClass(/flagged/);
    await first.click(); await expect(first).toHaveClass(/flagged/);
    await expect(app.locator('[data-mine-counter]')).toHaveText('097');
    expect(await viewport.evaluate(el => el.scrollLeft === 0 && el.scrollTop === 0)).toBe(true);
    await expect(app.locator('[data-mine-face]')).toBeInViewport();
    await page.screenshot({ path: `test-results/minesweeper-fit-${size.width}.png` });
    await app.locator('[data-mine-face]').click();
    await app.locator('[data-mine-flag-toggle]').click();
  }
});

test('playing does not undo a manual window resize', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile windows use the available work area.');
  const app = await openGame(page, false);
  await app.locator('[data-mine-diff]').selectOption('intermediate');
  const before = (await app.boundingBox())!;
  await page.mouse.move(before.x + before.width - 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width + 58, before.y + before.height / 2, { steps: 8 });
  await page.mouse.up();
  const resized = (await app.boundingBox())!;
  expect(resized.width).toBeGreaterThan(before.width + 30);
  await app.locator('[data-mine-flag-toggle]').click();
  await app.locator('.mine-cell').first().click();
  expect((await app.boundingBox())!.width).toBe(resized.width);
});
