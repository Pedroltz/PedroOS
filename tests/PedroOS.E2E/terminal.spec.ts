import { test, expect, type Locator } from './fixtures.js';

async function command(terminal: Locator, line: string): Promise<void> {
  const input = terminal.locator('[data-terminal-input]');
  await input.fill(line);
  await input.press('Enter');
}

test.beforeEach(async ({ page, isMobile }) => {
  await page.goto('./');
  const icon = page.locator('#icon-msdos');
  if (isMobile) await icon.click();
  else await icon.dblclick();
  await expect(page.locator('[data-terminal-input]')).toBeVisible();
});

test('directory commands navigate the Explorer filesystem and read files', async ({ page }) => {
  const terminal = page.locator('[data-terminal]');
  const output = terminal.locator('[data-terminal-output]');
  const prompt = terminal.locator('[data-terminal-prompt]');
  await command(terminal, 'DIR');
  await expect(output).toContainText('Projetos');
  await command(terminal, 'CD "projects"');
  await expect(prompt).toHaveText('C:\\Projetos>');
  await command(terminal, 'DIR /B');
  await expect(output).toContainText('Ofizzy.exe');
  await command(terminal, 'cd MaisProjetos');
  await expect(prompt).toHaveText('C:\\Projetos\\MaisProjetos>');
  await command(terminal, 'CD..');
  await expect(prompt).toHaveText('C:\\Projetos>');
  await command(terminal, 'cd\\');
  await expect(prompt).toHaveText('C:\\>');
  await command(terminal, 'cd /d "C:\\Projetos\\..\\SobreMim"');
  await expect(prompt).toHaveText('C:\\SobreMim>');
  await command(terminal, 'type "Readme.txt"');
  await expect(output).toContainText('PedroOS');
  await command(terminal, 'cd pasta-inexistente');
  await expect(output).toContainText('Diretório inválido');
  await expect(prompt).toHaveText('C:\\SobreMim>');
  await command(terminal, 'tree C:\\Projetos');
  await expect(output).toContainText('MaisProjetos');
});

test('completion, command history, clearing and SAIR work', async ({ page }) => {
  const terminal = page.locator('[data-terminal]');
  const input = terminal.locator('[data-terminal-input]');
  await input.fill('cd Pro');
  await input.press('Tab');
  await expect(input).toHaveValue('cd Projetos\\');
  await input.press('Enter');
  await expect(terminal.locator('[data-terminal-prompt]')).toHaveText('C:\\Projetos>');
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('cd Projetos\\');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('unfinished');
  await command(terminal, 'cls');
  await expect(terminal.locator('[data-terminal-output]')).toBeEmpty();
  await command(terminal, 'sair');
  await expect(terminal).toHaveCount(0);
});

test('EXIT closes the window', async ({ page }) => {
  const terminal = page.locator('[data-terminal]');
  await command(terminal, 'exit');
  await expect(terminal).toHaveCount(0);
});

test('classic menus work and the command input has no white field', async ({ page, isMobile }) => {
  const terminal = page.locator('[data-terminal]');
  const input = terminal.locator('[data-terminal-input]');
  const font = await page.evaluate(async () => {
    const faces = await document.fonts.load('16px "PedroOS VGA"');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = '16px "PedroOS VGA"';
    return { loaded: faces.length, widths: ['i', 'W', 'é', '─'].map((glyph) => context.measureText(glyph).width) };
  });
  expect(font.loaded).toBe(1);
  expect(font.widths).toEqual([8, 8, 8, 8]);
  await expect(input).toHaveCSS('font-family', '"PedroOS VGA", monospace');
  await expect(input).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(input).toHaveCSS('box-shadow', 'none');
  await expect(input).toHaveCSS('padding', '0px');
  await expect(terminal.locator('[data-terminal-screen]')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await terminal.getByRole('menuitem', { name: 'Ajuda', exact: true }).click();
  await terminal.getByRole('menuitem', { name: 'Referência de comandos' }).click();
  await expect(terminal.locator('[data-terminal-output]')).toContainText('CD..');
  await command(terminal, 'cd Projetos');
  await terminal.getByRole('menuitem', { name: 'Arquivo', exact: true }).click();
  await terminal.getByRole('menuitem', { name: 'Limpar tela' }).click();
  await expect(terminal.locator('[data-terminal-output]')).toBeEmpty();
  await command(terminal, 'dir');
  await page.screenshot({ path: `test-results/terminal-${isMobile ? 'mobile' : 'desktop'}.png` });
  await terminal.getByRole('menuitem', { name: 'Arquivo', exact: true }).click();
  await terminal.getByRole('menuitem', { name: 'Abrir pasta' }).click();
  const explorer = page.locator('.os-window[data-app-id="explorer"]');
  await expect(explorer.locator('[data-exp-address]')).toHaveValue('C:\\Projetos');
  if (!isMobile) await page.screenshot({ path: 'test-results/terminal-and-explorer.png' });
  await explorer.locator('[aria-label="Fechar"]').click();
  await terminal.getByRole('menuitem', { name: 'Arquivo', exact: true }).click();
  await terminal.getByRole('menuitem', { name: 'Sair', exact: true }).click();
  await expect(terminal).toHaveCount(0);
});
