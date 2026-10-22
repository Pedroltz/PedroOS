import type { AppMountContext, ClientAppModule, VirtualNode } from '../types/index.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';

const BANNER = [
  'Microsoft(R) Windows 95',
  '   (C)Copyright Microsoft Corp 1981-1996.',
  '',
];

const HELP = [
  'Comandos suportados:',
  '  CD [caminho]    Muda de diretorio (CD .. volta um nivel)',
  '  CLS             Limpa a tela',
  '  COLOR [xy]      Muda as cores (ex.: COLOR 0A). COLOR sem argumento restaura',
  '  DATE            Mostra a data atual',
  '  DIR [caminho]   Lista arquivos e pastas',
  '  ECHO texto      Exibe uma mensagem',
  '  EXIT            Fecha o prompt',
  '  HELP            Mostra esta lista',
  '  MEM             Mostra a memoria (virtual)',
  '  START app       Abre um programa (explorer, notepad, iexplore, winmine...)',
  '  TIME            Mostra a hora atual',
  '  TITLE texto     Muda o titulo da janela',
  '  TREE            Mostra a arvore de pastas do diretorio atual',
  '  TYPE arquivo    Exibe o conteudo de um arquivo de texto',
  '  VER             Mostra a versao do sistema',
  '  VOL             Mostra o rotulo do volume',
];

const COLORS = [
  '#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0',
  '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff',
];

