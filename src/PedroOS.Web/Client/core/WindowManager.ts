import interact from 'interactjs';
import type {
  AppDefinition,
  IWindowManager,
  OpenWindowOptions,
  WindowBounds,
  WindowRecord,
} from '../types/index.js';
import { AppRegistry } from './AppRegistry.js';
import { DesktopStore } from './DesktopStore.js';
import { IconRegistryClient } from './IconRegistryClient.js';
import { SoundEffects } from './SoundEffects.js';

const TASKBAR_HEIGHT = 28;
const MOBILE_BREAKPOINT = 640;

interface MountedWindowResources {
  element: HTMLElement;
  cleanup: Array<() => void>;
}

/**
 * Reusable, application-agnostic Window Manager for PedroOS 95.
 */
export class WindowManager implements IWindowManager {
  private counter = 0;
  private cascadeOffset = 0;
  private readonly mounted = new Map<string, MountedWindowResources>();

  public constructor(
    private readonly container: HTMLElement,
    private readonly store: DesktopStore,
    private readonly registry: AppRegistry,
    private readonly icons: IconRegistryClient,
    private readonly sound: SoundEffects = new SoundEffects(),
    private readonly onFragmentHydrate?: (windowEl: HTMLElement, record: WindowRecord) => void,
  ) {
    this.store.subscribe((event) => {
      if (event.type === 'window-updated') {
        this.syncWindowElement(event.window);
      } else if (event.type === 'focus-changed') {
        this.enforceMobileVisibility();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.handleViewportResize());
    }
  }

  public isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  public getWorkArea(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 740 };
    }
    const width = Math.max(320, window.innerWidth);
    const height = Math.max(240, window.innerHeight - TASKBAR_HEIGHT);
    return { width, height };
  }

  /**
   * Adopts any window pre-rendered by Razor Pages on initial SSR load (/projects, /resume, etc.)
   * so the visitor gets instant content AND full window management without re-fetching.
   */
  public adoptServerWindows(): void {
    const elements = Array.from(
      this.container.querySelectorAll<HTMLElement>('[data-prerendered-window="true"]'),
    );
    for (const el of elements) {
      const appId = el.dataset.appId || 'about';
      const def = this.registry.getDefinition(appId);
      const id = el.dataset.windowId || this.nextWindowId();
      const instanceKey = el.dataset.instanceKey || appId;
      const slug = el.dataset.argSlug;
      const args: Record<string, string> = {};
      if (slug) {
        args.slug = slug;
      }

      const work = this.getWorkArea();
      const width = Math.min(def?.defaultWidth ?? 640, work.width - 16);
      const height = Math.min(def?.defaultHeight ?? 440, work.height - 16);
      const x = Math.max(8, Math.round((work.width - width) / 2));
      const y = Math.max(8, Math.round((work.height - height) / 3));
      const clamped = this.clampBounds({ x, y, width, height }, def?.minWidth ?? 240, def?.minHeight ?? 180);

      const titleLabel = el.querySelector('.title-bar-label')?.textContent?.trim() || def?.title || 'PedroOS';
      const iconKey = el.dataset.windowIcon || def?.icon || 'exe';

      const record: WindowRecord = {
        id,
        appId,
        instanceKey,
        title: titleLabel,
        icon: iconKey,
        x: clamped.x,
        y: clamped.y,
        width: clamped.width,
        height: clamped.height,
        minWidth: def?.minWidth ?? 240,
        minHeight: def?.minHeight ?? 160,
        state: this.isMobileViewport() ? 'maximized' : 'normal',
        restoreBounds: { ...clamped },
        zIndex: this.store.nextZIndex(),
        focused: true,
        resizable: def?.resizable ?? true,
        maximizable: def?.maximizable ?? true,
        args,
      };

      const cleanup = this.bindWindowInteractions(el, record.id);
      this.mounted.set(record.id, { element: el, cleanup });
      this.store.addWindow(record);
      this.store.setActiveWindow(record.id);
      this.syncWindowElement(record);
      if (def?.content === 'client') {
        this.populateWindowContent(record, def, el);
      } else {
        this.onFragmentHydrate?.(el, record);
      }
    }
  }

  public open(appId: string, options: OpenWindowOptions = {}): string {
    const def = this.registry.getDefinition(appId);
    if (!def) {
      return this.openErrorDialog(`Application "${appId}" is not registered in PedroOS 95.`);
    }

    const args = { ...(options.args ?? {}) };
    const instanceKey = this.computeInstanceKey(def, args);

    if (!def.multiInstance || appId.toLowerCase() === 'project') {
      const existing = this.store.findByInstanceKey(instanceKey);
      if (existing) {
        if (existing.state === 'minimized') {
          this.restore(existing.id);
        }
        this.focus(existing.id);
        const existingRes = this.mounted.get(existing.id);
        if (existingRes && Object.keys(args).length > 0) {
          existing.args = { ...existing.args, ...args };
          this.onFragmentHydrate?.(existingRes.element, existing);
        }
        this.syncBrowserRoute(def, args, options.skipRouteSync);
        return existing.id;
      }
    }

    const id = this.nextWindowId();
    const initialBounds = this.computeInitialBounds(def, options);
    const title = options.title ?? this.computeDefaultTitle(def, args);
    const icon = options.icon ?? def.icon;

    const record: WindowRecord = {
      id,
      appId: def.id,
      instanceKey,
      title,
      icon,
      x: initialBounds.x,
      y: initialBounds.y,
      width: initialBounds.width,
      height: initialBounds.height,
      minWidth: def.minWidth,
      minHeight: def.minHeight,
      state: this.isMobileViewport() && def.maximizable ? 'maximized' : 'normal',
      restoreBounds: { ...initialBounds },
      zIndex: this.store.nextZIndex(),
      focused: true,
      resizable: def.resizable,
      maximizable: def.maximizable,
      args,
    };

    const windowEl = this.createWindowElement(record);
    this.container.appendChild(windowEl);
    const cleanup = this.bindWindowInteractions(windowEl, id);
    this.mounted.set(id, { element: windowEl, cleanup });

    this.store.addWindow(record);
    this.store.setActiveWindow(id);
    this.syncWindowElement(record);
    this.sound.playOpen();

    this.populateWindowContent(record, def, windowEl);
    this.syncBrowserRoute(def, args, options.skipRouteSync);

    return id;
  }

  public close(windowId: string): void {
    const res = this.mounted.get(windowId);
    if (res) {
      for (const fn of res.cleanup) {
        try {
          fn();
        } catch {
          // Ignore individual cleanup errors
        }
      }
      res.element.remove();
      this.mounted.delete(windowId);
    }

    const removed = this.store.removeWindow(windowId);
    if (removed) {
      this.sound.playClick();
      const top = this.store.findTopVisibleWindow();
      if (top) {
        const topDef = this.registry.getDefinition(top.appId);
        if (topDef) {
          this.syncBrowserRoute(topDef, top.args, false);
        }
      } else if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    }
  }

  public minimize(windowId: string): void {
    const win = this.store.getWindow(windowId);
    if (!win || win.state === 'minimized') {
      return;
    }

    if (win.state === 'normal') {
      win.restoreBounds = { x: win.x, y: win.y, width: win.width, height: win.height };
    }

    this.store.updateWindow(windowId, (w) => {
      w.state = 'minimized';
      w.focused = false;
    });

    if (this.store.getActiveWindowId() === windowId) {
      const next = this.store.findTopVisibleWindow();
      this.store.setActiveWindow(next?.id ?? null);
    }
  }

  public maximize(windowId: string): void {
    const win = this.store.getWindow(windowId);
    if (!win || !win.maximizable) {
      return;
    }

    if (win.state === 'normal') {
      win.restoreBounds = { x: win.x, y: win.y, width: win.width, height: win.height };
    }

    const work = this.getWorkArea();
    this.store.updateWindow(windowId, (w) => {
      w.state = 'maximized';
      w.x = 0;
      w.y = 0;
      w.width = work.width;
      w.height = work.height;
    });
    this.focus(windowId);
  }

  public restore(windowId: string): void {
    const win = this.store.getWindow(windowId);
    if (!win) {
      return;
    }

    const clamped = this.clampBounds(win.restoreBounds, win.minWidth, win.minHeight);
    this.store.updateWindow(windowId, (w) => {
      w.state = 'normal';
      w.x = clamped.x;
      w.y = clamped.y;
      w.width = clamped.width;
      w.height = clamped.height;
    });
    this.focus(windowId);
  }

  public focus(windowId: string): void {
    const win = this.store.getWindow(windowId);
    if (!win) {
      return;
    }
    if (win.state === 'minimized') {
      const clamped = this.clampBounds(win.restoreBounds, win.minWidth, win.minHeight);
      this.store.updateWindow(windowId, (w) => {
        w.state = this.isMobileViewport() && w.maximizable ? 'maximized' : 'normal';
        w.x = clamped.x;
        w.y = clamped.y;
        w.width = clamped.width;
        w.height = clamped.height;
      });
    }
    this.store.setActiveWindow(windowId);
  }

  public move(windowId: string, x: number, y: number): void {
    const win = this.store.getWindow(windowId);
    if (!win || win.state !== 'normal') {
      return;
    }
    const clamped = this.clampBounds(
      { x, y, width: win.width, height: win.height },
      win.minWidth,
      win.minHeight,
    );
    this.store.updateWindow(windowId, (w) => {
      w.x = clamped.x;
      w.y = clamped.y;
      w.restoreBounds = { x: clamped.x, y: clamped.y, width: w.width, height: w.height };
    });
  }

  public resize(windowId: string, width: number, height: number): void {
    const win = this.store.getWindow(windowId);
    if (!win || !win.resizable || win.state !== 'normal') {
      return;
    }
    const clamped = this.clampBounds(
      { x: win.x, y: win.y, width, height },
      win.minWidth,
      win.minHeight,
    );
    this.store.updateWindow(windowId, (w) => {
      w.width = clamped.width;
      w.height = clamped.height;
      w.restoreBounds = { x: w.x, y: w.y, width: clamped.width, height: clamped.height };
    });
  }

  public setWindowTitle(windowId: string, title: string, iconKey?: string): void {
    this.store.updateWindow(windowId, (w) => {
      w.title = title;
      if (iconKey) {
        w.icon = iconKey;
      }
    });
  }

  public cascade(): void {
    let idx = 0;
    for (const win of this.store.getAllWindows()) {
      if (win.state === 'minimized') {
        continue;
      }
      const x = 36 + (idx % 6) * 28;
      const y = 28 + (idx % 6) * 28;
      const clamped = this.clampBounds(
        { x, y, width: win.restoreBounds.width, height: win.restoreBounds.height },
        win.minWidth,
        win.minHeight,
      );
      this.store.updateWindow(win.id, (w) => {
        w.state = 'normal';
        w.x = clamped.x;
        w.y = clamped.y;
        w.width = clamped.width;
        w.height = clamped.height;
        w.zIndex = this.store.nextZIndex();
      });
      idx += 1;
    }
  }

  private handleViewportResize(): void {
    const work = this.getWorkArea();
    for (const win of this.store.getAllWindows()) {
      if (win.state === 'maximized') {
        this.store.updateWindow(win.id, (w) => {
          w.x = 0;
          w.y = 0;
          w.width = work.width;
          w.height = work.height;
        });
      } else if (win.state === 'normal') {
        const clamped = this.clampBounds(
          { x: win.x, y: win.y, width: win.width, height: win.height },
          win.minWidth,
          win.minHeight,
        );
        this.store.updateWindow(win.id, (w) => {
          w.x = clamped.x;
          w.y = clamped.y;
          w.width = clamped.width;
          w.height = clamped.height;
        });
      }
    }
    this.enforceMobileVisibility();
  }

  /**
   * On smartphone viewports, keeps one visible active window at a time in fullscreen
   * while keeping all other running windows accessible from the taskbar.
   */
  private enforceMobileVisibility(): void {
    if (!this.isMobileViewport()) {
      for (const win of this.store.getAllWindows()) {
        const res = this.mounted.get(win.id);
        if (res) {
          res.element.classList.remove('mobile-background-hidden');
        }
      }
      return;
    }

    const activeId = this.store.getActiveWindowId();
    for (const win of this.store.getAllWindows()) {
      const res = this.mounted.get(win.id);
      if (!res) {
        continue;
      }
      const isHiddenOnMobile = win.state === 'minimized' || (activeId !== null && win.id !== activeId);
      res.element.classList.toggle('mobile-background-hidden', isHiddenOnMobile);
    }
  }

  private clampBounds(bounds: WindowBounds, minWidth: number, minHeight: number): WindowBounds {
    const work = this.getWorkArea();
    const maxW = Math.max(240, work.width);
    const maxH = Math.max(180, work.height);
    const width = Math.min(Math.max(bounds.width, Math.min(minWidth, maxW)), maxW);
    const height = Math.min(Math.max(bounds.height, Math.min(minHeight, maxH)), maxH);

    // Ensure at least 72px of the window stays inside horizontal bounds and title bar never goes above y=0 or below taskbar
    const minX = Math.min(0, -(width - 96));
    const maxX = Math.max(0, work.width - 72);
    const minY = 0;
    const maxY = Math.max(0, work.height - 34);

    const x = Math.min(Math.max(Math.round(bounds.x), minX), maxX);
    const y = Math.min(Math.max(Math.round(bounds.y), minY), maxY);
    return { x, y, width: Math.round(width), height: Math.round(height) };
  }

  private computeInitialBounds(def: AppDefinition, options: OpenWindowOptions): WindowBounds {
    const work = this.getWorkArea();
    const width = options.width ?? def.defaultWidth;
    const height = options.height ?? def.defaultHeight;
    const step = (this.cascadeOffset % 6) * 26;
    this.cascadeOffset += 1;

    const defaultX = Math.max(16, Math.min(184 + step, work.width - width - 16));
    const defaultY = Math.max(14, Math.min(28 + step, work.height - height - 16));
    return this.clampBounds(
      {
        x: options.x ?? defaultX,
        y: options.y ?? defaultY,
        width,
        height,
      },
      def.minWidth,
      def.minHeight,
    );
  }

  private computeInstanceKey(def: AppDefinition, args: Record<string, string>): string {
    if (def.id === 'project' && args.slug) {
      return `project:${args.slug.toLowerCase()}`;
    }
    if (!def.multiInstance) {
      return def.id;
    }
    return `${def.id}:${this.counter + 1}`;
  }

  private computeDefaultTitle(def: AppDefinition, args: Record<string, string>): string {
    if (def.id === 'project' && args.slug) {
      return `Project — ${args.slug}`;
    }
    if (def.id === 'explorer' && args.path) {
      return `Exploring - ${args.path}`;
    }
    return def.title;
  }

  private createWindowElement(record: WindowRecord): HTMLElement {
    const section = document.createElement('section');
    section.className = 'window os-window active';
    section.id = record.id;
    section.setAttribute('role', 'dialog');
    section.setAttribute('aria-label', record.title);
    section.dataset.windowId = record.id;
    section.dataset.appId = record.appId;
    section.dataset.instanceKey = record.instanceKey;

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.setAttribute('data-window-drag-handle', '');

    const titleText = document.createElement('div');
    titleText.className = 'title-bar-text';

    const iconImg = this.icons.create(record.icon, 16, 'pixel-icon title-bar-icon');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'title-bar-label';
    labelSpan.textContent = record.title;

    titleText.append(iconImg, labelSpan);

    const controls = document.createElement('div');
    controls.className = 'title-bar-controls';

    const minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.setAttribute('aria-label', 'Minimize');
    minBtn.title = 'Minimize';
    minBtn.dataset.winAction = 'minimize';
    controls.appendChild(minBtn);

    if (record.maximizable) {
      const maxBtn = document.createElement('button');
      maxBtn.type = 'button';
      maxBtn.setAttribute('aria-label', record.state === 'maximized' ? 'Restore' : 'Maximize');
      maxBtn.title = record.state === 'maximized' ? 'Restore' : 'Maximize';
      maxBtn.dataset.winAction = 'maximize';
      controls.appendChild(maxBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.title = 'Close';
    closeBtn.dataset.winAction = 'close';
    controls.appendChild(closeBtn);

    titleBar.append(titleText, controls);

    const body = document.createElement('div');
    body.className = 'window-body os-window-body';
    body.setAttribute('data-window-content', '');

    section.append(titleBar, body);
    return section;
  }

  private bindWindowInteractions(windowEl: HTMLElement, windowId: string): Array<() => void> {
    const cleanup: Array<() => void> = [];

    const onPointerDown = (): void => {
      this.focus(windowId);
    };
    windowEl.addEventListener('mousedown', onPointerDown);
    windowEl.addEventListener('touchstart', onPointerDown, { passive: true });
    cleanup.push(() => {
      windowEl.removeEventListener('mousedown', onPointerDown);
      windowEl.removeEventListener('touchstart', onPointerDown);
    });

    const onControlsClick = (ev: MouseEvent): void => {
      const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-win-action]');
      if (!target) {
        return;
      }
      ev.stopPropagation();
      const action = target.dataset.winAction;
      if (action === 'minimize') {
        this.minimize(windowId);
      } else if (action === 'maximize') {
        const win = this.store.getWindow(windowId);
        if (win?.state === 'maximized') {
          this.restore(windowId);
        } else {
          this.maximize(windowId);
        }
      } else if (action === 'close') {
        this.close(windowId);
      }
    };
    windowEl.addEventListener('click', onControlsClick);
    cleanup.push(() => windowEl.removeEventListener('click', onControlsClick));

    const titleBar = windowEl.querySelector<HTMLElement>('[data-window-drag-handle]');
    if (titleBar) {
      const onDblClick = (ev: MouseEvent): void => {
        if ((ev.target as HTMLElement | null)?.closest('.title-bar-controls')) {
          return;
        }
        const win = this.store.getWindow(windowId);
        if (!win || !win.maximizable) {
          return;
        }
        if (win.state === 'maximized') {
          this.restore(windowId);
        } else {
          this.maximize(windowId);
        }
      };
      titleBar.addEventListener('dblclick', onDblClick);
      cleanup.push(() => titleBar.removeEventListener('dblclick', onDblClick));
    }

    // Configure interact.js drag & resize
    try {
      const interactFn = (typeof interact === 'function' ? interact : (interact as unknown as { default: typeof interact }).default) as unknown as (target: HTMLElement | string) => any;
      const interactable = interactFn(windowEl);
      const desktop = this.container.closest<HTMLElement>('.desktop');
      const endCursor = (): void => {
        desktop?.classList.remove('is-window-interacting');
        desktop?.style.removeProperty('--interaction-cursor');
      };
      const beginCursor = (name: string): void => {
        desktop?.style.setProperty('--interaction-cursor', `var(--cursor-${name})`);
        desktop?.classList.add('is-window-interacting');
      };
      const resizeCursor = (edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } = {}): string => {
        const win = this.store.getWindow(windowId);
        if (!win?.resizable || win.state !== 'normal') return 'arrow';
        const horizontal = edges.left || edges.right;
        const vertical = edges.top || edges.bottom;
        if (horizontal && vertical) return (edges.left && edges.bottom) || (edges.right && edges.top) ? 'size-nesw' : 'size-nwse';
        return horizontal ? 'size-ew' : 'size-ns';
      };
      interactable.draggable({
        cursorChecker: (_action: unknown, _interactable: unknown, _element: unknown, interacting: boolean) => interacting ? 'var(--cursor-move)' : 'var(--cursor-arrow)',
        allowFrom: '[data-window-drag-handle]',
        ignoreFrom: '.title-bar-controls, button, input, select, a',
        listeners: {
          start: () => {
            this.focus(windowId);
            beginCursor('move');
          },
          end: endCursor,
          move: (event: { dx: number; dy: number }) => {
            const win = this.store.getWindow(windowId);
            if (!win || win.state !== 'normal') {
              return;
            }
            this.move(windowId, win.x + event.dx, win.y + event.dy);
          },
        },
      });

      interactable.resizable({
        cursorChecker: (action: { edges?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } }) => `var(--cursor-${resizeCursor(action.edges)})`,
        edges: { left: true, right: true, bottom: true, top: false },
        margin: 6,
        listeners: {
          start: (event: { edges?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } }) => {
            this.focus(windowId);
            beginCursor(resizeCursor(event.edges));
          },
          end: endCursor,
          move: (event: { rect: { width: number; height: number }; deltaRect: { left: number; top: number } }) => {
            const win = this.store.getWindow(windowId);
            if (!win || !win.resizable || win.state !== 'normal') {
              return;
            }
            const nextX = win.x + event.deltaRect.left;
            const nextY = win.y + event.deltaRect.top;
            const clamped = this.clampBounds(
              { x: nextX, y: nextY, width: event.rect.width, height: event.rect.height },
              win.minWidth,
              win.minHeight,
            );
            this.store.updateWindow(windowId, (w) => {
              w.x = clamped.x;
              w.y = clamped.y;
              w.width = clamped.width;
              w.height = clamped.height;
              w.restoreBounds = { ...clamped };
            });
          },
        },
      });

      cleanup.push(() => { endCursor(); interactable.unset(); });
    } catch {
      // Headless environments without DOM geometry still work via direct WindowManager methods
    }

    return cleanup;
  }

  private syncWindowElement(record: WindowRecord): void {
    const res = this.mounted.get(record.id);
    if (!res) {
      return;
    }
    const el = res.element;
    el.setAttribute('aria-label', record.title);
    el.classList.toggle('active', record.focused);
    el.classList.toggle('minimized', record.state === 'minimized');
    el.classList.toggle('maximized', record.state === 'maximized');
    el.hidden = record.state === 'minimized';

    const titleBar = el.querySelector('.title-bar');
    if (titleBar) {
      titleBar.classList.toggle('inactive', !record.focused);
    }

    const label = el.querySelector('.title-bar-label');
    if (label && label.textContent !== record.title) {
      label.textContent = record.title;
    }

    const iconImg = el.querySelector<HTMLImageElement>('.title-bar-icon');
    if (iconImg) {
      const expected = this.icons.getPath(record.icon, 16);
      if (!iconImg.src.endsWith(expected)) {
        iconImg.src = expected;
      }
    }

    const maxBtn = el.querySelector<HTMLButtonElement>('[data-win-action="maximize"]');
    if (maxBtn) {
      const isMax = record.state === 'maximized';
      maxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
      maxBtn.title = isMax ? 'Restore' : 'Maximize';
    }

    el.style.zIndex = String(record.zIndex);
    if (record.state === 'maximized' || (this.isMobileViewport() && record.maximizable)) {
      const work = this.getWorkArea();
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.width = `${work.width}px`;
      el.style.height = `${work.height}px`;
    } else {
      el.style.left = `${record.x}px`;
      el.style.top = `${record.y}px`;
      el.style.width = `${record.width}px`;
      el.style.height = `${record.height}px`;
    }
  }

  private populateWindowContent(record: WindowRecord, def: AppDefinition, windowEl: HTMLElement): void {
    const body = windowEl.querySelector<HTMLElement>('[data-window-content]');
    if (!body) {
      return;
    }

    if (def.content === 'client') {
      const mod = this.registry.getClientModule(def.id);
      if (!mod) {
        body.innerHTML = `<div class="win95-error-box">Client module for <strong>${this.escapeHtml(def.id)}</strong> is not available.</div>`;
        return;
      }
      try {
        const teardown = mod.mount({
          windowId: record.id,
          container: body,
          args: record.args,
          windowManager: this,
          setTitle: (newTitle: string, newIcon?: string) => this.setWindowTitle(record.id, newTitle, newIcon),
        });
        if (typeof teardown === 'function') {
          this.mounted.get(record.id)?.cleanup.push(teardown);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected application error';
        body.innerHTML = `<div class="win95-error-box">Failed to initialize ${this.escapeHtml(def.title)}: ${this.escapeHtml(message)}</div>`;
      }
      return;
    }

    // Fragment application: fetch server-rendered Razor Partial View
    body.innerHTML = `<div class="win95-loading" role="status">${this.icons.render('computer', 16)} <span>Loading ${this.escapeHtml(def.title)}...</span></div>`;

    const params = new URLSearchParams(record.args);
    const queryString = params.toString();
    const url = `/fragments/${encodeURIComponent(def.id)}${queryString ? `?${queryString}` : ''}`;

    fetch(url, { headers: { 'X-Requested-With': 'PedroOSWindowManager' } })
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.text();
      })
      .then((html) => {
        if (!this.mounted.has(record.id)) {
          return;
        }
        body.innerHTML = html;
        this.onFragmentHydrate?.(windowEl, record);
      })
      .catch(() => {
        if (!this.mounted.has(record.id)) {
          return;
        }
        body.innerHTML = `
          <div class="win95-error-box" role="alert">
            ${this.icons.render('error', 32, 'pixel-icon', 'Error')}
            <div>
              <p><strong>PedroOS 95 could not load ${this.escapeHtml(def.title)}.</strong></p>
              <p>Check your connection or click Retry.</p>
              <button type="button" data-retry-fragment>Retry</button>
            </div>
          </div>`;
        body.querySelector('[data-retry-fragment]')?.addEventListener('click', () => {
          this.populateWindowContent(record, def, windowEl);
        });
      });
  }

  private openErrorDialog(message: string): string {
    const id = this.nextWindowId();
    const bounds = this.clampBounds({ x: 180, y: 120, width: 360, height: 160 }, 280, 140);
    const record: WindowRecord = {
      id,
      appId: 'error',
      instanceKey: `error:${id}`,
      title: 'PedroOS 95',
      icon: 'error',
      ...bounds,
      minWidth: 280,
      minHeight: 140,
      state: 'normal',
      restoreBounds: { ...bounds },
      zIndex: this.store.nextZIndex(),
      focused: true,
      resizable: false,
      maximizable: false,
      args: {},
    };
    const el = this.createWindowElement(record);
    const body = el.querySelector<HTMLElement>('[data-window-content]');
    if (body) {
      body.innerHTML = `
        <div class="win95-error-box" role="alert">
          ${this.icons.render('error', 32, 'pixel-icon', 'Erro')}
          <div>
            <p>${this.escapeHtml(message)}</p>
            <button type="button" data-win-action="close">OK</button>
          </div>
        </div>`;
    }
    this.container.appendChild(el);
    const cleanup = this.bindWindowInteractions(el, id);
    this.mounted.set(id, { element: el, cleanup });
    this.store.addWindow(record);
    this.store.setActiveWindow(id);
    this.syncWindowElement(record);
    this.sound.playError();
    return id;
  }

  private syncBrowserRoute(def: AppDefinition, args: Record<string, string>, skip?: boolean): void {
    if (skip || typeof window === 'undefined' || !def.route) {
      return;
    }
    let route = def.route;
    if (route.includes('{slug}')) {
      if (!args.slug) {
        return;
      }
      route = route.replace('{slug}', encodeURIComponent(args.slug));
    }
    if (window.location.pathname.toLowerCase() !== route.toLowerCase()) {
      window.history.pushState({ appId: def.id, args }, '', route);
    }
  }

  private nextWindowId(): string {
    this.counter += 1;
    return `win-${this.counter}`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
