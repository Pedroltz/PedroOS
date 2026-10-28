import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test',
  '-c', 'tests/PedroOS.E2E/playwright.static.config.ts', ...process.argv.slice(2)],
{ stdio: 'inherit', env: { ...process.env, PEDROOS_STATIC: '1' } });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
