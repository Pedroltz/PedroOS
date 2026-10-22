import type { AppMountContext, ClientAppModule, ProjectSummary } from '../types/index.js';
import { IconRegistryClient } from '../core/IconRegistryClient.js';
import { resumePdfUrl } from '../core/BasePath.js';

interface FavoriteLink {
  label: string;
  url: string;
  external?: boolean;
}

const FAVORITES: FavoriteLink[] = [
  { label: 'PedroOS Home', url: 'pedroos://home' },
  { label: 'Projetos (Portal)', url: 'pedroos://projects' },
  { label: 'Currículo & Habilidades', url: 'pedroos://resume' },
  { label: 'Links & Contatos', url: 'pedroos://links' },
  { label: 'Créditos & Licenças', url: 'pedroos://credits' },
  { label: 'GitHub (@Pedroltz)', url: 'https://github.com/Pedroltz', external: true },
  { label: 'LinkedIn (pedrotunin)', url: 'https://www.linkedin.com/in/pedrotunin/', external: true },
];

export class InternetExplorerApp implements ClientAppModule {
  public constructor(
    private readonly icons: IconRegistryClient,
    private readonly projects: ProjectSummary[],
  ) {}

  public mount(ctx: AppMountContext): () => void {
    const startUrl = ctx.args.url || 'pedroos://home';
    const history: string[] = [startUrl];
    let historyIndex = 0;
    let favoritesOpen = false;

    ctx.container.innerHTML = `
      <div class="app-shell iexplore-app" data-iexplore-instance="${ctx.windowId}">
        <div class="win95-menubar" role="menubar" aria-label="Menu do Internet Explorer">
          <span class="win95-menu-item"><u>F</u>ile</span>
          <span class="win95-menu-item"><u>E</u>dit</span>
          <span class="win95-menu-item"><u>V</u>iew</span>
          <button type="button" class="win95-menu-item win95-menu-btn" data-ie-fav-toggle aria-expanded="false">F<u>a</u>vorites</button>
          <span class="win95-menu-item"><u>H</u>elp</span>
        </div>

        <div class="win95-toolbar" role="toolbar" aria-label="Barra de navegação do Internet Explorer">
          <button type="button" class="toolbar-btn" data-ie-back aria-label="Back" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-left')}" width="16" height="16" alt="" />
            <span>Back</span>
          </button>
          <button type="button" class="toolbar-btn" data-ie-forward aria-label="Forward" disabled>
            <img class="pixel-icon" src="${this.icons.getGlyphPath('arrow-right')}" width="16" height="16" alt="" />
            <span>Forward</span>
          </button>
          <button type="button" class="toolbar-btn" data-ie-refresh aria-label="Refresh">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('reload')}" width="16" height="16" alt="" />
            <span>Refresh</span>
          </button>
          <button type="button" class="toolbar-btn" data-ie-home aria-label="Home">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('home')}" width="16" height="16" alt="" />
            <span>Home</span>
          </button>
          <span class="toolbar-sep" aria-hidden="true"></span>
          <button type="button" class="toolbar-btn" data-ie-fav-btn aria-label="Favorites">
            <img class="pixel-icon" src="${this.icons.getGlyphPath('bookmark')}" width="16" height="16" alt="" />
            <span>Favorites</span>
          </button>
        </div>

        <div class="ie-favorites-bar" data-ie-fav-bar hidden>
          ${FAVORITES.map((fav) =>
            fav.external
              ? `<a class="ie-fav-chip" href="${fav.url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(fav.label)} &#8599;</a>`
              : `<button type="button" class="ie-fav-chip" data-ie-fav-nav="${fav.url}">${this.escapeHtml(fav.label)}</button>`,
          ).join('')}
        </div>

        <form class="win95-addressbar" data-ie-form>
          <label class="addressbar-label" for="ie-addr-${ctx.windowId}">Address</label>
          <input id="ie-addr-${ctx.windowId}"
                 class="addressbar-input"
                 type="text"
                 value="${this.escapeHtml(startUrl)}"
                 aria-label="Address"
                 data-ie-address />
          <button type="submit" class="addressbar-go">Go</button>
        </form>

        <div class="ie-viewport sunken-panel" data-ie-viewport tabindex="0"></div>

        <div class="status-bar">
          <p class="status-bar-field" data-ie-status>Done</p>
          <p class="status-bar-field">PedroOS Intranet Zone</p>
        </div>
      </div>
    `;

    const backBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-back]')!;
    const forwardBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-forward]')!;
    const refreshBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-refresh]')!;
    const homeBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-home]')!;
    const favBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-fav-btn]')!;
    const favMenuBtn = ctx.container.querySelector<HTMLButtonElement>('[data-ie-fav-toggle]')!;
    const favBar = ctx.container.querySelector<HTMLElement>('[data-ie-fav-bar]')!;
    const form = ctx.container.querySelector<HTMLFormElement>('[data-ie-form]')!;
    const addressInput = ctx.container.querySelector<HTMLInputElement>('[data-ie-address]')!;
    const viewport = ctx.container.querySelector<HTMLElement>('[data-ie-viewport]')!;
    const statusEl = ctx.container.querySelector<HTMLElement>('[data-ie-status]')!;

    const navigate = (rawUrl: string, push = true): void => {
      const normalized = this.normalizeUrl(rawUrl);
      if (push && history[historyIndex] !== normalized) {
        history.splice(historyIndex + 1);
        history.push(normalized);
        historyIndex = history.length - 1;
      }
      render();
    };

    const render = (): void => {
      const currentUrl = history[historyIndex];
      addressInput.value = currentUrl;
      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;

      const page = this.renderPageContent(currentUrl);
      ctx.setTitle(`${page.title} - Microsoft Internet Explorer`, 'iexplore');
      viewport.innerHTML = page.html;
      statusEl.textContent = page.status;
    };

    const toggleFavorites = (): void => {
      favoritesOpen = !favoritesOpen;
      favBar.hidden = !favoritesOpen;
      favMenuBtn.setAttribute('aria-expanded', String(favoritesOpen));
    };

    backBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex -= 1;
        render();
      }
    });

    forwardBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        render();
      }
    });

    refreshBtn.addEventListener('click', () => {
      statusEl.textContent = 'Refreshing page...';
      render();
    });

    homeBtn.addEventListener('click', () => navigate('pedroos://home', true));
    favBtn.addEventListener('click', toggleFavorites);
    favMenuBtn.addEventListener('click', toggleFavorites);

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      navigate(addressInput.value, true);
    });

    ctx.container.addEventListener('click', (ev) => {
      const navBtn = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-ie-nav], [data-ie-fav-nav]');
      const navUrl = navBtn?.dataset.ieNav || navBtn?.dataset.ieFavNav;
      if (navUrl) {
        ev.preventDefault();
        navigate(navUrl, true);
        return;
      }

      const appBtn = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-ie-open-app]');
      if (appBtn?.dataset.ieOpenApp) {
        ev.preventDefault();
        const slug = appBtn.dataset.ieSlug;
        ctx.windowManager.open(appBtn.dataset.ieOpenApp, {
          args: slug ? { slug } : {},
        });
      }
    });

    render();
    return () => {
      ctx.container.innerHTML = '';
    };
  }

  private normalizeUrl(raw: string): string {
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      return 'pedroos://home';
    }
    const lower = trimmed.toLowerCase();
    if (lower === 'home' || lower === 'about:blank') {
      return 'pedroos://home';
    }
    if (lower === 'projects' || lower === '/projects') {
      return 'pedroos://projects';
    }
    if (lower === 'resume' || lower === '/resume') {
      return 'pedroos://resume';
    }
    if (lower === 'skills' || lower === '/skills') {
      return 'pedroos://skills';
    }
    if (lower === 'links') {
      return 'pedroos://links';
    }
    if (lower === 'github' || lower === 'github.com/pedroltz') {
      return 'https://github.com/Pedroltz';
    }
    if (lower === 'linkedin' || lower === 'linkedin.com/in/pedrotunin') {
      return 'https://www.linkedin.com/in/pedrotunin/';
    }
    return trimmed;
  }

  private renderPageContent(url: string): { title: string; html: string; status: string } {
    const lower = url.toLowerCase();

    if (lower === 'pedroos://home') {
      return {
        title: 'Welcome to PedroOS 95 Intranet',
        status: 'Done (pedroos://home)',
        html: `
          <div class="ie-page">
            <div class="ie-hero">
              ${this.icons.render('iexplore', 48)}
              <div>
                <h2>PedroOS 95 — Intranet &amp; Developer Portal</h2>
                <p>Bem-vindo ao navegador interno do portfólio de <strong>Pedro Tunin</strong> (Engenheiro de Software — .NET, Python, Linux/DevOps &amp; IA).</p>
              </div>
            </div>
            <hr />
            <div class="ie-columns">
              <div class="ie-box">
                <h3>Páginas Internas (Intranet)</h3>
                <ul>
                  <li><a href="#projects" data-ie-nav="pedroos://projects">Catálogo de Projetos (Ofizzy, RDP Session Manager, ZellaPedia)</a></li>
                  <li><a href="#resume" data-ie-nav="pedroos://resume">Resumo Profissional &amp; Competências</a></li>
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
        title: 'Projects Directory — PedroOS 95',
        status: 'Done (pedroos://projects)',
        html: `
          <div class="ie-page">
            <h2>Diretório de Projetos — Pedro Tunin</h2>
            <p>Clique em um projeto para abrir sua janela detalhada no PedroOS ou visite seu repositório:</p>
            <table class="ie-table">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Resumo</th>
                  <th>Stack</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${this.projects
                  .map(
                    (p) => `
                  <tr>
                    <td><strong>${this.escapeHtml(p.name)}</strong></td>
                    <td>${this.escapeHtml(p.summary)}</td>
                    <td>${this.escapeHtml(p.stack.slice(0, 5).join(', '))}</td>
                    <td>
                      <button type="button" data-ie-open-app="project" data-ie-slug="${this.escapeHtml(p.slug)}">Abrir no OS</button>
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
            </table>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar para PedroOS Home</a></p>
          </div>`,
      };
    }

    if (lower === 'pedroos://resume' || lower === 'pedroos://skills') {
      return {
        title: 'Resume & Skills Overview',
        status: `Done (${url})`,
        html: `
          <div class="ie-page">
            <h2>Pedro Tunin — Engenharia de Software</h2>
            <p>Especializado em Backend (<strong>C# / .NET 10 / ASP.NET Core</strong> e <strong>Python / FastAPI</strong>), Infraestrutura <strong>Linux &amp; DevOps</strong> (Docker, Compose, GitHub Actions, CI/CD) e <strong>Inteligência Artificial Aplicada</strong> (LLMs, RAG, Embeddings, Agentes, Tool Calling e vLLM).</p>
            <div class="ie-actions-row">
              <button type="button" data-ie-open-app="resume">Abrir Resume.doc no WordPad</button>
              <button type="button" data-ie-open-app="sysprops">Abrir System Properties</button>
              <a class="button" href="${resumePdfUrl()}" download="Pedro-Tunin-Resume.pdf">Baixar Currículo PDF</a>
            </div>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar para PedroOS Home</a></p>
          </div>`,
      };
    }

    if (lower === 'pedroos://links') {
      return {
        title: 'External Links & Contacts',
        status: 'Done (pedroos://links)',
        html: `
          <div class="ie-page">
            <h2>Links Profissionais &amp; Repositórios</h2>
            <ul>
              <li><strong>GitHub:</strong> <a href="https://github.com/Pedroltz" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz &#8599;</a></li>
              <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/pedrotunin/" target="_blank" rel="noopener noreferrer">https://www.linkedin.com/in/pedrotunin/ &#8599;</a></li>
              <li><strong>Ofizzy (Repositório):</strong> <a href="https://github.com/Pedroltz/ofizzy" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz/ofizzy &#8599;</a></li>
              <li><strong>RDP Session Manager (Repositório):</strong> <a href="https://github.com/Pedroltz/rdp-session-manager" target="_blank" rel="noopener noreferrer">https://github.com/Pedroltz/rdp-session-manager &#8599;</a></li>
              <li><strong>RDP Session Manager (Website):</strong> <a href="https://pedroltz.github.io/rdp-session-manager/" target="_blank" rel="noopener noreferrer">https://pedroltz.github.io/rdp-session-manager/ &#8599;</a></li>
            </ul>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar para PedroOS Home</a></p>
          </div>`,
      };
    }

    if (lower === 'pedroos://credits') {
      return {
        title: 'PedroOS 95 Credits',
        status: 'Done (pedroos://credits)',
        html: `
          <div class="ie-page">
            <h2>Créditos &amp; Recursos Utilizados</h2>
            <ul>
              <li><strong>98.css</strong> — MIT License (Jordan Scales) — base CSS adaptada para Windows 95.</li>
              <li><strong>interact.js</strong> — MIT License (Taye Adeyemi) — arraste e redimensionamento de janelas.</li>
              <li><strong>Pixelarticons</strong> — MIT License (Gerrit Halfmann) — ícones auxiliares de barra de ferramentas.</li>
              <li><strong>Ícones Pixel Art 16×16 / 32×32 / 48×48</strong> — arte original gerada em código para o PedroOS 95 respeitando a paleta clássica de 16 cores.</li>
            </ul>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar para PedroOS Home</a></p>
          </div>`,
      };
    }

    if (lower === 'about:mozilla') {
      return {
        title: 'The Book of PedroOS',
        status: 'Easter Egg — about:mozilla',
        html: `
          <div class="ie-page ie-mozilla-egg">
            <p><em>"And the Monolith was modularized, and the Windows were rendered in 16 colors of pure nostalgia; and the Engineers saw that the tests were green, both Unit and End-to-End."</em></p>
            <p class="ie-mozilla-cite">from <strong>The Book of PedroOS</strong>, 19:95</p>
          </div>`,
      };
    }

    if (/^https?:\/\//i.test(url)) {
      return {
        title: `External Site — ${url}`,
        status: `External URL (${url})`,
        html: `
          <div class="ie-page">
            <h2>Navegação para Site Externo</h2>
            <p>Por segurança e respeito às políticas de iframe dos navegadores modernos, URLs externas são abertas em uma nova aba real do navegador:</p>
            <p class="ie-external-box">
              <a class="button" href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                Abrir ${this.escapeHtml(url)} em nova aba &#8599;
              </a>
            </p>
            <p><a href="#home" data-ie-nav="pedroos://home">&laquo; Voltar para PedroOS Home</a></p>
          </div>`,
      };
    }

    return {
      title: 'Page Not Found',
      status: '404 Not Found',
      html: `
        <div class="ie-page">
          <h2>Internet Explorer cannot open the intranet page</h2>
          <p>Address <code>${this.escapeHtml(url)}</code> is not registered. Try one of the internal pages:</p>
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
