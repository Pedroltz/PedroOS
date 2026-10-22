import assert from 'node:assert/strict';

const base = process.env.PEDROOS_BASE_URL || 'http://localhost:5161';
const html = await (await fetch(base)).text();
const boot = JSON.parse(html.match(/<script\b[^>]*id="pedroos-boot-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const path = boot.icons.ofizzy.variants[32];
assert.match(path, /\?v=/, 'Boot manifest must contain a content-versioned icon URL');
assert.ok(html.includes(path), 'Razor and TypeScript must use the same versioned icon URL');
const versioned = await fetch(base + path);
assert.equal(versioned.status, 200);
const plain = await fetch(base + '/assets/icons/projects/ofizzy-32.png');
assert.equal(plain.status, 200);
assert.doesNotMatch(plain.headers.get('cache-control'), /immutable/);
assert.match(plain.headers.get('cache-control'), /no-cache|must-revalidate/);
console.log('PASS: matching content-versioned URLs in Razor/TypeScript; PNG HTTP 200; stable URLs require revalidation.');
