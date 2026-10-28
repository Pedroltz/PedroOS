import type { AppMountContext, ClientAppModule } from '../types/index.js';
import type { DesktopStore } from '../core/DesktopStore.js';
import { withBase } from '../core/BasePath.js';

/** Each window owns its game document, animation loop and WebAudio context. */
export class NeonFistApp implements ClientAppModule {
  public constructor(private readonly store: DesktopStore) {}

  public mount(ctx: AppMountContext): () => void {
    const abort = new AbortController();
    const session = crypto.randomUUID();
    ctx.container.innerHTML = '<div class="app-shell neon-fist-app"><iframe data-neon-frame title="Neon Fist — luta contra CPU" allow="autoplay"></iframe><div class="status-bar"><p class="status-bar-field" data-neon-status role="status">Lendo o disquete…</p></div></div>';
    const frame = ctx.container.querySelector<HTMLIFrameElement>('[data-neon-frame]')!;
    const status = ctx.container.querySelector<HTMLElement>('[data-neon-status]')!;
    let running = false;
    let lastPaused: boolean | undefined;
    const syncPause = (): void => {
      const paused = document.hidden || this.store.getActiveWindowId() !== ctx.windowId
        || this.store.getWindow(ctx.windowId)?.state === 'minimized' || this.store.isStartMenuOpen()
        || !document.getElementById('bsod-overlay')?.hidden;
      if (lastPaused !== paused) {
        lastPaused = paused;
        frame.contentWindow?.postMessage({ source: 'pedroos-neon-host', type: 'pause', value: paused }, location.origin);
      }
      if (running) status.textContent = paused ? 'Pausado' : 'Em execução · contra CPU';
    };
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow
        || event.data?.source !== 'pedroos-neon-fist' || event.data.session !== session) return;
      switch (event.data.type) {
        case 'loaded': lastPaused = undefined; syncPause(); break;
        case 'ready': status.textContent = 'Pronto · clique em Jogar para entrar na luta'; syncPause(); break;
        case 'running': running = true; syncPause(); break;
        case 'focus': ctx.windowManager.focus(ctx.windowId); break;
        case 'close': ctx.windowManager.close(ctx.windowId); break;
        case 'error': status.textContent = 'Não foi possível ler o jogo. Feche a janela e abra o disquete novamente.'; break;
      }
    }, { signal: abort.signal });
    frame.addEventListener('error', () => { status.textContent = 'Não foi possível ler o jogo. Feche a janela e tente novamente.'; }, { signal: abort.signal });
    document.addEventListener('visibilitychange', syncPause, { signal: abort.signal });
    const unsubscribe = this.store.subscribe(syncPause);
    const observer = new MutationObserver(syncPause);
    const bsod = document.getElementById('bsod-overlay');
    if (bsod) observer.observe(bsod, { attributes: true, attributeFilter: ['hidden'] });
    frame.src = `${withBase('/assets/games/neon-fist/player.html')}?session=${session}`;
    return () => {
      abort.abort(); unsubscribe(); observer.disconnect();
      frame.src = 'about:blank'; frame.remove(); ctx.container.replaceChildren();
    };
  }
}
