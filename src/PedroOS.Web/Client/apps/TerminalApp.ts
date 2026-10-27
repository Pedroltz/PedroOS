import { mountClassicMenu } from '../components/ClassicMenu.js';
import type { AppMountContext, ClientAppModule, VirtualNode } from '../types/index.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';
import { NativeGameTerminal } from './NativeGameTerminal.js';

const BANNER = [
  'PedroOS 95',
  '   (C) Pedro Tunin — PedroOS 95.',
  '',
];

const HELP = [
  'Comandos suportados:',
  '  CD [caminho]     Muda de diretório (CD.. volta, CD\\ vai a raiz)',
  '  CLS             Limpa a tela',
  '  COLOR [xy]      Muda as cores (ex.: COLOR 0A). COLOR sem argumento restaura',
  '  DATE            Mostra a data atual',
  '  DIR [caminho]    Lista arquivos e pastas (/B: nomes, /A: ocultos)',
  '  ECHO texto      Exibe uma mensagem',
  '  EXIT / SAIR     Fecha o prompt',
  '  HELP            Mostra esta lista',
  '  MEM             Mostra a memória (virtual)',
  '  START app       Abre um programa (explorador, bloco, navegador, campominado...)',
  '  2091            Abre a aventura cyberpunk 2091',
  '  TIME            Mostra a hora atual',
  '  TITLE texto     Muda o título da janela',
  '  TREE [caminho]  Mostra a árvore de pastas',
  '  TYPE arquivo    Exibe o conteudo de um arquivo de texto',
  '  VER             Mostra a versão do sistema',
  '  VOL             Mostra o rótulo do volume',
  '',
  'Exemplo: DIR, CD Projetos, DIR, CD.., SAIR',
  'Use TAB para completar caminhos e as setas para recuperar comandos.',
];

const COLORS = [
  '#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0',
  '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff',
];

const START_ALIASES: Record<string, { appId: string; args?: Record<string, string> }> = {
  explorador: { appId: 'explorer', args: { path: 'C:\\' } },
  navegador: { appId: 'iexplore' },
  campominado: { appId: 'minesweeper' },
  projetos: { appId: 'projects' },
  curriculo: { appId: 'resume' },
  habilidades: { appId: 'sysprops' },
  localizar: { appId: 'find' },
  terminal: { appId: 'terminal' },
  bloco: { appId: 'notepad' },
  explorer: { appId: 'explorer', args: { path: 'C:\\' } },
  notepad: { appId: 'notepad' },
  iexplore: { appId: 'iexplore' },
  ie: { appId: 'iexplore' },
  winmine: { appId: 'minesweeper' },
  minesweeper: { appId: 'minesweeper' },
  projects: { appId: 'projects' },
  resume: { appId: 'resume' },
  wordpad: { appId: 'resume' },
  sysprops: { appId: 'sysprops' },
  skills: { appId: 'sysprops' },
  find: { appId: 'find' },
  cmd: { appId: 'terminal' },
  command: { appId: 'terminal' },
};

/**
 * Terminal PedroOS: a tiny PedroOS 95 style command interpreter backed by the virtual file system.
 */
export class TerminalApp implements ClientAppModule {
  public constructor(private readonly vfs: VirtualFileSystemClient) {}

