import type { SoundEffects } from '../core/SoundEffects.js';

const SESSION_KEY = 'pedroos.boot.seen.v1';

/** Cosmetic startup: visual deadlines never depend on media playback. */
export function runBootSequence(sound: SoundEffects): Promise<void> {
  const screen = document.getElementById('boot-screen');
  if (!screen) return Promise.resolve();
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      screen.hidden = true;
      return Promise.resolve();
    }
  } catch { /* Storage is optional. */ }

  return new Promise(resolve => {
    const desktop = document.getElementById('desktop');
    const previousInert = desktop?.inert ?? false;
    if (desktop) desktop.inert = true;
    screen.focus({ preventScroll: true });
    const events = new AbortController();
    const log = screen.querySelector<HTMLElement>('[data-boot-log]')!;
    const splash = screen.querySelector<HTMLElement>('[data-boot-splash]')!;
    const status = screen.querySelector<HTMLElement>('[data-boot-status]')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let finished = false;

    const wait = (ms: number): Promise<void> => new Promise(done => {
      if (events.signal.aborted) { done(); return; }
      const complete = (): void => {
        window.clearTimeout(timer);
        events.signal.removeEventListener('abort', complete);
        done();
      };
      const timer = window.setTimeout(complete, ms);
      events.signal.addEventListener('abort', complete, { once: true });
    });
    const finish = (skipped = false): void => {
      if (finished) return;
      finished = true;
      events.abort();
      screen.hidden = true;
      if (desktop) desktop.inert = previousInert;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Optional. */ }
      document.getElementById('start-button')?.focus({ preventScroll: true });
      if (!skipped) sound.playStartup();
      resolve();
    };
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(true); }
    }, { signal: events.signal });

    const lines = [
      'Verificando memória.................. OK',
      'Detectando teclado e mouse........... OK',
      'Unidade C: PEDROOS................... OK',
      '',
      'Carregando PEDROOS.SYS...',
      'Carregando drivers de vídeo...',
      'Preparando área de trabalho...',
      '',
      'Iniciando PedroOS 95...',
    ];
    void (async () => {
      // Preload usually finishes before DOMContentLoaded. Limit the wait when
      // fonts are slow/offline so first paint remains black and boot can finish.
      await Promise.race([document.fonts.load('16px "PedroOS VGA"').catch(() => []), wait(250)]);
      if (finished) return;
      screen.dataset.bootFontReady = '';
      if (reduced) {
        log.textContent += lines.join('\n') + '\n';
        await wait(1500);
      } else {
        for (const line of lines) {
          if (finished) return;
          log.textContent += line + '\n';
          await wait(220);
        }
      }
      if (finished) return;
      screen.querySelector<HTMLElement>('[data-boot-console]')!.hidden = true;
      splash.hidden = false;
      screen.dataset.bootPhase = 'splash';
      status.textContent = 'Iniciando PedroOS 95…';
      await wait(reduced ? 1500 : 2500);
      if (!finished) finish();
    })();
  });
}
