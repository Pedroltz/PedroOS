// tests/client/unit.test.ts
import { strict as assert } from "node:assert";

// src/PedroOS.Web/Client/apps/MinesweeperEngine.ts
var DIFFICULTIES = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 }
};
var MinesweeperEngine = class {
  constructor(difficulty = "beginner") {
    this.difficulty = difficulty;
    const cfg = DIFFICULTIES[difficulty];
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.totalMines = cfg.mines;
    this.flagsRemaining = cfg.mines;
    this.reset(difficulty);
  }
  difficulty;
  rows;
  cols;
  totalMines;
  grid = [];
  status = "idle";
  flagsRemaining;
  elapsedSeconds = 0;
  firstClick = true;
  timerId = null;
  onStateChange;
  onTick;
  reset(difficulty = this.difficulty) {
    this.stopTimer();
    this.difficulty = difficulty;
    const cfg = DIFFICULTIES[difficulty];
    this.rows = cfg.rows;
    this.cols = cfg.cols;
    this.totalMines = cfg.mines;
    this.flagsRemaining = cfg.mines;
    this.status = "idle";
    this.firstClick = true;
    this.elapsedSeconds = 0;
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          adjacentMines: 0,
          state: "hidden"
        });
      }
      this.grid.push(row);
    }
    this.onStateChange?.();
    this.onTick?.(0);
  }
  startTimer() {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      if (this.status === "playing") {
        this.elapsedSeconds = Math.min(999, this.elapsedSeconds + 1);
        this.onTick?.(this.elapsedSeconds);
      }
    }, 1e3);
  }
  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  placeMines(excludeR, excludeC) {
    let placed = 0;
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      const isNearTarget = Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1;
      const isTarget = r === excludeR && c === excludeC;
      const shouldAvoid = this.rows * this.cols - this.totalMines > 9 ? isNearTarget : isTarget;
      if (!this.grid[r][c].isMine && !shouldAvoid) {
        this.grid[r][c].isMine = true;
        placed++;
      }
    }
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (!this.grid[r][c].isMine && !(r === excludeR && c === excludeC)) {
        this.grid[r][c].isMine = true;
        placed++;
      }
    }
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].isMine) {
          let count = 0;
          this.forEachNeighbor(r, c, (n) => {
            if (n.isMine) count++;
          });
          this.grid[r][c].adjacentMines = count;
        }
      }
    }
  }
  forEachNeighbor(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          fn(this.grid[nr][nc]);
        }
      }
    }
  }
  reveal(r, c) {
    if (this.status === "won" || this.status === "lost") return false;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state === "revealed" || cell.state === "flagged") return false;
    if (this.firstClick) {
      this.firstClick = false;
      this.placeMines(r, c);
      this.status = "playing";
      this.startTimer();
    }
    if (cell.isMine) {
      cell.exploded = true;
      this.gameOver(false);
      return false;
    }
    this.floodReveal(cell);
    this.checkWinCondition();
    this.onStateChange?.();
    return true;
  }
  floodReveal(cell) {
    if (cell.state === "revealed" || cell.state === "flagged") return;
    cell.state = "revealed";
    if (cell.adjacentMines === 0 && !cell.isMine) {
      this.forEachNeighbor(cell.row, cell.col, (neighbor) => {
        if (neighbor.state === "hidden") {
          this.floodReveal(neighbor);
        }
      });
    }
  }
  toggleFlag(r, c) {
    if (this.status === "won" || this.status === "lost") return;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state === "revealed") return;
    if (cell.state === "hidden") {
      cell.state = "flagged";
      this.flagsRemaining--;
    } else if (cell.state === "flagged") {
      cell.state = "hidden";
      this.flagsRemaining++;
    }
    this.onStateChange?.();
  }
  chord(r, c) {
    if (this.status !== "playing") return;
    const cell = this.grid[r]?.[c];
    if (!cell || cell.state !== "revealed" || cell.adjacentMines === 0) return;
    let flagCount = 0;
    this.forEachNeighbor(r, c, (n) => {
      if (n.state === "flagged") flagCount++;
    });
    if (flagCount === cell.adjacentMines) {
      this.forEachNeighbor(r, c, (n) => {
        if (n.state === "hidden") {
          this.reveal(n.row, n.col);
        }
      });
    }
  }
  checkWinCondition() {
    if (this.status !== "playing") return;
    let unrevealedSafe = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.isMine && cell.state !== "revealed") {
          unrevealedSafe++;
        }
      }
    }
    if (unrevealedSafe === 0) {
      this.gameOver(true);
    }
  }
  gameOver(won) {
    this.stopTimer();
    this.status = won ? "won" : "lost";
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (won) {
          if (cell.isMine) cell.state = "flagged";
        } else {
          if (cell.isMine && cell.state !== "flagged") {
            cell.state = "revealed";
          } else if (!cell.isMine && cell.state === "flagged") {
            cell.misflagged = true;
          }
        }
      }
    }
    if (won) {
      this.flagsRemaining = 0;
    }
    this.onStateChange?.();
  }
  isMine(r, c) {
    return Boolean(this.grid[r]?.[c]?.isMine);
  }
};

