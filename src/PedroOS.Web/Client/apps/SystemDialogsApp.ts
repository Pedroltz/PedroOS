import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';
import { DesktopStore } from '../core/DesktopStore.js';

export class FindDialogApp implements ClientAppModule {
  public constructor(
    private readonly vfs: VirtualFileSystemClient,
    private readonly icons: IconRegistryClient,
  ) {}

  public mount(ctx: AppMountContext): () => void {
    ctx.container.innerHTML = `
      <div class="app-shell find-dialog">
        <div class="find-form-row">
          <label for="find-named-${ctx.windowId}">Named:</label>
          <input type="text" id="find-named-${ctx.windowId}" class="find-input" data-find-input placeholder="*.txt, ofizzy, c#, etc." />
          <button type="button" class="win95-btn-primary" data-find-submit>Find Now</button>
        </div>
        <div class="find-results sunken-panel" data-find-results aria-label="Resultados da busca">
          <p class="muted-note">Type a keyword and click 'Find Now'.</p>
        </div>
        <div class="status-bar">
          <p class="status-bar-field" data-find-status>0 file(s) found</p>
        </div>
      </div>
    `;

    const input = ctx.container.querySelector<HTMLInputElement>('[data-find-input]')!;
    const btn = ctx.container.querySelector<HTMLButtonElement>('[data-find-submit]')!;
    const results = ctx.container.querySelector<HTMLElement>('[data-find-results]')!;
    const status = ctx.container.querySelector<HTMLElement>('[data-find-status]')!;

    const doSearch = (): void => {
      const q = input.value.trim();
      const hits = this.vfs.search(q, true);
      status.textContent = `${hits.length} file(s) found`;

      if (hits.length === 0) {
        results.innerHTML = `<p class="muted-note">No matching files or projects found.</p>`;
        return;
      }

      results.innerHTML = `
        <table class="find-table">
          <thead>
            <tr><th>Name</th><th>In Folder</th><th>Size</th></tr>
          </thead>
          <tbody>
            ${hits
              .map(
                (h) => `
              <tr data-node-path="${h.path}">
                <td>
                  ${this.icons.render(h.icon, 16)}
                  <button type="button" class="find-item-btn" data-open-path="${h.path}">${h.name}</button>
                </td>
                <td>${h.path.substring(0, h.path.lastIndexOf('\\') || 3)}</td>
                <td>${h.size ?? '—'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `;
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    results.addEventListener('click', (e) => {
      const itemBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-open-path]');
      if (!itemBtn?.dataset.openPath) return;
      const node = this.vfs.resolvePath(itemBtn.dataset.openPath);
      if (node?.action?.kind === 'open-app' && node.action.appId) {
        ctx.windowManager.open(node.action.appId, { args: node.action.args ?? {} });
      } else if (node?.type === 'folder' || node?.type === 'drive') {
        ctx.windowManager.open('explorer', { args: { path: node.path } });
      } else if (node?.action?.kind === 'open-url' && node.action.url) {
        window.open(node.action.url, '_blank', 'noopener,noreferrer');
      }
    });

    return () => {
      ctx.container.innerHTML = '';
    };
  }
}

export class RunDialogApp implements ClientAppModule {
  public constructor(private readonly icons: IconRegistryClient) {}

  public mount(ctx: AppMountContext): () => void {
    ctx.container.innerHTML = `
      <div class="app-shell run-dialog">
        <div class="run-row">
          ${this.icons.render('run', 32)}
          <p>Type the name of a program, folder, document, or Internet resource, and PedroOS will open it for you.</p>
        </div>
        <form class="run-form" data-run-form>
          <label for="run-cmd-${ctx.windowId}"><u>O</u>pen:</label>
          <input type="text" id="run-cmd-${ctx.windowId}" class="run-input" data-run-input autofocus placeholder="explorer, cmd, ofizzy, bsod, minesweeper..." />
          <div class="run-buttons">
            <button type="submit" class="win95-btn-primary">OK</button>
            <button type="button" data-run-cancel>Cancel</button>
          </div>
        </form>
      </div>
    `;

    const form = ctx.container.querySelector<HTMLFormElement>('[data-run-form]')!;
    const input = ctx.container.querySelector<HTMLInputElement>('[data-run-input]')!;
    const cancel = ctx.container.querySelector<HTMLButtonElement>('[data-run-cancel]')!;

    cancel.addEventListener('click', () => {
      ctx.windowManager.close(ctx.windowId);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = input.value.trim().toLowerCase();
      ctx.windowManager.close(ctx.windowId);

      if (cmd === 'bsod') {
        document.getElementById('bsod-overlay')?.removeAttribute('hidden');
        return;
      }
      if (cmd === 'ofizzy') {
        ctx.windowManager.open('project', { args: { slug: 'ofizzy' } });
        return;
      }
      if (cmd === 'rdp' || cmd === 'rdp-session-manager') {
        ctx.windowManager.open('project', { args: { slug: 'rdp-session-manager' } });
        return;
      }
      if (cmd === 'zellapedia') {
        ctx.windowManager.open('project', { args: { slug: 'zellapedia' } });
        return;
      }
      if (cmd === 'winmine' || cmd === 'minesweeper') {
        ctx.windowManager.open('minesweeper');
        return;
      }
      if (cmd === 'iexplore' || cmd === 'ie') {
        ctx.windowManager.open('iexplore');
        return;
      }
      if (cmd === 'cmd' || cmd === 'command' || cmd === 'msdos') {
        ctx.windowManager.open('terminal');
        return;
      }
      if (cmd === 'notepad') {
        ctx.windowManager.open('notepad');
        return;
      }
      if (cmd === 'explorer' || cmd === 'c:') {
        ctx.windowManager.open('explorer', { args: { path: 'C:\\' } });
        return;
      }
      if (cmd === 'projects') {
        ctx.windowManager.open('projects');
        return;
      }
      if (cmd === 'resume' || cmd === 'cv' || cmd === 'wordpad') {
        ctx.windowManager.open('resume');
        return;
      }
      if (cmd === 'skills' || cmd === 'sysprops') {
        ctx.windowManager.open('sysprops');
        return;
      }
      if (cmd.startsWith('http://') || cmd.startsWith('https://')) {
        window.open(cmd, '_blank', 'noopener,noreferrer');
        return;
      }

      ctx.windowManager.open('explorer', { args: { path: 'C:\\' } });
    });

    return () => {
      ctx.container.innerHTML = '';
    };
  }
}

export class DisplayPropertiesApp implements ClientAppModule {
  public constructor(
    private readonly store: DesktopStore,
    private readonly icons: IconRegistryClient,
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const current = this.store.getWallpaper();

    ctx.container.innerHTML = `
      <div class="app-shell display-properties-app">
        <menu role="tablist" class="display-tabs">
          <li role="tab" aria-selected="true">Background</li>
        </menu>
        <div class="display-panel window">
          <div class="display-monitor-preview">
            ${this.icons.render('display', 48)}
            <div class="monitor-screen" data-monitor-screen></div>
          </div>
          <fieldset class="win95-fieldset">
            <legend>Wallpaper Pattern</legend>
            <div class="display-patterns-list">
              <label><input type="radio" name="wall" value="solid" ${current === 'solid' ? 'checked' : ''} /> (None / Classic Teal)</label>
              <label><input type="radio" name="wall" value="bricks" ${current === 'bricks' ? 'checked' : ''} /> Bricks</label>
              <label><input type="radio" name="wall" value="weave" ${current === 'weave' ? 'checked' : ''} /> Weave</label>
              <label><input type="radio" name="wall" value="scottie" ${current === 'scottie' ? 'checked' : ''} /> Scottie</label>
              <label><input type="radio" name="wall" value="dots" ${current === 'dots' ? 'checked' : ''} /> Dots</label>
            </div>
          </fieldset>
          <div class="display-actions">
            <button type="button" class="win95-btn-primary" data-display-ok>OK</button>
            <button type="button" data-display-cancel>Cancel</button>
            <button type="button" data-display-apply>Apply</button>
          </div>
        </div>
      </div>
    `;

    const screenPreview = ctx.container.querySelector<HTMLElement>('[data-monitor-screen]')!;
    const radios = ctx.container.querySelectorAll<HTMLInputElement>('input[name="wall"]');
    const okBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-ok]')!;
    const cancelBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-cancel]')!;
    const applyBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-apply]')!;

    const getSelected = (): string => {
      for (const r of radios) {
        if (r.checked) return r.value;
      }
      return 'solid';
    };

    const updatePreview = (): void => {
      const val = getSelected();
      if (val === 'solid') {
        screenPreview.style.background = '#008080';
      } else {
        screenPreview.style.background = `#008080 url('/assets/wallpapers/${val}.png') repeat`;
      }
    };

    radios.forEach((r) => r.addEventListener('change', updatePreview));
    updatePreview();

    applyBtn.addEventListener('click', () => {
      this.store.setWallpaper(getSelected());
    });

    okBtn.addEventListener('click', () => {
      this.store.setWallpaper(getSelected());
      ctx.windowManager.close(ctx.windowId);
    });

    cancelBtn.addEventListener('click', () => {
      ctx.windowManager.close(ctx.windowId);
    });

    return () => {
      ctx.container.innerHTML = '';
    };
  }
}

