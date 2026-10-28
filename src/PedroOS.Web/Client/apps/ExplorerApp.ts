import type { AppMountContext, ClientAppModule, VirtualNode } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { VirtualFileSystemClient } from '../core/VirtualFileSystemClient.js';
import { mountClassicMenu } from '../components/ClassicMenu.js';
import { secrets } from '../core/SecretSession.js';

const NODE_TYPE_LABELS: Record<string, string> = { drive: 'Disco local', folder: 'Pasta de arquivos', application: 'Aplicativo', document: 'Documento de texto', text: 'Arquivo de texto', systemFile: 'Arquivo do sistema', shortcut: 'Atalho' };

export type ExplorerViewMode = 'icons' | 'small-icons' | 'list' | 'details';

export class ExplorerApp implements ClientAppModule {
  public constructor(
    private readonly vfs: VirtualFileSystemClient,
    private readonly icons: IconRegistryClient,
    private readonly defaultPath = 'C:\\',
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const initialPath = this.vfs.normalizePath(ctx.args.path || this.defaultPath) || 'C:\\';
    let currentPath = this.vfs.resolvePath(initialPath)?.path || 'C:\\';
    const history: string[] = [currentPath];
    let historyIndex = 0;
    let viewMode: ExplorerViewMode = 'icons';
    let showHidden = currentPath.toUpperCase().includes('PEDROOS');
    const selectedPaths = new Set<string>();
    let lastAnchorPath: string | null = null;
    let treeWidth = 200;
    const listeners = new AbortController();

    // Sorting state for details view
    let sortColumn: 'name' | 'type' | 'size' | 'modified' = 'name';
    let sortAscending = true;

    // Expanded folders set in tree view
    const expandedFolders = new Set<string>(['C:\\', 'C:\\Projetos', 'C:\\SobreMim']);

    ctx.container.innerHTML = `
      <div class="app-shell explorer-app" data-explorer-instance="${ctx.windowId}">
        <!-- 1. Menubar with Dropdowns -->
        <div class="win95-menubar" role="menubar" aria-label="Menu do Explorador de Arquivos" data-exp-menubar>
          <div class="win95-menu-item" data-menu="file">
            <button type="button" class="win95-menu-btn" data-menu-trigger="file"><u>A</u>rquivo</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="file-open"><u>A</u>brir</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-explore">E<u>x</u>plorar</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Criar a<u>t</u>alho</button></li>
              <li><button type="button" class="win95-dropdown-item" disabled>E<u>x</u>cluir</button></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Reno<u>m</u>ear</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-properties">P<u>r</u>opriedades</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="file-close"><u>F</u>echar</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="edit">
            <button type="button" class="win95-menu-btn" data-menu-trigger="edit"><u>E</u>ditar</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" disabled><u>D</u>esfazer</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Recor<u>t</u>ar</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-copy"><u>C</u>opiar <span class="shortcut-key">Ctrl+C</span></button></li>
              <li><button type="button" class="win95-dropdown-item" disabled>Co<u>l</u>ar</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-select-all">Selecionar <u>t</u>udo <span class="shortcut-key">Ctrl+A</span></button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="edit-invert-selection"><u>I</u>nverter seleção</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="view">
            <button type="button" class="win95-menu-btn" data-menu-trigger="view">E<u>x</u>ibir</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-exp-view="icons" data-check="icons">Ícones <u>g</u>randes</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="small-icons" data-check="small-icons">Ícones <u>p</u>equenos</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="list" data-check="list"><u>L</u>ista</button></li>
              <li><button type="button" class="win95-dropdown-item" data-exp-view="details" data-check="details"><u>D</u>etalhes</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-name">Organizar ícones por <u>n</u>ome</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-type">Organizar ícones por <u>t</u>ipo</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="sort-size">Organizar ícones por t<u>a</u>manho</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="view-refresh">Atuali<u>z</u>ar <span class="shortcut-key">F5</span></button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="view-options" data-check="hidden">Exibir arquivos <u>o</u>cultos</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="go">
            <button type="button" class="win95-menu-btn" data-menu-trigger="go"><u>I</u>r</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="go-back" data-exp-go-back><u>V</u>oltar</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="go-forward" data-exp-go-fwd><u>A</u>vançar</button></li>
              <li><button type="button" class="win95-dropdown-item" data-action="go-up" data-exp-go-up><u>S</u>ubir um nível</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\"><u>I</u>nício (C:\\)</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Projetos"><u>P</u>rojetos (C:\\Projetos)</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="favorites">
            <button type="button" class="win95-menu-btn" data-menu-trigger="favorites"><u>F</u>avoritos</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Projetos">${this.icons.render('folder', 16)} C:\\Projetos</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\SobreMim">${this.icons.render('folder', 16)} C:\\SobreMim</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\Habilidades">${this.icons.render('folder', 16)} C:\\Habilidades</button></li>
              <li><button type="button" class="win95-dropdown-item" data-nav="C:\\PEDROOS">${this.icons.render('folder', 16)} C:\\PEDROOS</button></li>
            </ul>
          </div>

          <div class="win95-menu-item" data-menu="help">
            <button type="button" class="win95-menu-btn" data-menu-trigger="help">A<u>j</u>uda</button>
            <ul class="win95-menu-dropdown" role="menu">
              <li><button type="button" class="win95-dropdown-item" data-action="help-topics">A<u>j</u>uda Topics</button></li>
              <li class="win95-dropdown-separator"></li>
              <li><button type="button" class="win95-dropdown-item" data-action="help-about"><u>S</u>obre o Explorador de Arquivos</button></li>
            </ul>
          </div>
        </div>

        <!-- 2. Classic Toolbar with Pixel-art Controls -->
        <div class="win95-toolbar" role="toolbar" aria-label="Barra de ferramentas do Explorer">
          <button type="button" class="toolbar-btn" data-exp-back aria-label="Voltar" title="Voltar" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-left')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-forward aria-label="Avançar" title="Avançar" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-right')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-up aria-label="Subir um nível" title="Subir um nível">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-up')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-folders aria-label="Pastas" title="Mostrar ou ocultar pastas" aria-expanded="true">${this.icons.render('folder', 16)}<span>Pastas</span></button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-cut aria-label="Recortar" title="Recortar" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('cut')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-copy aria-label="Copiar" title="Copiar">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('copy')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-paste aria-label="Colar" title="Colar" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('paste')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-undo aria-label="Desfazer" title="Desfazer" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('undo')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-delete aria-label="Excluir" title="Excluir" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('delete')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-properties aria-label="Propriedades" title="Propriedades">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('properties')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn active" data-exp-view="icons" aria-label="Ícones grandes" title="Ícones grandes" aria-pressed="true">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('icons')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="small-icons" aria-label="Ícones pequenos" title="Ícones pequenos" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('list')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="list" aria-label="Lista" title="Lista" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('bulletlist')}" width="16" height="16" alt="" />
          </button>
          <button type="button" class="toolbar-btn" data-exp-view="details" aria-label="Detalhes" title="Detalhes" aria-pressed="false">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('details')}" width="16" height="16" alt="" />
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-exp-hidden aria-pressed="${showHidden}" title="Mostrar ou ocultar arquivos de sistema">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('check')}" width="16" height="16" alt="" />
          </button>
        </div>

        <!-- 3. Address Bar with Combobox -->
        <form class="win95-addressbar" data-exp-address-form>
          <label class="addressbar-label" for="exp-addr-${ctx.windowId}">Endereço</label>
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
              <option value="C:\\">Disco local (C:)</option>
              <option value="C:\\Projetos">Projetos</option>
              <option value="C:\\SobreMim">Sobre mim</option>
              <option value="C:\\Habilidades">Habilidades</option>
              <option value="C:\\PEDROOS">Sistema PedroOS</option>
            </datalist>
          </div>
          <button type="submit" class="addressbar-go">Ir</button>
        </form>

        <!-- 4. Main Area: Left Tree, Draggable Splitter, Right Files Area -->
        <div class="explorer-split">
          <aside class="explorer-tree-pane sunken-panel" data-exp-tree-pane aria-label="Árvore de pastas" style="width: ${treeWidth}px">
            <div class="explorer-pane-header">Todas as pastas</div>
            <ul class="explorer-tree" data-exp-tree role="tree"></ul>
          </aside>

          <div class="explorer-splitter" data-exp-splitter title="Arraste para redimensionar painéis"></div>

          <section class="explorer-files-pane sunken-panel" aria-label="Arquivos e pastas">
            <div class="explorer-pane-header" data-exp-pane-title>Conteúdo de '${this.escapeHtml(currentPath)}'</div>
            <div class="explorer-items-viewport" data-exp-viewport tabindex="0">
              <div class="explorer-items view-large-icons" data-exp-items role="listbox" aria-label="Itens da pasta" aria-multiselectable="true"></div>
            </div>
          </section>
        </div>

        <!-- 5. 3-Part PedroOS 95 Status Bar -->
        <div class="status-bar" role="status">
          <p class="status-bar-field" data-exp-status-count>0 objeto(s)</p>
          <p class="status-bar-field" data-exp-status-size>0 bytes</p>
          <p class="status-bar-field" data-exp-status-detail>Disco local (C:)</p>
        </div>

        <dialog class="window ie-dialog explorer-dialog" aria-label="Explorador de Arquivos">
          <form method="dialog"><div class="title-bar"><span class="title-bar-text" data-exp-dialog-title></span><div class="title-bar-controls"><button type="submit" value="close" class="close" aria-label="Fechar diálogo"></button></div></div>
          <div class="window-body" data-exp-dialog-body></div><div class="ie-dialog-buttons"><button value="ok">OK</button></div></form>
        </dialog>
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

    const menus = mountClassicMenu(ctx.container);
    const dialog = ctx.container.querySelector<HTMLDialogElement>('.explorer-dialog')!;
    let dialogFocus: HTMLElement | null = null;
    const showDialog = (title: string, html: string): void => {
      menus.close(); contextMenuEl.style.display = 'none';
      dialogFocus = document.activeElement as HTMLElement;
      dialog.querySelector('[data-exp-dialog-title]')!.textContent = title;
      dialog.querySelector('[data-exp-dialog-body]')!.innerHTML = html;
      dialog.showModal();
    };
    dialog.addEventListener('close', () => {
      if (dialogFocus?.isConnected && dialogFocus.getClientRects().length) dialogFocus.focus();
      else viewportEl.focus();
    });
    const showNotFoundError = (badPath: string): void => {
      statusDetailEl.textContent = `Caminho não encontrado: ${badPath}`;
      showDialog('Explorador de Arquivos', `<p>Não foi possível encontrar '${this.escapeHtml(badPath)}'.</p><p>Verifique o caminho ou nome do arquivo e tente novamente.</p>`);
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
      ctx.setTitle(`Explorando - ${currentPath}`, iconKey);
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
      if (node.action?.kind === 'unlock-secret') { secrets.unlockArcade(); return; }
      if (node.action?.kind === 'open-app' && node.action.appId) {
        ctx.windowManager.open(node.action.appId, { args: node.action.args ?? {} });
      }
    };

    const copySelected = (): void => {
      if (selectedPaths.size === 0) return;
      const text = Array.from(selectedPaths).join('\n');
      if (navigator.clipboard?.writeText) {
        const count = selectedPaths.size;
        void navigator.clipboard.writeText(text).then(() => { statusDetailEl.textContent = `${count} item(ns) copiado(s) para a área de transferência`; }).catch(() => { statusDetailEl.textContent = 'Área de transferência indisponível neste navegador.'; });
      } else statusDetailEl.textContent = 'Área de transferência indisponível neste navegador.';
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

    const closeDropdowns = (): void => { menus.close(); contextMenuEl.style.display = 'none'; };
    document.addEventListener('pointerdown', event => {
      if (!contextMenuEl.contains(event.target as Node)) contextMenuEl.style.display = 'none';
    }, { signal: listeners.signal });

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
          <li role="treeitem"${hasChildren ? ` aria-expanded="${isExpanded}"` : ''}>
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
              <span>Meu Computador</span>
            </button>
          </div>
          <ul>
            <li role="treeitem" aria-expanded="${cExpanded}">
              <div class="tree-row">
                <span class="tree-expander" data-exp-toggle="C:\\">${cExpanded ? '−' : '+'}</span>
                <button type="button" class="explorer-tree-btn ${isCSelected ? 'selected' : ''}" data-tree-path="C:\\">
                  ${this.icons.render('drive', 16)}
                  <span>Disco local (C:)</span>
                </button>
              </div>
              ${cChildrenHtml}
            </li>
          </ul>
        </li>
      `;
      const focusTarget = treeEl.querySelector<HTMLButtonElement>('.explorer-tree-btn.selected') || treeEl.querySelector<HTMLButtonElement>('[data-tree-path]');
      treeEl.querySelectorAll<HTMLButtonElement>('[data-tree-path]').forEach(button => { button.tabIndex = button === focusTarget ? 0 : -1; });
    };

