import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('test-results/visual-audit');
const pairs = [
  ['desktop', 'Área de trabalho', '01-desktop.png'],
  ['projects', 'Projects: cards substituídos pelo Explorer', '04-projects.png'],
  ['labels', 'Nomes de executáveis e ícones próprios', '06-more-projects.png'],
  ['start', 'Menu Iniciar sem caixas em cada item', '03-start-menu.png'],
  ['mobile', 'Explorer em 360 × 800', 'explorer-360x800.png'],
];
const finalImages = readdirSync(join(output, 'final')).filter(name => name.endsWith('.png'));
const manifest = JSON.parse(readFileSync('src/PedroOS.Web/Data/icons.json', 'utf8'));
const projects = ['ofizzy', 'rdp-session-manager', 'zellapedia', 'anycomic', '2091-retrogame', 'autoapply'];
writeFileSync(join(output, 'index.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>PedroOS 95 — auditoria visual</title><style>
body{margin:20px;font:16px/1.5 system-ui;background:#f4f4f4;color:#222}h1,h2{line-height:1.2}
.pair{background:white;padding:16px;margin:24px 0;width:max-content}.columns{display:grid;grid-template-columns:1024px 1024px;gap:16px}
figure{margin:0}figcaption{font-weight:bold;margin:8px 0}img{display:block;image-rendering:pixelated}
.gallery{display:flex;flex-wrap:wrap;gap:24px}.gallery img{max-width:360px;max-height:300px;object-fit:contain;object-position:left top}
.icons{display:flex;gap:24px}.icons figure{width:160px}.icons img{display:inline-block;margin-right:16px}
</style><h1>PedroOS 95 — auditoria e correção visual</h1>
<p>Antes: commit <code>6a75e2e</code> em cópia isolada. Depois: diretório de trabalho com correções e alterações locais preservadas. A screenshot mencionada no pedido não estava anexada.</p>
<p>Inspeção em Chromium, seis resoluções. Arte original restaurada conforme solicitado; ajustes de layout preservados.</p>
<h2>Ícones de projetos — variantes de 16 e 32 px</h2><div class="icons">${projects.map(key => `<figure><figcaption>${key}</figcaption>${[16, 32].map(size => `<img width="${size}" height="${size}" src="../../src/PedroOS.Web/wwwroot${manifest.icons[key].variants[size]}" alt="${size} pixels">`).join('')}</figure>`).join('')}</div>
${pairs.map(([id, label, name]) => `<section class="pair" id="${id}"><h2>${label}</h2><div class="columns"><figure><figcaption>Antes — 6a75e2e</figcaption><img src="baseline/${name}" alt="Antes"></figure><figure><figcaption>Depois</figcaption><img src="final/${name}" alt="Depois"></figure></div></section>`).join('')}
<h2>Capturas finais em tamanho original</h2><div class="gallery">${finalImages.map(name => `<figure><figcaption><a href="final/${name}">${name}</a></figcaption><a href="final/${name}"><img src="final/${name}" alt="${name}"></a></figure>`).join('')}</div></html>`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 2140, height: 1000 } });
  await page.goto(pathToFileURL(join(output, 'index.html')).href);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  for (const [id] of pairs) await page.locator('#' + id).screenshot({ path: join(output, `comparison-${id}.png`) });
} finally { await browser.close(); }
console.log(`Report: ${join(output, 'index.html')}`);
