# Carregamento estático do PedroOS

Medição local em 28/10/2026, Chromium, cache frio, computador 1280 × 720 e
emulação Pixel 5. Inclui HTML, CSS, JavaScript, fontes, ícones, apresentação e o
som completo de inicialização e a fonte VGA pré-carregada. A abertura é automática.
O relatório soma `decodedBodySize`, independente
da compressão HTTP oferecida pela hospedagem. Não inclui jogos iniciados depois.

| Recurso | Antes | Depois |
| --- | ---: | ---: |
| Abertura completa, desktop | 3.709.825 bytes | 912.980 bytes |
| Abertura completa, emulação móvel | 3.709.825 bytes | 912.980 bytes |
| Requisições na abertura | 58 | 58 |
| Arte da apresentação | 3.056.546 bytes | 255.244 bytes |
| Seis capturas usadas no portfólio | 1.557.913 bytes originais | 135.490 bytes em prévias |
| Miniaturas dessas capturas | reutilizavam os originais | 7.250 bytes |

A abertura transfere **75,4% menos dados descomprimidos** e fica abaixo da meta de
1 MiB. As miniaturas e prévias usam WebP; a ampliação continua carregando os pixels
originais. As comparações de capturas usam o mesmo conjunto de seis imagens.

Os jogos carregam seus motores e dados somente ao iniciar. A remoção do jogo
nativo elimina processos de partida, PTY e WebSockets no servidor. Na publicação,
somente arquivos estáticos são necessários. Pausa em segundo plano e descarte do
iframe ao fechar evitam processamento contínuo dos jogos inativos.

Reproduzir com o servidor de prévia já iniciado:

```sh
node scripts/measure-startup.mjs http://127.0.0.1:5170/PedroOS/ test-results/startup-auto.json
```

Os relatórios brutos locais são `test-results/startup-before.json` e
`test-results/startup-auto.json`. Os testes estáticos também anexam os recursos
medidos e verificam o orçamento de 1 MiB no CI. A medição não estima FPS nem
garante desempenho em um Android físico; a CPU/GPU usada pelas partidas é a do
visitante.
