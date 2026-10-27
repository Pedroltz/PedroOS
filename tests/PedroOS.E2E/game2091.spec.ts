import { test, expect, type Page, type Locator } from '@playwright/test';


async function key(terminal: Locator, name: string): Promise<void> {
  const keys: Record<string, string> = { Enter: 'Enter', Baixo: 'ArrowDown', Cima: 'ArrowUp' };
  await terminal.getByRole('textbox', { name: 'Entrada do jogo 2091' }).press(keys[name] ?? name);
}
async function closeGame(terminal: Locator): Promise<void> {
  await terminal.locator('[aria-label="Fechar"]').click();
}

async function text(terminal: Locator): Promise<string> {
  return terminal.locator('.xterm-accessibility-tree').innerText();
}
async function waitFor(terminal: Locator, phrase: string): Promise<void> {
  await expect.poll(() => text(terminal), { timeout: 20000 }).toContain(phrase);
}
async function openGame(page: Page): Promise<Locator> {
  await page.goto('/projects/2091-retrogame');
  await page.getByRole('button', { name: 'Jogar 2091' }).click();
  const terminal = page.locator('.os-window[data-app-id="terminal"]');
  await expect(terminal.locator('[data-terminal-native]')).toBeVisible();
  await expect(terminal).toHaveClass(/maximized/);
  await expect(page.locator('#taskbar')).toBeVisible();
  await waitFor(terminal, 'Pressione qualquer tecla');
  return terminal;
}

test('the real C# game runs inside CMD and returns to the prompt when it exits', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const BrowserAudio = window.Audio;
    window.Audio = class extends BrowserAudio {
      constructor(src?: string) { super(src); this.dataset.testMusic = ''; document.body.append(this); }
    };
  });
  const terminal = await openGame(page);
  await expect(page.locator('.os-window[data-app-id="game2091"]')).toHaveCount(0);
  await expect(terminal.locator('.native-terminal-keys, .native-terminal-toolbar')).toHaveCount(0);
  await key(terminal, 'Enter');
  await waitFor(terminal, 'Jogar');
  await expect.poll(() => page.locator('audio[data-test-music]').evaluate((audio: HTMLAudioElement) =>
    !audio.paused && audio.currentTime > 0 && audio.readyState >= 2)).toBe(true);
  await page.screenshot({ path: `test-results/game2091-native-${isMobile ? 'mobile' : 'desktop'}.png` });
  await key(terminal, 'Baixo');
  await key(terminal, 'Baixo');
  await key(terminal, 'Enter');
  await expect(terminal.locator('[data-terminal-input]')).toBeVisible();
  await expect.poll(() => page.locator('audio[data-test-music]').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await expect(terminal.locator('[data-terminal-output]')).toContainText('2091 encerrado');
  await terminal.locator('[data-terminal-input]').fill('dir');
  await terminal.locator('[data-terminal-input]').press('Enter');
  await expect(terminal.locator('[data-terminal-output]')).toContainText('Projetos');
});

test('native character creation saves on the backend and survives reopening in the same browser', async ({ page, context, browser }) => {
  test.setTimeout(60000);
  const terminal = await openGame(page);
  const press = (name: string): Promise<void> => key(terminal, name);
  await press('Enter');
  await waitFor(terminal, 'Jogar');
  await press('Enter');
  await waitFor(terminal, 'NOME DO AGENTE');
  await page.keyboard.type('NativeAlex');
  await press('Enter');
  await waitFor(terminal, 'PERFIL DO AGENTE');
  await terminal.getByRole('textbox', { name: 'Entrada do jogo 2091' }).focus();
  for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => text(terminal), { timeout: 15000 }).toMatch(/Disponíveis:\s*0\b/);
  await press('Enter');
  await waitFor(terminal, 'CONFIRMAÇÃO DE CONTRATO');
  await press('Enter');
  await waitFor(terminal, 'Você é NativeAlex');
  expect(await text(terminal)).not.toContain('tentando sobreviver na máquina corporativa');
  await waitFor(terminal, 'tentando sobreviver na máquina corporativa');
  // Original dialogs advance text with console keys before presenting chapter choices.
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name === 'pedroos.2091.visitor' && c.httpOnly)).toBe(true);
  await closeGame(terminal);
  await page.reload();
  await page.getByRole('button', { name: 'Jogar 2091' }).click();
  const reopened = page.locator('.os-window[data-app-id="terminal"]');
  await waitFor(reopened, 'Pressione qualquer tecla');
  await key(reopened, 'Enter');
  await waitFor(reopened, 'Jogar');
  await key(reopened, 'Enter');
  await waitFor(reopened, 'Carregar Jogo');
  await key(reopened, 'Baixo');
  await key(reopened, 'Enter');
  await waitFor(reopened, 'Personagem: NativeAlex');
  await closeGame(reopened);
  const visitor = await browser.newContext({ baseURL: page.url() });
  try {
    const isolated = await openGame(await visitor.newPage());
    await key(isolated, 'Enter');
    await waitFor(isolated, 'Jogar');
    await key(isolated, 'Enter');
    await waitFor(isolated, 'NOME DO AGENTE');
    expect(await text(isolated)).not.toContain('NativeAlex');
  } finally { await visitor.close(); }
});

