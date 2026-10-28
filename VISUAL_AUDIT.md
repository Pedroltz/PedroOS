# PedroOS 95 — auditoria visual

Auditoria executada em 22/10/2026. Implementação em Razor Pages, TypeScript e CSS, sem dependências novas.

Revisão após feedback visual: os desenhos simplificados foram rejeitados pelo usuário. Todos os PNGs antigos de desktop e aplicativos foram restaurados exatamente à arte do commit original, preservando as correções de layout. Apenas AnyComic, Gamepad e AutoApply mantêm desenhos novos. As capturas finais e a galeria foram atualizadas e novamente inspecionadas.

## Referência e evidências

A screenshot mencionada no pedido não estava anexada à conversa. A interface executada localmente foi inspecionada. As comparações reproduzíveis usam o commit `6a75e2e` em uma cópia isolada como baseline e o diretório de trabalho corrigido como resultado final. A baseline não representa as alterações locais que já existiam antes desta auditoria; elas foram preservadas.

- [Galeria comparativa HTML](test-results/visual-audit/index.html)
- [Desktop antes/depois](test-results/visual-audit/comparison-desktop.png)
- [Projects antes/depois](test-results/visual-audit/comparison-projects.png)
- [Ícones e nomes antes/depois](test-results/visual-audit/comparison-labels.png)
- [Menu Iniciar antes/depois](test-results/visual-audit/comparison-start.png)
- [Mobile antes/depois](test-results/visual-audit/comparison-mobile.png)
- [Medições das seis resoluções e erros do navegador](test-results/visual-audit/final/measurements.json)

Capturas finais, inspecionadas visualmente:

| Cenário | Imagem |
| --- | --- |
| Desktop | [PNG](test-results/visual-audit/final/01-desktop.png) |
| Ícone selecionado | [PNG](test-results/visual-audit/final/02-desktop-selected.png) |
| Projects como Explorer | [PNG](test-results/visual-audit/final/04-projects.png) |
| Large Icons | [PNG](test-results/visual-audit/final/05-large-icons.png) |
| Projetos adicionais e nomes de executáveis | [PNG](test-results/visual-audit/final/06-more-projects.png) |
| Small Icons | [PNG](test-results/visual-audit/final/07-small-icons.png) |
| List | [PNG](test-results/visual-audit/final/07-list.png) |
| Details | [PNG](test-results/visual-audit/final/07-details.png) |
| Seleção de arquivo | [PNG](test-results/visual-audit/final/08-files-selected.png) |
| Ofizzy | [PNG](test-results/visual-audit/final/09-ofizzy-details.png) |
| Menu Iniciar | [PNG](test-results/visual-audit/final/03-start-menu.png) |
| Sobreposição e taskbar | [PNG](test-results/visual-audit/final/10-multiple-windows.png) |
| Mobile 360 × 800 | [PNG](test-results/visual-audit/final/explorer-360x800.png) |
| Mobile 390 × 844 | [PNG](test-results/visual-audit/final/explorer-390x844.png) |

## Diagnóstico e correções

| Causa encontrada | Correção |
| --- | --- |
| Botões de arquivo, desktop e árvore herdavam `box-shadow` e dimensões mínimas do `98.css` | Reset explícito de relevo, inclusive nos estados de foco e pressionado; área clicável separada da seleção do rótulo |
| `word-break: break-word` dividia palavras e `.exe` | Quebras somente em espaços e hífens, tokens indivisíveis, limite de duas linhas e ellipsis; nome completo no tooltip e na barra de status |
| Small Icons e List tinham apresentação praticamente idêntica | Small Icons distribui itens por linhas; List mantém colunas compactas; ambos usam PNG nativo de 16 px |
| Tabela expandia conforme conteúdo | Layout de colunas fixo, truncamento horizontal, ícone sem encolhimento e seleção de linha |
| Ordenação por tamanho comparava strings | Comparação numérica em bytes; cabeçalho acessível por teclado |
| Projects tinha cards e uma tabela próprios | Reutilização de `ExplorerApp` sobre o mesmo VFS, mantendo `C:\Projects\MoreProjects`, navegação, seleção e quatro modos |
| Caminho SSR e abertura dinâmica tinham estruturas diferentes | Janela SSR é adotada pelo Window Manager e monta o mesmo módulo; fallback Razor apresenta links de executáveis para todos os projetos |
| AnyComic, Gamepad e AutoApply compartilhavam o ícone genérico | Arte própria e variantes nativas de 16/32 px para os seis projetos |
| Desenhos simplificados perderam o detalhe da arte anterior | Arte original restaurada para todos os ícones existentes, incluindo suas variantes de escala inteira; três projetos adicionais possuem composições nativas de 32 px |
| Glyphs SVG de grade 24 px eram reduzidos para 16 px | 25 glyphs originais desenhados em grade nativa de 16 px, dentro do mesmo registro |
| Substituição dos ícones conhecidos de GitHub e LinkedIn descaracterizou o desktop | Ícones originais restaurados conforme preferência do usuário; URLs e conteúdo profissional preservados |
| Imagens comuns também recebiam `image-rendering: pixelated` | Renderização pixelada restrita aos ícones; screenshots de projetos mantêm renderização normal |
| Botões da área de notificação herdavam largura mínima de 75 px | Controles de 18 px contendo ícones de 16 px; taskbar com títulos truncados e ícones sem deformação |
| Menu Iniciar herdava relevo em cada linha | Linhas planas, seleção azul e ícones de 16 px; submenu ajustado para caber no mobile |
| Abertura de detalhes por Explorer mantinha título/ícone genéricos | Metadados do projeto atualizam barra de título e taskbar, como na rota direta |
| Textos profissionais muito compactados | Altura de linha maior nos detalhes; fonte de interface de 11 px mantida no desktop e no mobile |
| Descrição longa comprimindo campos de status | Espaço reservado à contagem e ao tamanho; descrição truncada com tooltip |
| Listeners globais do divisor permaneciam após fechar Explorer | Cancelamento por `AbortController` ao desmontar a aplicação |

