import { test, expect } from '@playwright/test';

const pinned = ['rdp-session-manager', 'anycomic', 'taskproj', 'binary-tree-study', '2091-retrogame', 'uninotes-web'];

test('GitHub shows the six pinned repositories in profile order and opens each portfolio entry', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.locator('#icon-github').click(); else await page.locator('#icon-github').dblclick();
  const app = page.locator('.os-window[data-app-id="github"]');
  const cards = app.locator('[data-github-pinned]');
  await expect(cards).toHaveCount(6);
  expect(await cards.evaluateAll(items => items.map(el => (el as HTMLElement).dataset.githubPinned))).toEqual(pinned);
  await expect(app).not.toContainText('ZellaPedia');
  for (const slug of pinned) {
    const card = app.locator(`[data-github-pinned="${slug}"]`);
    await expect(card.locator('a[href^="https://github.com/Pedroltz/"]')).toHaveAttribute('target', '_blank');
    await card.getByRole('button', { name: 'Inspecionar no PedroOS' }).click();
    const project = page.locator(`.os-window[data-instance-key="project:${slug}"]`);
    await expect(project.locator('[data-project-details]')).toBeVisible();
    await expect(project.locator('.project-banner-summary')).not.toBeEmpty();
    await project.locator('[data-win-action="close"]').click();
  }
  await app.locator('.github-viewport').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: `test-results/github-pinned-${isMobile ? 'mobile' : 'desktop'}.png` });
});

test('all pinned projects appear in the project explorer and have direct routes', async ({ page, request }) => {
  await page.goto('/projects');
  const explorer = page.locator('.os-window[data-app-id="projects"]');
  for (const name of ['RDP-Session-Manager.exe', 'AnyComic.exe', '2091-RetroGame.exe', 'MaisProjetos']) {
    await expect(explorer.locator('.explorer-item-name', { hasText: name })).toHaveCount(1);
  }
  await explorer.locator('[data-exp-address]').fill('C:\\Projetos\\MaisProjetos');
  await explorer.locator('[data-exp-address]').press('Enter');
  for (const name of ['TaskProj.exe', 'BinaryTreeStudy.exe', 'UniNote.exe']) {
    await expect(explorer.locator('.explorer-item-name', { hasText: name })).toHaveCount(1);
  }
  await expect(explorer).not.toContainText('ZellaPedia');
  for (const slug of pinned) expect((await request.get(`/projects/${slug}`)).status()).toBe(200);
  expect((await request.get('/projects/zellapedia')).status()).toBe(404);
});
