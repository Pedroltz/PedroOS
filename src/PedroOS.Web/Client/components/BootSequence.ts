import { withBase } from '../core/BasePath.js';

const SESSION_KEY = 'pedroos.boot.seen.v1';

/** A cosmetic boot sequence: it never changes the route or the desktop state. */
export function runBootSequence(): Promise<void> {
  const screen = document.getElementById('boot-screen');
  if (!screen) return Promise.resolve();
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      screen.hidden = true;
      return Promise.resolve();
    }
  } catch { /* Private browsing can disable storage. Boot still works. */ }

  return new Promise(resolve => {
    const desktop = document.getElementById('desktop');
    const previousInert = desktop?.inert ?? false;
    if (desktop) desktop.inert = true;
    screen.focus({ preventScroll: true });
    const events = new AbortController();
    const log = screen.querySelector<HTMLElement>('[data-boot-log]')!;
    const splash = screen.querySelector<HTMLElement>('[data-boot-splash]')!;
    const start = screen.querySelector<HTMLButtonElement>('[data-boot-start]')!;
    const skip = screen.querySelector<HTMLButtonElement>('[data-boot-skip]')!;
    const status = screen.querySelector<HTMLElement>('[data-boot-status]')!;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let finished = false;
    let playing = false;
    let audio: HTMLAudioElement | undefined;
    let soundTimeout = 0;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      events.abort();
      window.clearTimeout(soundTimeout);
      audio?.pause();
      screen.hidden = true;
      if (desktop) desktop.inert = previousInert;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Optional. */ }
      document.getElementById('start-button')?.focus({ preventScroll: true });
      resolve();
    };

    const play = (): void => {
      if (finished || playing || start.hidden) return;
      playing = true;
      start.hidden = true;
      screen.dataset.bootPhase = 'sound';
      status.textContent = 'Bem-vindo ao PedroOS 95…';
      skip.textContent = 'Entrar agora (Esc)';
      // Keep play() inside the trusted handler so mobile browsers allow audio.
      audio = new Audio(withBase('/assets/boot/windows-95-startup.wav'));
      audio.volume = 0.65;
      audio.addEventListener('ended', finish, { once: true, signal: events.signal });
      audio.addEventListener('error', finish, { once: true, signal: events.signal });
      soundTimeout = window.setTimeout(finish, 7500);
      try { void audio.play().catch(finish); } catch { finish(); }
    };

    skip.addEventListener('click', finish, { signal: events.signal });
    start.addEventListener('click', play, { signal: events.signal });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      else if (event.key === 'Enter' && document.activeElement !== skip) {
        event.preventDefault();
        play();
      }
    }, { signal: events.signal });

    const lines = [
      'Verificando memória........................ OK',
      'Detectando teclado e mouse................. OK',
      'Montando unidade C:\\...................... OK',
      '',
      'C:\\> carregar PEDROOS.SYS',
      'Carregando interface gráfica...',
      'Preparando área de trabalho...',
      '',
      'Iniciando PedroOS 95...',
    ];
    void (async () => {
      for (const line of lines) {
        if (finished) return;
        log.textContent += line + '\n';
        await new Promise(r => window.setTimeout(r, reducedMotion ? 25 : 230));
      }
      if (finished) return;
      screen.querySelector<HTMLElement>('[data-boot-console]')!.hidden = true;
      splash.hidden = false;
      screen.dataset.bootPhase = 'splash';
      status.textContent = 'Pressione Enter ou toque em Iniciar com som.';
      skip.textContent = 'Entrar sem som (Esc)';
      start.hidden = false;
      start.focus({ preventScroll: true });
    })();
  });
}
