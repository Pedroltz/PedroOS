import type { AppMountContext, ClientAppModule, VirtualNode } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';

export class ExplorerApp implements ClientAppModule {
  public constructor(
    private readonly vfs: VirtualFileSystemClient,
    private readonly icons: IconRegistryClient,
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const initialPath = this.vfs.normalizePath(ctx.args.path) || 'C:\\';
    let currentPath = this.vfs.resolvePath(initialPath) ? initialPath : 'C:\\';
    const history: string[] = [currentPath];
    let historyIndex = 0;
    let viewMode: 'icons' | 'list' = 'icons';
    let showHidden = currentPath.toUpperCase().includes('PEDROOS');
    let selectedPath: string | null = null;

    ctx.container.innerHTML = `
      <div class="app-shell explorer-app" data-explorer-instance="${ctx.windowId}">
        <div class="win95-menubar" role="menubar" aria-label="Menu do Windows Explorer">
          <span class="win95-menu-item"><u>F</u>ile</span>
          <span class="win95-menu-item"><u>E</u>dit</span>
          <span class="win95-menu-item"><u>V</u>iew</span>
          <span class="win95-menu-item"><u>T</u>ools</span>
          <span class="win95-menu-item"><u>H</u>elp</span>
        </div>

        <div class="win95-toolbar" role="toolbar" aria-label="Barra de ferramentas do Explorer">
          <button type="button" class="toolbar-btn" data-exp-back aria-label="Back" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-left')}" width="16" height="16" alt="" />
            <span>Back</span>
          </button>
          <button type="button" class="toolbar-btn" data-exp-forward aria-label="Forward" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-right')}" width="16" height="16" alt="" />
            <span>Forward</span>
          </button>
          <button type="button" class="toolbar-btn" data-exp-up aria-label="Up One Level">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-up')}" width="16" height="16" alt="" />
            <span>Up</span>
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn active" data-exp-view="icons" aria-pressed="true">
            <img class="pixel-icon" src="${this.icons.getPath('folder', 16)}" width="16" height="16" alt="" />
            <span>Icons</span>
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="list" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getPath('document', 16)}" width="16" height="16" alt="" />
            <span>List</span>
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-hidden aria-pressed="${showHidden}">
            <span>Hidden</span>
          </button>
        </div>

        <form class="win95-addressbar" data-exp-address-form>
          <label class="addressbar-label" for="exp-addr-${ctx.windowId}">Address</label>
          <input id="exp-addr-${ctx.windowId}"
                 class="addressbar-input"
                 type="text"
                 value="${this.escapeAttr(currentPath)}"
                 aria-label="Endereço da pasta virtual"
                 data-exp-address />
          <button type="submit" class="addressbar-go">Go</button>
        </form>

        <div class="explorer-split">
          <aside class="explorer-tree-pane sunken-panel" aria-label="Árvore de pastas">
            <div class="explorer-pane-header">All Folders</div>
            <ul class="tree-view explorer-tree" data-exp-tree></ul>
          </aside>

          <section class="explorer-files-pane sunken-panel" aria-label="Arquivos e pastas">
            <div class="explorer-pane-header" data-exp-pane-title>Contents of '${this.escapeHtml(currentPath)}'</div>
            <div class="explorer-items view-icons" data-exp-items role="listbox" aria-label="Itens da pasta"></div>
          </section>
        </div>

        <div class="status-bar">
          <p class="status-bar-field" data-exp-status-count>0 object(s)</p>
          <p class="status-bar-field" data-exp-status-detail>${this.escapeHtml(currentPath)}</p>
        </div>
      </div>
    `;

    const backBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-back]')!;
    const forwardBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-forward]')!;
    const upBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-up]')!;
    const viewIconsBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-view="icons"]')!;
    const viewListBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-view="list"]')!;
    const hiddenBtn = ctx.container.querySelector<HTMLButtonElement>('[data-exp-hidden]')!;
    const addressForm = ctx.container.querySelector<HTMLFormElement>('[data-exp-address-form]')!;
    const addressInput = ctx.container.querySelector<HTMLInputElement>('[data-exp-address]')!;
    const treeEl = ctx.container.querySelector<HTMLUListElement>('[data-exp-tree]')!;
    const paneTitleEl = ctx.container.querySelector<HTMLElement>('[data-exp-pane-title]')!;
    const itemsEl = ctx.container.querySelector<HTMLElement>('[data-exp-items]')!;
    const statusCountEl = ctx.container.querySelector<HTMLElement>('[data-exp-status-count]')!;
    const statusDetailEl = ctx.container.querySelector<HTMLElement>('[data-exp-status-detail]')!;

    const navigateTo = (targetPath: string, pushHistory = true): void => {
      const resolved = this.vfs.resolvePath(targetPath);
      if (!resolved || (resolved.type !== 'drive' && resolved.type !== 'folder')) {
        statusDetailEl.textContent = `Path not found: ${targetPath}`;
        return;
      }
      currentPath = resolved.path;
      selectedPath = null;
      if (pushHistory && history[historyIndex] !== currentPath) {
        history.splice(historyIndex + 1);
        history.push(currentPath);
        historyIndex = history.length - 1;
      }
      ctx.setTitle(`Exploring - ${currentPath}`, resolved.icon || 'explorer');
      render();
    };

    const activateNode = (node: VirtualNode): void => {
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

    const renderTree = (): void => {
      const folders = this.vfs.listFoldersTree(showHidden);
      treeEl.innerHTML = folders
        .map((folder) => {
          const depth = folder.path === 'C:\\' ? 0 : folder.path.slice(3).split('\\').length;
          const isCurrent = folder.path.toLowerCase() === currentPath.toLowerCase();
          const iconKey = isCurrent && folder.type === 'folder' ? 'folder-open' : folder.icon;
          return `
            <li style="padding-left:${depth * 12}px">
              <button type="button"
                      class="explorer-tree-btn ${isCurrent ? 'selected' : ''}"
                      data-tree-path="${this.escapeAttr(folder.path)}">
                <img class="pixel-icon" src="${this.icons.getPath(iconKey, 16)}" width="16" height="16" alt="" />
                <span>${this.escapeHtml(folder.name)}</span>
              </button>
            </li>`;
        })
        .join('');
    };

    const renderItems = (): void => {
      const children = this.vfs.listDirectory(currentPath, showHidden);
      itemsEl.className = `explorer-items ${viewMode === 'icons' ? 'view-icons' : 'view-list'}`;

      if (children.length === 0) {
        itemsEl.innerHTML = `<div class="explorer-empty">This folder is empty.</div>`;
      } else if (viewMode === 'icons') {
        itemsEl.innerHTML = children
          .map((item) => {
            const isSelected = selectedPath === item.path;
            return `
              <button type="button"
                      class="explorer-item ${isSelected ? 'selected' : ''}"
                      role="option"
                      aria-selected="${isSelected}"
                      data-node-path="${this.escapeAttr(item.path)}"
                      title="${this.escapeAttr(item.description ?? item.name)}">
                <img class="pixel-icon" src="${this.icons.getPath(item.icon, 32)}" width="32" height="32" alt="" />
                <span class="explorer-item-name">${this.escapeHtml(item.name)}</span>
              </button>`;
          })
          .join('');
      } else {
        itemsEl.innerHTML = `
          <table class="explorer-details-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${children
                .map((item) => {
                  const isSelected = selectedPath === item.path;
                  return `
                    <tr class="explorer-row ${isSelected ? 'selected' : ''}"
                        data-node-path="${this.escapeAttr(item.path)}">
                      <td>
                        <img class="pixel-icon" src="${this.icons.getPath(item.icon, 16)}" width="16" height="16" alt="" />
                        <span>${this.escapeHtml(item.name)}</span>
                      </td>
                      <td>${this.escapeHtml(item.type)}</td>
                      <td>${this.escapeHtml(item.size ?? (item.type === 'folder' ? 'Folder' : '—'))}</td>
                      <td>${this.escapeHtml(item.description ?? '')}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>`;
      }

      statusCountEl.textContent = `${children.length} object(s)`;
      const selNode = selectedPath ? this.vfs.resolvePath(selectedPath) : undefined;
      statusDetailEl.textContent = selNode
        ? `${selNode.name} — ${selNode.description ?? selNode.path}`
        : currentPath;
    };

    const render = (): void => {
      addressInput.value = currentPath;
      paneTitleEl.textContent = `Contents of '${currentPath}'`;
      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;
      upBtn.disabled = currentPath === 'C:\\';
      viewIconsBtn.classList.toggle('active', viewMode === 'icons');
      viewIconsBtn.setAttribute('aria-pressed', String(viewMode === 'icons'));
      viewListBtn.classList.toggle('active', viewMode === 'list');
      viewListBtn.setAttribute('aria-pressed', String(viewMode === 'list'));
      hiddenBtn.classList.toggle('active', showHidden);
      hiddenBtn.setAttribute('aria-pressed', String(showHidden));
      renderTree();
      renderItems();
    };

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

    viewIconsBtn.addEventListener('click', () => {
      viewMode = 'icons';
      render();
    });

    viewListBtn.addEventListener('click', () => {
      viewMode = 'list';
      render();
    });

    hiddenBtn.addEventListener('click', () => {
      showHidden = !showHidden;
      render();
    });

    addressForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const target = this.vfs.resolvePath(addressInput.value);
      if (!target) {
        statusDetailEl.textContent = `Cannot find '${addressInput.value}'.`;
        return;
      }
      activateNode(target);
    });

    treeEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-tree-path]');
      if (!btn?.dataset.treePath) {
        return;
      }
      navigateTo(btn.dataset.treePath, true);
    });

    let lastClickPath = '';
    let lastClickTime = 0;

    itemsEl.addEventListener('click', (ev) => {
      const itemEl = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-node-path]');
      if (!itemEl?.dataset.nodePath) {
        selectedPath = null;
        renderItems();
        return;
      }

      const path = itemEl.dataset.nodePath;
      selectedPath = path;
      renderItems();

      const now = Date.now();
      const isDoubleTap = path === lastClickPath && now - lastClickTime < 420;
      lastClickPath = path;
      lastClickTime = now;

      if (isDoubleTap || ctx.windowManager && window.innerWidth <= 640) {
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

    itemsEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && selectedPath) {
        ev.preventDefault();
        const node = this.vfs.resolvePath(selectedPath);
        if (node) {
          activateNode(node);
        }
      }
    });

    render();
    return () => {
      ctx.container.innerHTML = '';
    };
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