// src/PedroOS.Web/Client/core/VirtualFileSystemClient.ts
var VirtualFileSystemClient = class {
  constructor(root) {
    this.root = root;
    this.index(root);
  }
  root;
  byPath = /* @__PURE__ */ new Map();
  byId = /* @__PURE__ */ new Map();
  index(node) {
    this.byPath.set(node.path.toLowerCase(), node);
    this.byId.set(node.id.toLowerCase(), node);
    if (node.children) {
      for (const child of node.children) {
        this.index(child);
      }
    }
  }
  getRoot() {
    return this.root;
  }
  normalizePath(rawPath) {
    if (!rawPath || !rawPath.trim()) {
      return "C:\\";
    }
    const cleaned = rawPath.trim().replace(/\//g, "\\");
    if (cleaned.includes("..") || cleaned.startsWith("\\\\")) {
      return "";
    }
    if (/^c:\\?$/i.test(cleaned)) {
      return "C:\\";
    }
    if (!/^c:\\/i.test(cleaned)) {
      return "";
    }
    const parts = cleaned.slice(3).split("\\").map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.some((p) => p === "." || p === "..")) {
      return "";
    }
    return parts.length === 0 ? "C:\\" : `C:\\${parts.join("\\")}`;
  }
  resolvePath(virtualPath) {
    const normalized = this.normalizePath(virtualPath);
    if (!normalized) {
      return void 0;
    }
    return this.byPath.get(normalized.toLowerCase());
  }
  getParentPath(virtualPath) {
    const normalized = this.normalizePath(virtualPath);
    if (!normalized || normalized === "C:\\") {
      return "C:\\";
    }
    const idx = normalized.lastIndexOf("\\");
    return idx <= 2 ? "C:\\" : normalized.slice(0, idx);
  }
  listDirectory(virtualPath, includeHidden = false) {
    const node = this.resolvePath(virtualPath);
    if (!node?.children) {
      return [];
    }
    return includeHidden ? [...node.children] : node.children.filter((c) => !c.hidden);
  }
  listFoldersTree(includeHidden = false) {
    const out = [];
    const visit = (n) => {
      if (!includeHidden && n.hidden) {
        return;
      }
      if (n.type === "drive" || n.type === "folder") {
        out.push(n);
        for (const child of n.children ?? []) {
          visit(child);
        }
      }
    };
    visit(this.root);
    return out;
  }
  search(query, includeHidden = false) {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      return [];
    }
    const results = [];
    for (const node of this.byPath.values()) {
      if (node.type === "drive") {
        continue;
      }
      if (!includeHidden && node.hidden) {
        continue;
      }
      if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q) || node.description && node.description.toLowerCase().includes(q)) {
        results.push(node);
      }
    }
    return results;
  }
};

