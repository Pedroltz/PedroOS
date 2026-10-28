import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const web = new URL('../../src/PedroOS.Web/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('Data/icons.json', web)));
test('established desktop artwork retains its original appearance', () => {
  const originals = {
    'system/my-computer-32.png': '9c60337cd1ae0ea3f1d81bd3e08af45c7f7aec668ecc542ba3b4e4a7a43d2571',
    'applications/explorer-32.png': '2016d66a0bfd698128f04c3e83d538f165b0d2fab9b45fecd3b7a46e487d1b3b',
    'applications/projects-32.png': 'c5738af7181b074f4268e60cbd948c505bd660eb311d67a9b73702765d80f35f',
    'projects/ofizzy-32.png': 'ecdd82b7194ba2aabda159132e2e8f454727331570cf5b8e75bc35fc7c32dd77',
    'projects/rdp-session-manager-32.png': 'adc1f59c4896bf1b977ad71b36d0d14445ab4f75d4d541d6f482163023a02908',
    'applications/resume-32.png': 'b12271f9937e956a1e7c0755d7132428fd2b75cc352fd9f64e0b7a02c5186959',
    'system/system-32.png': '0bbefbdb1bad1211dfdb2f2e27d062de9851c3e070434611f2448ff062a12a50',
    'applications/github-32.png': '1a2e3d3c822cc5bc2d178fad356d5a59d2003a3a144183968e3022437c4f8e4d',
    'applications/linkedin-32.png': '973e809c95df886faf5aa6174c43d5db076bdebef6077360966bc77ae552e75c',
  };
  for (const [path, hash] of Object.entries(originals)) {
    const bytes = readFileSync(new URL('wwwroot/assets/icons/' + path, web));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, path);
  }
});
test('every registered icon variant exists at its advertised dimensions with hard pixel alpha', () => {
  for (const [key, entry] of Object.entries(manifest.icons)) {
    for (const [sizeText, path] of Object.entries(entry.variants)) {
      const size = Number(sizeText);
      const png = readFileSync(new URL('wwwroot' + path, web));
      assert.equal(png.readUInt32BE(16), size, key);
      assert.equal(png.readUInt32BE(20), size, key);
      assert.equal(png[25], 6, 'RGBA PNG');
      const idats = [];
      for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') idats.push(png.subarray(offset + 8, offset + 8 + length));
        offset += length + 12;
      }
      const raw = inflateSync(Buffer.concat(idats));
      for (let y = 0; y < size; y++) {
        assert.equal(raw[y * (size * 4 + 1)], 0, 'Unfiltered generated artwork');
        for (let x = 0; x < size; x++) {
          const alpha = raw[y * (size * 4 + 1) + 1 + x * 4 + 3];
          assert.ok(alpha === 0 || alpha === 255, `${key}: blurred edge at ${x},${y}`);
        }
      }
    }
  }
});
test('established project icons retain distinct small and large assets', () => {
  const assets = new Set();
  for (const key of ['ofizzy', 'rdp-session-manager', 'anycomic', 'gamepad', 'autoapply']) {
    const entry = manifest.icons[key];
    assert.ok(entry.variants[16] && entry.variants[32]);
    if (['anycomic', 'gamepad', 'autoapply'].includes(key)) assert.deepEqual(entry.nativeSizes, [16, 32]);
    assert.ok(entry.attribution);
    for (const size of [16, 32]) {
      const art = readFileSync(new URL('wwwroot' + entry.variants[size], web)).toString('base64');
      assert.ok(!assets.has(art), `${key} duplicates another project icon`);
      assets.add(art);
    }
  }
});
