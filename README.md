# PedroOS 95

> Um portfólio profissional interativo e sistema operacional virtual completo inspirado no Microsoft Windows 95, desenvolvido com **ASP.NET Core (.NET 10 LTS)**, **Razor Pages**, **TypeScript**, **98.css** e **interact.js**.

---

## 1. Visão Geral

O **PedroOS 95** transforma o portfólio de **Pedro Tunin** em uma experiência imersiva de sistema operacional retrô acessível diretamente pelo navegador. Todos os aplicativos são funcionais e integrados ao mesmo ambiente desktop, apresentando projetos reais (.NET 10, Python, Linux/DevOps, IA), currículo em WordPad, competências em System Properties, navegador Internet Explorer simulado e Campo Minado.

### Características Visuais & Direção Artística:
- Desktop verde-petróleo autêntico (`#008080`) com suporte a padrões clássicos (Bricks, Weave, Scottie, Dots).
- Janelas cinza (`#c0c0c0`) com relevo 3D chanfrado e profundidade.
- Barras de título azul-marinho (`#000080`) para janelas ativas e cinza para inativas.
- Ícones em pixel art 16x16, 32x32 e 48x48 gerados exclusivamente com a paleta clássica de 16 cores.
- Botões clássicos com efeito de clique pressionado e fontes tipo MS Sans Serif sem suavização anti-aliasing artificial.
- Responsividade total: janelas livres com arraste e redimensionamento no desktop/tablet, e modo tela cheia adaptado para smartphones.

---

## 2. Stack Tecnológica

