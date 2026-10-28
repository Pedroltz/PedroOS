import { requestSystemFailure } from '../components/SystemFailure.js';
import { secrets } from '../core/SecretSession.js';
import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { withBase } from '../core/BasePath.js';
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
          <label for="find-named-${ctx.windowId}">Nome:</label>
          <input type="text" id="find-named-${ctx.windowId}" class="find-input" data-find-input placeholder="*.txt, ofizzy, c#, etc." />
          <button type="button" class="win95-btn-primary" data-find-submit>Localizar agora</button>
        </div>
        <div class="find-results sunken-panel" data-find-results aria-label="Resultados da busca">
          <p class="muted-note">Digite uma palavra-chave e clique em 'Localizar agora'.</p>
        </div>
        <div class="status-bar">
          <p class="status-bar-field" data-find-status>0 arquivo(s) encontrado(s)</p>
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
      status.textContent = `${hits.length} arquivo(s) encontrado(s)`;

      if (hits.length === 0) {
        results.innerHTML = `<p class="muted-note">Nenhum arquivo ou projeto encontrado.</p>`;
        return;
      }

      results.innerHTML = `
        <table class="find-table">
          <thead>
            <tr><th>Nome</th><th>Na pasta</th><th>Tamanho</th></tr>
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
          <p>Digite o nome de um programa, pasta, documento ou endereço da Internet para abri-lo no PedroOS.</p>
        </div>
        <form class="run-form" data-run-form>
          <label for="run-cmd-${ctx.windowId}"><u>A</u>brir:</label>
          <input type="text" id="run-cmd-${ctx.windowId}" class="run-input" data-run-input autofocus placeholder="explorador, terminal, navegador, campominado..." />
          <div class="run-buttons">
            <button type="submit" class="win95-btn-primary">OK</button>
            <button type="button" data-run-cancel>Cancelar</button>
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
      const aliases: Record<string, string> = { explorador: 'explorer', terminal: 'cmd', navegador: 'iexplore', bloco: 'notepad', campominado: 'minesweeper', projetos: 'projects', curriculo: 'resume', currículo: 'resume', habilidades: 'skills' };
      const raw = input.value.trim();
      const cmd = aliases[raw.toLowerCase()] || raw.toLowerCase();
      ctx.windowManager.close(ctx.windowId);

      if (cmd === 'bsod') {
        requestSystemFailure();
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
      if (cmd === 'doom' || cmd === 'doom.exe' || cmd === 'freedoom') {
        ctx.windowManager.open('doom');
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
        window.open(raw, '_blank', 'noopener,noreferrer');
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
            <li role="presentation"><button type="button" role="tab" aria-selected="true" aria-controls="display-wallpaper" id="tab-wallpaper" data-display-tab="wallpaper">Plano de fundo</button></li>
            <li role="presentation"><button type="button" role="tab" aria-selected="false" aria-controls="display-saver" id="tab-saver" data-display-tab="saver">Proteção de tela</button></li>
        </menu>
        <div class="display-panel window">
          <div id="display-wallpaper" role="tabpanel" aria-labelledby="tab-wallpaper" data-display-wallpaper>
          <div class="display-monitor-preview">
            ${this.icons.render('display', 48)}
            <div class="monitor-screen" data-monitor-screen></div>
          </div>
          <fieldset class="win95-fieldset">
            <legend>Padrão do papel de parede</legend>
            <div class="display-patterns-list">
              <label><input type="radio" name="wall" value="solid" ${current === 'solid' ? 'checked' : ''} /> (Nenhum / Verde-petróleo clássico)</label>
              <label><input type="radio" name="wall" value="bricks" ${current === 'bricks' ? 'checked' : ''} /> Tijolos</label>
              <label><input type="radio" name="wall" value="weave" ${current === 'weave' ? 'checked' : ''} /> Trama</label>
              <label><input type="radio" name="wall" value="scottie" ${current === 'scottie' ? 'checked' : ''} /> Cachorrinhos</label>
              <label><input type="radio" name="wall" value="dots" ${current === 'dots' ? 'checked' : ''} /> Pontos</label>
            </div>
          </fieldset>
          </div>
          <div id="display-saver" role="tabpanel" aria-labelledby="tab-saver" data-display-saver hidden>
            <div class="saver-preview" aria-hidden="true"><strong>PedroOS 95</strong></div>
            <fieldset class="win95-fieldset">
              <legend>Proteção de tela</legend>
              <div class="field-row"><input type="checkbox" id="saver-enabled-${ctx.windowId}" data-saver-enabled ${secrets.saver.enabled ? 'checked' : ''} /><label for="saver-enabled-${ctx.windowId}">Ativar proteção de tela</label></div>
              <p><label>Esperar <select data-saver-minutes aria-label="Tempo de espera">${[1, 2, 5].map(minutes => `<option value="${minutes}" ${minutes === secrets.saver.minutes ? 'selected' : ''}>${minutes} minuto${minutes === 1 ? '' : 's'}</option>`).join('')}</select></label></p>
              <button type="button" data-saver-preview>Visualizar</button>
              <p>Mova o mouse, toque ou pressione uma tecla para voltar.</p>
            </fieldset>
          </div>
          <div class="display-actions">
            <button type="button" class="win95-btn-primary" data-display-ok>OK</button>
            <button type="button" data-display-cancel>Cancelar</button>
            <button type="button" data-display-apply>Aplicar</button>
          </div>
        </div>
      </div>
    `;

    const screenPreview = ctx.container.querySelector<HTMLElement>('[data-monitor-screen]')!;
    const radios = ctx.container.querySelectorAll<HTMLInputElement>('input[name="wall"]');
    const okBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-ok]')!;
    const cancelBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-cancel]')!;
    const applyBtn = ctx.container.querySelector<HTMLButtonElement>('[data-display-apply]')!;
    for (const tab of ctx.container.querySelectorAll<HTMLButtonElement>('[data-display-tab]')) {
      tab.addEventListener('click', () => {
        const saver = tab.dataset.displayTab === 'saver';
        ctx.container.querySelector<HTMLElement>('[data-display-wallpaper]')!.hidden = saver;
        ctx.container.querySelector<HTMLElement>('[data-display-saver]')!.hidden = !saver;
        for (const item of ctx.container.querySelectorAll('[data-display-tab]')) item.setAttribute('aria-selected', String(item === tab));
      });
    }
    ctx.container.querySelector('[data-saver-preview]')!.addEventListener('click', () => secrets.preview());
    const ensureTheme = (): void => {
      if (!secrets.arcade || ctx.container.querySelector('[data-arcade-wallpaper]')) return;
      const label = document.createElement('label');
      label.dataset.arcadeWallpaper = '';
      label.innerHTML = `<input type="radio" name="wall" value="arcade" ${current === 'arcade' ? 'checked' : ''} /> Arcade — edição secreta`;
      ctx.container.querySelector('.display-patterns-list')!.appendChild(label);
      label.addEventListener('change', updatePreview);
    };

    const getSelected = (): string => {
      for (const r of ctx.container.querySelectorAll<HTMLInputElement>('input[name="wall"]')) {
        if (r.checked) return r.value;
      }
      return 'solid';
    };

    const updatePreview = (): void => {
      const val = getSelected();
      if (val === 'solid') {
        screenPreview.style.background = '#008080';
      } else {
        screenPreview.style.background = `#008080 url('${withBase('/assets/wallpapers/' + val + '.png')}') repeat`;
      }
    };

    radios.forEach((r) => r.addEventListener('change', updatePreview));
    ensureTheme();
    const unsubscribe = secrets.subscribe(ensureTheme);
    updatePreview();

    const apply = (): void => {
      this.store.setWallpaper(getSelected());
      secrets.configureSaver(ctx.container.querySelector<HTMLInputElement>('[data-saver-enabled]')!.checked,
        Number(ctx.container.querySelector<HTMLSelectElement>('[data-saver-minutes]')!.value));
    };

    applyBtn.addEventListener('click', () => {
      apply();
    });

    okBtn.addEventListener('click', () => {
      apply();
      ctx.windowManager.close(ctx.windowId);
    });

    cancelBtn.addEventListener('click', () => {
      ctx.windowManager.close(ctx.windowId);
    });

    return () => {
      unsubscribe();
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
          <p>O que você deseja fazer no PedroOS?</p>
        </div>
        <form class="shutdown-form" data-shutdown-form>
          <label><input type="radio" name="sd-action" value="safe-off" checked /> Desligar</label>
          <label><input type="radio" name="sd-action" value="restart" /> Reiniciar o PedroOS</label>
          <label><input type="radio" name="sd-action" value="bsod" /> Testar a tela azul (segredo do sistema)</label>
          <div class="shutdown-buttons">
            <button type="submit" class="win95-btn-primary">OK</button>
            <button type="button" data-sd-cancel>Cancelar</button>
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
        try { sessionStorage.removeItem('pedroos.boot.seen.v1'); } catch { /* Storage is optional. */ }
        window.location.href = withBase('/');
      } else if (val === 'bsod') {
        requestSystemFailure();
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
        <p>Agora você pode desligar o computador com segurança.</p>
        <button type="button" class="safe-power-off-wake" data-wake>Voltar ao PedroOS</button>
      </div>
    `;
    document.body.appendChild(splash);
    splash.querySelector('[data-wake]')?.addEventListener('click', () => {
      splash.remove();
    });
  }
}
