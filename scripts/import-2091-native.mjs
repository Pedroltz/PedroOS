// Vendor the original C# sources and public game content, never user saves or API keys.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const source = resolve(process.argv[2] || '../2091-RetroGame');
const target = resolve('src/Game2091.Native/Original');
const hashes = {};
function copy(folder) {
  for (const entry of readdirSync(join(source, folder), { withFileTypes: true })) {
    const name = join(folder, entry.name);
    if (entry.isDirectory()) copy(name);
    else if (entry.name.endsWith('.cs') || entry.name.endsWith('.json')) {
      const bytes = readFileSync(join(source, name));
      const dest = join(target, name);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, bytes);
      hashes[relative(source, join(source, name))] = createHash('sha256').update(bytes).digest('hex');
    }
  }
}
for (const folder of ['Core', 'Services', 'UI', 'Utils', 'Chapters', 'Enemies', 'Items', 'NPCs']) copy(folder);
for (const name of ['Program.cs', 'README.md']) writeFileSync(join(target, name), readFileSync(join(source, name)));
writeFileSync(join(target, 'source.json'), JSON.stringify({ repository: 'https://github.com/Pedroltz/2091-RetroGame', commit: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files: hashes, note: 'Original working-tree files copied byte for byte. The hosted launcher replaces only startup/DI/audio; original gameplay and console UI are compiled unchanged.' }, null, 2) + '\n');
console.log('Imported original C# game and public narrative resources.');

const music = readFileSync(join(source, 'Sounds/Menus/Cyberpunk 2077 - Never Fade Away __ Knight972 ret..mp3'));
const musicTarget = resolve('src/PedroOS.Web/wwwroot/assets/games/2091');
mkdirSync(musicTarget, { recursive: true });
writeFileSync(join(musicTarget, 'title.mp3'), music);