export class ShutDownDialogApp implements ClientAppModule {
  public constructor(private readonly icons: IconRegistryClient) {}

  public mount(ctx: AppMountContext): () => void {
    ctx.container.innerHTML = `
      <div class="app-shell shutdown-dialog">
        <div class="shutdown-row">
          ${this.icons.render('shutdown', 32)}
          <p>What do you want the computer to do?</p>
        </div>
        <form class="shutdown-form" data-shutdown-form>
          <label><input type="radio" name="sd-action" value="safe-off" checked /> Shut down</label>
          <label><input type="radio" name="sd-action" value="restart" /> Restart the computer</label>
          <label><input type="radio" name="sd-action" value="bsod" /> Voluntary BSOD test (Easter Egg)</label>
          <div class="shutdown-buttons">
            <button type="submit" class="win95-btn-primary">OK</button>
            <button type="button" data-sd-cancel>Cancel</button>
          </div>
        </form>
      </div>
    `;

    const form = ctx.container.querySelector<HTMLFormElement>('[data-shutdown-form]')!;
    const cancel = ctx.container.querySelector<HTMLButtonElement>('[data-sd-cancel]')!;

    cancel.addEventListener('click', () => {
      ctx.windowManager.close(ctx.windowId);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ctx.windowManager.close(ctx.windowId);
      const val = (form.elements.namedItem('sd-action') as RadioNodeList).value;

      if (val === 'restart') {
        window.location.href = '/';
      } else if (val === 'bsod') {
        document.getElementById('bsod-overlay')?.removeAttribute('hidden');
      } else if (val === 'safe-off') {
        this.renderSafeToPowerOff();
      }
    });

    return () => {
      ctx.container.innerHTML = '';
    };
  }

  private renderSafeToPowerOff(): void {
    const splash = document.createElement('div');
    splash.className = 'safe-power-off-screen';
    splash.innerHTML = `
      <div class="safe-power-off-text">
        <p>It's now safe to turn off your computer.</p>
        <button type="button" class="safe-power-off-wake" data-wake>Wake up PedroOS</button>
      </div>
    `;
    document.body.appendChild(splash);
    splash.querySelector('[data-wake]')?.addEventListener('click', () => {
      splash.remove();
    });
  }
}
