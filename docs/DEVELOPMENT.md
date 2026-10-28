# Guia de desenvolvimento

Comandos e detalhes para executar, testar e publicar o PedroOS 95.

[Voltar ao README](../README.md).

## Executar localmente

Requisitos: Node.js 24 e .NET SDK 10. Não é necessário Python.

```sh
npm ci
npm run dev
```

O endereço local é informado pelo ASP.NET Core. Os catálogos ficam em
`src/PedroOS.Web/Data/`: `projects.json`, `skills.json`, `profile.json` e `icons.json`.
O gerenciador de janelas usa TypeScript, interact.js e 98.css. O sistema virtual
inclui projetos, documentos, habilidades, jogos e arquivos de sistema.

```sh
npm run build
npm run typecheck
npm run lint
npm run test:client
dotnet test tests/PedroOS.Tests/PedroOS.Tests.csproj -c Release
npm run test:e2e
```

## Exportar e testar o site real

```sh
dotnet build PedroOS.slnx -c Release
npm run export:pages -- --base /PedroOS --site https://pedroltz.github.io
npm run preview:pages
```

A prévia estática fica em http://127.0.0.1:5170/PedroOS/. Encerre a prévia antes
de executar os testes, que iniciam seu próprio servidor de arquivos:

```sh
npm run test:static
```

Essa suíte usa os mesmos testes de interface no site exportado, sem servidor .NET,
com o prefixo real `/PedroOS/`. Para outro nome de repositório, use esse prefixo na
exportação e defina `PEDROOS_TEST_BASE` ao executar os testes estáticos.

A pasta `dist/pages` contém páginas pré-renderizadas para cada projeto, fragmentos,
PDF, `404.html`, sitemap, robots e os recursos locais. A exportação limpa o destino
para não republicar arquivos antigos. O destino deve ser uma subpasta de `dist/`.

## GitHub Pages

Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
O workflow **CI & Deploy (GitHub Pages)** valida o código, gera e testa o site
estático em computador e celular e publica com as ações oficiais do Pages.
Pushes em `main`/`master` publicam após os testes; pull requests apenas validam.
Também é possível iniciar o workflow manualmente. Não são necessários segredos de
servidor, credenciais de túnel ou uma branch `gh-pages` mantida manualmente.

O endereço público não redireciona para outra hospedagem. Nenhum processo precisa
ficar rodando no celular. O build .NET ocorre no runner do GitHub e não é enviado
para o navegador.

## Jogos

Abra **Meu Computador → C:\Jogos**:

| Executável | Jogo |
| --- | --- |
| `Doom.exe` | Chocolate Doom / Freedoom: Phase 1; aceita seu próprio IWAD |
| `CampoMinado.exe` | Campo Minado |
| `SkiFree.exe` | SkiFree.js |
| `OpenTyrian.exe` | OpenTyrian |
| `OneMustFall2097.exe` | One Must Fall 2097 via DOSBox |

Motores, WASM e arquivos grandes são baixados somente ao iniciar o jogo. Freedoom
precisa de aproximadamente 35 MB no primeiro carregamento. Jogos inativos ficam
pausados, inclusive áudio; fechar a janela descarta o iframe e seu motor. Os
controles de toque aparecem nos jogos compatíveis. O desempenho depende do
aparelho do visitante. Nenhuma partida usa processamento no servidor.

Licenças, fontes e procedência acompanham os jogos em `wwwroot/assets/games/`.
`UPSTREAM.md` documenta cada importação. Os scripts `scripts/import-retro-games.py`
e `scripts/import-neon-fist.py` reproduzem as adaptações de versões fixas; os
arquivos e checkouts de entrada ficam em `.local/`, ignorada pelo Git.

## Inicialização e segredos

A primeira abertura de cada aba mostra logs de BIOS/DOS em fundo preto e fonte
IBM VGA 8×16, seguidos da apresentação PedroOS 95. A entrada no desktop ocorre
automaticamente em cerca de 4,5 segundos, sem botões. **Esc** permite pular.
O som clássico é tentado na transição para o desktop e continua sobre ele; quando
o navegador bloqueia autoplay, a entrada segue silenciosa, sem repetir o som no
primeiro clique. O controle de som da bandeja também silencia a gravação inicial.
Falhas de áudio, fonte ou armazenamento não bloqueiam a entrada. Reiniciar pelo
menu repete a apresentação sem alterar a preferência da janela de boas-vindas.

A Lixeira e arquivos ocultos formam um percurso de pistas até `C:\Segredos` e o
disquete secreto. O código Konami também faz parte das descobertas. As descobertas
duram até recarregar a página. O protetor de tela é configurado em **Propriedades
de Vídeo → Proteção de tela** e respeita movimento reduzido.

- **Alt+F4:** fecha a janela ativa.
- **Ctrl+Alt+B:** tela azul de diagnóstico; muitas janelas também podem acioná-la.
- **Iniciar → Executar:** abre aplicativos, incluindo `doom`, `cmd` e `campominado`.
- **Terminal:** `HELP`, `DIR`, `CD`, `TYPE`, `START`, `TREE` e `doom`.
- **Navegador PedroOS:** explore `about:mozilla` e `pedroos://credits`.
- **Campo Minado:** `xyzzy` + Enter ativa o pixel espião.

## Recursos leves e medições

`npm run images` gera WebP de apresentação, prévias de até 960 × 720 e miniaturas
de até 160 × 120 usando Sharp. O build já executa essa etapa. O PNG original da
apresentação fica em `artwork/boot/`, fora da publicação; as capturas originais são
preservadas para ampliação. O prompt da arte está em
`src/PedroOS.Web/wwwroot/assets/boot/ARTWORK.md`.

Os testes estáticos verificam a meta de até 1 MiB de recursos para abrir o desktop
com som, sem baixar jogos antecipadamente. Para medir uma prévia já iniciada:

```sh
node scripts/measure-startup.mjs http://127.0.0.1:5170/PedroOS/ test-results/startup-after.json
```

O relatório registra bytes descomprimidos, requisições e erros em desktop e
emulação móvel, com cache frio. Não é uma medição de FPS no Android físico.
O cache HTTP é administrado pelo Pages; não há service worker nem dependência de
cabeçalhos personalizados para servir os jogos.

## Licenças

Consulte [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) para créditos e licenças
dos componentes, jogos e áudio. PedroOS é um portfólio pessoal sem afiliação com a
Microsoft. Direitos de recursos de terceiros permanecem com seus titulares.
