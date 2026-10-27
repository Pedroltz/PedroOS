import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';

export class NotepadApp implements ClientAppModule {
  public constructor(private readonly vfs: VirtualFileSystemClient) {}

  public mount(ctx: AppMountContext): () => void {
    const filePath = ctx.args.path || 'C:\\SobreMim\\Leia-me.txt';
    const node = this.vfs.resolvePath(filePath);
    const fileName = node ? node.name : 'Sem título.txt';
    const initialText = node?.content ?? (ctx.args.content || 'PedroOS 95 Bloco de Notas\r\n');

    ctx.setTitle(`${fileName} - Bloco de Notas`, 'notepad');

    ctx.container.innerHTML = `
      <div class="app-shell notepad-app">
        <div class="win95-menubar" role="menubar">
          <span class="win95-menu-item"><u>A</u>rquivo</span>
          <span class="win95-menu-item"><u>E</u>ditar</span>
          <span class="win95-menu-item"><u>P</u>esquisar</span>
          <span class="win95-menu-item">A<u>j</u>uda</span>
        </div>
        <div class="notepad-body">
          <textarea class="notepad-textarea" aria-label="Editor de texto">${this.escapeHtml(initialText)}</textarea>
        </div>
        <div class="status-bar">
          <p class="status-bar-field">${this.escapeHtml(filePath)}</p>
          <p class="status-bar-field" data-notepad-len>${initialText.length} caracteres</p>
        </div>
      </div>
    `;

    const textarea = ctx.container.querySelector<HTMLTextAreaElement>('.notepad-textarea')!;
    const statusLen = ctx.container.querySelector<HTMLElement>('[data-notepad-len]')!;

    const onInput = (): void => {
      statusLen.textContent = `${textarea.value.length} caracteres`;
    };
    textarea.addEventListener('input', onInput);

    return () => {
      textarea.removeEventListener('input', onInput);
      ctx.container.innerHTML = '';
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
