import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDirName = process.argv[2] || 'before';
const outDir = join(root, 'test-results', 'audit-screenshots', outDirName);
mkdirSync(outDir, { recursive: true });

const BASE_URL = process.env.PEDROOS_BASE_URL || 'http://localhost:5159';

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/healthz`);
      if (res.ok) return true;
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} not responding within ${timeoutMs}ms`);
}

async function run() {
  console.log(`Checking server at ${BASE_URL}...`);
  await waitForServer(BASE_URL);
  console.log(`Server is ready. Launching chromium...`);

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop sem janelas (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(outDir, '01_desktop.png') });
    console.log('Captured 01_desktop.png');
    await page.close();
  }

  // 2. Menu Iniciar aberto (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#start-button').click();
    await page.waitForTimeout(300);
    // Also hover over Programs to show submenu
    await page.locator('.start-menu-item.has-submenu').first().hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '02_start_menu.png') });
    console.log('Captured 02_start_menu.png');
    await page.close();
  }

  // 3. Explorer em C:\ (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-explorer').dblclick();
    await page.waitForSelector('.os-window[data-app-id="explorer"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '03_explorer_root.png') });
    console.log('Captured 03_explorer_root.png');
    await page.close();
  }

  // 4. Explorer em C:\Projects (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-explorer').dblclick();
    await page.waitForSelector('.os-window[data-app-id="explorer"]');
    // Navigate to C:\Projects
    const addr = page.locator('.os-window[data-app-id="explorer"] [data-exp-address]').first();
    await addr.fill('C:\\Projects');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '04_explorer_projects.png') });
    console.log('Captured 04_explorer_projects.png');
    await page.close();
  }

  // 5. Explorer no modo Details (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-explorer').dblclick();
    await page.waitForSelector('.os-window[data-app-id="explorer"]');
    const detailsBtn = page.locator('.os-window[data-app-id="explorer"] .toolbar-btn[data-exp-view="details"]').first();
    if (await detailsBtn.count()) {
      await detailsBtn.click();
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '05_explorer_details.png') });
    console.log('Captured 05_explorer_details.png');
    await page.close();
  }

  // 6. Duas janelas lado a lado (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-minesweeper').dblclick();
    await page.waitForSelector('.os-window[data-app-id="minesweeper"]');
    await page.locator('#icon-explorer').dblclick();
    await page.waitForSelector('.os-window[data-app-id="explorer"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, '06_two_windows.png') });
    console.log('Captured 06_two_windows.png');
    await page.close();
  }

  // 7. Currículo aberto (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-resume').dblclick();
    await page.waitForSelector('.os-window[data-app-id="resume"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '07_resume.png') });
    console.log('Captured 07_resume.png');
    await page.close();
  }

  // 8. Habilidades / Propriedades do Sistema (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-sysprops').dblclick();
    await page.waitForSelector('.os-window[data-app-id="sysprops"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '08_skills.png') });
    console.log('Captured 08_skills.png');
    await page.close();
  }

  // 9. Internet Explorer aberto (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-iexplore').dblclick();
    await page.waitForSelector('.os-window[data-app-id="iexplore"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '09_internet_explorer.png') });
    console.log('Captured 09_internet_explorer.png');
    await page.close();
  }

  // 10. Campo Minado aberto (1024x768)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-minesweeper').dblclick();
    await page.waitForSelector('.os-window[data-app-id="minesweeper"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '10_minesweeper.png') });
    console.log('Captured 10_minesweeper.png');
    await page.close();
  }

  // 11. Interface mobile (390x844)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#icon-explorer').click();
    await page.waitForSelector('.os-window[data-app-id="explorer"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, '11_mobile.png') });
    console.log('Captured 11_mobile.png');
    await page.close();
  }

  // 12. Test resolutions (1920x1080, 1366x768, 768x1024, 360x800)
  for (const [w, h] of [[1920, 1080], [1366, 768], [768, 1024], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(outDir, `res_${w}x${h}.png`) });
    console.log(`Captured res_${w}x${h}.png`);
    await page.close();
  }

  await browser.close();
  console.log(`All screenshots captured in ${outDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
