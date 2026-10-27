import { mountClassicMenu } from '../components/ClassicMenu.js';
import type { AppMountContext, ClientAppModule, ProjectSummary } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { resumePdfUrl, withBase } from '../core/BasePath.js';
import { browserState, updateBrowserState, subscribeBrowserState, normalizeAddress, allowedAddress, INTERNAL_PAGES } from './InternetExplorerState.js';
import profile from '../../Data/profile.json' with { type: 'json' };
import projectData from '../../Data/projects.json' with { type: 'json' };

export class InternetExplorerApp implements ClientAppModule {
  public constructor(
    private readonly icons: IconRegistryClient,
    private readonly projects: ProjectSummary[],
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const escape = (text: string): string => this.escapeHtml(text);
    const abort = new AbortController();
    const { signal } = abort;
    let state = browserState();
    const history = [{ url: normalizeAddress(ctx.args.url || state.preferences.home), top: 0, left: 0 }];
    let index = 0;
    let panel = '';
    let query = '';
    let pageStatus = '';
    const menus: Record<string, [string, string][]> = {
      File: [['open', 'Abrir endereço…'], ['homepage', 'Definir página inicial…'], ['close', 'Fechar']],
      Edit: [['copy', 'Copiar endereço'], ['find', 'Localizar nesta página…']],
      View: [['toolbar', 'Barra de navegação'], ['address', 'Barra de endereço'], ['status', 'Barra de status'], ['refresh', 'Atualizar'], ['smaller', 'Diminuir texto'], ['larger', 'Aumentar texto']],
      Favorites: [['favorites', 'Exibir favoritos'], ['add', 'Adicionar aos favoritos…'], ['organize', 'Organizar favoritos…']],
      Help: [['help', 'Ajuda do Navegador PedroOS'], ['about', 'Sobre o Navegador PedroOS']],
    };
    const menuLabels: Record<string, string> = { File: '<u>A</u>rquivo', Edit: '<u>E</u>ditar', View: 'E<u>x</u>ibir', Favorites: '<u>F</u>avoritos', Help: 'A<u>j</u>uda' };
    const toolbar = [['back', 'Voltar', 'arrow-left'], ['forward', 'Avançar', 'arrow-right'], ['refresh', 'Atualizar', 'reload'], ['home', 'Início', 'home'], ['favorites', 'Favoritos', 'bookmark'], ['history', 'Histórico', 'folder'], ['search', 'Pesquisar', 'search']];
    ctx.container.innerHTML = `<div class="app-shell iexplore-app" data-iexplore-instance="${escape(ctx.windowId)}">
      <div class="win95-menubar" role="menubar" aria-label="Menu do Navegador PedroOS">${Object.entries(menus).map(([name, items]) => `<div class="ie-menu"><button type="button" class="win95-menu-item win95-menu-btn" role="menuitem" aria-haspopup="menu" aria-expanded="false" data-ie-menu="${name}">${menuLabels[name]}</button><div class="ie-menu-popup" role="menu" aria-label="${name}" hidden>${items.map(([action, label]) => `<button type="button" role="${['toolbar', 'address', 'status'].includes(action) ? 'menuitemcheckbox' : 'menuitem'}" data-ie-action="${action}">${label}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="win95-toolbar ie-toolbar" data-ie-toolbar role="toolbar" aria-label="Barra de navegação do Navegador PedroOS">${toolbar.map(([action, label, icon]) => `<button type="button" class="toolbar-btn" data-ie-${action} data-ie-action="${action}" aria-label="${label}"><img class="pixel-icon" src="${this.icons.getGlyphPath(icon)}" width="16" height="16" alt=""><span>${label}</span></button>`).join('')}<span class="ie-brand" aria-hidden="true">${this.icons.render('iexplore', 32)}</span></div>
      <form class="win95-addressbar" data-ie-form><label class="addressbar-label" for="ie-addr-${ctx.windowId}">Endereço</label><input id="ie-addr-${ctx.windowId}" class="addressbar-input" aria-label="Endereço" data-ie-address autocomplete="off" spellcheck="false"><button type="submit" class="addressbar-go">Ir</button></form>
      <div class="ie-workspace"><aside class="ie-sidebar sunken-panel" aria-label="Painel do navegador" hidden><div class="ie-sidebar-heading"><strong data-ie-panel-title></strong><button type="button" data-ie-action="panel-close" aria-label="Fechar painel">×</button></div><div data-ie-panel></div></aside><div class="ie-viewport sunken-panel" data-ie-viewport tabindex="0" aria-label="Página"></div></div>
      <div class="status-bar" data-ie-statusbar><p class="status-bar-field" data-ie-status></p><p class="status-bar-field">Zona da intranet do PedroOS</p></div>
      <dialog class="window ie-dialog" aria-label="Navegador PedroOS"><form method="dialog"><div class="title-bar"><span class="title-bar-text" data-ie-dialog-title></span><div class="title-bar-controls"><button type="button" class="close" data-ie-action="dialog-close" aria-label="Fechar diálogo"></button></div></div><div class="window-body" data-ie-dialog-body></div><div class="ie-dialog-buttons"><button value="ok">OK</button><button value="cancel">Cancelar</button></div></form></dialog>
    </div>`;
    const root = ctx.container.querySelector<HTMLElement>('.iexplore-app')!;
    const address = root.querySelector<HTMLInputElement>('[data-ie-address]')!;
    const viewport = root.querySelector<HTMLElement>('[data-ie-viewport]')!;
    const sidebar = root.querySelector<HTMLElement>('.ie-sidebar')!;
    const panelBody = root.querySelector<HTMLElement>('[data-ie-panel]')!;
    const status = root.querySelector<HTMLElement>('[data-ie-status]')!;
    const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
    let dialogSubmit: (() => void) | undefined;
    let dialogFocus: HTMLElement | null = null;
    const current = (): string => history[index].url;
    const saveScroll = (): void => { history[index].top = viewport.scrollTop; history[index].left = viewport.scrollLeft; };
    const menuController = mountClassicMenu(ctx.container);
    const closeMenus = menuController.close;
    const openDialog = (title: string, body: string, submit?: () => void): void => {
      dialogFocus = document.activeElement as HTMLElement;
      dialogSubmit = submit;
      dialog.querySelector('[data-ie-dialog-title]')!.textContent = title;
      dialog.querySelector('[data-ie-dialog-body]')!.innerHTML = body;
      dialog.returnValue = '';
      if (!dialog.open) dialog.showModal();
      (dialog.querySelector<HTMLElement>('input, select') || dialog.querySelector<HTMLElement>('button[value="ok"]'))?.focus();
    };
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'ok') dialogSubmit?.();
      dialogSubmit = undefined;
      if (dialogFocus?.isConnected && dialogFocus.getClientRects().length) dialogFocus.focus();
      else viewport.focus();
    }, { signal });
    const inputDialog = (title: string, label: string, value: string, submit: (value: string) => void): void => {
      openDialog(title, `<label>${label}<input data-ie-dialog-input value="${escape(value)}" required></label>`, () => submit(dialog.querySelector<HTMLInputElement>('[data-ie-dialog-input]')!.value.trim()));
    };
    const renderPanel = (): void => {
      sidebar.hidden = !panel;
      root.querySelector('[data-ie-panel-title]')!.textContent = { favorites: 'Favoritos', history: 'Histórico', search: 'Pesquisar' }[panel] || '';
      root.querySelectorAll<HTMLElement>('.ie-toolbar [data-ie-action]').forEach(button => {
        if (['favorites', 'history', 'search'].includes(button.dataset.ieAction!)) button.setAttribute('aria-pressed', String(button.dataset.ieAction === panel));
      });
      const link = (url: string, title: string): string => `<a href="${escape(url)}" data-ie-nav="${escape(url)}">${escape(title)}</a>`;
      if (panel === 'favorites') panelBody.innerHTML = `<button data-ie-action="add">Adicionar…</button><button data-ie-action="organize">Organizar…</button><ul>${state.favorites.map(f => `<li>${link(f.url, f.label)}</li>`).join('')}</ul>`;
      if (panel === 'history') panelBody.innerHTML = `<p>Últimas 100 visitas</p><ol>${state.visits.slice().reverse().map(v => `<li>${link(v.url, this.renderPageContent(v.url).title)}<small>${escape(new Date(v.date).toLocaleDateString('pt-BR'))}</small></li>`).join('')}</ol>`;
      if (panel === 'search') {
        const pages = INTERNAL_PAGES.map(([id, label]) => ({ url: `pedroos://${id}`, label, text: `${label} ${id} ${id === 'skills' ? profile.competencies.map(c => c.items.join(' ')).join(' ') : id === 'resume' ? profile.summary : ''}` }));
        const terms = query.toLocaleLowerCase('pt-BR').trim().split(/\s+/);
        const matches = (text: string): boolean => terms.every(t => text.toLocaleLowerCase('pt-BR').includes(t));
        panelBody.innerHTML = `<form data-ie-search-form><label>Pesquisar no portfólio<input aria-label="Pesquisar no portfólio" name="query" value="${escape(query)}"></label><button>Pesquisar</button></form><p>Projetos e páginas internas</p><ul>${pages.filter(p => matches(p.text)).map(p => `<li>${link(p.url, p.label)}</li>`).join('')}${this.projects.filter(p => matches(`${p.name} ${p.summary} ${p.stack.join(' ')}`)).map(p => `<li><button data-ie-open-app="project" data-ie-slug="${escape(p.slug)}">${escape(p.name)}</button></li>`).join('')}</ul>`;
        if (!panelBody.querySelector('li')) panelBody.insertAdjacentHTML('beforeend', '<p>Nenhum resultado encontrado.</p>');
      }
    };
    const applyPreferences = (): void => {
      root.querySelector<HTMLElement>('[data-ie-toolbar]')!.hidden = !state.preferences.toolbar;
      root.querySelector<HTMLElement>('[data-ie-form]')!.hidden = !state.preferences.address;
      root.querySelector<HTMLElement>('[data-ie-statusbar]')!.hidden = !state.preferences.status;
      viewport.style.setProperty('--ie-text-scale', String(state.preferences.textSize / 100));
      for (const key of ['toolbar', 'address', 'status'] as const) root.querySelector(`[data-ie-action="${key}"]`)?.setAttribute('aria-checked', String(state.preferences[key]));
    };
    const render = (): void => {
      const page = this.renderPageContent(current());
      address.value = current();
      root.querySelector<HTMLButtonElement>('[data-ie-back]')!.disabled = index === 0;
      root.querySelector<HTMLButtonElement>('[data-ie-forward]')!.disabled = index === history.length - 1;
      ctx.setTitle(`${page.title} - Navegador PedroOS`, 'iexplore');
      const framed = current().startsWith('pedroos://');
      const navigation = INTERNAL_PAGES.map(([id, label]) => `<a href="pedroos://${id}" data-ie-nav="pedroos://${id}"${current() === `pedroos://${id}` ? ' aria-current="page"' : ''}>${label}</a>`).join(' | ');
      viewport.innerHTML = `${framed ? `<header class="ie-site-header"><b>PEDRO TUNIN</b><span>Software • Linux • Inteligência Artificial</span><nav aria-label="Diretório do portal">${navigation}</nav></header>` : ''}${page.html}${framed ? `<footer class="ie-site-footer"><hr>PedroOS 95 · Portal pessoal do desenvolvedor<br><a href="pedroos://home" data-ie-nav="pedroos://home">Início</a> · Melhor visualizado no Navegador PedroOS · Estilo de 1995, software de hoje</footer>` : ''}`;
      viewport.scrollTop = history[index].top;
      viewport.scrollLeft = history[index].left;
      pageStatus = page.status;
      status.textContent = pageStatus;
    };
    const recordVisit = (): void => {
      if (allowedAddress(current())) updateBrowserState(s => s.visits.push({ url: current(), title: this.renderPageContent(current()).title, date: new Date().toISOString() }));
    };
    const navigate = (url: string): void => {
      saveScroll();
      const normalized = normalizeAddress(url);
      history.splice(index + 1);
      history.push({ url: normalized, top: 0, left: 0 });
      index = history.length - 1;
      render(); recordVisit();
      if (matchMedia('(max-width: 600px)').matches) { panel = ''; renderPanel(); }
    };
    const travel = (delta: number): void => {
      if (index + delta < 0 || index + delta >= history.length) return;
      saveScroll(); index += delta; render();
    };
    const findText = (text: string): void => {
      viewport.querySelectorAll('mark').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent || '')));
      viewport.normalize();
      if (!text) return;
      const walker = document.createTreeWalker(viewport, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      let count = 0;
      for (const node of nodes) {
        const value = node.data; let from = 0; let position: number;
        const fragment = document.createDocumentFragment();
        while ((position = value.toLocaleLowerCase().indexOf(text.toLocaleLowerCase(), from)) !== -1) {
          fragment.append(value.slice(from, position));
          const mark = document.createElement('mark'); mark.textContent = value.slice(position, position + text.length); fragment.append(mark);
          from = position + text.length; count++;
        }
        if (from) { fragment.append(value.slice(from)); node.replaceWith(fragment); }
      }
      viewport.querySelector('mark')?.scrollIntoView({ block: 'center' });
      status.textContent = `${count} ocorrência(s) de “${text}”`;
    };
    const action = (name: string): void => {
      if (name === 'back') travel(-1);
      else if (name === 'forward') travel(1);
      else if (name === 'refresh') { saveScroll(); render(); }
      else if (name === 'home') navigate(state.preferences.home);
      else if (['favorites', 'history', 'search'].includes(name)) { panel = panel === name ? '' : name; renderPanel(); sidebar.querySelector<HTMLElement>('input, a, button')?.focus(); }
      else if (name === 'panel-close') { panel = ''; renderPanel(); viewport.focus(); }
      else if (name === 'close') ctx.windowManager.close(ctx.windowId);
      else if (name === 'dialog-close') dialog.close('cancel');
      else if (name === 'open') inputDialog('Abrir', 'Endereço', current(), navigate);
      else if (name === 'homepage') inputDialog('Página inicial', 'Endereço da página inicial', state.preferences.home, value => {
        const url = normalizeAddress(value);
        if (allowedAddress(url)) updateBrowserState(s => { s.preferences.home = url; });
        else status.textContent = 'Endereço inválido. Use pedroos://, HTTP ou HTTPS.';
      });
      else if (name === 'copy') {
        const fallback = (): void => { if (!state.preferences.address) updateBrowserState(s => { s.preferences.address = true; }); address.focus(); address.select(); status.textContent = 'Use Ctrl+C para copiar o endereço.'; };
        if (navigator.clipboard) void navigator.clipboard.writeText(current()).then(() => { status.textContent = 'Endereço copiado.'; }).catch(fallback);
        else fallback();
      }
      else if (name === 'find') inputDialog('Localizar', 'Localizar texto', '', findText);
      else if (['toolbar', 'address', 'status'].includes(name)) updateBrowserState(s => { const key = name as 'toolbar' | 'address' | 'status'; s.preferences[key] = !s.preferences[key]; });
      else if (name === 'larger' || name === 'smaller') updateBrowserState(s => { const sizes = [85, 100, 120, 140]; s.preferences.textSize = sizes[Math.max(0, Math.min(3, sizes.indexOf(s.preferences.textSize) + (name === 'larger' ? 1 : -1)))]; });
      else if (name === 'add') {
        if (!allowedAddress(current())) { status.textContent = 'Este endereço não pode ser salvo.'; return; }
        inputDialog('Adicionar aos favoritos', 'Nome do favorito', this.renderPageContent(current()).title, label => {
          if (label) updateBrowserState(s => { s.favorites = s.favorites.filter(f => f.url !== current()); s.favorites.push({ label, url: current() }); s.favorites = s.favorites.slice(-100); });
        });
      } else if (name === 'organize') {
        openDialog('Organizar favoritos', `<label>Favorito<select data-ie-favorite>${state.favorites.map((f, i) => `<option value="${i}">${escape(f.label)}</option>`).join('')}</select></label><label>Novo nome<input data-ie-rename></label><div class="ie-remove-row"><input type="checkbox" id="ie-remove-${ctx.windowId}" data-ie-remove><label for="ie-remove-${ctx.windowId}">Excluir favorito selecionado</label></div>`, () => {
          const selected = Number(dialog.querySelector<HTMLSelectElement>('select')!.value);
          const label = dialog.querySelector<HTMLInputElement>('[data-ie-rename]')!.value.trim();
          const remove = dialog.querySelector<HTMLInputElement>('[data-ie-remove]')!.checked;
          updateBrowserState(s => { if (remove) s.favorites.splice(selected, 1); else if (label && s.favorites[selected]) s.favorites[selected].label = label; });
        });
      } else if (name === 'help') openDialog('Ajuda do Navegador PedroOS', '<p>Use a barra de endereço para abrir páginas pedroos:// ou endereços HTTP/HTTPS. Sites externos oferecem um link para outra aba.</p><p>Alt+← / Alt+→: voltar e avançar. Ctrl+L: endereço. Ctrl+F: localizar. Ctrl+D: adicionar favorito. F5: atualizar. Use Tab e setas nos menus e painéis; Escape fecha o menu ou painel.</p><p>Favoritos, preferências e até 100 visitas ficam salvos neste navegador.</p>');
      else if (name === 'about') openDialog('Sobre o Navegador PedroOS', `${this.icons.render('iexplore', 48)}<h3>Navegador PedroOS</h3><p>PedroOS 95 · Edição Intranet · 1.0</p><p>Uma homenagem aos portais pessoais dos anos 1990.</p>`);
    };
    root.addEventListener('submit', e => {
      const form = e.target as HTMLFormElement;
      if (form.matches('[data-ie-form]')) { e.preventDefault(); navigate(address.value); }
      if (form.matches('[data-ie-search-form]')) { e.preventDefault(); query = new FormData(form).get('query')?.toString() || ''; renderPanel(); panelBody.querySelector<HTMLInputElement>('input')?.focus(); }
    }, { signal });
    root.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      closeMenus();
      const link = target.closest<HTMLElement>('[data-ie-nav]');
      if (link) { e.preventDefault(); navigate(link.dataset.ieNav!); return; }
      const app = target.closest<HTMLElement>('[data-ie-open-app]');
      if (app) { e.preventDefault(); ctx.windowManager.open(app.dataset.ieOpenApp!, { args: { slug: app.dataset.ieSlug || '' } }); return; }
      const button = target.closest<HTMLElement>('[data-ie-action]');
      if (button) action(button.dataset.ieAction!);
    }, { signal });
    root.addEventListener('mouseover', e => {
      const link = (e.target as Element).closest<HTMLElement>('a, [data-ie-nav]');
      status.textContent = link?.dataset.ieNav || link?.getAttribute('href') || pageStatus;
    }, { signal });
    root.addEventListener('mouseleave', () => { status.textContent = pageStatus; }, { signal });
    root.addEventListener('keydown', e => {
      if (dialog.open) return;
      const target = e.target as HTMLElement;
      if (e.key === 'Escape') { e.preventDefault(); const expanded = root.querySelector<HTMLElement>('[data-ie-menu][aria-expanded="true"]'); if (expanded) { closeMenus(); expanded.focus(); } else { panel = ''; renderPanel(); viewport.focus(); } }
      else if (e.ctrlKey && ['l', 'f', 'd'].includes(e.key.toLowerCase())) { e.preventDefault(); if (e.key.toLowerCase() === 'l') { if (!state.preferences.address) updateBrowserState(s => { s.preferences.address = true; }); address.focus(); address.select(); } else action(e.key.toLowerCase() === 'f' ? 'find' : 'add'); }
      else if (e.key === 'F5') { e.preventDefault(); action('refresh'); }
      else if (e.altKey && ['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) { e.preventDefault(); if (e.key === 'Home') action('home'); else travel(e.key === 'ArrowLeft' ? -1 : 1); }
      else if (sidebar.contains(target) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && !target.matches('input')) {
        const items = [...sidebar.querySelectorAll<HTMLElement>('button, a, input')];
        const at = items.indexOf(target); let next = at + (e.key === 'ArrowUp' ? -1 : 1);
        if (e.key === 'Home') next = 0; if (e.key === 'End') next = items.length - 1;
        e.preventDefault(); items[(next + items.length) % items.length]?.focus();
      }
    }, { signal });
    const unsubscribe = subscribeBrowserState(() => { state = browserState(); applyPreferences(); renderPanel(); });
    applyPreferences(); render(); recordVisit();
    return () => { menuController.dispose(); unsubscribe(); abort.abort(); if (dialog.open) dialog.close(); ctx.container.replaceChildren(); };
  }

  private renderPageContent(url: string): { title: string; html: string; status: string } {
    const lower = url.toLowerCase();
    if (lower === 'about:blank') return { title: 'about:blank', status: 'Concluído', html: '' };

    if (lower === 'pedroos://home') {
      return {
        title: 'Bem-vindo à intranet do PedroOS 95',
        status: 'Concluído (pedroos://home)',
        html: `
          <div class="ie-page">
            <div class="ie-hero">
              ${this.icons.render('iexplore', 48)}
              <div>
                <h2>PedroOS 95 — Intranet e Portal do Desenvolvedor</h2>
                <p>Bem-vindo ao navegador interno do portfólio de <strong>Pedro Tunin</strong> (Engenheiro de Software — .NET, Python, Linux/DevOps &amp; IA).</p>
              </div>
            </div>
            <hr />
            <div class="ie-columns">
              <div class="ie-box">
                <h3>Páginas Internas (Intranet)</h3>
                <ul>
                  <li><a href="#projects" data-ie-nav="pedroos://projects">Catálogo de projetos e repositórios fixados</a></li>
                  <li><a href="#resume" data-ie-nav="pedroos://resume">Currículo Profissional</a></li><li><a href="#skills" data-ie-nav="pedroos://skills">Diretório de Competências</a></li>
                  <li><a href="#links" data-ie-nav="pedroos://links">Diretório de Links &amp; Perfis Oficiais</a></li>
                  <li><a href="#credits" data-ie-nav="pedroos://credits">Sobre o PedroOS 95 &amp; Licenças</a></li>
                </ul>
              </div>
              <div class="ie-box">
                <h3>Perfis Externos Verificados</h3>
                <p>Links externos abrem com segurança em uma nova aba real do seu navegador:</p>
                <ul>
                  <li><a href="https://github.com/Pedroltz" target="_blank" rel="noopener noreferrer">GitHub — https://github.com/Pedroltz &#8599;</a></li>
                  <li><a href="https://www.linkedin.com/in/pedrotunin/" target="_blank" rel="noopener noreferrer">LinkedIn — https://www.linkedin.com/in/pedrotunin/ &#8599;</a></li>
                  <li><a href="${resumePdfUrl()}" download="Pedro-Tunin-Resume.pdf">Download do Currículo em PDF</a></li>
                </ul>
              </div>
            </div>
          </div>`,
      };
    }

    if (lower === 'pedroos://projects') {
      return {
        title: 'Diretório de Projetos — PedroOS 95',
        status: 'Concluído (pedroos://projects)',
        html: `
          <div class="ie-page">
            <h2>Diretório de Projetos — Pedro Tunin</h2>
            <p>Clique em um projeto para abrir sua janela detalhada no PedroOS ou visite seu repositório:</p>
            <div class="ie-table-scroll"><table class="ie-table ie-projects-table">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Resumo</th>
                  <th>Tecnologias</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${this.projects
                  .map(
                    (p) => `
                  <tr>
                    <td>${this.icons.render(p.icon, 32)}<br><strong>${this.escapeHtml(p.name)}</strong>${projectData.find(project => project.slug === p.slug)?.screenshots.slice(0, 1).map(image => `<figure><img class="ie-project-preview" src="${withBase(image.src)}" alt="${this.escapeHtml(image.alt)}" loading="lazy"><figcaption>${this.escapeHtml(image.caption)}</figcaption></figure>`).join('') || ''}</td>
                    <td>${this.escapeHtml(p.summary)}</td>
                    <td>${this.escapeHtml(p.stack.slice(0, 5).join(', '))}</td>
                    <td>
                      <button type="button" data-ie-open-app="project" data-ie-slug="${this.escapeHtml(p.slug)}">Abrir no PedroOS</button>
                      ${
                        p.repositoryUrl
                          ? `<a href="${this.escapeHtml(p.repositoryUrl)}" target="_blank" rel="noopener noreferrer">GitHub &#8599;</a>`
                          : ''
                      }
                    </td>
                  </tr>`,
                  )
                  .join('')}
              </tbody>
            </table></div>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar ao início do PedroOS</a></p>
          </div>`,
      };
    }

    if (lower === 'pedroos://resume') {
      return { title: 'Currículo — Pedro Tunin', status: `Concluído (${url})`, html: `<article class="ie-page">
        <h2>${this.escapeHtml(profile.name)} — Currículo</h2><p><b>${this.escapeHtml(profile.headline)}</b></p><p>${this.escapeHtml(profile.location)}</p>
        <p>${this.escapeHtml(profile.summary)}</p><h3>Apresentação</h3>${profile.about.map(p => `<p>${this.escapeHtml(p)}</p>`).join('')}
        <h3>Projetos e experiência pública</h3>${profile.experience.filter(e => !e.isPlaceholder).map(e => `<h4>${this.escapeHtml(e.role)} · ${this.escapeHtml(e.organization)}</h4><p>${this.escapeHtml(e.period)}</p><ul>${e.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join('')}</ul>`).join('')}
        <h3>Idiomas</h3><ul>${profile.languages.map(l => `<li>${this.escapeHtml(l)}</li>`).join('')}</ul>
        <div class="ie-actions-row"><button data-ie-open-app="resume">Abrir Currículo no Editor de Documentos</button><a href="${resumePdfUrl()}" download="Pedro-Tunin-Resume.pdf">Baixar currículo PDF</a></div>
        <p><a href="pedroos://skills" data-ie-nav="pedroos://skills">Consultar competências técnicas »</a></p></article>` };
    }
    if (lower === 'pedroos://skills') {
      return { title: 'Competências — Pedro Tunin', status: `Concluído (${url})`, html: `<article class="ie-page"><h2>Diretório de Competências</h2><p>Tecnologias utilizadas no desenvolvimento dos projetos do portfólio.</p>
        <table class="ie-table"><thead><tr><th>Área</th><th>Tecnologias</th></tr></thead><tbody>${profile.competencies.map(c => `<tr><th>${this.escapeHtml(c.name)}</th><td><ul>${c.items.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table>
        <p><button data-ie-open-app="sysprops">Inspecionar em Propriedades do Sistema</button></p><p><a href="pedroos://resume" data-ie-nav="pedroos://resume">Consultar currículo »</a></p></article>` };
    }

    if (lower === 'pedroos://links') {
      return {
        title: 'Links externos e contatos',
        status: 'Concluído (pedroos://links)',
        html: `
          <div class="ie-page">
            <h2>Links Profissionais &amp; Contatos</h2><p>E-mail: <a href="mailto:pedro.tunin@outlook.com">pedro.tunin@outlook.com</a></p>
            <ul>
              <li><strong>GitHub:</strong> <a href="https://github.com/Pedroltz" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz &#8599;</a></li>
              <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/pedrotunin/" target="_blank" rel="noopener noreferrer">https://www.linkedin.com/in/pedrotunin/ &#8599;</a></li>
              <li><strong>Ofizzy (Repositório):</strong> <a href="https://github.com/Pedroltz/ofizzy" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz/ofizzy &#8599;</a></li>
              <li><strong>RDP Session Manager (Repositório):</strong> <a href="https://github.com/Pedroltz/rdp-session-manager" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz/rdp-session-manager &#8599;</a></li>
              <li><strong>RDP Session Manager (Website):</strong> <a href="https://pedroltz.github.io/rdp-session-manager/" target="_blank" rel="noopener noreferrer">https://pedroltz.github.io/rdp-session-manager/ &#8599;</a></li>
            </ul>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar ao início do PedroOS</a></p>
          </div>`,
      };
    }

    if (lower === 'pedroos://credits') {
      return {
        title: 'Créditos do PedroOS 95',
        status: 'Concluído (pedroos://credits)',
        html: `
          <div class="ie-page">
            <h2>Créditos &amp; Recursos Utilizados</h2>
            <ul>
              <li><strong>98.css</strong> — Licença MIT (Jordan Scales) — base CSS do PedroOS 95.</li>
              <li><strong>interact.js</strong> — Licença MIT (Taye Adeyemi) — arraste e redimensionamento de janelas.</li>
              <li><strong>Pixelarticons</strong> — Licença MIT (Gerrit Halfmann) — ícones auxiliares de barra de ferramentas.</li>
              <li><strong>Ícones Pixel Art 16×16 / 32×32 / 48×48</strong> — arte original gerada em código para o PedroOS 95 respeitando a paleta clássica de 16 cores.</li>
            </ul>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar ao início do PedroOS</a></p>
          </div>`,
      };
    }

    if (lower === 'about:mozilla') {
      return {
        title: 'O Livro do PedroOS',
        status: 'Segredo — about:mozilla',
        html: `
          <div class="ie-page ie-mozilla-egg">
            <p><em>"E o monólito foi modularizado, e as janelas foram renderizadas em 16 cores de pura nostalgia; e os engenheiros viram que todos os testes passaram, tanto os unitários quanto os de ponta a ponta."</em></p>
            <p class="ie-mozilla-cite">de <strong>O Livro do PedroOS</strong>, 19:95</p>
          </div>`,
      };
    }

    if (allowedAddress(url) && /^https?:\/\//i.test(url)) {
      return {
        title: `Site externo — ${url}`,
        status: `Endereço externo (${url})`,
        html: `
          <div class="ie-page">
            <h2>Navegação para Site Externo</h2>
            <p>Por segurança e respeito às políticas de iframe dos navegadores modernos, URLs externas são abertas em uma nova aba real do navegador:</p>
            <p class="ie-external-box">
              <a class="button" href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                Abrir ${this.escapeHtml(url)} em nova aba &#8599;
              </a>
            </p>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar ao início do PedroOS</a></p>
          </div>`,
      };
    }

    return {
      title: 'Página não encontrada',
      status: '404 — Página não encontrada',
      html: `
        <div class="ie-page">
          <h2>O Navegador PedroOS não pode abrir esta página</h2>
          <p>O endereço <code>${this.escapeHtml(url)}</code> não está cadastrado. Tente uma das páginas internas:</p>
          <ul>
            <li><a href="#home" data-ie-nav="pedroos://home">pedroos://home</a></li>
            <li><a href="#projects" data-ie-nav="pedroos://projects">pedroos://projects</a></li>
            <li><a href="#resume" data-ie-nav="pedroos://resume">pedroos://resume</a></li>
            <li><a href="#links" data-ie-nav="pedroos://links">pedroos://links</a></li>
          </ul>
        </div>`,
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