const START_ALIASES: Record<string, { appId: string; args?: Record<string, string> }> = {
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
 * MS-DOS Prompt: a tiny Windows 95 style command interpreter backed by the virtual file system.
 */
export class TerminalApp implements ClientAppModule {
  public constructor(private readonly vfs: VirtualFileSystemClient) {}

  public mount(ctx: AppMountContext): () => void {
    ctx.setTitle('MS-DOS Prompt', 'msdos');

    ctx.container.innerHTML = `
      <div class="app-shell terminal-app" data-terminal>
        <div class="terminal-screen" data-terminal-screen tabindex="-1" aria-live="polite">
          <div class="terminal-output" data-terminal-output></div>
          <form class="terminal-line" data-terminal-form autocomplete="off">
            <span class="terminal-prompt" data-terminal-prompt></span>
            <input type="text" class="terminal-input" data-terminal-input spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Linha de comando" />
          </form>
        </div>
      </div>
    `;

    const screen = ctx.container.querySelector<HTMLElement>('[data-terminal-screen]')!;
    const output = ctx.container.querySelector<HTMLElement>('[data-terminal-output]')!;
    const form = ctx.container.querySelector<HTMLFormElement>('[data-terminal-form]')!;
    const promptEl = ctx.container.querySelector<HTMLElement>('[data-terminal-prompt]')!;
    const input = ctx.container.querySelector<HTMLInputElement>('[data-terminal-input]')!;

    let cwd = 'C:\\';
    const history: string[] = [];
    let historyIndex = 0;

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
    };

    const resolve = (raw: string): string => {
      const arg = raw.trim().replace(/\//g, '\\');
      if (!arg) {
        return cwd;
      }
      if (/^[a-z]:/i.test(arg)) {
        return this.vfs.normalizePath(arg);
      }
      let current = cwd;
      if (arg.startsWith('\\')) {
        current = 'C:\\';
      }
      for (const part of arg.split('\\').filter((p) => p.length > 0)) {
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
      const path = resolve(arg);
      const node = path ? this.vfs.resolvePath(path) : undefined;
      if (!node || !node.children) {
        print(node ? 'Arquivo nao encontrado' : 'Caminho nao encontrado');
        return;
      }
      const children = this.vfs.listDirectory(path);
      print(['', ' O volume na unidade C e PEDROOS', ` Pasta de ${path}`, '']);
      if (path !== 'C:\\') {
        print(['.'.padEnd(14) + '<DIR>', '..'.padEnd(13) + '<DIR>']);
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
        print(`${c.name.slice(0, 28).padEnd(30)}${sizeOf(c).padStart(10)}`);
      }
      print([`      ${files} arquivo(s)`, `      ${dirs} pasta(s)   1,44 MB livres (virtual)`, '']);
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
        print('Argumento invalido. Use COLOR xy (dois digitos hexadecimais diferentes).');
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
      const match = /^([^\s\\/]+)\s*(.*)$/.exec(trimmed);
      const cmd = (match?.[1] ?? '').toLowerCase();
      const arg = match?.[2] ?? '';

      switch (cmd) {
        case 'help':
        case '?':
          print(HELP);
          break;
        case 'cls':
          output.innerHTML = '';
          break;
        case 'ver':
          print(['', 'Windows 95 [Versao 4.00.950] - PedroOS', '']);
          break;
        case 'vol':
          print([' O volume na unidade C e PEDROOS', ' O numero de serie do volume e 1995-0824']);
          break;
        case 'echo':
          print(arg || 'ECHO esta ativado');
          break;
        case 'date':
          print(`Data atual: ${new Date().toLocaleDateString('pt-BR')}`);
          break;
        case 'time':
          print(`Hora atual: ${new Date().toLocaleTimeString('pt-BR')}`);
          break;
        case 'mem':
          print(['', '   655360 bytes de memoria convencional total', '   655360 bytes disponiveis para MS-DOS', '']);
          break;
        case 'title':
          ctx.setTitle(arg || 'MS-DOS Prompt', 'msdos');
          break;
        case 'color':
          applyColor(arg.trim());
          break;
        case 'dir':
          dir(arg);
          break;
        case 'tree':
          print(['', cwd]);
          tree(cwd, '');
          print('');
          break;
        case 'cd':
        case 'chdir': {
          if (!arg) {
            print(cwd);
            break;
          }
          const path = resolve(arg);
          const node = path ? this.vfs.resolvePath(path) : undefined;
          if (!node || !node.children) {
            print('Diretorio invalido');
            break;
          }
          cwd = node.path;
          break;
        }
        case 'type': {
          if (!arg) {
            print('Parametro requerido ausente');
            break;
          }
          const path = resolve(arg.replace(/^"|"$/g, ''));
          const node = path ? this.vfs.resolvePath(path) : undefined;
          if (!node) {
            print('Arquivo nao encontrado - ' + arg);
          } else if (typeof node.content !== 'string') {
            print('Nao e possivel exibir este arquivo.');
          } else {
            print(node.content.split(/\r?\n/));
          }
          break;
        }
        case 'start': {
          const key = arg.trim().toLowerCase().replace(/\.exe$/, '');
          const target = START_ALIASES[key];
          if (!target) {
            print(`Programa nao encontrado: ${arg || '(vazio)'}`);
            break;
          }
          ctx.windowManager.open(target.appId, target.args ? { args: target.args } : undefined);
          break;
        }
        case 'exit':
          ctx.windowManager.close(ctx.windowId);
          return true;
        case 'c:':
          cwd = 'C:\\';
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

    print(BANNER);
    updatePrompt();

    const onSubmit = (e: Event): void => {
      e.preventDefault();
      const value = input.value;
      print(`${cwd}>${value}`);
      input.value = '';
      if (value.trim()) {
        history.push(value);
      }
      historyIndex = history.length;
      const closed = run(value);
      if (!closed) {
        updatePrompt();
        screen.scrollTop = screen.scrollHeight;
      }
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
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
          input.value = '';
        }
      } else if (e.key === 'Escape') {
        input.value = '';
      }
    };

    const onScreenClick = (): void => {
      if (!window.getSelection()?.toString()) {
        input.focus();
      }
    };

    form.addEventListener('submit', onSubmit);
    input.addEventListener('keydown', onKey);
    screen.addEventListener('click', onScreenClick);
    queueMicrotask(() => input.focus());

    return () => {
      form.removeEventListener('submit', onSubmit);
      input.removeEventListener('keydown', onKey);
      screen.removeEventListener('click', onScreenClick);
      ctx.container.innerHTML = '';
    };
  }
}
