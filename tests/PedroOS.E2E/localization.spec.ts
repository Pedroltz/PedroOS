import { test, expect, type Page } from '@playwright/test';

async function openIcon(page: Page, id: string, mobile: boolean): Promise<void> {
  const icon = page.locator(`#icon-${id}`);
  if (mobile) await icon.click(); else await icon.dblclick();
}

test('desktop, explorer and window controls default to Portuguese and PedroOS identity', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('#start-button')).toHaveText('Iniciar');
  await expect(page.locator('#icon-my-computer')).toContainText('Meu Computador');
  await expect(page.locator('#icon-explorer')).toContainText('Explorador de Arquivos');
  await expect(page.locator('#icon-iexplore')).toContainText('Navegador PedroOS');
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Windows\s*95/i);
  await openIcon(page, 'explorer', isMobile);
  const explorer = page.locator('.os-window[data-app-id="explorer"]');
  await expect(explorer.locator('.title-bar-label')).toContainText('Explorando');
  await expect(explorer.locator('[data-exp-items]')).toContainText('Projetos');
  await expect(explorer.locator('[data-exp-items]')).toContainText('Jogos');
  await expect(explorer.locator('[data-menu-trigger="file"]')).toHaveText('Arquivo');
  await expect(explorer.locator('[data-menu-trigger="view"]')).toHaveText('Exibir');
  await expect(explorer.getByRole('button', { name: 'Minimizar', exact: true })).toHaveCSS('background-repeat', 'no-repeat');
  await expect(explorer.getByRole('button', { name: 'Fechar', exact: true })).not.toHaveCSS('background-image', 'none');
  await explorer.locator('[data-exp-address]').fill('C:\\Projects');
  await explorer.locator('[data-exp-address]').press('Enter');
  await expect(explorer.locator('[data-exp-address]')).toHaveValue('C:\\Projetos');
  await page.screenshot({ path: `test-results/portuguese-explorer-${isMobile ? 'mobile' : 'desktop'}.png` });
  await explorer.getByRole('button', { name: 'Fechar', exact: true }).click();
  await openIcon(page, 'msdos', isMobile);
  const terminal = page.locator('.os-window[data-app-id="terminal"]');
  await expect(terminal.locator('[data-terminal-output]')).toContainText('PedroOS 95');
  await expect(terminal.locator('[data-terminal-output]')).not.toContainText('Microsoft');
  await terminal.locator('[data-terminal-input]').fill('ver');
  await terminal.locator('[data-terminal-input]').press('Enter');
  await expect(terminal.locator('[data-terminal-output]')).toContainText('Versão');
  await expect(page.locator('body')).not.toContainText(/Windows\s*95/i);
});

test('system pages, browser menus and utility dialogs use Portuguese', async ({ page, isMobile }) => {
  await page.goto('/skills');
  await expect(page).toHaveTitle(/Propriedades do Sistema/);
  const system = page.locator('.os-window[data-app-id="sysprops"]');
  await expect(system).toContainText('PedroOS 95');
  await expect(system).toContainText('Gerenciador de Dispositivos');
  await expect(system).not.toContainText(/Windows\s*95/i);
  await system.getByRole('button', { name: 'Fechar', exact: true }).click();
  await openIcon(page, 'iexplore', isMobile);
  const browser = page.locator('.os-window[data-app-id="iexplore"]');
  await expect(browser.locator('.title-bar-label')).toContainText('Navegador PedroOS');
  await expect(browser.locator('[data-ie-menu="File"]')).toHaveText('Arquivo');
  await expect(browser.locator('[data-ie-menu="Favorites"]')).toHaveText('Favoritos');
  await browser.locator('[data-ie-menu="Help"]').click();
  await browser.locator('[data-ie-action="about"]').click();
  await expect(browser.locator('dialog')).toContainText('Edição Intranet');
  await page.screenshot({ path: `test-results/portuguese-browser-${isMobile ? 'mobile' : 'desktop'}.png` });
  await browser.locator('[data-ie-action="dialog-close"]').click();
  await browser.locator('[data-ie-address]').fill('pedroos://credits');
  await browser.locator('[data-ie-address]').press('Enter');
  await expect(browser.locator('[data-ie-viewport]')).not.toContainText(/Windows\s*95/i);
  await browser.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="run"]').click();
  await expect(page.locator('.os-window[data-app-id="run"]')).toContainText('Digite o nome');
  await page.locator('[data-run-input]').fill('campominado');
  await page.locator('[data-run-input]').press('Enter');
  await expect(page.locator('.os-window[data-app-id="minesweeper"] .title-bar-label')).toContainText('Campo Minado');
  await expect(page.locator('[data-mine-diff]')).toContainText('Iniciante');
  await expect(page.locator('body')).not.toContainText(/Windows\s*95/i);
});
