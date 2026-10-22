import { test, expect } from '@playwright/test';

test.describe('PedroOS 95 — End-to-End Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // 1. O desktop inicializa
  test('1. desktop initializes with wallpaper, desktop icons, and taskbar', async ({ page }) => {
    const desktop = page.locator('#desktop');
    await expect(desktop).toBeVisible();

    const icons = page.locator('#desktop-icons');
    await expect(icons).toBeVisible();

    const taskbar = page.locator('#taskbar');
    await expect(taskbar).toBeVisible();

    const startBtn = page.locator('#start-button');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('Start');
  });

  // 2. O menu Iniciar abre
  test('2. start menu opens and closes correctly', async ({ page }) => {
    const startBtn = page.locator('#start-button');
    const startMenu = page.locator('#start-menu');

    await expect(startMenu).toBeHidden();
    await startBtn.click();
    await expect(startMenu).toBeVisible();

    // Click outside on desktop wallpaper
    await page.locator('#desktop').click({ position: { x: 300, y: 300 } });
    await expect(startMenu).toBeHidden();
  });

  // 3. O Explorer abre por duplo clique
  test('3. explorer opens via double click on desktop icon', async ({ page, isMobile }) => {
    const explorerIcon = page.locator('#icon-explorer');
    await expect(explorerIcon).toBeVisible();

    if (isMobile) {
      await explorerIcon.click();
    } else {
      await explorerIcon.dblclick();
    }

    const explorerWin = page.locator('.os-window[data-app-id="explorer"]');
    await expect(explorerWin).toBeVisible({ timeout: 5000 });
    await expect(explorerWin.locator('.title-bar-label')).toContainText('Exploring');
  });

  // 4. Projetos são listados
  test('4. projects are listed in projects window', async ({ page, isMobile }) => {
    const projectsIcon = page.locator('#icon-projects');
    if (isMobile) {
      await projectsIcon.click();
    } else {
      await projectsIcon.dblclick();
    }

    const projectsWin = page.locator('.os-window[data-app-id="projects"]');
    await expect(projectsWin).toBeVisible({ timeout: 5000 });
    await expect(projectsWin).toContainText('Ofizzy');
    await expect(projectsWin).toContainText('RDP Session Manager');
  });

  // 5. Uma janela de projeto abre
  test('5. ofizzy project details window opens and displays information', async ({ page, isMobile }) => {
    const ofizzyIcon = page.locator('#icon-ofizzy');
    if (isMobile) {
      await ofizzyIcon.click();
    } else {
      await ofizzyIcon.dblclick();
    }

    const ofizzyWin = page.locator('.os-window[data-instance-key="project:ofizzy"]');
    await expect(ofizzyWin).toBeVisible({ timeout: 5000 });
    await expect(ofizzyWin).toContainText('Ofizzy');
    await expect(ofizzyWin).toContainText('Ofizzy.exe');
    await expect(ofizzyWin).toContainText('Problema Abordado');
    await expect(ofizzyWin).toContainText('Solução Desenvolvida');
  });

  // 6. Duas janelas coexistem
  test('6. multiple windows coexist simultaneously', async ({ page, isMobile }) => {
    if (isMobile) test.skip(); // Mobile mode displays one active window at a time

    await page.locator('#icon-minesweeper').dblclick();
    const mineWin = page.locator('.os-window[data-app-id="minesweeper"]');
    await expect(mineWin).toBeVisible({ timeout: 5000 });

    await page.locator('#icon-resume').dblclick();
    const resumeWin = page.locator('.os-window[data-app-id="resume"]');
    await expect(resumeWin).toBeVisible({ timeout: 5000 });

    await expect(mineWin).toBeVisible();
    await expect(resumeWin).toBeVisible();
  });

  // 7. Minimizar e restaurar funciona
  test('7. minimize and restore window works via title bar controls and taskbar', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.locator('#icon-minesweeper').click();
    } else {
      await page.locator('#icon-minesweeper').dblclick();
    }

    const mineWin = page.locator('.os-window[data-app-id="minesweeper"]');
    await expect(mineWin).toBeVisible({ timeout: 5000 });

    // Click minimize button
    const minBtn = mineWin.locator('button[data-win-action="minimize"]');
    await minBtn.click();
    await expect(mineWin).toBeHidden();

    // Click on taskbar item to restore
    const taskItem = page.locator('.taskbar-item[data-taskbar-win-id]').first();
    await expect(taskItem).toBeVisible();
    await taskItem.click();
    await expect(mineWin).toBeVisible();
  });

  // 8. Maximizar e restaurar funciona
  test('8. maximize and restore window works', async ({ page, isMobile }) => {
    if (isMobile) test.skip(); // Mobile windows are maximized by default

    await page.locator('#icon-explorer').dblclick();
    const explorerWin = page.locator('.os-window[data-app-id="explorer"]');
    await expect(explorerWin).toBeVisible({ timeout: 5000 });

    const maxBtn = explorerWin.locator('button[data-win-action="maximize"]');
    await maxBtn.click();
    await expect(explorerWin).toHaveClass(/maximized/);

    // Click restore
    await maxBtn.click();
    await expect(explorerWin).not.toHaveClass(/maximized/);
  });

  // 9. Fechar uma janela não encerra outras
  test('9. closing one window does not close other running applications', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.locator('#icon-minesweeper').click();
      await page.locator('#icon-readme').click();
    } else {
      await page.locator('#icon-minesweeper').dblclick();
      await page.locator('#icon-readme').dblclick();
    }

    const mineWin = page.locator('.os-window[data-app-id="minesweeper"]');
    const noteWin = page.locator('.os-window[data-app-id="notepad"]');

    await expect(noteWin).toBeVisible({ timeout: 5000 });

    // Close notepad
    const closeBtn = noteWin.locator('button[data-win-action="close"]');
    await closeBtn.click();
    await expect(noteWin).toHaveCount(0);

    // Minesweeper must remain open in store/DOM
    await expect(mineWin).toHaveCount(1);
  });

  // 10. Currículo pode ser acessado
  test('10. resume (Resume.doc) can be opened and contains profile data and PDF download button', async ({ page, isMobile }) => {
    const resumeIcon = page.locator('#icon-resume');
    if (isMobile) {
      await resumeIcon.click();
    } else {
      await resumeIcon.dblclick();
    }

    const resumeWin = page.locator('.os-window[data-app-id="resume"]');
    await expect(resumeWin).toBeVisible({ timeout: 5000 });
    await expect(resumeWin).toContainText('Pedro Tunin');
    await expect(resumeWin).toContainText('Baixar PDF');

    const downloadLink = resumeWin.locator('a[href="/resume/pdf"]').first();
    await expect(downloadLink).toBeVisible();
  });

  // 11. GitHub e LinkedIn apontam para URLs corretas
  test('11. github and linkedin icons link to correct verified URLs with noopener', async ({ page }) => {
    const githubLink = page.locator('#icon-github');
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/Pedroltz');
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', /noopener/);

    const linkedinLink = page.locator('#icon-linkedin');
    await expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/pedrotunin/');
    await expect(linkedinLink).toHaveAttribute('target', '_blank');
    await expect(linkedinLink).toHaveAttribute('rel', /noopener/);
  });

  // 12. Internet Explorer navega por páginas internas
  test('12. internet explorer navigates between internal intranet pages', async ({ page, isMobile }) => {
    const ieIcon = page.locator('#icon-iexplore');
    if (isMobile) {
      await ieIcon.click();
    } else {
      await ieIcon.dblclick();
    }

    const ieWin = page.locator('.os-window[data-app-id="iexplore"]');
    await expect(ieWin).toBeVisible({ timeout: 5000 });
    await expect(ieWin).toContainText('PedroOS 95 — Intranet');

    // Click on projects internal link inside IE
    const projectsLink = ieWin.locator('[data-ie-nav="pedroos://projects"]').first();
    await projectsLink.click();
    await expect(ieWin).toContainText('Diretório de Projetos — Pedro Tunin');

    // Click Home button in IE toolbar
    const homeBtn = ieWin.locator('button[data-ie-home]');
    await homeBtn.click();
    await expect(ieWin).toContainText('PedroOS 95 — Intranet');
  });

  // 13. Campo Minado inicia e reinicia uma partida
  test('13. minesweeper starts, allows reveals, and resets game', async ({ page, isMobile }) => {
    const mineIcon = page.locator('#icon-minesweeper');
    if (isMobile) {
      await mineIcon.click();
    } else {
      await mineIcon.dblclick();
    }

    const mineWin = page.locator('.os-window[data-app-id="minesweeper"]');
    await expect(mineWin).toBeVisible({ timeout: 5000 });

    const cells = mineWin.locator('.mine-cell');
    await expect(cells).toHaveCount(81); // 9x9 beginner board

    // First safe click
    await cells.nth(40).click();

    // Reset button
    const faceBtn = mineWin.locator('[data-mine-face]');
    await faceBtn.click();
    await expect(cells.first()).not.toHaveClass(/revealed/);
  });

  // 14. A interface funciona em viewport mobile
  test('14. mobile viewport adapts correctly', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    const startBtn = page.locator('#start-button');
    await expect(startBtn).toBeVisible();

    const icons = page.locator('#desktop-icons');
    await expect(icons).toBeVisible();

    // Tap icon
    await page.locator('#icon-resume').click();
    const resumeWin = page.locator('.os-window[data-app-id="resume"]');
    await expect(resumeWin).toBeVisible({ timeout: 5000 });

    // In mobile, window fills the screen width
    const box = await resumeWin.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(300);
  });

  // 15. Rotas diretas funcionam após atualização da página
  test('15. direct SEO routes render server-side correctly', async ({ page }) => {
    await page.goto('/projects/ofizzy');
    await expect(page).toHaveTitle(/Ofizzy/);

    const ofizzyWin = page.locator('.os-window[data-instance-key="project:ofizzy"]');
    await expect(ofizzyWin).toBeVisible();
    await expect(ofizzyWin).toContainText('Ofizzy');

    await page.goto('/skills');
    await expect(page).toHaveTitle(/System Properties/);
    const sysWin = page.locator('.os-window[data-app-id="sysprops"]');
    await expect(sysWin).toBeVisible();
    await expect(sysWin).toContainText('Development');
  });
});
