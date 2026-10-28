import { mountSystemFailure, requestSystemFailure } from './SystemFailure.js';
import type { IWindowManager, WindowRecord } from '../types/index.js';
import { DesktopStore } from '../core/DesktopStore.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { withBase } from '../core/BasePath.js';
import { SoundEffects } from '../core/SoundEffects.js';

export class DesktopController {
  private startMenuOpen = false;

  public constructor(
    private readonly store: DesktopStore,
    private readonly wm: IWindowManager,
    private readonly icons: IconRegistryClient,
    private readonly sound: SoundEffects,
  ) {}

  public init(): void {
    this.setupDesktopIcons();
    this.setupTaskbar();
    this.setupStartMenu();
    this.setupContextMenu();
    mountSystemFailure(this.store);
    this.setupGlobalKeyboard();
    this.setupClock();
    this.setupWallpaperSubscription();
  }

  private setupDesktopIcons(): void {
    const container = document.getElementById('desktop-icons');
    if (!container) return;

    let selectedIcon: HTMLElement | null = null;
    let lastClickId = '';
    let lastClickTime = 0;
    let lastActionId = '';
    let lastActionTime = 0;

    const executeAction = (icon: HTMLElement): void => {
      const now = Date.now();
      if (lastActionId === icon.id && now - lastActionTime < 450) {
        return;
      }
      lastActionId = icon.id;
      lastActionTime = now;
      this.triggerIconAction(icon);
    };

    const selectIcon = (el: HTMLElement | null): void => {
      if (selectedIcon) selectedIcon.classList.remove('selected');
      selectedIcon = el;
      if (selectedIcon) selectedIcon.classList.add('selected');
    };

    container.addEventListener('click', (ev) => {
      const icon = (ev.target as HTMLElement).closest<HTMLElement>('[data-desktop-icon]');
      if (!icon) {
        selectIcon(null);
        return;
      }

      selectIcon(icon);
      this.sound.playClick();

      const now = Date.now();
      const isDouble = lastClickId === icon.id && now - lastClickTime < 450;
      lastClickId = icon.id;
      lastClickTime = now;

      // On mobile or on double-tap, trigger action
      if (isDouble || window.innerWidth <= 640) {
        executeAction(icon);
      }
    });

    container.addEventListener('dblclick', (ev) => {
      const icon = (ev.target as HTMLElement).closest<HTMLElement>('[data-desktop-icon]');
      if (icon) {
        executeAction(icon);
      }
    });

    // Arrow navigation
    container.addEventListener('keydown', (ev) => {
      const icons = Array.from(container.querySelectorAll<HTMLElement>('[data-desktop-icon]')).filter(icon => !icon.hidden);
      if (icons.length === 0) return;

      const idx = selectedIcon ? icons.indexOf(selectedIcon) : -1;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const next = icons[(idx + 1) % icons.length];
        selectIcon(next);
        next.focus();
      } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const prev = icons[(idx - 1 + icons.length) % icons.length];
        selectIcon(prev);
        prev.focus();
      } else if (ev.key === 'Enter' && selectedIcon) {
        ev.preventDefault();
        this.triggerIconAction(selectedIcon);
      }
    });
  }

  private triggerIconAction(icon: HTMLElement): void {
    const action = icon.dataset.action;
    if (action === 'url') {
      const url = icon.dataset.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const appId = icon.dataset.appId;
    if (appId) {
      const key = icon.dataset.argKey;
      const val = icon.dataset.argValue;
      const args: Record<string, string> = {};
      if (key && val) args[key] = val;
      this.wm.open(appId, { args });
    }
  }

  private setupTaskbar(): void {
    const windowsContainer = document.getElementById('taskbar-windows');
    const startBtn = document.getElementById('start-button');
    const soundBtn = document.getElementById('tray-sound-toggle');
    const soundIcon = document.getElementById('tray-sound-icon') as HTMLImageElement | null;

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const enabled = this.sound.toggle();
        if (soundIcon) {
          soundIcon.src = this.icons.getPath(enabled ? 'speaker' : 'speaker-muted', 16);
          soundIcon.alt = enabled ? 'Som ativo' : 'Som mudo';
        }
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.toggleStartMenu();
      });
    }

    // Subscribe to store to render taskbar items
    this.store.subscribe((event) => {
      if (
        event.type === 'window-opened' ||
        event.type === 'window-closed' ||
        event.type === 'window-updated' ||
        event.type === 'focus-changed'
      ) {
        this.renderTaskbarButtons(windowsContainer);
      }
    });

    if (windowsContainer) {
      windowsContainer.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-taskbar-win-id]');
        if (!btn?.dataset.taskbarWinId) return;

        const winId = btn.dataset.taskbarWinId;
        const win = this.store.getWindow(winId);
        if (!win) return;

        if (win.state === 'minimized') {
          this.wm.restore(winId);
        } else if (win.focused) {
          this.wm.minimize(winId);
        } else {
          this.wm.focus(winId);
        }
      });
    }
  }

  private renderTaskbarButtons(container: HTMLElement | null): void {
    if (!container) return;
    const wins = this.store.getAllWindows();

    container.innerHTML = wins
      .map((w: WindowRecord) => {
        const isActive = w.focused && w.state !== 'minimized';
        const isMin = w.state === 'minimized';
        let classes = 'taskbar-item';
        if (isActive) classes += ' active';
        if (isMin) classes += ' minimized';

        return `
          <button type="button"
                  class="${classes}"
                  data-taskbar-win-id="${w.id}"
                  aria-pressed="${isActive}"
                  title="${this.escapeHtml(w.title)}">
            ${this.icons.render(w.icon, 16)}
            <span class="taskbar-item-label">${this.escapeHtml(w.title)}</span>
          </button>
        `;
      })
      .join('');
  }

  private setupStartMenu(): void {
    const menu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (!menu) return;

    document.addEventListener('click', (ev) => {
      if (this.startMenuOpen) {
        const clickedInside = menu.contains(ev.target as Node) || startBtn?.contains(ev.target as Node);
        if (!clickedInside) {
          this.closeStartMenu();
        }
      }
    });

    menu.addEventListener('click', (ev) => {
      const action = (ev.target as HTMLElement).closest<HTMLElement>('[data-open-app]');
      if (action?.dataset.openApp) {
        const appId = action.dataset.openApp;
        const path = action.dataset.argPath;
        const slug = action.dataset.argSlug;
        const args: Record<string, string> = {};
        if (path) args.path = path;
        if (slug) args.slug = slug;

        this.wm.open(appId, { args });
        this.closeStartMenu();
      }
    });
  }

  private toggleStartMenu(): void {
    this.startMenuOpen = !this.startMenuOpen;
    const menu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (menu) menu.hidden = !this.startMenuOpen;
    if (startBtn) {
      startBtn.classList.toggle('active', this.startMenuOpen);
      startBtn.setAttribute('aria-expanded', String(this.startMenuOpen));
    }
    if (this.startMenuOpen) {
      this.sound.playClick();
    }
  }

  private closeStartMenu(): void {
    this.startMenuOpen = false;
    const menu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (menu) menu.hidden = true;
    if (startBtn) {
      startBtn.classList.remove('active');
      startBtn.setAttribute('aria-expanded', 'false');
    }
  }

  private setupContextMenu(): void {
    const menu = document.getElementById('desktop-context-menu');
    const desktop = document.getElementById('desktop');
    if (!menu || !desktop) return;

    desktop.addEventListener('contextmenu', (ev) => {
      // If right click was on a window or icon, don't show desktop context menu
      if ((ev.target as HTMLElement).closest('.os-window') || (ev.target as HTMLElement).closest('[data-desktop-icon]')) {
        return;
      }
      ev.preventDefault();

      menu.style.left = `${Math.min(window.innerWidth - 180, ev.clientX)}px`;
      menu.style.top = `${Math.min(window.innerHeight - 200, ev.clientY)}px`;
      menu.hidden = false;
    });

    document.addEventListener('click', (ev) => {
      if (!menu.hidden && !menu.contains(ev.target as Node)) {
        menu.hidden = true;
      }
    });

    menu.addEventListener('click', (ev) => {
      menu.hidden = true;
      const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-context-action]');
      if (!target) return;
      const action = target.dataset.contextAction;
      if (action === 'arrange') {
        // Arrange icons
        const iconContainer = document.getElementById('desktop-icons');
        if (iconContainer) {
          const icons = Array.from(iconContainer.children);
          icons.sort((a, b) => (a.textContent || '').localeCompare(b.textContent || ''));
          icons.forEach((ic) => iconContainer.appendChild(ic));
        }
      } else if (action === 'cascade') {
        (this.wm as { cascade?: () => void }).cascade?.();
      } else if (action === 'refresh') {
        // Soft refresh
        this.sound.playClick();
      }
    });
  }

  private setupGlobalKeyboard(): void {
    window.addEventListener('keydown', (ev) => {
      // Alt+F4: close active window
      if (ev.altKey && ev.key === 'F4') {
        ev.preventDefault();
        const activeId = this.store.getActiveWindowId();
        if (activeId) {
          this.wm.close(activeId);
        }
      }

      // Ctrl+Alt+B: show system failure diagnostics
      if (ev.ctrlKey && ev.altKey && (ev.key === 'b' || ev.key === 'B')) {
        ev.preventDefault();
        requestSystemFailure();
      }

      // Esc: close start menu or context menu
      if (ev.key === 'Escape') {
        this.closeStartMenu();
        const ctxMenu = document.getElementById('desktop-context-menu');
        if (ctxMenu) ctxMenu.hidden = true;
      }
    });
  }

  private setupClock(): void {
    const clock = document.getElementById('taskbar-clock');
    if (!clock) return;

    const update = (): void => {
      const now = new Date();
      const hrs = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      clock.textContent = `${hrs}:${mins}`;
    };

    update();
    setInterval(update, 1000);
  }

  private setupWallpaperSubscription(): void {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    this.store.subscribe((e) => {
      if (e.type === 'wallpaper-changed') {
        if (e.wallpaper === 'solid') {
          desktop.style.backgroundImage = 'none';
          desktop.style.backgroundColor = '#008080';
        } else {
          desktop.style.backgroundImage = `url('${withBase('/assets/wallpapers/' + e.wallpaper + '.png')}')`;
          desktop.style.backgroundRepeat = 'repeat';
        }
      }
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
