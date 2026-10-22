import type { AppMountContext, ClientAppModule, VirtualNode } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';

export type ExplorerViewMode = 'icons' | 'small-icons' | 'list' | 'details';

export class ExplorerApp implements ClientAppModule {
  public constructor(
    private readonly vfs: VirtualFileSystemClient,
    private readonly icons: IconRegistryClient,
    private readonly defaultPath = 'C:\\',
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const initialPath = this.vfs.normalizePath(ctx.args.path || this.defaultPath) || 'C:\\';
    let currentPath = this.vfs.resolvePath(initialPath) ? initialPath : 'C:\\';
    const history: string[] = [currentPath];
    let historyIndex = 0;
    let viewMode: ExplorerViewMode = 'icons';
    let showHidden = currentPath.toUpperCase().includes('PEDROOS');
    const selectedPaths = new Set<string>();
    let lastAnchorPath: string | null = null;
    let activeDropdown: string | null = null;
    let treeWidth = 200;
    const listeners = new AbortController();

    // Sorting state for details view
    let sortColumn: 'name' | 'type' | 'size' | 'modified' = 'name';
    let sortAscending = true;

    // Expanded folders set in tree view
    const expandedFolders = new Set<string>(['C:\\', 'C:\\Projects', 'C:\\AboutMe']);

    ctx.container.innerHTML = `
      <div class="app-shell explorer-app" data-explorer-instance="${ctx.windowId}">
        <!-- 1. Menubar with Dropdowns -->
        <div class="win95-menubar" role="menubar" aria-label="Menu do Windows Explorer" data-exp-menubar>
          <div class="win95-menu-item" data-menu="file">
            <button type="button" class="win95-menu-btn" data-menu-trigger="file"><u>F</u>ile</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="file-open"><u>O</u>pen</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-explore"><u>E</u>xplore</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Create <u>S</u>hortcut</button></li>
              <li><button type="button" class="win95-dropdown-item" disabled><u>D</u>elete</button></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Rena<u>m</u>e</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-properties">P<u>r</u>operties</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-close"><u>C</u>lose</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="edit">
            <button type="button" class="win95-menu-btn" data-menu-trigger="edit"><u>E</u>dit</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" disabled><u>U</u>ndo</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Cu<u>t</u></button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-copy"><u>C</u>opy <span class="shortcut-key">Ctrl+C</span></button></li>
              <li><button type="button" class="win95-dropdown-item" disabled><u>P</u>aste</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-select-all">Select <u>A</u>ll <span class="shortcut-key">Ctrl+A</span></button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-invert-selection"><u>I</u>nvert Selection</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="view">
            <button type="button" class="win95-menu-btn" data-menu-trigger="view"><u>V</u>iew</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-exp-view="icons" data-check="icons">Lar<u>g</u>e Icons</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="small-icons" data-check="small-icons">S<u>m</u>all Icons</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="list" data-check="list"><u>L</u>ist</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="details" data-check="details"><u>D</u>etails</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-name">Arrange Icons by <u>N</u>ame</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-type">Arrange Icons by <u>T</u>ype</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-size">Arrange Icons by <u>S</u>ize</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="view-refresh"><u>R</u>efresh <span class="shortcut-key">F5</span></button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="view-options" data-check="hidden">Show <u>H</u>idden Files</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="go">
            <button type="button" class="win95-menu-btn" data-menu-trigger="go"><u>G</u>o</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="go-back" data-exp-go-back><u>B</u>ack</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="go-forward" data-exp-go-fwd><u>F</u>orward</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="go-up" data-exp-go-up><u>U</u>p One Level</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\"><u>H</u>ome (C:\\)</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Projects"><u>P</u>rojects (C:\\Projects)</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="favorites">
            <button type="button" class="win95-menu-btn" data-menu-trigger="favorites">Fa<u>v</u>orites</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Projects">${this.icons.render('folder', 16)} C:\\Projects</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\AboutMe">${this.icons.render('folder', 16)} C:\\AboutMe</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Skills">${this.icons.render('folder', 16)} C:\\Skills</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\PEDROOS">${this.icons.render('folder', 16)} C:\\PEDROOS</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="help">
            <button type="button" class="win95-menu-btn" data-menu-trigger="help"><u>H</u>elp</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="help-topics"><u>H</u>elp Topics</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="help-about"><u>A</u>bout Windows Explorer</button></li>
            </ul>
          </div>
        </div>

        <!-- 2. Classic Toolbar with Pixel-art Controls -->
        <div class="win95-toolbar" role="toolbar" aria-label="Barra de ferramentas do Explorer">
          <button type="button" class="toolbar-btn" data-exp-back aria-label="Back" title="Back" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-left')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-forward aria-label="Forward" title="Forward" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-right')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-up aria-label="Up One Level" title="Up One Level">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-up')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-cut aria-label="Cut" title="Cut" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('cut')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-copy aria-label="Copy" title="Copy">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('copy')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-paste aria-label="Paste" title="Paste" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('paste')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-undo aria-label="Undo" title="Undo" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('undo')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-delete aria-label="Delete" title="Delete" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('delete')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-properties aria-label="Properties" title="Properties">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('properties')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn active" data-exp-view="icons" aria-label="Large Icons" title="Large Icons" aria-pressed="true">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('icons')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="small-icons" aria-label="Small Icons" title="Small Icons" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('list')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="list" aria-label="List" title="List" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('bulletlist')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="details" aria-label="Details" title="Details" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('details')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-hidden aria-pressed="${showHidden}" title="Mostrar ou ocultar arquivos de sistema">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('check')}" width="16" height="16" alt="" />
          </button>
        </div>

        <!-- 3. Address Bar with Combobox -->
        <form class="win95-addressbar" data-exp-address-form>
          <label class="addressbar-label" for="exp-addr-${ctx.windowId}">Address</label>
          <div class="addressbar-combobox">
            <img class="pixel-icon addressbar-icon" data-exp-addr-icon src="${this.icons.getPath('drive', 16)}" width="16" height="16" alt="" />
            <input id="exp-addr-${ctx.windowId}"
                   class="addressbar-input"
                   type="text"
                   value="${this.escapeAttr(currentPath)}"
                   list="exp-quick-paths-${ctx.windowId}"
                   aria-label="Endereço da pasta virtual"
                   data-exp-address />
            <datalist id="exp-quick-paths-${ctx.windowId}">
              <option value="C:\\">Local Disk (C:)</option>
              <option value="C:\\Projects">Projects</option>
              <option value="C:\\AboutMe">About Me</option>
              <option value="C:\\Skills">Skills</option>
              <option value="C:\\PEDROOS">PedroOS System</option>
            </datalist>
          </div>
          <button type="submit" class="addressbar-go">Go</button>
        </form>

        <!-- 4. Main Area: Left Tree, Draggable Splitter, Right Files Area -->
        <div class="explorer-split">
          <aside class="explorer-tree-pane sunken-panel" data-exp-tree-pane aria-label="Árvore de pastas" style="width: ${treeWidth}px">
            <div class="explorer-pane-header">All Folders</div>
            <ul class="tree-view explorer-tree" data-exp-tree role="tree"></ul>
          </aside>

          <div class="explorer-splitter" data-exp-splitter title="Arraste para redimensionar painéis"></div>

          <section class="explorer-files-pane sunken-panel" aria-label="Arquivos e pastas">
            <div class="explorer-pane-header" data-exp-pane-title>Contents of '${this.escapeHtml(currentPath)}'</div>
            <div class="explorer-items-viewport" data-exp-viewport tabindex="0">
              <div class="explorer-items view-large-icons" data-exp-items role="listbox" aria-label="Itens da pasta"></div>
            </div>
          </section>
        </div>

        <!-- 5. 3-Part Windows 95 Status Bar -->
        <div class="status-bar" role="status">
          <p class="status-bar-field" data-exp-status-count>0 object(s)</p>
          <p class="status-bar-field" data-exp-status-size>0 bytes</p>
          <p class="status-bar-field" data-exp-status-detail>Local Disk (C:)</p>
        </div>

        <!-- Context menu (hidden by default) -->
        <div class="explorer-context-menu window" data-exp-context-menu style="display:none;" role="menu"></div>
      </div>
    `;

    // DOM Elements
    const backBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-back]')!;
    const forwardBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-forward]')!;
    const upBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-up]')!;
    const copyBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-copy]')!;
    const propsBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-properties]')!;
    const toolbarViewButtons = ctx.container.querySelectorAll<HTMLButtonElement>('.toolbar-btn[data-exp-view]');
    const hiddenBtns = ctx.container.querySelectorAll<HTMLButtonElement>('[data-exp-hidden]');
    const addressForm = ctx.container.querySelector<HTMLFormElement>('[data-exp-address-form]')!;
    const addressInput = ctx.container.querySelector<HTMLInputElement>('[data-exp-address]')!;
    const addressIcon = ctx.container.querySelector<HTMLImageElement>('[data-exp-addr-icon]')!;
    const treePane = ctx.container.querySelector<HTMLElement>('[data-exp-tree-pane]')!;
    const splitter = ctx.container.querySelector<HTMLElement>('[data-exp-splitter]')!;
    const treeEl = ctx.container.querySelector<HTMLUListElement>('[data-exp-tree]')!;
    const paneTitleEl = ctx.container.querySelector<HTMLElement>('[data-exp-pane-title]')!;
    const viewportEl = ctx.container.querySelector<HTMLElement>('[data-exp-viewport]')!;
    const itemsEl = ctx.container.querySelector<HTMLElement>('[data-exp-items]')!;
    const statusCountEl = ctx.container.querySelector<HTMLElement>('[data-exp-status-count]')!;
    const statusSizeEl = ctx.container.querySelector<HTMLElement>('[data-exp-status-size]')!;
    const statusDetailEl = ctx.container.querySelector<HTMLElement>('[data-exp-status-detail]')!;
    const contextMenuEl = ctx.container.querySelector<HTMLElement>('[data-exp-context-menu]')!;

    // Helper: shows classic Win95 alert dialog for invalid paths
    const showNotFoundError = (badPath: string): void => {
      statusDetailEl.textContent = `Path not found: ${badPath}`;
      alert(`Cannot find '${badPath}'.\n\nMake sure the path or filename is correct and try again.`);
    };

    // Navigation logic
    const navigateTo = (targetPath: string, pushHistory = true): void => {
      const resolved = this.vfs.resolvePath(targetPath);
      if (!resolved || (resolved.type !== 'drive' && resolved.type !== 'folder')) {
        showNotFoundError(targetPath);
        return;
      }
      currentPath = resolved.path;
      selectedPaths.clear();
      lastAnchorPath = null;

      // Auto-expand parents in the tree
      let parent = currentPath;
      while (parent && parent !== 'C:\\') {
        expandedFolders.add(parent);
        parent = this.vfs.getParentPath(parent);
      }
      expandedFolders.add('C:\\');

      if (pushHistory && history[historyIndex] !== currentPath) {
        history.splice(historyIndex + 1);
        history.push(currentPath);
        historyIndex = history.length - 1;
      }

      const iconKey = currentPath === 'C:\\' ? 'drive' : 'folder-open';
      ctx.setTitle(`Exploring - ${currentPath}`, iconKey);
      render();
    };

    let lastActionTime = 0;
    let lastActionPath = '';
    const activateNode = (node: VirtualNode): void => {
      const now = Date.now();
      if (lastActionPath === node.path && now - lastActionTime < 450) {
        return;
      }
      lastActionPath = node.path;
      lastActionTime = now;

      if (node.type === 'drive' || node.type === 'folder' || node.action?.kind === 'navigate') {
        navigateTo(node.path, true);
        return;
      }
      if (node.action?.kind === 'open-url' && node.action.url) {
        window.open(node.action.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (node.action?.kind === 'open-app' && node.action.appId) {
        ctx.windowManager.open(node.action.appId, { args: node.action.args ?? {} });
      }
    };

    const copySelected = (): void => {
      if (selectedPaths.size === 0) return;
      const text = Array.from(selectedPaths).join('\n');
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      statusDetailEl.textContent = `Copied ${selectedPaths.size} item(s) to clipboard`;
    };

    const selectAll = (): void => {
      const children = this.vfs.listDirectory(currentPath, showHidden);
      selectedPaths.clear();
      for (const c of children) {
        selectedPaths.add(c.path);
      }
      renderItems();
      updateStatus();
    };

    const invertSelection = (): void => {
      const children = this.vfs.listDirectory(currentPath, showHidden);
      const newSel = new Set<string>();
      for (const c of children) {
        if (!selectedPaths.has(c.path)) {
          newSel.add(c.path);
        }
      }
      selectedPaths.clear();
      for (const p of newSel) {
        selectedPaths.add(p);
      }
      renderItems();
      updateStatus();
    };

    // Close any open menubar dropdowns
    const closeDropdowns = (): void => {
      activeDropdown = null;
      ctx.container.querySelectorAll('.win95-menu-dropdown').forEach((el) => {
        el.classList.remove('open');
      });
      ctx.container.querySelectorAll('.win95-menu-btn').forEach((btn) => {
        btn.classList.remove('active');
      });
      if (contextMenuEl) {
        contextMenuEl.style.display = 'none';
      }
    };

    // Tree View Rendering
    const renderTree = (): void => {
      const rootNode = this.vfs.getRoot();
      const isCSelected = currentPath.toLowerCase() === 'c:\\';

      const renderNode = (node: VirtualNode, level: number): string => {
        const isSelected = node.path.toLowerCase() === currentPath.toLowerCase();
        const hasChildren = node.children && node.children.some((c) => (c.type === 'folder' || c.type === 'drive') && (showHidden || !c.hidden));
        const isExpanded = expandedFolders.has(node.path);
        const iconKey = isSelected && node.type === 'folder' ? 'folder-open' : node.icon;

        let childrenHtml = '';
        if (hasChildren && isExpanded && node.children) {
          const folderChildren = node.children.filter((c) => (c.type === 'folder' || c.type === 'drive') && (showHidden || !c.hidden));
          childrenHtml = `<ul>${folderChildren.map((c) => renderNode(c, level + 1)).join('')}</ul>`;
        }

        const expanderSymbol = hasChildren ? (isExpanded ? '−' : '+') : '';
        const expanderClass = hasChildren ? 'tree-expander' : 'tree-expander empty';

        return `
          <li role="treeitem" aria-expanded="${isExpanded}">
            <div class="tree-row">
              <span class="${expanderClass}" data-exp-toggle="${this.escapeAttr(node.path)}">${expanderSymbol}</span>
              <button type="button"
                      class="explorer-tree-btn ${isSelected ? 'selected' : ''}"
                      data-tree-path="${this.escapeAttr(node.path)}"
                      tabindex="${isSelected ? '0' : '-1'}">
                ${this.icons.render(iconKey, 16)}
                <span>${this.escapeHtml(node.name)}</span>
              </button>
            </div>
            ${childrenHtml}
          </li>`;
      };

      // Desktop -> My Computer -> C:\
      const cExpanded = expandedFolders.has('C:\\');
      const cChildren = rootNode.children
        ? rootNode.children.filter((c) => (c.type === 'folder' || c.type === 'drive') && (showHidden || !c.hidden))
        : [];
      const cChildrenHtml = cExpanded
        ? `<ul>${cChildren.map((c) => renderNode(c, 2)).join('')}</ul>`
        : '';

      treeEl.innerHTML = `
        <li role="treeitem" aria-expanded="true">
          <div class="tree-row">
            <span class="tree-expander">−</span>
            <button type="button" class="explorer-tree-btn ${isCSelected ? '' : ''}" data-tree-path="C:\\">
              ${this.icons.render('my-computer', 16)}
              <span>My Computer</span>
            </button>
          </div>
          <ul>
            <li role="treeitem" aria-expanded="${cExpanded}">
              <div class="tree-row">
                <span class="tree-expander" data-exp-toggle="C:\\">${cExpanded ? '−' : '+'}</span>
                <button type="button" class="explorer-tree-btn ${isCSelected ? 'selected' : ''}" data-tree-path="C:\\">
                  ${this.icons.render('drive', 16)}
                  <span>Local Disk (C:)</span>
                </button>
              </div>
              ${cChildrenHtml}
            </li>
          </ul>
        </li>
      `;
    };

    // Sort items helper
    const sortNodes = (nodes: VirtualNode[]): VirtualNode[] => {
      return [...nodes].sort((a, b) => {
        // Folders always precede files in Windows 95
        const aIsFolder = a.type === 'drive' || a.type === 'folder';
        const bIsFolder = b.type === 'drive' || b.type === 'folder';
        if (aIsFolder !== bIsFolder) {
          return aIsFolder ? -1 : 1;
        }

        let diff = 0;
        if (sortColumn === 'name') {
          diff = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        } else if (sortColumn === 'type') {
          diff = a.type.localeCompare(b.type);
        } else if (sortColumn === 'size') {
          diff = this.sizeInBytes(a.size) - this.sizeInBytes(b.size);
        } else if (sortColumn === 'modified') {
          diff = a.name.localeCompare(b.name);
        }
        return sortAscending ? diff : -diff;
      });
    };

    // Render contents pane according to current view mode
    const renderItems = (): void => {
      const rawChildren = this.vfs.listDirectory(currentPath, showHidden);
      const children = sortNodes(rawChildren);

      let viewClass = 'view-large-icons';
      if (viewMode === 'small-icons') viewClass = 'view-small-icons';
      else if (viewMode === 'list') viewClass = 'view-list';
      else if (viewMode === 'details') viewClass = 'view-details';

      itemsEl.className = `explorer-items ${viewClass}`;

      if (children.length === 0) {
        itemsEl.innerHTML = `<div class="explorer-empty" style="padding: 16px; color: #666; font-style: italic;">This folder is empty.</div>`;
        return;
      }

      if (viewMode === 'icons') {
        // Large Icons (32x32)
        itemsEl.innerHTML = children
          .map((item) => {
            const isSelected = selectedPaths.has(item.path);
            return `
              <button type="button"
                      class="explorer-item ${isSelected ? 'selected' : ''}"
                      role="option"
                      aria-selected="${isSelected}"
                      data-node-path="${this.escapeAttr(item.path)}"
                      title="${this.escapeAttr(item.name + (item.description ? " — " + item.description : ""))}">
                ${this.icons.render(item.icon, 32)}
                <span class="explorer-item-name">${this.fileLabel(item.name)}</span>
              </button>`;
          })
          .join('');
      } else if (viewMode === 'small-icons' || viewMode === 'list') {
        // Small Icons / List (16x16 with label on right)
        itemsEl.innerHTML = children
          .map((item) => {
            const isSelected = selectedPaths.has(item.path);
            return `
              <button type="button"
                      class="explorer-item ${isSelected ? 'selected' : ''}"
                      role="option"
                      aria-selected="${isSelected}"
                      data-node-path="${this.escapeAttr(item.path)}"
                      title="${this.escapeAttr(item.name + (item.description ? " — " + item.description : ""))}">
                ${this.icons.render(item.icon, 16)}
                <span class="explorer-item-name">${this.escapeHtml(item.name)}</span>
              </button>`;
          })
          .join('');
      } else {
        // Details View with table, sortable headers, and sort indicators
        const arrow = (col: string): string =>
          sortColumn === col ? `<span class="sort-indicator">${sortAscending ? '▲' : '▼'}</span>` : '';

        itemsEl.innerHTML = `
          <table class="explorer-details-table">
            <thead>
              <tr>
                <th tabindex="0" role="columnheader" aria-sort="${sortColumn === 'name' ? (sortAscending ? 'ascending' : 'descending') : 'none'}" data-sort="name">Name ${arrow('name')}</th>
                <th tabindex="0" role="columnheader" data-sort="type">Type ${arrow('type')}</th>
                <th tabindex="0" role="columnheader" data-sort="size">Size ${arrow('size')}</th>
                <th tabindex="0" role="columnheader" data-sort="modified">Modified ${arrow('modified')}</th>
              </tr>
            </thead>
            <tbody>
              ${children
                .map((item) => {
                  const isSelected = selectedPaths.has(item.path);
                  const typeLabel =
                    item.type === 'drive'
                      ? 'Local Disk'
                      : item.type === 'folder'
                      ? 'File Folder'
                      : item.type === 'application'
                      ? 'Application'
                      : item.type === 'document'
                      ? 'WordPad Document'
                      : item.type === 'text'
                      ? 'Text Document'
                      : 'File';
                  const sizeLabel = item.size ?? (item.type === 'folder' || item.type === 'drive' ? '' : '1 KB');
                  const modifiedDate = '22/10/1995 12:00';

                  return `
                    <tr class="explorer-row ${isSelected ? 'selected' : ''}"
                        role="row"
                        aria-selected="${isSelected}"
                        data-node-path="${this.escapeAttr(item.path)}" title="${this.escapeAttr(item.name)}" tabindex="-1">
                      <td>
                        <div class="explorer-row-name-cell">
                          ${this.icons.render(item.icon, 16)}
                          <span>${this.escapeHtml(item.name)}</span>
                        </div>
                      </td>
                      <td>${this.escapeHtml(typeLabel)}</td>
                      <td>${this.escapeHtml(sizeLabel)}</td>
                      <td>${this.escapeHtml(modifiedDate)}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>`;
      }
    };

    const updateStatus = (): void => {
      const children = this.vfs.listDirectory(currentPath, showHidden);
      const totalCount = children.length;
      const selCount = selectedPaths.size;

      statusCountEl.textContent = `${totalCount} object(s)`;

      if (selCount === 0) {
        statusSizeEl.textContent = '0 bytes';
        statusDetailEl.textContent = currentPath === 'C:\\' ? 'Local Disk (C:)' : currentPath;
      } else if (selCount === 1) {
        const first = Array.from(selectedPaths)[0];
        const selNode = this.vfs.resolvePath(first);
        statusSizeEl.textContent = selNode?.size || (selNode?.type === 'folder' ? 'Folder' : '1 KB');
        statusDetailEl.textContent = selNode ? `${selNode.name} — ${selNode.description ?? selNode.path}` : currentPath;
      } else {
        statusSizeEl.textContent = `${selCount} items selected`;
        statusDetailEl.textContent = `${selCount} objects selected`;
      }

      statusDetailEl.title = statusDetailEl.textContent || '';
      copyBtn.disabled = selCount === 0;
    };

    const render = (): void => {
      addressInput.value = currentPath;
      addressIcon.src = this.icons.getPath(currentPath === 'C:\\' ? 'drive' : 'folder-open', 16);
      paneTitleEl.textContent = `Contents of '${currentPath}'`;

      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;
      upBtn.disabled = currentPath === 'C:\\';

      // Toolbar view button states
      toolbarViewButtons.forEach((btn) => {
        const isAct = btn.dataset.expView === viewMode;
        btn.classList.toggle('active', isAct);
        btn.setAttribute('aria-pressed', String(isAct));
      });

      hiddenBtns.forEach((btn) => {
        btn.classList.toggle('active', showHidden);
        btn.setAttribute('aria-pressed', String(showHidden));
      });

      // View menu checkmarks
      ctx.container.querySelectorAll('[data-check]').forEach((el) => {
        const checkMode = (el as HTMLElement).dataset.check;
        if (checkMode === 'hidden') {
          el.classList.toggle('has-check', showHidden);
        } else {
          el.classList.toggle('has-check', viewMode === checkMode);
        }
      });

      renderTree();
      renderItems();
      updateStatus();
    };

    // Range select helper for Shift+Click
    const rangeSelectTo = (targetPath: string): void => {
      const children = sortNodes(this.vfs.listDirectory(currentPath, showHidden));
      const targetIdx = children.findIndex((c) => c.path === targetPath);
      if (targetIdx === -1) return;

      const anchorIdx = lastAnchorPath
        ? children.findIndex((c) => c.path === lastAnchorPath)
        : 0;

      const start = Math.min(anchorIdx >= 0 ? anchorIdx : 0, targetIdx);
      const end = Math.max(anchorIdx >= 0 ? anchorIdx : 0, targetIdx);

      selectedPaths.clear();
      for (let i = start; i <= end; i++) {
        selectedPaths.add(children[i].path);
      }
      renderItems();
      updateStatus();
    };

    // Toolbar events
    backBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex -= 1;
        navigateTo(history[historyIndex], false);
      }
    });

    forwardBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        navigateTo(history[historyIndex], false);
      }
    });

    upBtn.addEventListener('click', () => {
      if (currentPath !== 'C:\\') {
        navigateTo(this.vfs.getParentPath(currentPath), true);
      }
    });

    copyBtn.addEventListener('click', copySelected);

    propsBtn.addEventListener('click', () => {
      if (selectedPaths.size > 0) {
        const first = Array.from(selectedPaths)[0];
        const node = this.vfs.resolvePath(first);
        if (node) {
          alert(`Properties of '${node.name}':\n\nType: ${node.type}\nLocation: ${node.path}\nSize: ${node.size ?? 'Folder'}\nDescription: ${node.description ?? 'System Object'}`);
          return;
        }
      }
      alert(`Properties of '${currentPath}':\n\nType: File Folder\nLocation: ${currentPath}\nFree Space: 1.44 MB (Virtual)`);
    });

    ctx.container.querySelectorAll<HTMLButtonElement>('[data-exp-view]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.expView as ExplorerViewMode;
        if (mode) {
          viewMode = mode;
          closeDropdowns();
          render();
        }
      });
    });

    hiddenBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showHidden = !showHidden;
        closeDropdowns();
        render();
      });
    });

    // Address Bar form
    addressForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const targetVal = addressInput.value.trim();
      const target = this.vfs.resolvePath(targetVal);
      if (!target) {
        showNotFoundError(targetVal);
        return;
      }
      activateNode(target);
    });

    // Menubar events
    ctx.container.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      // Dropdown trigger
      const menuTrigger = target.closest<HTMLElement>('[data-menu-trigger]');
      if (menuTrigger) {
        ev.stopPropagation();
        const menuKey = menuTrigger.dataset.menuTrigger;
        if (activeDropdown === menuKey) {
          closeDropdowns();
        } else {
          closeDropdowns();
          activeDropdown = menuKey ?? null;
          const parentItem = menuTrigger.closest<HTMLElement>('.win95-menu-item');
          parentItem?.querySelector('.win95-menu-dropdown')?.classList.add('open');
          menuTrigger.classList.add('active');
        }
        return;
      }

      // Close dropdowns when clicking outside menubar
      if (!target.closest('.win95-menubar')) {
        closeDropdowns();
      }

      // Dropdown menu actions
      const actionBtn = target.closest<HTMLElement>('[data-action]');
      if (actionBtn?.dataset.action) {
        const action = actionBtn.dataset.action;
        closeDropdowns();

        if (action === 'file-open') {
          if (selectedPaths.size > 0) {
            const node = this.vfs.resolvePath(Array.from(selectedPaths)[0]);
            if (node) activateNode(node);
          }
        } else if (action === 'file-explore') {
          if (selectedPaths.size > 0) {
            const node = this.vfs.resolvePath(Array.from(selectedPaths)[0]);
            if (node) activateNode(node);
          }
        } else if (action === 'file-properties') {
          propsBtn.click();
        } else if (action === 'file-close') {
          ctx.windowManager.close(ctx.windowId);
        } else if (action === 'edit-copy') {
          copySelected();
        } else if (action === 'edit-select-all') {
          selectAll();
        } else if (action === 'edit-invert-selection') {
          invertSelection();
        } else if (action === 'sort-name') {
          sortColumn = 'name';
          sortAscending = true;
          renderItems();
        } else if (action === 'sort-type') {
          sortColumn = 'type';
          sortAscending = true;
          renderItems();
        } else if (action === 'sort-size') {
          sortColumn = 'size';
          sortAscending = true;
          renderItems();
        } else if (action === 'view-refresh') {
          render();
        } else if (action === 'view-options') {
          showHidden = !showHidden;
          render();
        } else if (action === 'go-back') {
          backBtn.click();
        } else if (action === 'go-forward') {
          forwardBtn.click();
        } else if (action === 'go-up') {
          upBtn.click();
        } else if (action === 'help-topics') {
          ctx.windowManager.open('notepad', { args: { path: 'C:\\AboutMe\\Readme.txt' } });
        } else if (action === 'help-about') {
          alert('Windows 95 Explorer\nPedroOS 95 Portfolio Edition\nMicrosoft Windows 95 Emulation\n\nAll rights reserved.');
        }
        return;
      }

      // Quick Nav from Favorites/Go menus
      const navItem = target.closest<HTMLElement>('[data-nav]');
      if (navItem?.dataset.nav) {
        closeDropdowns();
        navigateTo(navItem.dataset.nav, true);
        return;
      }

      // Column Header Sort in Details view
      const th = target.closest<HTMLElement>('[data-sort]');
      if (th?.dataset.sort) {
        const col = th.dataset.sort as 'name' | 'type' | 'size' | 'modified';
        if (sortColumn === col) {
          sortAscending = !sortAscending;
        } else {
          sortColumn = col;
          sortAscending = true;
        }
        renderItems();
        return;
      }

      // Tree expander [+] / [-]
      const expander = target.closest<HTMLElement>('[data-exp-toggle]');
      if (expander?.dataset.expToggle) {
        const p = expander.dataset.expToggle;
        if (expandedFolders.has(p)) {
          expandedFolders.delete(p);
        } else {
          expandedFolders.add(p);
        }
        renderTree();
        return;
      }

      // Tree button click
      const treeBtn = target.closest<HTMLElement>('[data-tree-path]');
      if (treeBtn?.dataset.treePath) {
        navigateTo(treeBtn.dataset.treePath, true);
        return;
      }
    });

    // Items selection and activation (Single Click, Ctrl+Click, Shift+Click, Double Click)
    let lastItemClickPath = '';
    let lastItemClickTime = 0;

    itemsEl.addEventListener('click', (ev) => {
      const itemEl = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-node-path]');
      if (!itemEl?.dataset.nodePath) {
        // Click on empty space inside viewport clears selection
        selectedPaths.clear();
        lastAnchorPath = null;
        renderItems();
        updateStatus();
        return;
      }

      viewportEl.focus({ preventScroll: true });
      const path = itemEl.dataset.nodePath;

      if (ev.shiftKey && lastAnchorPath) {
        // Shift + Click: Range Selection
        rangeSelectTo(path);
      } else if (ev.ctrlKey || ev.metaKey) {
        // Ctrl + Click: Toggle Selection
        if (selectedPaths.has(path)) {
          selectedPaths.delete(path);
        } else {
          selectedPaths.add(path);
          lastAnchorPath = path;
        }
        renderItems();
        updateStatus();
      } else {
        // Standard single click
        selectedPaths.clear();
        selectedPaths.add(path);
        lastAnchorPath = path;
        renderItems();
        updateStatus();
      }

      const now = Date.now();
      const isDoubleTap = path === lastItemClickPath && now - lastItemClickTime < 420;
      lastItemClickPath = path;
      lastItemClickTime = now;

      if (isDoubleTap || window.innerWidth <= 640) {
        const node = this.vfs.resolvePath(path);
        if (node) {
          activateNode(node);
        }
      }
    });

    itemsEl.addEventListener('dblclick', (ev) => {
      const itemEl = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-node-path]');
      if (!itemEl?.dataset.nodePath) {
        return;
      }
      const node = this.vfs.resolvePath(itemEl.dataset.nodePath);
      if (node) {
        activateNode(node);
      }
    });

    // Keyboard navigation inside explorer viewport
    viewportEl.addEventListener('keydown', (ev) => {
      const header = (ev.target as HTMLElement).closest<HTMLElement>('[data-sort]');
      if (header && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); header.click(); return; }
      const children = sortNodes(this.vfs.listDirectory(currentPath, showHidden));
      if (children.length === 0) return;

      const selArray = Array.from(selectedPaths);
      const currentIdx = selArray.length > 0
        ? children.findIndex((c) => c.path === selArray[selArray.length - 1])
        : -1;

      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (selArray.length > 0) {
          const node = this.vfs.resolvePath(selArray[0]);
          if (node) activateNode(node);
        }
      } else if (ev.key === 'Backspace') {
        ev.preventDefault();
        if (currentPath !== 'C:\\') {
          navigateTo(this.vfs.getParentPath(currentPath), true);
        }
      } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const nextIdx = currentIdx < children.length - 1 ? currentIdx + 1 : 0;
        const target = children[nextIdx];
        selectedPaths.clear();
        selectedPaths.add(target.path);
        lastAnchorPath = target.path;
        renderItems();
        updateStatus();
      } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : children.length - 1;
        const target = children[prevIdx];
        selectedPaths.clear();
        selectedPaths.add(target.path);
        lastAnchorPath = target.path;
        renderItems();
        updateStatus();
      } else if (ev.ctrlKey && (ev.key === 'a' || ev.key === 'A')) {
        ev.preventDefault();
        selectAll();
      } else if (ev.ctrlKey && (ev.key === 'c' || ev.key === 'C')) {
        ev.preventDefault();
        copySelected();
      }
    });

    // Draggable Splitter Implementation
    let isDraggingSplitter = false;

    splitter.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      isDraggingSplitter = true;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'var(--cursor-size-ew)';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (ev) => {
      if (!isDraggingSplitter) return;
      const rect = treePane.getBoundingClientRect();
      const newWidth = Math.max(120, Math.min(450, ev.clientX - rect.left));
      treeWidth = newWidth;
      treePane.style.width = `${newWidth}px`;
    }, { signal: listeners.signal });

    window.addEventListener('mouseup', () => {
      if (isDraggingSplitter) {
        isDraggingSplitter = false;
        splitter.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }, { signal: listeners.signal });

    // Right-click context menu inside explorer
    viewportEl.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const itemEl = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-node-path]');
      const rect = ctx.container.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      contextMenuEl.style.left = `${Math.min(x, rect.width - 180)}px`;
      contextMenuEl.style.top = `${Math.min(y, rect.height - 180)}px`;
      contextMenuEl.style.display = 'block';

      if (itemEl?.dataset.nodePath) {
        viewportEl.focus({ preventScroll: true });
      const path = itemEl.dataset.nodePath;
        if (!selectedPaths.has(path)) {
          selectedPaths.clear();
          selectedPaths.add(path);
          lastAnchorPath = path;
          renderItems();
          updateStatus();
        }

        contextMenuEl.innerHTML = `
          <ul class="start-menu-list">
            <li><button type="button" class="start-menu-action" data-ctx-action="open"><strong>Open</strong></button></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="explore">Explore</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="copy">Copy</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="properties">Properties</button></li>
          </ul>`;
      } else {
        contextMenuEl.innerHTML = `
          <ul class="start-menu-list">
            <li><button type="button" class="start-menu-action" data-exp-view="icons">Large Icons</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="small-icons">Small Icons</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="list">List</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="details">Details</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="refresh">Refresh</button></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="properties">Properties</button></li>
          </ul>`;
      }
    });

    contextMenuEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-ctx-action]');
      if (!btn?.dataset.ctxAction) return;
      const action = btn.dataset.ctxAction;
      contextMenuEl.style.display = 'none';

      if (action === 'open' || action === 'explore') {
        if (selectedPaths.size > 0) {
          const node = this.vfs.resolvePath(Array.from(selectedPaths)[0]);
          if (node) activateNode(node);
        }
      } else if (action === 'copy') {
        copySelected();
      } else if (action === 'properties') {
        propsBtn.click();
      } else if (action === 'refresh') {
        render();
      }
    });

    render();
    ctx.setTitle(`${this.defaultPath === 'C:\\Projects' ? 'Projects' : 'Exploring'} - ${currentPath}`, 'explorer');

    return () => {
      listeners.abort();
      if (isDraggingSplitter) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      ctx.container.innerHTML = '';
    };
  }

  private fileLabel(name: string): string {
    // Only explicit word boundaries may wrap; the final token retains its extension.
    return name.split(/(?<=[ -])/).map(part => `<span class="filename-token">${this.escapeHtml(part)}</span>`).join('<wbr>');
  }

  private sizeInBytes(size?: string): number {
    const match = size?.match(/^([\d.]+)\s*(KB|MB|GB|bytes?)?$/i);
    if (!match) return 0;
    const multiplier: Record<string, number> = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return Number(match[1]) * (multiplier[match[2]?.toUpperCase()] ?? 1);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(str: string): string {
    return this.escapeHtml(str);
  }
}
