import type { AppMountContext, ClientAppModule } from '../types/index.js';
import type { DesktopStore } from '../core/DesktopStore.js';
import { withBase } from '../core/BasePath.js';

export class RetroGameApp implements ClientAppModule {
  public constructor(private readonly store: DesktopStore, private readonly game: 'skifree' | 'opentyrian' | 'omf2097', private readonly title: string) {}

  public mount(ctx: AppMountContext): () => void {
    const abort = new AbortController(), session = crypto.randomUUID();
    ctx.container.innerHTML = '<div class="app-shell retro-game-app"><iframe data-retro-frame allow="autoplay"></iframe><div class="status-bar"><p class="status-bar-field" data-retro-status role="status">Preparando o jogo…</p></div></div>';
    const frame = ctx.container.querySelector<HTMLIFrameElement>('[data-retro-frame]')!;
    frame.title = this.title;
    const status = ctx.container.querySelector<HTMLElement>('[data-retro-status]')!;
    let ready = false;
    let lastPaused: boolean | undefined;
    const sync = (): void => {
      const paused = document.hidden || this.store.getActiveWindowId() !== ctx.windowId
        || this.store.getWindow(ctx.windowId)?.state === 'minimized' || this.store.isStartMenuOpen()
        || !document.getElementById('bsod-overlay')?.hidden;
      if (lastPaused !== paused) {
        lastPaused = paused;
        frame.contentWindow?.postMessage({ source: 'pedroos-retro-host', type: 'pause', value: paused }, location.origin);
      }
      if (ready) status.textContent = paused ? 'Pausado' : 'Em execução';
    };
    window.addEventListener('message', event => {
      if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.source !== 'pedroos-retro' || event.data.session !== session) return;
      switch (event.data.type) {
        case 'loaded': status.textContent = 'Clique em Jogar para iniciar'; lastPaused = undefined; sync(); break;
        case 'ready': ready = true; sync(); break;
        case 'error': ready = false; status.textContent = 'Não foi possível iniciar. Feche a janela e tente novamente.'; break;
        case 'focus': ctx.windowManager.focus(ctx.windowId); break;
        case 'close': ctx.windowManager.close(ctx.windowId); break;
      }
    }, { signal: abort.signal });
    frame.addEventListener('error', () => { ready = false; status.textContent = 'Não foi possível carregar o jogo.'; }, { signal: abort.signal });
    document.addEventListener('visibilitychange', sync, { signal: abort.signal });
    const unsubscribe = this.store.subscribe(sync);
    const observer = new MutationObserver(sync);
    const bsod = document.getElementById('bsod-overlay');
    if (bsod) observer.observe(bsod, { attributes: true, attributeFilter: ['hidden'] });
    frame.src = `${withBase(`/assets/games/${this.game}/player.html`)}?session=${session}`;
    return () => {
      abort.abort(); unsubscribe(); observer.disconnect();
      frame.src = 'about:blank'; frame.remove(); ctx.container.replaceChildren();
    };
  }
}
