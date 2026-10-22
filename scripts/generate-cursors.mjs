// Original Windows 95-inspired monochrome cursors. No Microsoft assets copied.
// CUR files use native 32px canvases, explicit hotspots and binary transparency.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const out = new URL('../src/PedroOS.Web/wwwroot/assets/cursors/', import.meta.url);
mkdirSync(out, { recursive: true });
const palette = { k: [0, 0, 0], w: [255, 255, 255], g: [128, 128, 128] };
function draw(paint) {
  const pixels = Array.from({ length: 32 }, () => Array(32).fill('.'));
  const dot = (x, y, color = 'k') => { if (x >= 0 && y >= 0 && x < 32 && y < 32) pixels[y][x] = color; };
  const rect = (x, y, w, h, color = 'k') => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) dot(xx, yy, color); };
  const line = (x, y, xx, yy, color = 'k') => {
    const steps = Math.max(Math.abs(xx - x), Math.abs(yy - y));
    for (let i = 0; i <= steps; i++) dot(Math.round(x + (xx - x) * i / steps), Math.round(y + (yy - y) * i / steps), color);
  };
  const sprite = (rows, x, y) => rows.forEach((row, sy) => [...row].forEach((color, sx) => { if (color !== '.') dot(x + sx, y + sy, color); }));
  paint({ dot, rect, line, sprite });
  return pixels;
}
const cursors = {
  arrow: { hotspot: [1, 1], pixels: draw(({ sprite }) => sprite([
    'k...............',
    'kk..............',
    'kwk.............',
    'kwwk............',
    'kwwwk...........',
    'kwwwwk..........',
    'kwwwwwk.........',
    'kwwwwwwk........',
    'kwwwwwwwk.......',
    'kwwwwwwwwk......',
    'kwwwwwwwwwk.....',
    'kwwwwwwwwwwk....',
    'kwwwwwwkkkkkk...',
    'kwwwkwwkg.......',
    'kwwkgkwwkg......',
    'kwkg.kwwkg......',
    'kkg...kwwkg.....',
    'kg....kwwkg.....',
    '.......kkg......',
  ], 1, 1)) },
  link: { hotspot: [6, 1], pixels: draw(({ sprite }) => sprite([
    '.....kk..........',
    '....kwwk.........',
    '....kwwk.........',
    '....kwwk.........',
    '....kwwkkk.......',
    '....kwwkwwkkk....',
    '....kwwkwwkwwkk..',
    '....kwwkwwkwwkwk.',
    '.kk.kwwwwwwwwwwk.',
    'kwwkkwwwwwwwwwwk.',
    'kwwwkwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwwk.',
    '..kwwwwwwwwwwwk..',
    '..kwwwwwwwwwwwk..',
    '...kwwwwwwwwwk...',
    '....kwwwwwwwwk...',
    '....kkkkkkkkkk...',
    '....kwwwwwwwwk...',
    '....kkkkkkkkkk...',
  ], 1, 1)) },
  text: { hotspot: [8, 11], pixels: draw(({ rect }) => {
    rect(4, 2, 9, 2, 'w'); rect(4, 20, 9, 2, 'w'); rect(7, 2, 3, 20, 'w');
    rect(4, 2, 3, 1); rect(10, 2, 3, 1); rect(7, 3, 3, 1);
    rect(8, 4, 1, 16); rect(4, 21, 3, 1); rect(10, 21, 3, 1); rect(7, 20, 3, 1);
  }) },
  wait: { hotspot: [9, 12], pixels: draw(({ rect, line }) => {
    rect(3, 2, 13, 3); rect(3, 22, 13, 3); rect(4, 3, 11, 1, 'w'); rect(4, 23, 11, 1, 'w');
    for (let y = 5; y <= 11; y++) { const x = 4 + Math.floor((y - 5) / 2); rect(x, y, 12 - 2 * (x - 4), 1, 'w'); }
    for (let y = 13; y <= 21; y++) { const x = 7 - Math.floor((y - 13) / 3); rect(x, y, 18 - 2 * x, 1, 'w'); }
    line(4, 5, 4, 8); line(4, 8, 9, 13); line(14, 5, 14, 8); line(14, 8, 9, 13);
    line(9, 13, 4, 19); line(9, 13, 14, 19); rect(4, 19, 1, 3); rect(14, 19, 1, 3);
    rect(6, 6, 7, 1, 'g'); line(7, 7, 9, 10); line(11, 7, 9, 10); rect(9, 14, 1, 3, 'g');
    for (let y = 18; y < 22; y++) rect(9 - (y - 18), y, 1 + 2 * (y - 18), 1, 'g');
  }) },
};
// Resize/move cursors are white outlined by black, legible on teal and white.
function arrows(axes) {
  const points = new Set();
  const add = (x, y) => points.add(`${x},${y}`);
  for (const [dx, dy] of axes) {
    for (let i = -9; i <= 9; i++) add(15 + dx * i, 15 + dy * i);
    for (const sign of [-1, 1]) for (let i = 0; i <= 4; i++) {
      const x = 15 + sign * dx * (9 - i), y = 15 + sign * dy * (9 - i);
      add(x - dy * i, y + dx * i); add(x + dy * i, y - dx * i);
    }
  }
  return draw(({ dot }) => {
    for (const point of points) {
      const [x, y] = point.split(',').map(Number);
      for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) dot(x + xx, y + yy);
    }
    for (const point of points) dot(...point.split(',').map(Number), 'w');
  });
}
for (const [name, axes] of Object.entries({ 'size-ew': [[1, 0]], 'size-ns': [[0, 1]], 'size-nwse': [[1, 1]], 'size-nesw': [[1, -1]], move: [[1, 0], [0, 1]] })) {
  cursors[name] = { hotspot: [15, 15], pixels: arrows(axes) };
}
function encodeCur({ pixels, hotspot }) {
  const size = 32, stride = size * 4, maskStride = 4;
  const bmp = Buffer.alloc(40 + stride * size + maskStride * size);
  bmp.writeUInt32LE(40, 0); bmp.writeInt32LE(size, 4); bmp.writeInt32LE(size * 2, 8);
  bmp.writeUInt16LE(1, 12); bmp.writeUInt16LE(32, 14); bmp.writeUInt32LE(stride * size, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const color = palette[pixels[y][x]];
    const row = size - 1 - y;
    if (color) {
      const offset = 40 + row * stride + x * 4;
      bmp[offset] = color[2]; bmp[offset + 1] = color[1]; bmp[offset + 2] = color[0]; bmp[offset + 3] = 255;
    } else bmp[40 + stride * size + row * maskStride + (x >> 3)] |= 0x80 >> (x % 8);
  }
  const header = Buffer.alloc(22);
  header.writeUInt16LE(2, 2); header.writeUInt16LE(1, 4); header[6] = header[7] = size;
  header.writeUInt16LE(hotspot[0], 10); header.writeUInt16LE(hotspot[1], 12);
  header.writeUInt32LE(bmp.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, bmp]);
}
function encodePng(pixels) {
  const chunk = (name, data) => {
    const typeAndData = Buffer.concat([Buffer.from(name), data]);
    let crc = 0xffffffff;
    for (const value of typeAndData) {
      crc ^= value;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, typeAndData, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(32, 0); header.writeUInt32BE(32, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(32 * 129);
  pixels.forEach((row, y) => row.forEach((color, x) => {
    if (palette[color]) raw.set([...palette[color], 255], y * 129 + 1 + x * 4);
  }));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const [name, cursor] of Object.entries(cursors)) {
  writeFileSync(new URL(name + '.cur', out), encodeCur(cursor));
  writeFileSync(new URL(name + '.png', out), encodePng(cursor.pixels));
}
// SVG contact sheet is for visual review only; runtime prefers PNG with CUR fallback.
if (process.argv.includes('--preview')) {
  const colors = { k: '#000', w: '#fff', g: '#808080' };
  const preview = Object.entries(cursors).map(([name, { pixels, hotspot }], index) => {
    const shapes = pixels.flatMap((row, y) => row.map((color, x) => colors[color] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[color]}"/>` : '').filter(Boolean)).join('');
    return `<g transform="translate(${index * 116 + 12},24)"><g transform="scale(3)" shape-rendering="crispEdges">${shapes}</g><text y="116" font-size="12">${name}</text><text y="132" font-size="10">hotspot ${hotspot.join(',')}</text></g>`;
  }).join('');
  const target = process.argv[process.argv.indexOf('--preview') + 1];
  writeFileSync(target, `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="180"><rect width="1060" height="180" fill="#c0c0c0"/>${preview}</svg>`);
}
console.log(`Generated ${Object.keys(cursors).length} original cursors in ${fileURLToPath(out)}`);