test('the 2091 command uses the current CMD window and preserves its directory', async ({ page, isMobile }) => {
  await page.goto('/');
  const icon = page.locator('#icon-msdos');
  if (isMobile) await icon.click(); else await icon.dblclick();
  const terminal = page.locator('.os-window[data-app-id="terminal"]');
  const input = terminal.locator('[data-terminal-input]');
  await input.fill('cd Jogos');
  await input.press('Enter');
  await expect(terminal.locator('[data-terminal-prompt]')).toHaveText('C:\\Jogos>');
  const wasMaximized = await terminal.evaluate(el => el.classList.contains('maximized'));
  const bounds = await terminal.boundingBox();
  await input.fill('2091');
  await input.press('Enter');
  await expect(terminal).toHaveClass(/maximized/);
  await waitFor(terminal, 'Pressione qualquer tecla');
  await expect(page.locator('.os-window[data-app-id="terminal"]')).toHaveCount(1);
  await key(terminal, 'Enter');
  await waitFor(terminal, 'Jogar');
  await key(terminal, 'Escape');
  await expect(input).toBeVisible();
  await expect(terminal.locator('[data-terminal-prompt]')).toHaveText('C:\\Jogos>');
  expect(await terminal.evaluate(el => el.classList.contains('maximized'))).toBe(wasMaximized);
  expect(await terminal.boundingBox()).toEqual(bounds);
});

test('untrusted origins cannot start a native process', async ({ request }) => {
  const response = await request.get('/api/game2091/terminal', { headers: {
    Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', Origin: 'https://untrusted.invalid',
  } });
  expect(response.status()).toBe(403);
});

test('a missing backend restores CMD instead of showing the removed browser game', async ({ page }) => {
  await page.route('**/api/game2091/status', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/projects/2091-retrogame');
  await page.getByRole('button', { name: 'Jogar 2091' }).click();
  const terminal = page.locator('.os-window[data-app-id="terminal"]');
  await expect(terminal.locator('[data-terminal-input]')).toBeVisible();
  await expect(terminal.locator('[data-terminal-output]')).toContainText('backend local');
  await expect(page.locator('[data-game2091]')).toHaveCount(0);
});

for (const maximized of [false, true]) {
  test(`backend failure restores CMD bounds (initial maximized=${maximized})`, async ({ page, isMobile }) => {
    await page.route('**/api/game2091/status', async route => {
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ status: 503, body: '{}' });
    });
    await page.goto('/');
    if (isMobile) await page.locator('#icon-msdos').click(); else await page.locator('#icon-msdos').dblclick();
    const terminal = page.locator('.os-window[data-app-id="terminal"]');
    const alreadyMaximized = await terminal.evaluate(el => el.classList.contains('maximized'));
    if (alreadyMaximized !== maximized) await terminal.locator('[aria-label="Maximizar"], [aria-label="Restaurar"]').click();
    const bounds = await terminal.boundingBox();
    const input = terminal.locator('[data-terminal-input]');
    await input.fill('2091.exe'); await input.press('Enter');
    await expect(terminal).toHaveClass(/maximized/);
    await expect(terminal.locator('[data-terminal-output]')).toContainText('backend local');
    await expect(input).toBeVisible();
    expect(await terminal.evaluate(el => el.classList.contains('maximized'))).toBe(maximized);
    expect(await terminal.boundingBox()).toEqual(bounds);
  });
}

test('Run executable maximizes CMD and returns to its prior state on failure', async ({ page }) => {
  await page.route('**/api/game2091/status', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');
  await page.locator('#start-button').click();
  await page.locator('[data-open-app="run"]').click();
  await page.locator('[data-run-input]').fill('2091.exe');
  await page.locator('[data-run-input]').press('Enter');
  const terminal = page.locator('.os-window[data-app-id="terminal"]');
  await expect(terminal.locator('[data-terminal-output]')).toContainText('backend local');
  await expect(terminal.locator('[data-terminal-input]')).toBeVisible();
});
