import type { Terminal as XTerm } from '@xterm/xterm';
import { withBase } from '../core/BasePath.js';

/** Only transport/rendering lives here. All gameplay runs in the original C# executable. */
export class NativeGameTerminal {
  private terminal?: XTerm;
  private socket?: WebSocket;
  private observer?: ResizeObserver;
  private readonly abort = new AbortController();
  private done = false;
  private connected = false;
  private input?: { dispose(): void };
  private music?: HTMLAudioElement;
  private musicRequested = false;
  private cols = 100;
  private rows = 40;

  public constructor(private readonly container: HTMLElement, private readonly exited: (message: string) => void) {}

  public async start(): Promise<void> {
    this.container.innerHTML = '<div class="native-terminal-body sunken-panel" data-native-scroll><div data-native-host></div></div>';
    this.container.addEventListener('pointerdown', this.resumeMusic);
    this.container.addEventListener('keydown', this.resumeMusic);
    try {
      const deadline = Date.now() + 7000;
      while (!this.done) {
        const status = await fetch(withBase('/api/game2091/status'), { signal: this.abort.signal });
        if (!status.ok) throw new Error('backend');
        const availability = await status.json();
        if (!availability.available) throw new Error('backend');
        if (!availability.busy) break;
        this.setStatus('Aguardando a sessão anterior encerrar…');
        if (Date.now() >= deadline) { this.finish('Já existe uma sessão do 2091 em uso neste navegador. Encerre-a antes de abrir outra.'); return; }
        await new Promise((done) => setTimeout(done, 350));
      }
      if (this.done) return;
      await document.fonts.load('16px "PedroOS VGA"');
      // Keep the terminal emulator out of the portfolio's startup bundle.
      const url = withBase('/js/vendor/xterm.mjs');
      const module = await import(url) as { Terminal: typeof XTerm };
      if (this.done) return;
      const host = this.container.querySelector<HTMLElement>('[data-native-host]')!;
      this.terminal = new module.Terminal({
        cols: this.cols, rows: this.rows, fontFamily: '"PedroOS VGA", monospace', fontSize: 16,
        lineHeight: 1, letterSpacing: 0, cursorBlink: true, scrollback: 1000,
        screenReaderMode: true, theme: { background: '#000000', foreground: '#c0c0c0', cursor: '#c0c0c0', selectionBackground: '#000080' },
      });
      this.terminal.parser.registerOscHandler(2091, (data) => {
        if (data === 'music:start') {
          this.musicRequested = true;
          this.resumeMusic();
        } else if (data === 'music:stop') this.stopMusic();
        return true;
      });
      this.terminal.open(host);
      this.terminal.onCursorMove(() => {
        const body = this.container.querySelector<HTMLElement>('[data-native-scroll]');
        if (!body || !this.terminal) return;
        const top = this.terminal.buffer.active.cursorY * 16;
        if (top < body.scrollTop) body.scrollTop = top;
        else if (top + 28 > body.scrollTop + body.clientHeight) body.scrollTop = top + 28 - body.clientHeight;
      });
      host.querySelector('textarea')?.setAttribute('aria-label', 'Entrada do jogo 2091');
      this.resize();
      const endpoint = new URL(withBase('/api/game2091/terminal'), location.href);
      endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
      endpoint.searchParams.set('cols', String(this.cols));
      endpoint.searchParams.set('rows', String(this.rows));
      this.socket = new WebSocket(endpoint);
      this.input = this.terminal.onData((data) => this.send({ type: 'input', data }));
      this.socket.onopen = () => {
        this.connected = true;
        this.setStatus('2091 original · use os menus do jogo para salvar e sair');
        this.terminal?.focus();
      };
      this.socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output' && typeof message.data === 'string') {
            this.terminal?.write(Uint8Array.from(atob(message.data), (char) => char.charCodeAt(0)));
          } else if (message.type === 'exit') this.finish('2091 encerrado.');
          else if (message.type === 'error') this.finish('A sessão do 2091 foi encerrada.');
        } catch { this.finish('Não foi possível continuar a sessão do 2091.'); }
      };
      this.socket.onclose = () => this.finish(this.connected ? 'A sessão do 2091 foi encerrada. Seu save fica neste backend.' : 'Não foi possível abrir o jogo. Pode haver outra sessão em uso ou o backend está indisponível.');
      this.socket.onerror = () => this.finish('Não foi possível conectar ao backend do 2091.');
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.container.querySelector('[data-native-scroll]')!);
    } catch {
      if (!this.done) this.finish('O 2091 original precisa do backend local. Abra o portfólio servido pelo ASP.NET Core e tente novamente.');
    }
  }

  private setStatus(text: string): void {
    this.container.setAttribute('aria-label', text);
  }
  private readonly resumeMusic = (): void => {
    if (!this.musicRequested || this.done) return;
    if (!this.music) {
      this.music = new Audio(withBase('/assets/games/2091/title.mp3'));
      this.music.loop = true;
      this.music.volume = 0.7;
    }
    if (this.music.paused) void this.music.play().catch(() => { /* Retry on the next keyboard/pointer gesture. */ });
  };
  private stopMusic(): void {
    this.musicRequested = false;
    if (this.music) { this.music.pause(); this.music.currentTime = 0; }
  }
  private send(message: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
  private resize(): void {
    if (!this.terminal) return;
    const body = this.container.querySelector<HTMLElement>('[data-native-scroll]')!;
    const host = this.container.querySelector<HTMLElement>('[data-native-host]')!;
    const firstLayout = !host.style.width;
    // The original console draws fixed-width panels; narrow screens scroll horizontally.
    const cols = Math.max(120, Math.min(240, Math.floor((body.clientWidth - 16) / 8)));
    const rows = Math.max(40, Math.min(100, Math.floor((body.clientHeight - 16) / 16)));
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols; this.rows = rows;
      this.terminal.resize(cols, rows);
      this.send({ type: 'resize', cols, rows });
    }
    host.style.width = `${cols * 8}px`;
    host.style.height = `${rows * 16}px`;
    if (firstLayout) body.scrollLeft = Math.max(0, (host.offsetWidth - body.clientWidth) / 2);
  }
  public focus(): void { this.terminal?.focus(); }
  public selection(): string { return this.terminal?.getSelection() ?? ''; }
  public selectAll(): void { this.terminal?.selectAll(); }
  public paste(data: string): void { this.terminal?.paste(data); }
  public clear(): void { this.terminal?.clear(); }
  private finish(message: string): void {
    if (this.done) return;
    this.dispose();
    this.exited(message);
  }
  public dispose(): void {
    if (this.done) return;
    this.done = true;
    this.abort.abort();
    this.observer?.disconnect();
    this.container.removeEventListener('pointerdown', this.resumeMusic);
    this.container.removeEventListener('keydown', this.resumeMusic);
    this.stopMusic();
    if (this.music) { this.music.removeAttribute('src'); this.music.load(); this.music = undefined; }
    this.input?.dispose();
    if (this.socket) {
      this.socket.onclose = null; this.socket.onerror = null; this.socket.onmessage = null; this.socket.onopen = null;
      this.socket.close();
    }
    this.terminal?.dispose();
    this.container.replaceChildren();
  }
}
