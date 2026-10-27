import { strict as assert } from 'node:assert';
import { MinesweeperEngine } from '../../src/PedroOS.Web/Client/apps/MinesweeperEngine.js';
import { VirtualFileSystemClient } from '../../src/PedroOS.Web/Client/core/VirtualFileSystemClient.js';
import { DesktopStore } from '../../src/PedroOS.Web/Client/core/DesktopStore.js';
import { AppRegistry } from '../../src/PedroOS.Web/Client/core/AppRegistry.js';
import { IconRegistryClient } from '../../src/PedroOS.Web/Client/core/IconRegistryClient.js';
import type { VirtualNode, WindowRecord } from '../../src/PedroOS.Web/Client/types/index.js';

console.log('--- Starting Client Unit Tests ---');

// 1. MinesweeperEngine tests
{
  console.log('Testing MinesweeperEngine...');
  const engine = new MinesweeperEngine('beginner');
  assert.equal(engine.rows, 9);
  assert.equal(engine.cols, 9);
  assert.equal(engine.totalMines, 10);
  assert.equal(engine.status, 'idle');
  assert.equal(engine.flagsRemaining, 10);

  // Safe first click
  const firstClickResult = engine.reveal(4, 4);
  assert.equal(firstClickResult, true);
  assert.equal(engine.status, 'playing');
  assert.equal(engine.isMine(4, 4), false, 'First click cell must never be a mine');
  assert.equal(engine.grid[4][4].state, 'revealed');

  // Flag toggling
  engine.toggleFlag(0, 0);
  if (engine.grid[0][0].state === 'flagged') {
    assert.equal(engine.flagsRemaining, 9);
    engine.toggleFlag(0, 0);
    assert.equal(engine.flagsRemaining, 10);
  }

  // Reset
  engine.reset('intermediate');
  assert.equal(engine.rows, 16);
  assert.equal(engine.cols, 16);
  assert.equal(engine.totalMines, 40);
  assert.equal(engine.status, 'idle');
  console.log('✓ MinesweeperEngine passed');
}

// 2. VirtualFileSystemClient tests
{
  console.log('Testing VirtualFileSystemClient...');
  const sampleTree: VirtualNode = {
    id: 'drive-c',
    name: 'PedroOS (C:)',
    type: 'drive',
    path: 'C:\\',
    icon: 'drive',
    children: [
      {
        id: 'dir-projects',
        name: 'Projects',
        type: 'folder',
        path: 'C:\\Projects',
        icon: 'folder',
        children: [
          {
            id: 'file-ofizzy',
            name: 'Ofizzy.exe',
            type: 'application',
            path: 'C:\\Projects\\Ofizzy.exe',
            icon: 'ofizzy',
          },
        ],
      },
    ],
  };

  const vfs = new VirtualFileSystemClient(sampleTree);
  assert.equal(vfs.resolvePath('c:/projects')?.path, 'C:\\Projects');
  assert.equal(vfs.normalizePath('C:\\..\\Windows'), '', 'Path traversal must be rejected');
  assert.equal(vfs.normalizePath('/etc/passwd'), '', 'Non C: path must be rejected');

  const root = vfs.resolvePath('C:\\');
  assert.ok(root);
  assert.equal(root?.type, 'drive');

  const ofizzy = vfs.resolvePath('C:\\Projects\\Ofizzy.exe');
  assert.ok(ofizzy);
  assert.equal(ofizzy?.name, 'Ofizzy.exe');

  const searchHits = vfs.search('ofizzy');
  assert.equal(searchHits.length, 1);
  assert.equal(searchHits[0].name, 'Ofizzy.exe');

  console.log('✓ VirtualFileSystemClient passed');
}

