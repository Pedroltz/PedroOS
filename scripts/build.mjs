import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'src', 'PedroOS.Web');
const wwwroot = join(web, 'wwwroot');
const cssOut = join(wwwroot, 'css');
const jsOut = join(wwwroot, 'js');

mkdirSync(cssOut, { recursive: true });
mkdirSync(jsOut, { recursive: true });

// 1. Copy 98.css and fonts
const dist98 = join(root, 'node_modules', '98.css', 'dist');
if (existsSync(dist98)) {
  for (const file of readdirSync(dist98)) {
    if (file.endsWith('.css') || file.endsWith('.woff') || file.endsWith('.woff2')) {
      copyFileSync(join(dist98, file), join(cssOut, file));
    }
  }
  console.log('Copied 98.css and fonts to wwwroot/css');
}

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

// 2. Bundle Client TypeScript with esbuild
const buildOptions = {
  entryPoints: [join(web, 'Client', 'pedroos.ts')],
  bundle: true,
  outfile: join(jsOut, 'pedroos.js'),
  format: 'iife',
  sourcemap: true,
  minify: !isDev,
  target: ['es2022'],
  platform: 'browser',
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching frontend changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Bundled pedroos.js successfully.');
}
