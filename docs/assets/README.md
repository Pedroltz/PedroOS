# Capturas do PedroOS 95

As imagens do README são capturas da aplicação real servida pela exportação
estática local. Não há montagens ou mockups: elas registram a interface em
execução. O gerenciador de janelas é usado apenas para organizar os
aplicativos em posições legíveis.

## Atualizar

Na raiz do repositório, gere o site e inicie a prévia:

```sh
npm ci
npm run build
dotnet build PedroOS.slnx -c Release
npm run export:pages -- --base /PedroOS --site https://pedroltz.github.io
npm run preview:pages
```

Em outro terminal:

```sh
npx playwright install chromium
node scripts/capture-readme.mjs http://127.0.0.1:5170/PedroOS/
```

O argumento é o endereço da prévia; o padrão também é
`http://127.0.0.1:5170/PedroOS/`. Os arquivos são escritos em
`docs/assets/screenshots/`, fora dos recursos publicados do aplicativo.

| Arquivo | Conteúdo |
| --- | --- |
| `desktop.webp` | Boas-vindas e Explorador de Projetos em 1280 × 800. |
| `portfolio.webp` | Ficha do Ofizzy e prévia de sua galeria. |
| `games.webp` | Pasta Jogos e One Must Fall 2097 em execução. |
| `startup.webp` | Apresentação automática com a identidade PedroOS. |
| `mobile.webp` | Boas-vindas e barra de tarefas em emulação Pixel 5. |

As telas com texto usam WebP sem perdas para preservar os pixels da interface.
A apresentação usa WebP com qualidade 82 para reduzir o tamanho da arte com céu e
nuvens. Revise as imagens após a captura, principalmente a tela do jogo, cujo
estado depende da velocidade do navegador. Os relógios mostram o horário local
da captura.

As capturas representam a versão local em desenvolvimento e podem anteceder o
próximo deploy da `main`. Consulte [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)
para os créditos dos jogos e dos recursos exibidos.