  public mount(ctx: AppMountContext): () => void {
    ctx.setTitle('Terminal PedroOS', 'msdos');

    ctx.container.innerHTML = `
      <div class="app-shell terminal-app" data-terminal>
        <div class="win95-menubar" role="menubar">
          <div class="win95-menu-item">
            <button type="button" class="win95-menu-btn" data-terminal-menu aria-label="Arquivo" aria-haspopup="true" aria-expanded="false"><u>A</u>rquivo</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="explore">Abrir pasta</button></li>
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="clear">Limpar tela</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="exit">Sair</button></li>
            </ul>
          </div>
          <div class="win95-menu-item">
            <button type="button" class="win95-menu-btn" data-terminal-menu aria-label="Editar" aria-haspopup="true" aria-expanded="false"><u>E</u>ditar</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="copy">Copiar</button></li>
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="paste">Colar</button></li>
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="select">Selecionar tudo</button></li>
            </ul>
          </div>
          <div class="win95-menu-item">
            <button type="button" class="win95-menu-btn" data-terminal-menu aria-label="Ajuda" aria-haspopup="true" aria-expanded="false">A<u>j</u>uda</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="help">Referência de comandos</button></li>
              <li><button type="button" class="win95-dropdown-item" role="menuitem" data-terminal-action="about">Sobre o Terminal PedroOS</button></li>
            </ul>
          </div>
        </div>
        <div class="terminal-screen sunken-panel" data-terminal-screen tabindex="-1">
          <div class="terminal-output" data-terminal-output role="log" aria-live="polite" aria-label="Saida do terminal"></div>
          <form class="terminal-line" data-terminal-form autocomplete="off">
            <span class="terminal-prompt" data-terminal-prompt></span>
            <input type="text" class="terminal-input" data-terminal-input spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Linha de comando" />
          </form>
        </div>
        <div class="terminal-native" data-terminal-native hidden></div>
        <div class="status-bar">
          <p class="status-bar-field" data-terminal-path>C:\\</p>
          <p class="status-bar-field">HELP: comandos · TAB: completar</p>
        </div>
      </div>
    `;

    const screen = ctx.container.querySelector<HTMLElement>('[data-terminal-screen]')!;
    const output = ctx.container.querySelector<HTMLElement>('[data-terminal-output]')!;
    const form = ctx.container.querySelector<HTMLFormElement>('[data-terminal-form]')!;
    const promptEl = ctx.container.querySelector<HTMLElement>('[data-terminal-prompt]')!;
    const input = ctx.container.querySelector<HTMLInputElement>('[data-terminal-input]')!;
    const pathLabel = ctx.container.querySelector<HTMLElement>('[data-terminal-path]')!;
    const nativeContainer = ctx.container.querySelector<HTMLElement>('[data-terminal-native]')!;
    let native: NativeGameTerminal | undefined;
    let disposed = false;

    let cwd = 'C:\\';
    const history: string[] = [];
    let historyIndex = 0;
    let draft = '';

    const print = (lines: string | string[]): void => {
      for (const line of Array.isArray(lines) ? lines : [lines]) {
        const div = document.createElement('div');
        div.className = 'terminal-text';
        div.textContent = line === '' ? '\u00a0' : line;
        output.appendChild(div);
      }
      screen.scrollTop = screen.scrollHeight;
    };

    const updatePrompt = (): void => {
      promptEl.textContent = `${cwd}>`;
      pathLabel.textContent = cwd;
    };

    const startNativeGame = (): void => {
      if (native) { native.focus(); return; }
      const wasMaximized = ctx.container.closest('.os-window')?.classList.contains('maximized');
      ctx.windowManager.maximize(ctx.windowId);
      screen.hidden = true;
      nativeContainer.hidden = false;
      native = new NativeGameTerminal(nativeContainer, (message) => {
        native = undefined;
        if (disposed) return;
        if (wasMaximized) ctx.windowManager.maximize(ctx.windowId);
        else ctx.windowManager.restore(ctx.windowId);
        nativeContainer.hidden = true;
        screen.hidden = false;
        ctx.setTitle('Terminal PedroOS', 'msdos');
        print(['', message, '']);
        updatePrompt();
        input.focus();
        screen.scrollTop = screen.scrollHeight;
      });
      void native.start();
    };

    const resolve = (raw: string): string => {
      const arg = raw.trim().replace(/^"(.*)"$/, '$1').replace(/\//g, '\\');
      if (!arg) {
        return cwd;
      }
      if (/^[a-z]:/i.test(arg) && !/^c:/i.test(arg)) return '';
      let current = cwd;
      if (arg.startsWith('\\') || /^c:\\/i.test(arg)) {
        current = 'C:\\';
      }
      for (const part of arg.replace(/^c:/i, '').split('\\').filter((p) => p.length > 0)) {
        if (part === '.') {
          continue;
        }
        if (part === '..') {
          current = this.vfs.getParentPath(current);
          continue;
        }
        current = current === 'C:\\' ? `C:\\${part}` : `${current}\\${part}`;
      }
      return this.vfs.normalizePath(current);
    };

    const sizeOf = (n: VirtualNode): string => {
      const text = n.type === 'folder' || n.type === 'drive' ? '<DIR>' : (n.size ?? '').replace(/\s*KB/i, ' KB');
      return text;
    };

    const dir = (arg: string): void => {
      const flags = [...arg.matchAll(/(?:^|\s)\/([a-z]+)(?=\s|$)/gi)].map((m) => m[1].toLowerCase());
      if (flags.some((flag) => flag !== 'a' && flag !== 'b')) {
        print('Parâmetro inválido. Use DIR [caminho] [/A] [/B].');
        return;
      }
      const target = arg.replace(/(?:^|\s)\/[a-z]+(?=\s|$)/gi, '').trim();
      const path = resolve(target);
      const node = path ? this.vfs.resolvePath(path) : undefined;
      if (!node || !node.children) {
        print(node ? 'Arquivo não encontrado' : 'Caminho não encontrado');
        return;
      }
      const children = this.vfs.listDirectory(path, flags.includes('a'));
      if (flags.includes('b')) {
        print(children.map((child) => child.name));
        return;
      }
      print(['', ' O volume na unidade C é PEDROOS', ' O número de série do volume é 1995-0824', ` Pasta de ${node.path}`, '']);
      if (path !== 'C:\\') {
        print([`${'<DIR>'.padStart(12)}  .`, `${'<DIR>'.padStart(12)}  ..`]);
      }
      let files = 0;
      let dirs = 0;
      for (const c of children) {
        const isDir = c.type === 'folder' || c.type === 'drive';
        if (isDir) {
          dirs++;
        } else {
          files++;
        }
        print(`${sizeOf(c).padStart(12)}  ${c.name}`);
      }
      print([`      ${files} arquivo(s)`, `      ${dirs} pasta(s)`, '']);
    };

    const tree = (path: string, prefix: string): void => {
      const kids = this.vfs.listDirectory(path).filter((c) => c.type === 'folder');
      kids.forEach((k, i) => {
        const last = i === kids.length - 1;
        print(`${prefix}${last ? '\u2514\u2500\u2500' : '\u251c\u2500\u2500'}${k.name}`);
        tree(k.path, prefix + (last ? '    ' : '\u2502   '));
      });
    };

    const applyColor = (arg: string): void => {
      const root = ctx.container.querySelector<HTMLElement>('[data-terminal]')!;
      if (!arg) {
        root.style.removeProperty('--term-bg');
        root.style.removeProperty('--term-fg');
        return;
      }
      if (!/^[0-9a-f]{2}$/i.test(arg) || arg[0].toLowerCase() === arg[1].toLowerCase()) {
        print('Argumento inválido. Use COLOR xy (dois dígitos hexadecimais diferentes).');
        return;
      }
      root.style.setProperty('--term-bg', COLORS[parseInt(arg[0], 16)]);
      root.style.setProperty('--term-fg', COLORS[parseInt(arg[1], 16)]);
    };

    const run = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed) {
        return false;
      }
      const normalized = trimmed.replace(/^(cd|chdir)(?=[.\\/])/i, '$1 ');
      const match = /^([^\s\\/]+)\s*(.*)$/.exec(normalized);
      const cmd = (match?.[1] ?? '').toLowerCase();
      const arg = match?.[2] ?? '';
      if (arg.trim() === '/?') {
        print(HELP);
        return false;
      }

      switch (cmd) {
        case 'doom':
        case 'doom.exe':
        case 'freedoom':
          ctx.windowManager.open('doom');
          break;
        case '2091':
        case '2091.exe':
        case '2091-retrogame':
        case '2091-retrogame.exe':
          startNativeGame();
          break;
        case 'help':
        case 'ajuda':
        case '?':
          print(HELP);
          break;
        case 'cls':
        case 'limpar':
          output.innerHTML = '';
          break;
        case 'ver':
          print(['', 'PedroOS 95 [Versão 4.00.950] - PedroOS', '']);
          break;
        case 'vol':
          print([' O volume na unidade C é PEDROOS', ' O número de série do volume é 1995-0824']);
          break;
        case 'echo':
          print(arg || 'ECHO está ativado');
          break;
        case 'date':
          print(`Data atual: ${new Date().toLocaleDateString('pt-BR')}`);
          break;
        case 'time':
          print(`Hora atual: ${new Date().toLocaleTimeString('pt-BR')}`);
          break;
        case 'mem':
          print(['', '   655360 bytes de memória convencional total', '   655360 bytes disponíveis no Terminal PedroOS', '']);
          break;
        case 'title':
          ctx.setTitle(arg || 'Terminal PedroOS', 'msdos');
          break;
        case 'color':
          applyColor(arg.trim());
          break;
        case 'dir':
        case 'ls':
        case 'diretorio':
          dir(arg);
          break;
        case 'tree': {
          const path = resolve(arg);
          const node = this.vfs.resolvePath(path);
          if (!path || !node?.children) {
            print('Caminho não encontrado');
            break;
          }
          print(['', node.path]);
          tree(path, '');
          print('');
          break;
        }
        case 'cd':
        case 'chdir': {
          if (!arg) {
            print(cwd);
            break;
          }
          const path = resolve(arg.replace(/^\/d\s+/i, ''));
          const node = path ? this.vfs.resolvePath(path) : undefined;
          if (!node || !node.children) {
            print('Diretório inválido');
            break;
          }
          cwd = node.path;
          break;
        }
        case 'pwd':
          print(cwd);
          break;
        case 'type': {
          if (!arg) {
            print('Parâmetro obrigatório ausente');
            break;
          }
          const path = resolve(arg.replace(/^"|"$/g, ''));
          const node = path ? this.vfs.resolvePath(path) : undefined;
          if (!node) {
            print('Arquivo não encontrado - ' + arg);
          } else if (typeof node.content !== 'string') {
            print('Não é possível exibir este arquivo.');
          } else {
            print(node.content.split(/\r?\n/));
          }
          break;
        }
        case 'start': {
          if (/^2091(?:-retrogame)?(?:\.exe)?$/i.test(arg.trim())) {
            startNativeGame();
            break;
          }
          if (!arg.trim()) {
            ctx.windowManager.open('terminal', { args: { path: cwd } });
            break;
          }
          const path = resolve(arg);
          const node = path ? this.vfs.resolvePath(path) : undefined;
          if (node?.children) {
            ctx.windowManager.open('explorer', { args: { path: node.path } });
            break;
          }
          const key = arg.trim().toLowerCase().replace(/\.exe$/, '');
          const target = START_ALIASES[key];
          if (!target) {
            print(`Programa não encontrado: ${arg || '(vazio)'}`);
            break;
          }
          ctx.windowManager.open(target.appId, target.args ? { args: target.args } : undefined);
          break;
        }
        case 'exit':
        case 'sair':
          ctx.windowManager.close(ctx.windowId);
          return true;
        case 'c:':
          break;
        default: {
          const alias = START_ALIASES[cmd.replace(/\.exe$/, '')];
          if (alias) {
            ctx.windowManager.open(alias.appId, alias.args ? { args: alias.args } : undefined);
          } else {
            print('Comando ou nome de arquivo incorreto');
          }
        }
      }
      return false;
    };