// src/PedroOS.Web/Client/core/DesktopStore.ts
var DesktopStore = class {
  windows = /* @__PURE__ */ new Map();
  activeWindowId = null;
  startMenuOpen = false;
  wallpaper = "solid";
  topZIndex = 20;
  listeners = /* @__PURE__ */ new Set();
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit(event) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
  nextZIndex() {
    this.topZIndex += 1;
    return this.topZIndex;
  }
  getWindow(windowId) {
    return this.windows.get(windowId);
  }
  getAllWindows() {
    return Array.from(this.windows.values());
  }
  findByInstanceKey(instanceKey) {
    for (const win of this.windows.values()) {
      if (win.instanceKey === instanceKey) {
        return win;
      }
    }
    return void 0;
  }
  getActiveWindowId() {
    return this.activeWindowId;
  }
  addWindow(record) {
    this.windows.set(record.id, record);
    this.emit({ type: "window-opened", window: record });
  }
  updateWindow(windowId, mutator) {
    const existing = this.windows.get(windowId);
    if (!existing) {
      return void 0;
    }
    mutator(existing);
    this.emit({ type: "window-updated", window: existing });
    return existing;
  }
  removeWindow(windowId) {
    const existed = this.windows.delete(windowId);
    if (!existed) {
      return false;
    }
    if (this.activeWindowId === windowId) {
      const nextTop = this.findTopVisibleWindow();
      this.setActiveWindow(nextTop?.id ?? null);
    }
    this.emit({ type: "window-closed", windowId });
    return true;
  }
  setActiveWindow(windowId) {
    if (this.activeWindowId === windowId) {
      if (windowId) {
        const current = this.windows.get(windowId);
        if (current && !current.focused) {
          current.focused = true;
          this.emit({ type: "window-updated", window: current });
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
        this.emit({ type: "window-updated", window: prev });
      }
    }
    if (windowId) {
      const next = this.windows.get(windowId);
      if (next) {
        next.focused = true;
        next.zIndex = this.nextZIndex();
        this.emit({ type: "window-updated", window: next });
      }
    }
    this.emit({ type: "focus-changed", activeWindowId: windowId });
  }
  findTopVisibleWindow() {
    let best;
    for (const win of this.windows.values()) {
      if (win.state === "minimized") {
        continue;
      }
      if (!best || win.zIndex > best.zIndex) {
        best = win;
      }
    }
    return best;
  }
  isStartMenuOpen() {
    return this.startMenuOpen;
  }
  setStartMenuOpen(open) {
    if (this.startMenuOpen === open) {
      return;
    }
    this.startMenuOpen = open;
    this.emit({ type: "start-menu-changed", open });
  }
  getWallpaper() {
    return this.wallpaper;
  }
  setWallpaper(wallpaper) {
    this.wallpaper = wallpaper;
    this.emit({ type: "wallpaper-changed", wallpaper });
  }
};

// src/PedroOS.Web/Client/core/AppRegistry.ts
var AppRegistry = class {
  definitions = /* @__PURE__ */ new Map();
  modules = /* @__PURE__ */ new Map();
  constructor(initialDefinitions = []) {
    for (const def of initialDefinitions) {
      this.registerDefinition(def);
    }
  }
  registerDefinition(definition) {
    this.definitions.set(definition.id.toLowerCase(), definition);
  }
  registerClientApp(appId, module) {
    this.modules.set(appId.toLowerCase(), module);
  }
  getDefinition(appId) {
    if (!appId || !/^[a-z0-9-]{1,40}$/i.test(appId)) {
      return void 0;
    }
    return this.definitions.get(appId.toLowerCase());
  }
  getClientModule(appId) {
    return this.modules.get(appId.toLowerCase());
  }
  getAllDefinitions() {
    return Array.from(this.definitions.values());
  }
};

// src/PedroOS.Web/Client/core/IconRegistryClient.ts
var IconRegistryClient = class {
  entries = /* @__PURE__ */ new Map();
  basePath = "/assets/icons";
  constructor(manifest = {}) {
    for (const [key, value] of Object.entries(manifest)) {
      this.entries.set(key.toLowerCase(), value);
    }
  }
  getPath(key, size = 32) {
    const normalizedSize = size <= 16 ? 16 : size <= 32 ? 32 : 48;
    const safeKey = (key || "").toLowerCase();
    if (/^[a-z0-9-]+$/.test(safeKey)) {
      const entry = this.entries.get(safeKey);
      if (entry) {
        return `${this.basePath}/${entry.category}/${safeKey}-${normalizedSize}.png`;
      }
    }
    return `${this.basePath}/system/exe-${normalizedSize}.png`;
  }
  getGlyphPath(name) {
    const safe = (name || "").toLowerCase();
    if (/^[a-z0-9-]+$/.test(safe)) {
      return `${this.basePath}/ui/px-${safe}.svg`;
    }
    return `${this.basePath}/ui/px-file.svg`;
  }
};

// tests/client/unit.test.ts
console.log("--- Starting Client Unit Tests ---");
{
  console.log("Testing MinesweeperEngine...");
  const engine = new MinesweeperEngine("beginner");
  assert.equal(engine.rows, 9);
  assert.equal(engine.cols, 9);
  assert.equal(engine.totalMines, 10);
  assert.equal(engine.status, "idle");
  assert.equal(engine.flagsRemaining, 10);
  const firstClickResult = engine.reveal(4, 4);
  assert.equal(firstClickResult, true);
  assert.equal(engine.status, "playing");
  assert.equal(engine.isMine(4, 4), false, "First click cell must never be a mine");
  assert.equal(engine.grid[4][4].state, "revealed");
  engine.toggleFlag(0, 0);
  if (engine.grid[0][0].state === "flagged") {
    assert.equal(engine.flagsRemaining, 9);
    engine.toggleFlag(0, 0);
    assert.equal(engine.flagsRemaining, 10);
  }
  engine.reset("intermediate");
  assert.equal(engine.rows, 16);
  assert.equal(engine.cols, 16);
  assert.equal(engine.totalMines, 40);
  assert.equal(engine.status, "idle");
  console.log("\u2713 MinesweeperEngine passed");
}
{
  console.log("Testing VirtualFileSystemClient...");
  const sampleTree = {
    id: "drive-c",
    name: "PedroOS (C:)",
    type: "drive",
    path: "C:\\",
    icon: "drive",
    children: [
      {
        id: "dir-projects",
        name: "Projects",
        type: "folder",
        path: "C:\\Projects",
        icon: "folder",
        children: [
          {
            id: "file-ofizzy",
            name: "Ofizzy.exe",
            type: "application",
            path: "C:\\Projects\\Ofizzy.exe",
            icon: "ofizzy"
          }
        ]
      }
    ]
  };
  const vfs = new VirtualFileSystemClient(sampleTree);
  assert.equal(vfs.resolvePath("c:/projects")?.path, "C:\\Projects");
  assert.equal(vfs.normalizePath("C:\\..\\Windows"), "", "Path traversal must be rejected");
  assert.equal(vfs.normalizePath("/etc/passwd"), "", "Non C: path must be rejected");
  const root = vfs.resolvePath("C:\\");
  assert.ok(root);
  assert.equal(root?.type, "drive");
  const ofizzy = vfs.resolvePath("C:\\Projects\\Ofizzy.exe");
  assert.ok(ofizzy);
  assert.equal(ofizzy?.name, "Ofizzy.exe");
  const searchHits = vfs.search("ofizzy");
  assert.equal(searchHits.length, 1);
  assert.equal(searchHits[0].name, "Ofizzy.exe");
  console.log("\u2713 VirtualFileSystemClient passed");
}
{
  console.log("Testing DesktopStore...");
  const store = new DesktopStore();
  const win1 = {
    id: "win-1",
    appId: "projects",
    instanceKey: "projects",
    title: "Projects",
    icon: "projects",
    x: 50,
    y: 50,
    width: 600,
    height: 400,
    minWidth: 200,
    minHeight: 150,
    state: "normal",
    restoreBounds: { x: 50, y: 50, width: 600, height: 400 },
    zIndex: 20,
    focused: true,
    resizable: true,
    maximizable: true,
    args: {}
  };
  store.addWindow(win1);
  assert.equal(store.getAllWindows().length, 1);
  assert.equal(store.getWindow("win-1")?.title, "Projects");
  store.setActiveWindow("win-1");
  assert.equal(store.getActiveWindowId(), "win-1");
  store.updateWindow("win-1", (w) => {
    w.state = "minimized";
  });
  assert.equal(store.getWindow("win-1")?.state, "minimized");
  store.removeWindow("win-1");
  assert.equal(store.getAllWindows().length, 0);
  assert.equal(store.getActiveWindowId(), null);
  console.log("\u2713 DesktopStore passed");
}
{
  console.log("Testing AppRegistry & IconRegistryClient...");
  const registry = new AppRegistry([
    {
      id: "explorer",
      title: "Windows Explorer",
      icon: "explorer",
      content: "client",
      defaultWidth: 600,
      defaultHeight: 400,
      minWidth: 200,
      minHeight: 150,
      resizable: true,
      maximizable: true,
      multiInstance: true
    }
  ]);
  assert.ok(registry.getDefinition("explorer"));
  assert.equal(registry.getDefinition("nonexistent"), void 0);
  const icons = new IconRegistryClient({
    "my-computer": { category: "system", description: "Computer", sizes: [16, 32, 48] }
  });
  assert.equal(icons.getPath("my-computer", 32), "/assets/icons/system/my-computer-32.png");
  assert.equal(icons.getPath("unknown", 16), "/assets/icons/system/exe-16.png");
  console.log("\u2713 AppRegistry & IconRegistryClient passed");
}
console.log("--- ALL CLIENT UNIT TESTS PASSED ---");