    // Sort items helper
    const sortNodes = (nodes: VirtualNode[]): VirtualNode[] => {
      return [...nodes].sort((a, b) => {
        // Folders always precede files in PedroOS 95
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
      itemsEl.setAttribute('role', viewMode === 'details' ? 'group' : 'listbox');
      if (viewMode === 'details') itemsEl.removeAttribute('aria-multiselectable');
      else itemsEl.setAttribute('aria-multiselectable', 'true');

      if (children.length === 0) {
        itemsEl.innerHTML = `<div class="explorer-empty" style="padding: 16px; color: #666; font-style: italic;">Esta pasta está vazia.</div>`;
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
                <th tabindex="0" role="columnheader" aria-sort="${sortColumn === 'name' ? (sortAscending ? 'ascending' : 'descending') : 'none'}" data-sort="name">Nome ${arrow('name')}</th>
                <th tabindex="0" role="columnheader" data-sort="type">Tipo ${arrow('type')}</th>
                <th tabindex="0" role="columnheader" data-sort="size">Tamanho ${arrow('size')}</th>
                <th tabindex="0" role="columnheader" data-sort="modified">Modificado ${arrow('modified')}</th>
              </tr>
            </thead>
            <tbody>
              ${children
                .map((item) => {
                  const isSelected = selectedPaths.has(item.path);
                  const typeLabel =
                    item.type === 'drive'
                      ? 'Disco local'
                      : item.type === 'folder'
                      ? 'Pasta de arquivos'
                      : item.type === 'application'
                      ? 'Aplicativo'
                      : item.type === 'document'
                      ? 'Editor de Documentos Document'
                      : item.type === 'text'
                      ? 'Arquivo de texto'
                      : 'Arquivo';
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

      statusCountEl.textContent = `${totalCount} objeto(s)`;

      if (selCount === 0) {
        statusSizeEl.textContent = '0 bytes';
        statusDetailEl.textContent = currentPath === 'C:\\' ? 'Disco local (C:)' : currentPath;
      } else if (selCount === 1) {
        const first = Array.from(selectedPaths)[0];
        const selNode = this.vfs.resolvePath(first);
        statusSizeEl.textContent = selNode?.size || (selNode?.type === 'folder' ? 'Pasta' : '1 KB');
        statusDetailEl.textContent = selNode ? `${selNode.name} — ${selNode.description ?? selNode.path}` : currentPath;
      } else {
        statusSizeEl.textContent = `${selCount} itens selecionados`;
        statusDetailEl.textContent = `${selCount} objetos selecionados`;
      }

      statusDetailEl.title = statusDetailEl.textContent || '';
      copyBtn.disabled = selCount === 0;
      for (const action of ['file-open', 'file-explore', 'edit-copy', 'edit-invert-selection', 'edit-select-all']) {
        const button = ctx.container.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
        if (button) button.disabled = action.startsWith('file-') || action === 'edit-copy' ? selCount === 0 : totalCount === 0;
      }
    };

    const render = (): void => {
      secrets.visit(currentPath);
      addressInput.value = currentPath;
      addressIcon.src = this.icons.getPath(currentPath === 'C:\\' ? 'drive' : 'folder-open', 16);
      paneTitleEl.textContent = `Conteúdo de '${currentPath}'`;

      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;
      upBtn.disabled = currentPath === 'C:\\';
      for (const [selector, disabled] of [['[data-exp-go-back]', backBtn.disabled], ['[data-exp-go-fwd]', forwardBtn.disabled], ['[data-exp-go-up]', upBtn.disabled]] as const) ctx.container.querySelector<HTMLButtonElement>(selector)!.disabled = disabled;

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
        el.setAttribute('role', checkMode === 'hidden' ? 'menuitemcheckbox' : 'menuitemradio');
        el.setAttribute('aria-checked', String(checkMode === 'hidden' ? showHidden : viewMode === checkMode));
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
      const node = this.vfs.resolvePath([...selectedPaths][0] || currentPath);
      if (!node) return;
      showDialog(`Propriedades de ${node.name}`, `<div class="explorer-properties-heading">${this.icons.render(node.icon, 32)}<strong>${this.escapeHtml(node.name)}</strong></div><hr><dl class="explorer-properties"><dt>Tipo:</dt><dd>${this.escapeHtml(NODE_TYPE_LABELS[node.type] || 'Arquivo')}</dd><dt>Localização:</dt><dd>${this.escapeHtml(node.path)}</dd>${node.size ? `<dt>Tamanho:</dt><dd>${this.escapeHtml(node.size)}</dd>` : ''}</dl><p>${this.escapeHtml(node.description || 'Sistema de arquivos virtual do PedroOS')}</p><p>Conteúdo do portfólio somente para leitura</p>`);
    });

    ctx.container.querySelector<HTMLButtonElement>('[data-exp-folders]')!.addEventListener('click', event => {
      treePane.hidden = !treePane.hidden;
      splitter.hidden = treePane.hidden;
      (event.currentTarget as HTMLButtonElement).setAttribute('aria-expanded', String(!treePane.hidden));
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
          ctx.windowManager.open('notepad', { args: { path: 'C:\\SobreMim\\Leia-me.txt' } });
        } else if (action === 'help-about') {
          showDialog('Sobre o Explorador de Arquivos', `${this.icons.render('explorer', 32)}<h3>Explorador de Arquivos</h3><p>PedroOS 95 — Edição Portfólio</p><p>Explore projetos, documentos e pastas do sistema neste ambiente virtual somente para leitura.</p>`);
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

    viewportEl.addEventListener('click', event => {
      if (event.target === viewportEl) { selectedPaths.clear(); lastAnchorPath = null; renderItems(); updateStatus(); viewportEl.focus(); }
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
      if (ev.altKey) return;
      const header = (ev.target as HTMLElement).closest<HTMLElement>('[data-sort]');
      if (header && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); header.click(); return; }
      const children = sortNodes(this.vfs.listDirectory(currentPath, showHidden));
      if (children.length === 0 && ev.key !== 'Backspace') return;

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
        [...itemsEl.querySelectorAll<HTMLElement>('[data-node-path]')].find(item => item.dataset.nodePath === target.path)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : children.length - 1;
        const target = children[prevIdx];
        selectedPaths.clear();
        selectedPaths.add(target.path);
        lastAnchorPath = target.path;
        renderItems();
        updateStatus();
        [...itemsEl.querySelectorAll<HTMLElement>('[data-node-path]')].find(item => item.dataset.nodePath === target.path)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else if (ev.ctrlKey && (ev.key === 'a' || ev.key === 'A')) {
        ev.preventDefault();
        selectAll();
      } else if (ev.ctrlKey && (ev.key === 'c' || ev.key === 'C')) {
        ev.preventDefault();
        copySelected();
      }
    });

    // Folder tree uses the same arrow-key behavior as the classic Explorer.
    treeEl.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tree-path]');
      if (!button) return;
      const buttons = [...treeEl.querySelectorAll<HTMLButtonElement>('[data-tree-path]')];
      const index = buttons.indexOf(button);
      const path = button.dataset.treePath!;
      const focusPath = (target: string): void => {
        const match = [...treeEl.querySelectorAll<HTMLButtonElement>('[data-tree-path]')].reverse().find(item => item.dataset.treePath === target);
        if (match) { treeEl.querySelectorAll<HTMLButtonElement>('[data-tree-path]').forEach(item => { item.tabIndex = item === match ? 0 : -1; }); match.focus(); }
      };
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
        buttons.forEach((item, i) => { item.tabIndex = i === next ? 0 : -1; }); buttons[next]?.focus();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const hasChildren = this.vfs.listDirectory(path, showHidden).some(node => node.type === 'folder' || node.type === 'drive');
        if (hasChildren && !expandedFolders.has(path)) { expandedFolders.add(path); renderTree(); focusPath(path); }
        else if (hasChildren) button.closest('li')?.querySelector<HTMLButtonElement>('ul [data-tree-path]')?.focus();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (expandedFolders.has(path)) { expandedFolders.delete(path); renderTree(); focusPath(path); }
        else focusPath(this.vfs.getParentPath(path));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); navigateTo(path); focusPath(path);
      }
    });
    ctx.container.addEventListener('keydown', event => {
      if (dialog.open) return;
      const target = event.target as HTMLElement;
      if (event.key === 'Escape' && contextMenuEl.style.display !== 'none') { event.preventDefault(); closeDropdowns(); viewportEl.focus(); }
      else if (contextMenuEl.contains(target) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const buttons = [...contextMenuEl.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]; const at = buttons.indexOf(target as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (at + (event.key === 'ArrowUp' ? buttons.length - 1 : 1)) % buttons.length;
        buttons[next]?.focus();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); addressInput.focus(); addressInput.select(); }
      else if (event.key === 'F5') { event.preventDefault(); render(); }
      else if (event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); (event.key === 'ArrowLeft' ? backBtn : event.key === 'ArrowRight' ? forwardBtn : upBtn).click();
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
      const maxWidth = Math.min(450, ctx.container.clientWidth - 185);
      const newWidth = Math.max(120, Math.min(maxWidth, ev.clientX - rect.left));
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
      menus.close();
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
            <li><button type="button" class="start-menu-action" data-ctx-action="open"><strong>Abrir</strong></button></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="explore">Explorar</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="copy">Copiar</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="properties">Propriedades</button></li>
          </ul>`;
      } else {
        contextMenuEl.innerHTML = `
          <ul class="start-menu-list">
            <li><button type="button" class="start-menu-action" data-exp-view="icons">Ícones grandes</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="small-icons">Ícones pequenos</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="list">Lista</button></li>
            <li><button type="button" class="start-menu-action" data-exp-view="details">Detalhes</button></li>
            <li class="start-menu-separator"></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="refresh">Atualizar</button></li>
            <li><button type="button" class="start-menu-action" data-ctx-action="properties">Propriedades</button></li>
          </ul>`;
      }
      contextMenuEl.querySelectorAll('button').forEach(button => { button.className = 'win95-dropdown-item'; button.setAttribute('role', 'menuitem'); });
      contextMenuEl.querySelectorAll('li').forEach(li => li.setAttribute('role', 'none'));
      contextMenuEl.querySelectorAll('.start-menu-separator').forEach(li => { li.className = 'win95-dropdown-separator'; li.setAttribute('role', 'separator'); });
      contextMenuEl.style.left = `${Math.max(0, Math.min(ev.clientX - rect.left, rect.width - contextMenuEl.offsetWidth - 3))}px`;
      contextMenuEl.style.top = `${Math.max(0, Math.min(ev.clientY - rect.top, rect.height - contextMenuEl.offsetHeight - 3))}px`;
      const underPointer = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLButtonElement>('button');
      (underPointer && contextMenuEl.contains(underPointer) ? underPointer : contextMenuEl.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
    });

    contextMenuEl.addEventListener('pointerover', event => {
      if (event.pointerType !== 'touch') (event.target as HTMLElement).closest<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    });
    contextMenuEl.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-ctx-action]');
      const view = (ev.target as HTMLElement).closest<HTMLElement>('[data-exp-view]')?.dataset.expView;
      if (view) { viewMode = view as ExplorerViewMode; closeDropdowns(); render(); return; }
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
    ctx.setTitle(`${this.defaultPath === 'C:\\Projetos' ? 'Projetos' : 'Explorando'} - ${currentPath}`, 'explorer');

    return () => {
      menus.dispose();
      if (dialog.open) dialog.close();
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