    const initialPath = resolve(ctx.args.path || 'C:\\');
    const initialNode = this.vfs.resolvePath(initialPath);
    if (initialNode?.children) cwd = initialNode.path;
    print(BANNER);
    updatePrompt();

    const onSubmit = (e: Event): void => {
      e.preventDefault();
      const value = input.value;
      print(`${cwd}>${value}`);
      input.value = '';
      if (value.trim()) {
        if (history.at(-1) !== value) history.push(value);
        if (history.length > 100) history.shift();
      }
      historyIndex = history.length;
      draft = '';
      completion = undefined;
      const closed = run(value);
      if (!closed && !native) {
        updatePrompt();
        screen.scrollTop = screen.scrollHeight;
      }
    };

    let completion: { values: string[]; index: number } | undefined;
    const onInput = (): void => { completion = undefined; };
    const completePath = (backwards: boolean): void => {
      if (!completion) {
        const match = /^(\S+\s+)(.*)$/.exec(input.value);
        if (!match) return;
        const raw = match[2].replace(/^"|"$/g, '').replace(/\//g, '\\');
        const split = raw.lastIndexOf('\\');
        const folder = raw.slice(0, split + 1);
        const leaf = raw.slice(split + 1).toLowerCase();
        const directory = resolve(folder || '.');
        if (!directory) return;
        const foldersOnly = /^(cd|chdir)\s/i.test(match[1]);
        const values = this.vfs.listDirectory(directory)
          .filter((node) => node.name.toLowerCase().startsWith(leaf) && (!foldersOnly || node.children))
          .map((node) => {
            const path = `${folder}${node.name}${node.children ? '\\' : ''}`;
            return match[1] + (/\s/.test(path) ? `"${path}"` : path);
          });
        if (!values.length) return;
        completion = { values, index: backwards ? 0 : -1 };
      }
      completion.index = (completion.index + (backwards ? -1 : 1) + completion.values.length) % completion.values.length;
      input.value = completion.values[completion.index];
      input.setSelectionRange(input.value.length, input.value.length);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        e.preventDefault();
        completePath(e.shiftKey);
        return;
      }
      completion = undefined;
      if (e.ctrlKey && (e.key.toLowerCase() === 'l' || (e.key.toLowerCase() === 'c' && !window.getSelection()?.toString() && input.selectionStart === input.selectionEnd))) {
        e.preventDefault();
        if (e.key.toLowerCase() === 'l') output.replaceChildren();
        else {
          print(`${cwd}>${input.value}^C`);
          input.value = '';
          historyIndex = history.length;
          draft = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex === history.length) draft = input.value;
        if (historyIndex > 0) {
          historyIndex--;
          input.value = history[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          input.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          input.value = draft;
        }
      } else if (e.key === 'Escape') {
        input.value = '';
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') input.setSelectionRange(input.value.length, input.value.length);
    };

    const menus = mountClassicMenu(ctx.container);
    const closeMenus = menus.close;
    const onMenuClick = async (e: MouseEvent): Promise<void> => {
      const target = e.target as HTMLElement;
      const action = target.closest<HTMLElement>('[data-terminal-action]')?.dataset.terminalAction;
      if (!action) return;
      closeMenus();
      if (action === 'exit') { ctx.windowManager.close(ctx.windowId); return; }
      if (native) {
        if (action === 'clear') native.clear();
        else if (action === 'select') native.selectAll();
        else if (action === 'copy') {
          try { const text = native.selection(); if (text) await navigator.clipboard.writeText(text); } catch { pathLabel.textContent = 'Use Ctrl+C para copiar a seleção.'; }
        } else if (action === 'paste') {
          try { native.paste(await navigator.clipboard.readText()); } catch { pathLabel.textContent = 'Use Ctrl+V para colar no jogo.'; }
        } else if (action === 'explore') ctx.windowManager.open('explorer', { args: { path: cwd } });
        else pathLabel.textContent = '2091: setas e Enter. Use os menus do jogo para salvar e sair.';
        if (action !== 'select' && action !== 'explore') native?.focus();
        return;
      }
      if (action === 'explore') ctx.windowManager.open('explorer', { args: { path: cwd } });
      if (action === 'clear') output.replaceChildren();
      if (action === 'help') print(HELP);
      if (action === 'about') print([...BANNER, 'PedroOS 95 - Terminal PedroOS', '']);
      if (action === 'select') {
        const range = document.createRange();
        range.selectNodeContents(output);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        return;
      }
      try {
        if (action === 'copy') {
          const selection = window.getSelection();
          const text = selection?.anchorNode && screen.contains(selection.anchorNode)
            ? selection.toString() : input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
          if (text) await navigator.clipboard.writeText(text);
        }
        if (action === 'paste') {
          const text = (await navigator.clipboard.readText()).replace(/[\r\n]+/g, ' ');
          input.setRangeText(text, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, 'end');
          completion = undefined;
        }
      } catch {
        print('Área de transferência indisponível. Use Ctrl+C ou Ctrl+V.');
      }
      if (action !== 'explore' && input.isConnected) input.focus();
      screen.scrollTop = screen.scrollHeight;
    };
    const onScreenClick = (): void => {
      if (!window.getSelection()?.toString()) {
        input.focus();
      }
    };

    form.addEventListener('submit', onSubmit);
    input.addEventListener('keydown', onKey);
    input.addEventListener('input', onInput);
    screen.addEventListener('click', onScreenClick);
    ctx.container.addEventListener('click', onMenuClick);
    queueMicrotask(() => {
      if (disposed) return;
      input.focus();
      if (ctx.args.command === '2091') { input.value = '2091'; form.requestSubmit(); }
    });

    return () => {
      disposed = true;
      native?.dispose();
      form.removeEventListener('submit', onSubmit);
      input.removeEventListener('keydown', onKey);
      input.removeEventListener('input', onInput);
      screen.removeEventListener('click', onScreenClick);
      ctx.container.removeEventListener('click', onMenuClick);
      menus.dispose();
      ctx.container.innerHTML = '';
    };
  }
}