### Backend
- **.NET 10 LTS** & C#
- **ASP.NET Core Razor Pages** com Partial Views
- **Injeção de Dependência** & Serviços Tipados (`IPortfolioCatalog`, `IAppCatalog`, `IVirtualFileSystem`, `IIconRegistry`, `IResumePdfService`)
- **JSON Abstractions**: Dados desacoplados em `Data/projects.json`, `Data/skills.json` e `Data/profile.json` prontos para transição futura para banco relacional.
- **Segurança**: Middleware de headers HTTP (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e validação estrita de paths e identificadores.
- **SEO Nativo**: Server-Side Rendering com pre-renderização da janela solicitada diretamente no HTML inicial para crawlers e compartilhamento social (`OG Tags`).

### Frontend
- **TypeScript** modular sem frameworks SPA pesados (sem React, Vue ou Angular no shell).
- **WindowManager** reutilizável, independente das aplicações, com suporte a multi-instâncias, z-index, arraste e redimensionamento via **interact.js**.
- **DesktopStore**: Gerenciamento de estado reativo e granular com emissão de eventos específicos para evitar re-renderizações desnecessárias.
- **Sistema de Arquivos Virtual (C:\...)**: Navegação baseada em árvore de metadados sem acesso ao sistema de arquivos do servidor.
- **98.css** adaptada para a identidade visual do Windows 95.
- **esbuild** para compilação e empacotamento rápido e enxuto.

### Qualidade & Automação
- **xUnit**: Suíte completa de testes unitários para catálogo, sistema de arquivos, rotas e geração de PDF.
- **Playwright**: Suíte de testes ponta a ponta (E2E) cobrindo os 15 fluxos do sistema.
- **ESLint** & **TypeScript Compiler** (`tsc --noEmit`).
- **Docker**: Build multi-stage enxuto (Node.js 24 + .NET 10 SDK → ASP.NET Core Runtime).
- **GitHub Actions**: Pipeline de CI automatizado com build, lint e testes.

---

## 3. Estrutura do Repositório

```text
PedroOS/
├── src/
│   └── PedroOS.Web/
│       ├── Pages/
│       │   ├── Index.cshtml              # Desktop Shell + SSR de Janelas
│       │   ├── Index.cshtml.cs           # Boot loader e resolução de rotas
│       │   ├── Apps/
│       │   │   ├── WindowFragment.cshtml # Endpoint de fragmentos Razor parciais
│       │   │   └── WindowFragment.cshtml.cs
│       │   ├── Shared/
│       │   │   ├── Desktop/              # Partials do Desktop (Taskbar, StartMenu, Icons, BSOD)
│       │   │   └── Apps/                 # Partials das Apps (Projects, Resume, SysProps, About)
│       │   ├── _ViewImports.cshtml
│       │   └── _ViewStart.cshtml
│       ├── Models/                       # Modelos tipados (Project, Skill, Profile, VirtualNode)
│       ├── Services/                     # Serviços de domínio (.NET)
│       ├── Data/                         # Catálogo de dados editáveis (JSON)
│       │   ├── projects.json
│       │   ├── skills.json
│       │   ├── profile.json
│       │   └── icons.json
│       ├── Client/                       # Código TypeScript frontend
│       │   ├── core/                     # WindowManager, DesktopStore, VFS, AppRegistry
│       │   ├── components/               # DesktopController (Taskbar, Menus, Atalhos)
│       │   ├── apps/                     # Explorer, Internet Explorer, Minesweeper, Notepad, Dialogs
│       │   ├── types/                    # Tipos e interfaces TypeScript
│       │   └── pedroos.ts                # Ponto de entrada do bundle
│       ├── wwwroot/
│       │   ├── css/                      # 98.css e pedroos.css
│       │   ├── js/                       # pedroos.js empacotado pelo esbuild
│       │   └── assets/                   # Ícones, screenshots e wallpapers
│       ├── Program.cs                    # Configuração de DI, rotas e middlewares
│       └── PedroOS.Web.csproj
├── tests/
│   ├── PedroOS.Tests/                    # Testes unitários xUnit (.NET)
│   ├── PedroOS.E2E/                      # Testes ponta a ponta Playwright
│   └── client/                           # Testes unitários do motor TypeScript
├── scripts/
│   ├── build.mjs                         # Build esbuild do frontend
│   ├── generate-icons.mjs                # Gerador procedural de pixel art 16x16/32x32/48x48
│   └── test-client.mjs                   # Executor de testes unitários do frontend
├── Dockerfile                            # Dockerfile multi-stage
├── docker-compose.yml                    # Orquestração local com Docker
├── .github/workflows/ci.yml              # Pipeline CI
├── package.json                          # Toolchain frontend
├── tsconfig.json                         # Configuração TypeScript
├── THIRD_PARTY_NOTICES.md                # Atribuições e licenças
└── README.md
```

---

## 4. Aplicativos Internos

| Aplicativo | Executável / Atalho | Descrição |
| :--- | :--- | :--- |
| **Windows Explorer** | `Explorer.exe` | Navegador de arquivos com árvore de pastas, modos ícones/lista, barra de endereços e histórico. |
| **Projects Explorer** | `Projects.exe` | Central de projetos com visualização em grade e tabela detalhada. |
| **Ofizzy** | `Ofizzy.exe` | Plataforma SaaS multi-tenant de gestão operacional (.NET 10, Angular 21, PostgreSQL 18). |
| **RDP Session Manager** | `RDP-Session-Manager.exe` | Aplicação desktop Linux nativa em GTK 4 / libadwaita e Python para administração xrdp. |
| **ZellaPedia** | `ZellaPedia.exe` | Sistema de pesquisa e recuperação documental corporativa (placeholder transparente). |
| **Resume.doc** | `WordPad` | Visualizador de currículo com histórico, formação, projetos e **download de PDF real**. |
| **System Properties** | `System Properties` | Painel de controle que apresenta as habilidades de Pedro como componentes de hardware. |
| **Internet Explorer** | `IExplore.exe` | Simulação do IE clássico com favoritos, histórico, páginas internas e links externos seguros. |
| **Minesweeper** | `Winmine.exe` | Campo Minado com primeiro clique seguro, dificuldades, temporizador LED e modo touch. |
| **Notepad** | `Notepad.exe` | Editor de texto para leitura de `Readme.txt`, notas e segredos do sistema. |
| **Find** | `Find: All Files` | Mecanismo de busca textual sobre arquivos e projetos virtuais. |
| **Run...** | `Run` | Execução rápida de comandos (`ofizzy`, `minesweeper`, `explorer`, `bsod`, etc.). |
| **Display Properties** | `Display` | Configuração de papel de parede (Classic Teal, Bricks, Weave, Scottie, Dots). |
| **Shut Down** | `Shut Down` | Janela clássica de desligamento, reinício e easter eggs. |

---

## 5. Rotas Públicas & SEO

Todas as rotas abaixo são processadas pelo servidor, incluem metatags canônicas, Open Graph e pre-renderizam a janela correspondente:

- `/` — Desktop principal do PedroOS 95.
- `/projects` — Abre a central `Projects.exe`.
- `/projects/ofizzy` — Abre diretamente os detalhes do projeto Ofizzy.
- `/projects/rdp-session-manager` — Abre diretamente os detalhes do RDP Session Manager.
- `/projects/{slug}` — Abre os detalhes de qualquer projeto cadastrado em `Data/projects.json`.
- `/resume` — Abre o currículo profissional no WordPad (`Resume.doc`).
- `/resume/pdf` — Gera e baixa o arquivo `Pedro-Tunin-Resume.pdf`.
- `/skills` — Abre o painel `System Properties`.
- `/sitemap.xml` — Mapa do site para motores de busca.
- `/robots.txt` — Diretrizes para indexadores.

---

## 6. Como Executar Localmente

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 24 LTS](https://nodejs.org/)

### Passo a Passo

```bash
# 1. Instalar dependências frontend
npm install

# 2. Gerar ícones pixel art originais
npm run icons

# 3. Compilar o bundle frontend (esbuild)
npm run build

# 4. Executar a aplicação ASP.NET Core
dotnet run --project src/PedroOS.Web/PedroOS.Web.csproj
```

Acesse no navegador:
**http://localhost:5159**

---

## 7. Executando os Testes

### Testes Unitários de Frontend (TypeScript)
```bash
npm run test:client
```

### Validação de Tipos e Lint
```bash
npm run typecheck
npm run lint
```

### Testes Unitários .NET (xUnit)
```bash
dotnet test
```

### Testes Ponta a Ponta (Playwright E2E)
```bash
# Instalar binários do Chromium (primeira vez)
npx playwright install --with-deps chromium

# Executar suíte E2E
npm run test:e2e
```

---

## 8. Execução com Docker

```bash
# Build da imagem Docker
docker build -t pedroos-95 .

# Execução do container na porta 8080
docker run -d -p 8080:8080 --name pedroos pedroos-95
```

Acesse: **http://localhost:8080**

---

## 9. Atalhos e Segredos (Easter Eggs)

- **Alt + F4**: Fecha a janela atualmente focada.
- **Ctrl + Alt + B**: Dispara voluntariamente a tela azul clássica (BSOD segura). Pressione qualquer tecla para retornar.
- **Start > Run...**: Digite `bsod` para testar a tela azul, ou digite o nome de qualquer executável (`ofizzy`, `winmine`, `notepad`).
- **Campo Minado**: Digite `xyzzy` + Enter durante a partida para ativar o pixel espião no canto superior esquerdo.
- **Internet Explorer**: Navegue até `about:mozilla` para ler um versículo secreto de *The Book of PedroOS*.
- **Arquivos Ocultos**: No Windows Explorer, clique no botão `Hidden` para exibir a pasta secreta `C:\PEDROOS` com `Credits.txt` e `EasterEggs.txt`.

---

## 10. Licenças & Atribuições

Consulte o arquivo [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) para detalhes completos de licenças de terceiros (98.css, interact.js, Pixelarticons).
