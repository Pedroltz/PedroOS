// Capture the real local static export. Window arrangement uses the shell's API.
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || 'http://127.0.0.1:5170/PedroOS/';
const out = join(root, 'docs/assets/screenshots');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const save = async (page, name) => {
  const encoding = name === 'startup' ? { quality: 82, effort: 6 } : { lossless: true, effort: 6 };
  await sharp(await page.screenshot()).webp(encoding).toFile(join(out, name + '.webp'));
  console.log('Captured ' + name);
};
const desktop = async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    sessionStorage.setItem('pedroos.boot.seen.v1', '1');
    localStorage.setItem('pedroos.welcome.v1', '{"showOnStartup":false}');
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForFunction(() => !!window.PedroOS);
  return { context, page };
};
try {
  {
    const { context, page } = await desktop();
    await page.evaluate(() => {
      const { wm } = window.PedroOS;
      wm.open('projects', { x: 470, y: 70, width: 760, height: 640, skipRouteSync: true });
      wm.open('welcome', { x: 185, y: 240, skipRouteSync: true });
    });
    await page.locator('[data-welcome-app]').waitFor();
    await page.locator('[data-app-id="projects"] [data-exp-address]').waitFor();
    await save(page, 'desktop');
    await context.close();
  }
  {
    const { context, page } = await desktop();
    await page.evaluate(() => window.PedroOS.wm.open('project', {
      args: { slug: 'ofizzy' }, x: 185, y: 40, width: 1040, height: 690, skipRouteSync: true,
    }));
    await page.locator('[data-project-preview-image]').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-project-preview-image]')?.naturalWidth > 0);
    await save(page, 'portfolio');
    await context.close();
  }
  {
    const { context, page } = await desktop();
    await page.evaluate(() => {
      const { wm } = window.PedroOS;
      wm.open('explorer', { args: { path: 'C:\\Jogos' }, x: 170, y: 45, width: 620, height: 550, skipRouteSync: true });
      wm.open('omf2097', { x: 460, y: 150, skipRouteSync: true });
    });
    const frame = page.frameLocator('[data-retro-frame]');
    await frame.getByRole('button', { name: 'Jogar', exact: true }).click();
    await frame.locator('html[data-game-state="running"]').waitFor({ timeout: 60_000 });
    const canvas = frame.locator('canvas');
    for (let i = 0; i < 8; i++) { await canvas.press('Enter', { delay: 100 }); await page.waitForTimeout(250); }
    await canvas.press('ArrowRight', { delay: 200 });
    await page.waitForTimeout(600);
    await save(page, 'games');
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('#boot-screen[data-boot-phase="splash"]').waitFor();
    await page.waitForFunction(() => document.querySelector('.boot-artwork img')?.naturalWidth > 0);
    await save(page, 'startup');
    await context.close();
  }
  {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    await context.addInitScript(() => sessionStorage.setItem('pedroos.boot.seen.v1', '1'));
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('[data-welcome-app]').waitFor();
    await save(page, 'mobile');
    await context.close();
  }
} finally { await browser.close(); }
