import type { AppMountContext, ClientAppModule } from '../types/index.js';
import { DesktopStore } from '../core/DesktopStore.js';
import { withBase } from '../core/BasePath.js';
import { requestSystemFailure } from '../components/SystemFailure.js';

export function isValidDoomIwad(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || bytes.length > 64 * 1024 * 1024 || new TextDecoder().decode(bytes.subarray(0, 4)) !== 'IWAD') return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(4, true), offset = view.getUint32(8, true);
  if (!count || count > 100_000 || offset < 12 || offset + count * 16 > bytes.length) return false;
  for (let index = 0; index < count; index++) {
    const lump = offset + index * 16;
    if (view.getUint32(lump, true) + view.getUint32(lump + 4, true) > bytes.length) return false;
  }
  return true;
}

export class DoomApp implements ClientAppModule {
  public constructor(private readonly store: DesktopStore) {}

  public mount(ctx: AppMountContext): () => void {
    const abort = new AbortController();
    ctx.container.innerHTML = `
      <div class="app-shell doom-app" data-doom-app>
        <div class="doom-stage sunken-panel">
          <div class="doom-launcher" data-doom-launcher>
            <h2>DOOM</h2><p>Chocolate Doom + Freedoom: Phase 1</p>
            <p>
              <button type="button" data-doom-start>Jogar Freedoom</button>
              <button type="button" data-doom-upload>Carregar WAD...</button>
              <button type="button" data-doom-default hidden>Usar Freedoom</button>
              <input type="file" data-doom-file accept=".wad,.iwad" hidden aria-label="Arquivo IWAD do Doom" />
            </p>
            <p>Abra o jogo para explorar os mapas de Freedoom ou carregue um arquivo IWAD do seu Doom original.</p>
            <p>Primeiro carregamento do Freedoom: cerca de 35 MB, somente ao jogar.</p>
            <p>O jogo é executado no navegador. O arquivo escolhido não é enviado ao servidor.</p>
            <p class="doom-controls">Setas: mover e girar · Ctrl: atirar · Espaço: usar<br />Shift: correr · Enter: confirmar · Esc: menu</p>
            <p><a href="${withBase('/assets/games/doom/CREDITOS.txt')}" target="_blank" rel="noopener noreferrer">Créditos e licenças</a> · <a href="${withBase('/assets/games/doom/chocolate-doom-source.tar.gz')}" download>Código-fonte do motor</a></p>
          </div>
          <iframe title="DOOM — jogo" data-doom-frame hidden allow="autoplay"></iframe>
        </div>
        <div class="status-bar"><p class="status-bar-field" data-doom-status role="status">Pronto · Freedoom: Phase 1</p><p class="status-bar-field">Saves desta sessão · Efeitos sonoros</p></div>
      </div>`;
    const root = ctx.container.querySelector<HTMLElement>('[data-doom-app]')!;
    const frame = root.querySelector<HTMLIFrameElement>('[data-doom-frame]')!;
    const launcher = root.querySelector<HTMLElement>('[data-doom-launcher]')!;
    const start = root.querySelector<HTMLButtonElement>('[data-doom-start]')!;
    const file = root.querySelector<HTMLInputElement>('[data-doom-file]')!;
    const upload = root.querySelector<HTMLButtonElement>('[data-doom-upload]')!;
    const defaults = root.querySelector<HTMLButtonElement>('[data-doom-default]')!;
    const status = root.querySelector<HTMLElement>('[data-doom-status]')!;
    let selection: { name: string; bytes: Uint8Array } | null = null;
    let running = false, loading = false, disposed = false;
    let generation = 0;
    let lastPaused: boolean | undefined;
    const post = (data: object): void => frame.contentWindow?.postMessage({ source: 'pedroos-doom-host', ...data }, location.origin);
    const selectionLabel = (): string => selection?.name ?? 'Freedoom: Phase 1';
    const syncPause = (): void => {
      const record = this.store.getWindow(ctx.windowId);
      const blue = document.getElementById('bsod-overlay');
      const auto = document.hidden || record?.state === 'minimized' || this.store.getActiveWindowId() !== ctx.windowId || this.store.isStartMenuOpen() || !!blue && !blue.hidden;
      const value = auto;
      if (lastPaused !== value) { lastPaused = value; post({ type: 'pause', value }); }
      if (running) status.textContent = `${value ? 'Pausado' : 'Em execução'} · ${selectionLabel()}`;
    };
    const reset = (): void => {
      frame.src = 'about:blank'; frame.hidden = true; launcher.hidden = false;
      running = false; loading = false; lastPaused = undefined;
      start.disabled = false; upload.disabled = false;
    };
    const play = (): void => {
      if (loading || running) return;
      loading = true; status.textContent = `Carregando · ${selectionLabel()}`;
      start.disabled = true; upload.disabled = true;
      launcher.hidden = true; frame.hidden = false;
      lastPaused = undefined;
      const url = new URL(withBase('/assets/games/doom/player.html'), location.href);
      url.searchParams.set('session', String(++generation));
      frame.src = url.href;
    };
    window.addEventListener('message', event => {
      if (disposed || event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.source !== 'pedroos-doom' || event.data.session !== String(generation)) return;
      switch (event.data.type) {
        case 'loaded':
          post({ type: 'start', name: selection?.name, wad: selection ? selection.bytes.buffer : undefined });
          syncPause(); break;
        case 'ready':
          status.textContent = 'Clique ou toque na tela do jogo para iniciar e ativar o som'; break;
        case 'running':
          loading = false; running = true;
          syncPause(); break;
        case 'error':
          reset(); status.textContent = 'Não foi possível iniciar o jogo. Tente novamente ou selecione outro IWAD.'; break;
        case 'focus': ctx.windowManager.focus(ctx.windowId); break;
        case 'close': ctx.windowManager.close(ctx.windowId); break;
        case 'bsod': requestSystemFailure(); break;
      }
    }, { signal: abort.signal });
    start.addEventListener('click', play);
    upload.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const chosen = file.files?.[0]; file.value = '';
      if (!chosen) return;
      if (chosen.size > 64 * 1024 * 1024) { status.textContent = 'Escolha um IWAD de até 64 MB.'; return; }
      try {
        const bytes = new Uint8Array(await chosen.arrayBuffer());
        if (disposed) return;
        if (!isValidDoomIwad(bytes)) { status.textContent = 'Arquivo inválido. Escolha um IWAD completo de Doom; complementos PWAD não são suportados.'; return; }
        reset(); selection = { name: chosen.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase(), bytes };
        start.textContent = 'Jogar WAD selecionado'; defaults.hidden = false;
        status.textContent = `Pronto · ${selectionLabel()}`;
      } catch { if (!disposed) status.textContent = 'Não foi possível ler o arquivo selecionado.'; }
    });
    defaults.addEventListener('click', () => { reset(); selection = null; defaults.hidden = true; start.textContent = 'Jogar Freedoom'; status.textContent = 'Pronto · Freedoom: Phase 1'; });
    document.addEventListener('visibilitychange', syncPause, { signal: abort.signal });
    const unsubscribe = this.store.subscribe(syncPause);
    const observer = new MutationObserver(syncPause);
    const blue = document.getElementById('bsod-overlay');
    if (blue) observer.observe(blue, { attributes: true, attributeFilter: ['hidden'] });
    if (ctx.args.autoStart === 'true') play();
    return () => {
      disposed = true; abort.abort(); unsubscribe(); observer.disconnect();
      frame.src = 'about:blank'; frame.remove(); selection = null; ctx.container.replaceChildren();
    };
  }
}