## Registro e componentes

- `Data/icons.json`: 71 definições / 163 variantes, categoria, descrição, caminhos explícitos, fallback, atribuição e tamanhos nativos.
- `IconRegistry.cs` e `IconRegistryClient.ts`: resolução compartilhando o mesmo manifesto, seleção de variante disponível e fallback seguro.
- `IconTagHelper.cs`: `<os-icon>` para as páginas Razor, garantindo dimensões, classe e renderização comuns.
- `IconRegistryClient.render/create`: componentes de imagem usados pelas aplicações, desktop, taskbar e Window Manager.
- `ExplorerApp.ts`: implementação única para Explorer e Projects.
- `FragmentHydrator.ts`: removida a alternância exclusiva dos cards antigos.
- `scripts/icon-drawings.mjs` e `generate-icons.mjs`: fontes reproduzíveis dos desenhos, sem apagar a pasta de assets inteira ao gerar.

### Ícones de projetos

| Projeto | Motivo gráfico | Arquivos disponíveis |
| --- | --- | --- |
| Ofizzy | Chave mecânica laranja original | 16 / 32 px |
| RDP Session Manager | Monitores e conexão remota | 16 / 32 px |
| ZellaPedia | Livro com lupa original | 16 / 32 px |
| AnyComic | Livro com painéis coloridos | 16 / 32 px |
| Gamepad | Controle de videogame com fio | 16 / 32 px |
| AutoApply | Formulário com seta de automação | 16 / 32 px |

As fontes sugeridas foram avaliadas. Memphis declara MIT, ChiDoors CC BY-SA 4.0 e o conjunto gratuito Pixelarticons MIT. Não foi importada arte dessas fontes nesta correção. Os SVGs antigos foram preservados com seus avisos, mas as referências de toolbar agora usam arte original. [Licenças e fontes](THIRD_PARTY_NOTICES.md).

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm run build` | Aprovado |
| `dotnet build PedroOS.slnx` | Aprovado, zero erros/avisos |
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado |
| `npm run test:client` | Aprovado: Minesweeper, VFS, Store e registries |
| `dotnet test tests/PedroOS.Tests/PedroOS.Tests.csproj --no-build --no-restore` | 30 aprovados |
| `node --test tests/client/icon-assets.test.mjs` | 3 aprovados: arte original protegida por hashes, arquivos/dimensões/alpha e identidade dos seis projetos |
| `npm run test:e2e` | 26 aprovados, 4 ignorados por aplicabilidade à plataforma, zero falhas |
| `node scripts/verify-visual-audit.mjs final` | 6 resoluções, 24 capturas, zero erros JS/HTTP |
| Inspeção visual | Realizada; repetida após ajustes de menu, ícones de título, tipografia e status |

Resoluções: 1920×1080, 1366×768, 1024×768, 768×1024, 390×844 e 360×800. A auditoria verifica dimensões nativas/renderizadas, abertura pelo Explorer, ordenação, seleção, foco sem reposicionamento automático, título acessível e troca pela taskbar com uma janela visível no mobile. As verificações E2E preservam abertura, minimizar/restaurar/maximizar, links, rotas diretas e aplicativos existentes.

Para reproduzir as capturas com a aplicação em `http://localhost:5159`:

```powershell
node scripts/verify-visual-audit.mjs final
node scripts/build-visual-report.mjs
```

Os testes Playwright agora gravam traces em `test-results/playwright`, evitando apagar as capturas de auditoria. Os PNGs e a galeria permanecem em `test-results`, ignorado pelo Git; este relatório, o gerador e as verificações são versionáveis.

## Limites da validação

- A screenshot original solicitada continua indisponível; a baseline comparativa está identificada acima.
- Validação visual executada em Chromium. Firefox, Safari, zoom fracionário e telas com outras densidades não foram inspecionados nesta rodada.
- Os recursos legados de 48 px continuam disponíveis para compatibilidade; as superfícies auditadas usam 16/32 px e não dependem desses recursos ampliados.
- Nenhuma falha funcional ou visual relevante permaneceu nos cenários inspecionados.
