export type WindowDisplayState = 'normal' | 'minimized' | 'maximized';

export type AppContentKind = 'fragment' | 'client';

export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  content: AppContentKind;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  resizable: boolean;
  maximizable: boolean;
  multiInstance: boolean;
  route?: string;
  hidden?: boolean;
}

export interface OpenWindowOptions {
  title?: string;
  icon?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  args?: Record<string, string>;
  skipRouteSync?: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowRecord {
  id: string;
  appId: string;
  instanceKey: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  state: WindowDisplayState;
  restoreBounds: WindowBounds;
  zIndex: number;
  focused: boolean;
  resizable: boolean;
  maximizable: boolean;
  args: Record<string, string>;
}

export type VirtualNodeType =
  | 'drive'
  | 'folder'
  | 'application'
  | 'document'
  | 'text'
  | 'systemFile'
  | 'shortcut';

export interface FileAction {
  kind: 'open-app' | 'open-url' | 'navigate' | 'unlock-secret';
  appId?: string;
  args?: Record<string, string>;
  url?: string;
}

export interface VirtualNode {
  id: string;
  name: string;
  type: VirtualNodeType;
  path: string;
  icon: string;
  action?: FileAction;
  description?: string;
  size?: string;
  content?: string;
  hidden?: boolean;
  children?: VirtualNode[];
}

export interface IconManifestEntry {
  category: string;
  description: string;
  sizes: number[];
  variants?: Partial<Record<16 | 32 | 48, string>>;
  fallback?: string;
  attribution?: string;
  nativeSizes?: number[];
}

export interface ProjectSummary {
  slug: string;
  name: string;
  executableName: string;
  icon: string;
  summary: string;
  stack: string[];
  repositoryUrl?: string;
  demoUrl?: string;
  featured: boolean;
}

export interface BootPayload {
  apps: AppDefinition[];
  vfsRoot: VirtualNode;
  icons: Record<string, IconManifestEntry>;
  projects: ProjectSummary[];
  initialRoute: {
    path: string;
    appId?: string;
    args?: Record<string, string>;
    notFound?: boolean;
  };
}

export interface IWindowManager {
  open(appId: string, options?: OpenWindowOptions): string;
  close(windowId: string): void;
  minimize(windowId: string): void;
  maximize(windowId: string): void;
  restore(windowId: string): void;
  focus(windowId: string): void;
  move(windowId: string, x: number, y: number): void;
  resize(windowId: string, width: number, height: number): void;
}

export interface AppMountContext {
  windowId: string;
  container: HTMLElement;
  args: Record<string, string>;
  windowManager: IWindowManager;
  setTitle(title: string, icon?: string): void;
}

export interface ClientAppModule {
  mount(ctx: AppMountContext): (() => void) | void;
}
