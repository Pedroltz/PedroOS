import { DoomApp } from './apps/DoomApp.js';
import { welcomePreference } from './core/WelcomePreference.js';
import type { BootPayload } from './types/index.js';
import { DesktopStore } from './core/DesktopStore.js';
import { AppRegistry } from './core/AppRegistry.js';
import { IconRegistryClient } from './core/IconRegistryClient.js';
import { VirtualFileSystemClient } from './core/VirtualFileSystemClient.js';
import { SoundEffects } from './core/SoundEffects.js';
import { WindowManager } from './core/WindowManager.js';
import { stripBase } from './core/BasePath.js';
import { ExplorerApp } from './apps/ExplorerApp.js';
import { InternetExplorerApp } from './apps/InternetExplorerApp.js';
import { MinesweeperApp } from './apps/MinesweeperApp.js';
import { NotepadApp } from './apps/NotepadApp.js';
import { TerminalApp } from './apps/TerminalApp.js';
import { FindDialogApp, RunDialogApp, DisplayPropertiesApp, ShutDownDialogApp } from './apps/SystemDialogsApp.js';
import { hydrateWindowFragment } from './apps/FragmentHydrator.js';
import { DesktopController } from './components/DesktopController.js';

function boot(): void {
  const bootScript = document.getElementById('pedroos-boot-data');
  if (!bootScript?.textContent) {
    console.error('PedroOS 95: Boot data not found in page DOM.');
    return;
  }

  let data: BootPayload;
  try {
    data = JSON.parse(bootScript.textContent) as BootPayload;
  } catch (err) {
    console.error('PedroOS 95: Failed to parse boot payload', err);
    return;
  }

  const store = new DesktopStore();
  const registry = new AppRegistry(data.apps);
  const icons = new IconRegistryClient(data.icons);
  const vfs = new VirtualFileSystemClient(data.vfsRoot);
  const sound = new SoundEffects();

  // Register client modules
  registry.registerClientApp('explorer', new ExplorerApp(vfs, icons));
  registry.registerClientApp('projects', new ExplorerApp(vfs, icons, 'C:\\Projetos'));
  registry.registerClientApp('iexplore', new InternetExplorerApp(icons, data.projects));
  registry.registerClientApp('minesweeper', new MinesweeperApp(icons));
  registry.registerClientApp('doom', new DoomApp(store));
  registry.registerClientApp('notepad', new NotepadApp(vfs));
  registry.registerClientApp('terminal', new TerminalApp(vfs));
  registry.registerClientApp('find', new FindDialogApp(vfs, icons));
  registry.registerClientApp('run', new RunDialogApp(icons));
  registry.registerClientApp('display', new DisplayPropertiesApp(store, icons));
  registry.registerClientApp('shutdown', new ShutDownDialogApp(icons));

  const desktopWindows = document.getElementById('desktop-windows');
  if (!desktopWindows) {
    console.error('PedroOS 95: #desktop-windows container not found.');
    return;
  }

  const wm = new WindowManager(
    desktopWindows,
    store,
    registry,
    icons,
    sound,
    (windowEl, record) => {
      const project = windowEl.querySelector<HTMLElement>('[data-project-details]');
      if (project?.dataset.projectTitle) {
        wm.setWindowTitle(record.id, project.dataset.projectTitle, project.dataset.projectIcon);
      }
      hydrateWindowFragment(windowEl, record, wm);
    },
  );

  // Adopt any SSR pre-rendered windows
  wm.adoptServerWindows();

  // Initialize Desktop shell (icons, taskbar, start menu, BSOD, context menu)
  const controller = new DesktopController(store, wm, icons, sound);
  controller.init();

  // If page was loaded on an app route but SSR didn't pre-render it (e.g. client navigation)
  if (data.initialRoute.appId && store.getAllWindows().length === 0 && !data.initialRoute.notFound) {
    wm.open(data.initialRoute.appId, {
      args: data.initialRoute.args ?? {},
      skipRouteSync: true,
    });
  }

  // Only a fresh load of the desktop opens the welcome window automatically.
  if (stripBase(data.initialRoute.path) === '/' && !data.initialRoute.appId && !data.initialRoute.notFound && welcomePreference.read()) {
    wm.open('welcome', { skipRouteSync: true });
  }

  // Handle browser back/forward history navigation
  window.addEventListener('popstate', (ev: PopStateEvent) => {
    const state = ev.state as { appId?: string; args?: Record<string, string> } | null;
    const pathname = stripBase(window.location.pathname).toLowerCase();

    if (pathname === '/') {
      const activeId = store.getActiveWindowId();
      if (activeId) wm.minimize(activeId);
      return;
    }

    if (state?.appId) {
      wm.open(state.appId, { args: state.args ?? {}, skipRouteSync: true });
    } else if (pathname === '/projects') {
      wm.open('projects', { skipRouteSync: true });
    } else if (pathname.startsWith('/projects/')) {
      const slug = pathname.replace('/projects/', '').replace('/', '');
      wm.open('project', { args: { slug }, skipRouteSync: true });
    } else if (pathname === '/resume') {
      wm.open('resume', { skipRouteSync: true });
    } else if (pathname === '/skills') {
      wm.open('sysprops', { skipRouteSync: true });
    }
  });

  // Expose global for E2E tests and debugging
  (window as unknown as { PedroOS: unknown }).PedroOS = {
    wm,
    store,
    registry,
    vfs,
    icons,
    sound,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
