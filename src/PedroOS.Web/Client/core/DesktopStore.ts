import type { WindowRecord } from '../types/index.js';

export type DesktopEvent =
  | { type: 'window-opened'; window: WindowRecord }
  | { type: 'window-closed'; windowId: string }
  | { type: 'window-updated'; window: WindowRecord }
  | { type: 'focus-changed'; activeWindowId: string | null }
  | { type: 'start-menu-changed'; open: boolean }
  | { type: 'wallpaper-changed'; wallpaper: string };

export type DesktopListener = (event: DesktopEvent) => void;

/**
 * Central state store for the PedroOS 95 desktop and open windows.
 * Emits granular events so a single window update never forces a full desktop re-render.
 */
export class DesktopStore {
  private readonly windows = new Map<string, WindowRecord>();
  private activeWindowId: string | null = null;
  private startMenuOpen = false;
  private wallpaper = 'solid';
  private topZIndex = 20;
  private readonly listeners = new Set<DesktopListener>();

  public subscribe(listener: DesktopListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: DesktopEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public nextZIndex(): number {
    this.topZIndex += 1;
    return this.topZIndex;
  }

  public getWindow(windowId: string): WindowRecord | undefined {
    return this.windows.get(windowId);
  }

  public getAllWindows(): WindowRecord[] {
    return Array.from(this.windows.values());
  }

  public findByInstanceKey(instanceKey: string): WindowRecord | undefined {
    for (const win of this.windows.values()) {
      if (win.instanceKey === instanceKey) {
        return win;
      }
    }
    return undefined;
  }

  public getActiveWindowId(): string | null {
    return this.activeWindowId;
  }

  public addWindow(record: WindowRecord): void {
    this.windows.set(record.id, record);
    this.emit({ type: 'window-opened', window: record });
  }

  public updateWindow(windowId: string, mutator: (win: WindowRecord) => void): WindowRecord | undefined {
    const existing = this.windows.get(windowId);
    if (!existing) {
      return undefined;
    }
    mutator(existing);
    this.emit({ type: 'window-updated', window: existing });
    return existing;
  }

  public removeWindow(windowId: string): boolean {
    const existed = this.windows.delete(windowId);
    if (!existed) {
      return false;
    }
    if (this.activeWindowId === windowId) {
      const nextTop = this.findTopVisibleWindow();
      this.setActiveWindow(nextTop?.id ?? null);
    }
    this.emit({ type: 'window-closed', windowId });
    return true;
  }

  public setActiveWindow(windowId: string | null): void {
    if (this.activeWindowId === windowId) {
      if (windowId) {
        const current = this.windows.get(windowId);
        if (current && !current.focused) {
          current.focused = true;
          this.emit({ type: 'window-updated', window: current });
        }
      }
      return;
    }

    const previousId = this.activeWindowId;
    this.activeWindowId = windowId;

    if (previousId) {
      const prev = this.windows.get(previousId);
      if (prev) {
        prev.focused = false;
        this.emit({ type: 'window-updated', window: prev });
      }
    }

    if (windowId) {
      const next = this.windows.get(windowId);
      if (next) {
        next.focused = true;
        next.zIndex = this.nextZIndex();
        this.emit({ type: 'window-updated', window: next });
      }
    }

    this.emit({ type: 'focus-changed', activeWindowId: windowId });
  }

  public findTopVisibleWindow(): WindowRecord | undefined {
    let best: WindowRecord | undefined;
    for (const win of this.windows.values()) {
      if (win.state === 'minimized') {
        continue;
      }
      if (!best || win.zIndex > best.zIndex) {
        best = win;
      }
    }
    return best;
  }

  public isStartMenuOpen(): boolean {
    return this.startMenuOpen;
  }

  public setStartMenuOpen(open: boolean): void {
    if (this.startMenuOpen === open) {
      return;
    }
    this.startMenuOpen = open;
    this.emit({ type: 'start-menu-changed', open });
  }

  public getWallpaper(): string {
    return this.wallpaper;
  }

  public setWallpaper(wallpaper: string): void {
    this.wallpaper = wallpaper;
    this.emit({ type: 'wallpaper-changed', wallpaper });
  }
}
