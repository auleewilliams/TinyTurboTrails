import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resampleWhole, trimTransparentPadding } from './site-art-pixels.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';

test('whole-source area weights preserve pale opaque pixels and use premultiplied colour', () => {
  const image = { width: 2, height: 2, data: new Uint8Array([255, 255, 255, 255, 255, 0, 255, 0,
    255, 0, 255, 0, 255, 0, 255, 0]) };
  const reduced = resampleWhole(image, 2);
  assert.deepEqual([...reduced.data], [255, 255, 255, 63]);
  const identity = resampleWhole(image, 1);
  assert.deepEqual([...identity.data.slice(0, 4)], [255, 255, 255, 255]);
});

test('uniform rational scaling retains complete edge pixels with transparent ceil padding', () => {
  const image = { width: 3, height: 3, data: new Uint8Array(3 * 3 * 4).fill(255) };
  const reduced = resampleWhole(image, 2);
  assert.equal(reduced.width, 2); assert.equal(reduced.height, 2);
  assert.deepEqual([3, 7, 11, 15].map(i => reduced.data[i]), [255, 127, 127, 63]);
  const rational = resampleWhole(image, 3, 2);
  assert.deepEqual([...rational.data], new Array(16).fill(255));
});

test('padding trim preserves every nonzero alpha pixel, including a one-byte edge', () => {
  const image = { width: 4, height: 4, data: new Uint8Array(64) };
  image.data[(1 * 4 + 1) * 4 + 3] = 255;
  image.data[(3 * 4 + 3) * 4 + 3] = 1;
  const result = trimTransparentPadding(image);
  assert.deepEqual(result.bounds, { x: 1, y: 1, width: 3, height: 3 });
  assert.equal(result.image.data.at(-1), 1);
});

test('legacy preservation projects only the exact site declaration and rejects unrelated or duplicate bytes', () => {
  const path = 'public/assets/site/manifest.json', bytes = readFileSync(path);
  assert.ok(!beforeSiteArt(path, bytes).includes('siteTerrain'));
  for (const changed of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('"x": 24', '"x": 25')),
    Buffer.from(bytes.toString().replace('"siteTerrain":', '"siteTerrain": "steel-v1/manifest.json",\n  "siteTerrain":'))]) {
    assert.throws(() => beforeSiteArt(path, changed));
  }
  assert.equal(beforeSiteArt('public/assets/cove/manifest.json', bytes), bytes);
});

test('shared source projection accepts only the recorded preview bytes and rejects position or appended changes', () => {
  const record = JSON.parse(readFileSync('assets/source/site/steel-v1/preservation.json'));
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/site/manifest.json', 'src/world/assets.ts', 'src/world/renderer.ts', 'src/world/sunset-site.ts']);
  for (const [path, pin] of Object.entries(record.files)) {
    const bytes = readFileSync(path), original = readFileSync(pin.baselineCopy);
    assert.ok(beforeSiteArt(path, bytes).equals(original));
    assert.throws(() => beforeSiteArt(path, Buffer.concat([bytes, Buffer.from('\n// unrelated')])), path);
  }
  const path = 'src/world/sunset-site.ts', bytes = readFileSync(path, 'utf8');
  assert.throws(() => beforeSiteArt(path, Buffer.from(bytes.replace("girder('entrance', 0, 300, 560)", "girder('entrance', 0, 301, 560)"))));
});

test('all prepared preview PNGs reproduce with exact RGBA, dimensions, CRC and committed-copy guards', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'sunset-steel-'));
  try {
    execFileSync(process.execPath, ['scripts/prepare-site-art.mjs', temporary]);
    const metadata = JSON.parse(readFileSync('public/assets/site/steel-v1/preparation.json'));
    for (const expected of metadata.artifacts) {
      const actual = readFileSync(join(temporary, expected.name)), committed = readFileSync(`public/assets/site/steel-v1/${expected.name}`);
      assertPngPixelContract(actual, committed, expected);
    }
    assert.equal(readFileSync(join(temporary, 'manifest.json'), 'utf8'), readFileSync('public/assets/site/steel-v1/manifest.json', 'utf8'));
    assert.equal(readFileSync(join(temporary, 'preparation.json'), 'utf8'), readFileSync('public/assets/site/steel-v1/preparation.json', 'utf8'));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
