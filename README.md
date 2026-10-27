# PedroOS 95

[![CI & Deploy](https://github.com/Pedroltz/PedroOS/actions/workflows/ci.yml/badge.svg)](https://github.com/Pedroltz/PedroOS/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![.NET 10](https://img.shields.io/badge/.NET-10-512BD4) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)

> Um portfólio profissional interativo e sistema operacional virtual completo inspirado no visual clássico dos anos 90, desenvolvido com **ASP.NET Core (.NET 10 LTS)**, **Razor Pages**, **TypeScript**, **98.css** e **interact.js**.
>
> 🔗 **Acesse online (URL fixa):** **[https://pedroltz.github.io/PedroOS/](https://pedroltz.github.io/PedroOS/)**

---

## 1. Visão Geral

O **PedroOS 95** transforma o portfólio de **Pedro Tunin** em uma experiência imersiva de sistema operacional retrô em português acessível diretamente pelo navegador. Todos os aplicativos são funcionais e integrados ao mesmo ambiente desktop, apresentando projetos reais (.NET, Python, Linux/DevOps, IA), currículo no Editor de Documentos (`Curriculo.doc`), competências em Propriedades do Sistema, Navegador PedroOS, Terminal PedroOS com execução nativa em PTY do jogo **2091**, **DOOM** (Chocolate Doom / Freedoom) e **Campo Minado**.

### Características Visuais & Direção Artística:
- Desktop verde-petróleo autêntico (`#008080`) com suporte a padrões clássicos (Classic Teal, Bricks, Weave, Scottie, Dots).
- Janelas cinza (`#c0c0c0`) com relevo 3D chanfrado e profundidade.
- Barras de título azul-marinho (`#000080`) para janelas ativas e cinza para inativas.
- Ícones e cursores em pixel art 16x16, 32x32 e 48x48 gerados proceduralmente com a paleta clássica de 16 cores.
- Interface 100% localizada em português (com suporte a aliases legados em inglês no sistema de arquivos e terminal).
- Responsividade total: janelas livres com arraste e redimensionamento no desktop/tablet, e modo tela cheia adaptado para smartphones.

---

## 2. Stack Tecnológica

### Backend
- **.NET 10 LTS** & C# (`PedroOS.Web` + `Game2091.Native`)
- **ASP.NET Core Razor Pages** com Partial Views e endpoints de fragmentos
- **Injeção de Dependência** & Serviços Tipados (`IPortfolioCatalog`, `IAppCatalog`, `IVirtualFileSystem`, `IIconRegistry`, `IResumePdfService`, `Game2091TerminalService`)
- **Catálogo em JSON**: Dados desacoplados em `Data/projects.json`, `Data/skills.json` e `Data/profile.json`.
- **Segurança**: Middleware de headers HTTP (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e validação estrita de paths e identificadores.
- **SEO Nativo**: Server-Side Rendering com pré-renderização da janela solicitada diretamente no HTML inicial para crawlers e compartilhamento social (`OG Tags`, `sitemap.xml`, `robots.txt`).

### Frontend
- **TypeScript** modular sem frameworks SPA pesados.
- **WindowManager** reutilizável com suporte a multi-instâncias, z-index, arraste e redimensionamento via **interact.js**.
- **DesktopStore**: Gerenciamento de estado reativo e granular.
- **Sistema de Arquivos Virtual (`C:\...`)**: Navegação baseada em árvore de metadados (`C:\Projetos`, `C:\Projetos\MaisProjetos`, `C:\Documentos`, `C:\Experiencia`, `C:\Habilidades`, `C:\Jogos`, `C:\Internet`, `C:\SobreMim`, `C:\PEDROOS`).
- **xterm.js** carregado sob demanda para sessões de terminal PTY do jogo nativo `2091.exe`.
- **98.css** adaptada para a identidade visual do PedroOS 95 e **esbuild** para empacotamento rápido.

### Qualidade, Containerização & CI/CD
- **xUnit** (`.NET`), testes unitários de cliente TypeScript e testes Python de PTY (`unittest`).
- **Playwright**: Suíte E2E cobrindo desktop, explorador, projetos, galeria, terminal, DOOM, 2091, Campo Minado, navegador, localização e BSOD.
- **Docker / OCI Container**: Build multi-stage enxuto (Node.js 24 + .NET 10 SDK → ASP.NET Core Runtime + Python 3).
- **GitHub Actions CI/CD**: Pipeline automatizado que executa build e testes, faz deploy automático no container OCI rodando no servidor mobile (Android/Termux via Cloudflare Tunnel) e em seguida atualiza o gateway na URL fixa do GitHub Pages.

---

## 3. Estrutura do Repositório

```text
PedroOS/
├── src/
│   ├── PedroOS.Web/
│   │   ├── Pages/
│   │   │   ├── Index.cshtml                  # Desktop Shell + SSR de Janelas
│   │   │   ├── Apps/WindowFragment.cshtml    # Endpoint de fragmentos Razor parciais
│   │   │   └── Shared/
│   │   │       ├── Desktop/                  # Taskbar, StartMenu, DesktopIcons, ContextMenu, BSOD
│   │   │       └── Apps/                     # Welcome, Projects, ProjectDetails, Resume, SysProps, SkillDetails, GitHub, LinkedIn, About
│   │   ├── Models/                           # Modelos tipados (Project, SkillCategory, Profile, VirtualNode, AppDefinition)
│   │   ├── Services/                         # Serviços de domínio (.NET) e Game2091TerminalService
│   │   ├── Terminal/pty_host.py              # Host PTY em Python para execução isolada do 2091 nativo
│   │   ├── Data/                             # Catálogo editável (projects.json, skills.json, profile.json, icons.json)
│   │   ├── Client/                           # Código TypeScript frontend
│   │   │   ├── core/                         # WindowManager, DesktopStore, VFS, VirtualPathAliases, WindowPressure, BasePath
│   │   │   ├── components/                   # DesktopController, ClassicMenu, ProjectGallery, SystemInfo, SystemFailure, Welcome
│   │   │   ├── apps/                         # ExplorerApp, InternetExplorerApp, MinesweeperApp, DoomApp, NotepadApp, TerminalApp, NativeGameTerminal, SystemDialogsApp
│   │   │   └── pedroos.ts                    # Ponto de entrada do bundle
│   │   ├── wwwroot/                          # Assets estáticos (css, js, icons, cursors, fonts, games, resume PDF, screenshots)
│   │   └── Program.cs                        # Configuração de DI, WebSockets, rotas, SEO e endpoint de deploy
│   └── Game2091.Native/                      # Jogo de aventura cyberpunk 2091 original em C# (.NET 10)
├── tests/
│   ├── PedroOS.Tests/                        # Testes unitários xUnit (.NET)
│   ├── PedroOS.E2E/                          # Suíte ponta a ponta Playwright
│   ├── client/                               # Testes unitários TypeScript e verificação de ícones
│   └── terminal/                             # Testes do backend PTY nativo
├── scripts/
│   ├── build.mjs                             # Build esbuild do frontend + vendor xterm
│   ├── generate-icons.mjs                    # Gerador procedural de ícones pixel art
│   ├── generate-cursors.mjs                  # Gerador de cursores clássicos (.cur / .png)
│   ├── export-static.mjs                     # Exportador estático para GitHub Pages
│   ├── inject-live-redirect.mjs              # Injetor de redirecionamento automático para o container ao vivo
│   └── import-2091-native.mjs                # Importador dos fontes originais do 2091
├── Dockerfile                                # Dockerfile multi-stage (.NET 10 + Node 24)
├── docker-compose.yml                        # Orquestração com Docker Compose
├── .github/workflows/ci.yml                  # Pipeline CI + CD (Container no Celular + GitHub Pages)
├── PedroOS.slnx                              # Solution .NET
└── package.json                              # Scripts e dependências de frontend
```

---

## 4. Aplicativos e Estrutura do Sistema de Arquivos (`C:\`)

| Aplicativo | Caminho / Atalho | Descrição |
| :--- | :--- | :--- |
| **Explorador de Arquivos** | `C:\` | Navegador de arquivos com árvore de pastas, modos ícones grandes/pequenos/lista/detalhes, barra de endereços e menu de contexto. |
| **Projetos** | `C:\Projetos` | Diretório principal de projetos em destaque e subpasta `MaisProjetos`. |
| **Editor de Documentos** | `C:\Documentos\Curriculo.doc` | Visualizador do currículo atualizado de Pedro Tunin com **download do PDF oficial** (`/resume/pdf`). |
| **Propriedades do Sistema** | `C:\Habilidades\*.sys` | Painel que apresenta as competências de Desenvolvimento, DevOps e IA como drivers e dispositivos de hardware. |
| **Navegador PedroOS** | `pedroos://home` | Navegador clássico com páginas internas (`pedroos://projects`, `pedroos://resume`, `pedroos://skills`, `about:mozilla`). |
| **Terminal PedroOS** | `cmd` / `terminal` | Terminal interativo (`dir`, `cd`, `type`, `tree`, `start`, `help`) e execução nativa do jogo `2091.exe`. |
| **DOOM** | `C:\Jogos\Doom.exe` | Chocolate Doom (WebAssembly) com Freedoom Phase 1 integrado e suporte a upload de IWAD local. |
| **2091 — RetroGame** | `C:\Jogos\2091.exe` | Aventura textual cyberpunk em C# executada em PTY real no backend dentro do Terminal PedroOS. |
| **Campo Minado** | `C:\Jogos\CampoMinado.exe` | Campo Minado clássico com primeiro clique seguro, três níveis de dificuldade e contador LED. |
| **Bloco de Notas** | `C:\SobreMim\Leia-me.txt` | Editor de texto para leitura de `Leia-me.txt`, `Creditos.txt` e `Segredos.txt`. |
| **GitHub & LinkedIn** | `C:\Internet\*.url` | Janelas dedicadas com os repositórios fixados do GitHub (`@Pedroltz`) e perfil profissional no LinkedIn. |
| **Utilitários de Sistema** | Menu Iniciar | **Boas-vindas**, **Localizar**, **Executar...**, **Propriedades de Vídeo** e **Desligar o PedroOS**. |

### Organização de `C:\Projetos` e `C:\Projetos\MaisProjetos`

No **Explorador de Arquivos** (`C:\Projetos`), os projetos são organizados em dois níveis:

- **`C:\Projetos` (Destaques principais):**
  - `Ofizzy.exe` — Plataforma SaaS multi-tenant de gestão operacional (.NET 10, Angular 21, PostgreSQL 18).
  - `RDP-Session-Manager.exe` — Aplicação desktop nativa GTK 4 / libadwaita em Python para administração de sessões remotas xrdp.
  - `AnyComic.exe` — Sistema web em ASP.NET Core MVC e PostgreSQL para catalogação e leitura de mangás.
  - `2091-RetroGame.exe` — Aventura textual cyberpunk em C# com motor narrativo dirigido por JSON.
  - 📁 **`MaisProjetos`** (`C:\Projetos\MaisProjetos`):
    - `BinaryTreeStudy.exe` — Estudo de árvores binárias de busca (BST) em Python e C++.
    - `UniNote.exe` — Aplicação acadêmica em Angular integrada a API .NET para organização de notas.
    - `TaskProj.exe` — Gerenciador de tarefas com Angular, API .NET 9 e Firebase Authentication.
    - `AutoApply.exe` — Assistente de candidaturas em Python/FastAPI baseado em Evidence Ledger.

---

## 5. Rotas Públicas & SEO

Todas as rotas abaixo são processadas pelo servidor, incluem metatags canônicas, Open Graph e pré-renderizam a janela correspondente:

- `/` — Desktop principal do PedroOS 95.
- `/projects` — Abre o explorador em `C:\Projetos`.
- `/projects/{slug}` — Abre diretamente a janela de detalhes de qualquer projeto (`ofizzy`, `rdp-session-manager`, `anycomic`, `2091-retrogame`, `taskproj`, `binary-tree-study`, `uninotes-web`, `autoapply`).
- `/resume` — Abre o currículo profissional no Editor de Documentos (`Curriculo.doc`).
- `/resume/pdf` — Baixa o currículo em PDF (`Curriculo_Pedro_Tunin_DotNet_DevOps.pdf`).
- `/skills` — Abre o painel `Propriedades do Sistema`.
- `/healthz` — Healthcheck JSON do servidor.
- `/sitemap.xml` & `/robots.txt` — Indexação para motores de busca.

---

## 6. Como Executar Localmente

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 24 LTS](https://nodejs.org/)
- Python 3 (para o host PTY do jogo `2091.exe`)

### Passo a Passo

```bash
# 1. Instalar dependências frontend
npm ci

# 2. Gerar ícones pixel art e compilar o bundle frontend (esbuild)
npm run icons
npm run build

# 3. Executar a aplicação ASP.NET Core
dotnet run --project src/PedroOS.Web/PedroOS.Web.csproj
```

---

## 7. Executando os Testes

```bash
# Validação de Tipos, Lint e Testes Unitários de Frontend
npm run typecheck
npm run lint
npm run test:client

# Testes Unitários .NET (xUnit) e Backend PTY (Python)
dotnet test tests/PedroOS.Tests/PedroOS.Tests.csproj
npm run test:terminal-backend

# Suíte Ponta a Ponta (Playwright E2E)
npm run test:e2e
```

---

## 8. Execução com Docker e Deploy Contínuo (Celular + GitHub Pages)

### Docker Local
```bash
docker compose up --build -d
# Acesse em http://localhost:8080
```

### Pipeline CI/CD Híbrido (`.github/workflows/ci.yml`)
A cada push na branch `main`, o GitHub Actions executa automaticamente:
1. **`build-and-test`**: Compila o frontend e a solution `.NET 10`, valida lint/typecheck e executa todos os testes unitários e E2E.
2. **`deploy-phone`**: Envia o pacote de release (`pedroos-release.tar.gz`) via HTTPS (Cloudflare Tunnel) para o endpoint autenticado `/api/internal/deploy` do container OCI `pedroos-95` hospedado no servidor mobile (Android/Termux + `proot-distro`), reiniciando a aplicação automaticamente e validando o `/healthz`.
3. **`deploy-github-pages`**: Após o deploy no celular, publica a build na branch `gh-pages` (**https://pedroltz.github.io/PedroOS/**). Ao acessar a URL fixa do GitHub Pages, o script [`inject-live-redirect.mjs`](scripts/inject-live-redirect.mjs) verifica em tempo real se o túnel do celular está online e redireciona o visitante para o container ao vivo; caso o celular esteja offline, mantém a versão estática exportada como fallback automático.

---

### Manter o endereço do celular atualizado

O endereço `trycloudflare.com` é temporário: quando o processo do túnel encerra,
o endereço antigo pode deixar de funcionar. O GitHub Pages consulta o arquivo
`pedroos-tunnel.json` no Gist para descobrir o endereço atual. O backend precisa
estar em execução e acessível por esse túnel; publicar o front não inicia o celular.

Com o backend em `http://127.0.0.1:8080`, execute no celular, no lugar do comando
manual `cloudflared tunnel --url ...`:

```bash
# Requer Python 3, cloudflared e um token GitHub com permissão de escrita no Gist.
# Configure GITHUB_TOKEN no ambiente do celular; nunca no front ou no Gist público.
python scripts/phone-tunnel.py
# Para outra porta:
python scripts/phone-tunnel.py --origin http://127.0.0.1:5000
```

O script aguarda o backend, inicia o túnel, valida `/healthz` e atualiza o Gist.
Se o processo `cloudflared` encerrar, ele cria outro túnel e registra o novo endereço.
Mantenha esse script ativo no celular. Ele não inicia o container e não substitui
um serviço de inicialização automática do Android/Termux.

O Pages só redireciona após receber HTTP 200 com a identificação do PedroOS em
`/healthz`. Esse endpoint permite leitura pela origem `https://pedroltz.github.io`.
Atualize o backend e o Pages juntos para usar essa verificação. Para abrir a versão
estática explicitamente, use `https://pedroltz.github.io/PedroOS/?static=1`.
O pipeline publica o Pages mesmo se a etapa de deploy no celular falhar, desde que
o build e os testes tenham passado, mantendo o fallback público atualizado.
Também pode ser executado manualmente em **Actions → CI & Deploy → Run workflow**
na branch `main`. O runner hospedado no GitHub depende do túnel para alcançar o
celular; ele não consegue reiniciar um túnel offline sem um acesso independente.

## 9. Atalhos e Segredos (Easter Eggs)

- **Alt + F4**: Fecha a janela ativa.
- **Ctrl + Alt + B**: Aciona a tela azul clássica de diagnóstico (pressione qualquer tecla para voltar). A partir da 4ª janela aberta simultaneamente, também há chance progressiva de tela azul.
- **Iniciar → Executar...**: Digite `bsod`, `ofizzy`, `campominado`, `doom`, `2091`, `curriculo` ou `cmd`.
- **Campo Minado**: Digite `xyzzy` + Enter durante a partida para ativar o radar de pixel no canto superior esquerdo.
- **Navegador PedroOS**: Navegue até `about:mozilla` ou `pedroos://credits`.
- **Arquivos Ocultos**: No Explorador de Arquivos (`Exibir → Mostrar arquivos ocultos`), acesse `C:\PEDROOS` para ler `Creditos.txt` e `Segredos.txt`.

---

## 10. Licenças & Atribuições

Consulte o arquivo [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) para detalhes completos de licenças de terceiros (98.css, interact.js, Pixelarticons, xterm.js, Chocolate Doom e Freedoom).
