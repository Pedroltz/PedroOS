import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import vm from 'node:vm';

const dir = mkdtempSync(join(tmpdir(), 'pedroos-redirect-'));
let script;
try {
  writeFileSync(join(dir, 'index.html'), '<html><head></head></html>');
  execFileSync(process.execPath, ['scripts/inject-live-redirect.mjs', dir]);
  script = readFileSync(join(dir, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
} finally {
  rmSync(dir, { recursive: true, force: true });
}

async function visit({ search = '?app=2091', pathname = '/PedroOS/projects/', base = '/PedroOS',
  url = 'https://phone.trycloudflare.com', health = { status: 'ok', os: 'PedroOS 95' },
  status = 200, offline = false } = {}) {
  const requests = [];
  const redirects = [];
  vm.runInNewContext(script, {
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    document: { querySelector: () => ({ content: base }) },
    location: { pathname, search, hash: '#terminal', origin: 'https://pedroltz.github.io',
      replace: (target) => redirects.push(target) },
    fetch: async (target, options) => {
      requests.push({ target, options });
      if (target.includes('api.github.com')) return { ok: true, json: async () => ({ files: {
        'pedroos-tunnel.json': { content: JSON.stringify({ url }) },
      } }) };
      if (offline) throw new Error('DNS failure');
      return { ok: status === 200, status, json: async () => health };
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { requests, redirects };
}

test('generated script redirects to a healthy phone preserving route, query and hash', async () => {
  const { redirects, requests } = await visit();
  assert.deepEqual(redirects, ['https://phone.trycloudflare.com/projects/?app=2091#terminal']);
  assert.equal(requests[1].options.mode, 'cors');
});

test('offline, HTTP error and unrelated service preserve the static site', async () => {
  for (const options of [{ offline: true }, { status: 502 }, { health: {} },
    { health: { status: 'ok', os: 'another app' } }]) {
    assert.deepEqual((await visit(options)).redirects, []);
  }
});

test('static opt-out matches a query parameter exactly', async () => {
  assert.equal((await visit({ search: '?static=1' })).requests.length, 0);
  assert.equal((await visit({ search: '?static=10' })).redirects.length, 1);
  assert.equal((await visit({ search: '?value=static=1' })).redirects.length, 1);
});

test('exported base path is respected without stripping similarly named paths', async () => {
  assert.match((await visit({ base: '/Portfolio', pathname: '/Portfolio/resume' })).redirects[0], /\/resume\?/);
  assert.match((await visit({ pathname: '/PedroOS-other' })).redirects[0], /\/PedroOS-other\?/);
});

test('invalid, insecure and same-origin targets never redirect', async () => {
  for (const url of ['http://phone.test', 'javascript:alert(1)', 'invalid',
    'https://user:password@phone.test', 'https://pedroltz.github.io']) {
    assert.deepEqual((await visit({ url })).redirects, []);
  }
});
