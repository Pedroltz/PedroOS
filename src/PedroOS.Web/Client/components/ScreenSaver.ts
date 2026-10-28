import type { DesktopStore } from '../core/DesktopStore.js';
import type { SecretSession } from '../core/SecretSession.js';

export class ScreenSaver {
  private lastActivity = Date.now();
  private overlay?: HTMLElement;
  private animation = 0;
  private previousFocus?: HTMLElement;
  private previousInert = false;
  private swallowUntil = 0;

  public constructor(private readonly store: DesktopStore, private readonly session: SecretSession) {}

  public mount(): void {
    const overlay = document.createElement('div');
    overlay.className = 'pedroos-screen-saver';
    overlay.dataset.screenSaver = '';
    overlay.hidden = true;
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Proteção de tela. Mova o mouse, toque ou pressione uma tecla para voltar.');
    overlay.innerHTML = '<div class="screen-saver-logo" data-saver-logo><strong>PedroOS</strong><span>95</span></div>';
    document.body.appendChild(overlay);
    this.overlay = overlay;
    const activity = (event: Event): void => {
      this.lastActivity = Date.now();
      if (!overlay.hidden) {
        this.hide();
        this.swallowUntil = Date.now() + 500;
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (Date.now() < this.swallowUntil && ['click', 'dblclick', 'pointerdown', 'pointerup', 'keyup'].includes(event.type)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    for (const name of ['pointermove', 'pointerdown', 'pointerup', 'click', 'dblclick', 'keydown', 'keyup', 'wheel']) {
      window.addEventListener(name, activity, { capture: true, passive: false });
    }
    document.addEventListener('visibilitychange', () => { this.hide(); this.lastActivity = Date.now(); });
    this.session.subscribe(event => {
      if (event === 'preview') this.show();
      else { this.lastActivity = Date.now(); if (!this.session.saver.enabled) this.hide(); }
    });
    window.setInterval(() => {
      if (this.blocked()) { this.lastActivity = Date.now(); this.hide(); return; }
      if (this.session.saver.enabled && Date.now() - this.lastActivity >= this.session.saver.minutes * 60_000) this.show();
    }, 1000);
  }

  private blocked(): boolean {
    const active = this.store.getWindow(this.store.getActiveWindowId() ?? '');
    return document.hidden || !document.getElementById('bsod-overlay')?.hidden
      || !!document.querySelector('.safe-power-off-screen')
      || !!active && active.state !== 'minimized' && ['doom', 'neon-fist', 'skifree', 'opentyrian', 'omf2097'].includes(active.appId);
  }

  private show(): void {
    if (!this.overlay?.hidden || this.blocked()) return;
    const desktop = document.getElementById('desktop');
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.previousInert = desktop?.inert ?? false;
    if (desktop) desktop.inert = true;
    this.overlay.hidden = false;
    this.overlay.focus({ preventScroll: true });
    const logo = this.overlay.querySelector<HTMLElement>('[data-saver-logo]')!;
    let x = 24, y = 24, dx = 90, dy = 65, last = performance.now(), color = 0;
    const colors = ['#00ffff', '#ffff00', '#ff00ff', '#00ff00', '#ffffff'];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (now: number): void => {
      if (!this.overlay || this.overlay.hidden) return;
      if (!reduced && now - last > 0 && now - last < 1000 / 30) { this.animation = requestAnimationFrame(draw); return; }
      const dt = Math.min((now - last) / 1000, 0.1);
      const maxX = Math.max(0, this.overlay.clientWidth - logo.offsetWidth - 8);
      const maxY = Math.max(0, this.overlay.clientHeight - logo.offsetHeight - 8);
      if (reduced) { x = maxX / 2; y = maxY / 2; }
      else {
        x += dx * dt; y += dy * dt;
        if (x <= 0 || x >= maxX) { dx *= -1; logo.style.color = colors[++color % colors.length]; }
        if (y <= 0 || y >= maxY) { dy *= -1; logo.style.color = colors[++color % colors.length]; }
        x = Math.max(0, Math.min(x, maxX)); y = Math.max(0, Math.min(y, maxY));
      }
      logo.style.transform = `translate(${x}px, ${y}px)`;
      last = now;
      if (!reduced) this.animation = requestAnimationFrame(draw);
    };
    draw(last);
  }

  private hide(): void {
    if (!this.overlay || this.overlay.hidden) return;
    this.overlay.hidden = true;
    cancelAnimationFrame(this.animation);
    const desktop = document.getElementById('desktop');
    if (desktop) desktop.inert = this.previousInert;
    if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.lastActivity = Date.now();
  }
}