// 3. DesktopStore tests
{
  console.log('Testing DesktopStore...');
  const store = new DesktopStore();
  const win1: WindowRecord = {
    id: 'win-1',
    appId: 'projects',
    instanceKey: 'projects',
    title: 'Projects',
    icon: 'projects',
    x: 50,
    y: 50,
    width: 600,
    height: 400,
    minWidth: 200,
    minHeight: 150,
    state: 'normal',
    restoreBounds: { x: 50, y: 50, width: 600, height: 400 },
    zIndex: 20,
    focused: true,
    resizable: true,
    maximizable: true,
    args: {},
  };

  store.addWindow(win1);
  assert.equal(store.getAllWindows().length, 1);
  assert.equal(store.getWindow('win-1')?.title, 'Projects');

  store.setActiveWindow('win-1');
  assert.equal(store.getActiveWindowId(), 'win-1');

  store.updateWindow('win-1', (w) => {
    w.state = 'minimized';
  });
  assert.equal(store.getWindow('win-1')?.state, 'minimized');

  store.removeWindow('win-1');
  assert.equal(store.getAllWindows().length, 0);
  assert.equal(store.getActiveWindowId(), null);

  console.log('✓ DesktopStore passed');
}

// 4. AppRegistry & IconRegistryClient tests
{
  console.log('Testing AppRegistry & IconRegistryClient...');
  const registry = new AppRegistry([
    {
      id: 'explorer',
      title: 'Windows Explorer',
      icon: 'explorer',
      content: 'client',
      defaultWidth: 600,
      defaultHeight: 400,
      minWidth: 200,
      minHeight: 150,
      resizable: true,
      maximizable: true,
      multiInstance: true,
    },
  ]);

  assert.ok(registry.getDefinition('explorer'));
  assert.equal(registry.getDefinition('nonexistent'), undefined);

  const icons = new IconRegistryClient({
    'my-computer': { category: 'system', description: 'Computer', sizes: [16, 32, 48] },
  });
  assert.equal(icons.getPath('my-computer', 32), '/assets/icons/system/my-computer-32.png');
  assert.equal(icons.getPath('unknown', 16), '/assets/icons/system/exe-16.png');
  console.log('✓ AppRegistry & IconRegistryClient passed');
}


// Window pressure is probabilistic only for new windows above the threshold.
{
  const { WindowPressure } = await import('../../src/PedroOS.Web/Client/core/WindowPressure.js');
  let now = 100_000;
  let roll = .079;
  let draws = 0;
  const pressure = new WindowPressure(() => { draws++; return roll; }, () => now);
  assert.equal(pressure.shouldFail(3), false);
  assert.equal(draws, 0);
  assert.equal(pressure.shouldFail(4), true);
  roll = .08;
  assert.equal(pressure.shouldFail(4), false);
  assert.equal(pressure.shouldFail(5), true);
  roll = .6;
  assert.equal(pressure.shouldFail(50), false, 'Probability is capped at 60%.');
  roll = 0;
  pressure.recover();
  const previousDraws = draws;
  assert.equal(pressure.shouldFail(50), false);
  assert.equal(draws, previousDraws, 'No random draw during recovery cooldown.');
  now += 59_999;
  assert.equal(pressure.shouldFail(50), false);
  now++;
  assert.equal(pressure.shouldFail(4), true);
  console.log('✓ WindowPressure passed');
}


// Welcome preference survives reloads and falls back to memory without storage.
{
  const { WelcomePreference, WELCOME_PREFERENCE_KEY } = await import('../../src/PedroOS.Web/Client/core/WelcomePreference.js');
  let saved: string | null = null;
  const storage = { getItem: (key: string) => { assert.equal(key, WELCOME_PREFERENCE_KEY); return saved; }, setItem: (key: string, value: string) => { assert.equal(key, WELCOME_PREFERENCE_KEY); saved = value; } };
  const first = new WelcomePreference(() => storage);
  assert.equal(first.read(), true);
  first.set(false);
  assert.equal(new WelcomePreference(() => storage).read(), false);
  first.set(true);
  assert.equal(new WelcomePreference(() => storage).read(), true);
  saved = 'invalid json';
  assert.equal(new WelcomePreference(() => storage).read(), true);
  saved = '{"showOnStartup":"false"}';
  assert.equal(new WelcomePreference(() => storage).read(), true);
  const unavailable = new WelcomePreference(() => { throw new Error('Storage blocked'); });
  assert.equal(unavailable.read(), true);
  unavailable.set(false);
  assert.equal(unavailable.read(), false);
  const readOnly = new WelcomePreference(() => ({ getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } }));
  readOnly.set(false);
  assert.equal(readOnly.read(), false);
  console.log('✓ WelcomePreference passed');
}

console.log('--- ALL CLIENT UNIT TESTS PASSED ---');
