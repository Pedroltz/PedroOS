// Delivery encodings only: retain source artwork and full-resolution screenshots.
import sharp from 'sharp';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'src/PedroOS.Web');
const wwwroot = join(web, 'wwwroot');
const splash = join(wwwroot, 'assets/boot/pedroos-95-splash.webp');
mkdirSync(dirname(splash), { recursive: true });
await sharp(join(root, 'artwork/boot/pedroos-95-splash.png')).webp({ quality: 80, effort: 6 }).toFile(splash);
if (statSync(splash).size > 300 * 1024) throw new Error('Boot artwork exceeds 300 KiB.');

const projects = JSON.parse(readFileSync(join(web, 'Data/projects.json'), 'utf8'));
let images = 0, originalBytes = 0, previewBytes = 0, thumbnailBytes = 0;
for (const project of projects) {
  for (const shot of project.screenshots) {
    if (!shot.src.startsWith('/assets/screenshots/')) throw new Error('Expected a local screenshot: ' + shot.src);
    const original = join(wwwroot, shot.src.slice(1));
    const stem = original.slice(0, -extname(original).length);
    const preview = stem + '.preview.webp', thumbnail = stem + '.thumb.webp';
    await sharp(original).resize({ width: 960, height: 720, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 }).toFile(preview);
    await sharp(original).resize({ width: 160, height: 120, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 }).toFile(thumbnail);
    images++;
    originalBytes += statSync(original).size;
    previewBytes += statSync(preview).size;
    thumbnailBytes += statSync(thumbnail).size;
  }
}
console.log(JSON.stringify({ splashBytes: statSync(splash).size, images, originalBytes, previewBytes, thumbnailBytes }));
