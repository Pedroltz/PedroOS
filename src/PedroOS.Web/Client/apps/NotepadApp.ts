import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';

export class NotepadApp implements ClientAppModule {
  public constructor(private readonly vfs: VirtualFileSystemClient) {}

  public mount(ctx: AppMountContext): () => void {
    const filePath = ctx.args.path || 'C:\\AboutMe\\Readme.txt';
    const node = this.vfs.resolvePath(filePath);
    const fileName = node ? node.name : 'Untitled.txt';
    const initialText = node?.content ?? (ctx.args.content || 'PedroOS 95 Notepad\r\n');

    ctx.setTitle(`${fileName} - Notepad`, 'notepad');

    ctx.container.innerHTML = `
      <div class="app-shell notepad-app">
        <div class="win95-menubar" role="menubar">
          <span class="win95-menu-item"><u>F</u>ile</span>
          <span class="win95-menu-item"><u>E</u>dit</span>
          <span class="win95-menu-item"><u>S</u>earch</span>
          <span class="win95-menu-item"><u>H</u>elp</span>
        </div>
        <div class="notepad-body">
          <textarea class="notepad-textarea" aria-label="Editor de texto">${this.escapeHtml(initialText)}</textarea>
        </div>
        <div class="status-bar">
          <p class="status-bar-field">${this.escapeHtml(filePath)}</p>
          <p class="status-bar-field" data-notepad-len>${initialText.length} chars</p>
        </div>
      </div>
    `;

    const textarea = ctx.container.querySelector<HTMLTextAreaElement>('.notepad-textarea')!;
    const statusLen = ctx.container.querySelector<HTMLElement>('[data-notepad-len]')!;

    const onInput = (): void => {
      statusLen.textContent = `${textarea.value.length} chars`;
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
