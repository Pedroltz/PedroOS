import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testFile = join(root, 'tests', 'client', 'unit.test.ts');
const tmpOut = join(root, 'tests', 'client', 'unit.test.mjs');

execSync(`npx esbuild ${testFile} --bundle --platform=node --format=esm --outfile=${tmpOut}`, { stdio: 'inherit' });
execSync(`node ${tmpOut}`, { stdio: 'inherit' });

