import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resampleWhole, trimTransparentPadding } from './site-art-pixels.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';
import { decodePng } from './spelling-stickers.mjs';

test('rollout freezes every accepted preview image and every pixel of its left ground region', () => {
  const accepted = JSON.parse(readFileSync('assets/source/site/steel-v1/accepted-preview/preparation.json'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const current = JSON.parse(readFileSync('public/assets/site/steel-v1/preparation.json'));
  assert.deepEqual(current.preparations, accepted.preparations, 'accepted whole-source scales and alpha preparation');
  assert.deepEqual(current.plannedCells, accepted.plannedCells, 'accepted cap and centre cells');
  for (const source of accepted.preparations) assert.equal(hash(readFileSync(`assets/source/site/steel-v1/${source.file}`)), source.sha256, 'frozen generated original');
  for (const pin of accepted.artifacts) {
    const bytes = readFileSync(`public/assets/site/steel-v1/${pin.name}`);
    assert.equal(hash(bytes), pin.sha256, 'frozen preview file: ' + pin.name);
    assertPngPixelContract(bytes, bytes, pin);
  }
  const original = decodePng(readFileSync('public/assets/site/steel-v1/ground.png'));
  const complete = decodePng(readFileSync('public/assets/site/steel-v1/ground-full.png'));
  for (let y = 0; y < original.height; y++) {
    const prior = original.data.subarray(y * original.width * 4, (y + 1) * original.width * 4);
    const current = complete.data.subarray(y * complete.width * 4, (y * complete.width + original.width) * 4);
    assert.equal(Buffer.compare(Buffer.from(prior), Buffer.from(current)), 0, 'accepted ground row: ' + y);
  }
  const inventory = JSON.parse(readFileSync('docs/evidence/issue-242/inventory.json'));
  for (let x = 0; x < complete.width; x++) {
    const surface = inventory.terrain.find(s => x + 0.5 >= s.x1 && x + 0.5 < s.x2);
    const top = surface.y1 + (surface.y2 - surface.y1) * (x + 0.5 - surface.x1) / (surface.x2 - surface.x1);
    for (let y = 0; y < complete.height; y++) assert.equal(complete.data[(y * complete.width + x) * 4 + 3], y + 0.5 < top ? 0 : 255, `authored contour ${x},${y}`);
  }
});

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

test('shared source projection accepts only the recorded rollout bytes and rejects position or appended changes', () => {
  const record = JSON.parse(readFileSync('assets/source/site/steel-v1/rollout-preservation.json'));
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/site/manifest.json', 'src/world/assets.ts', 'src/world/renderer.ts', 'src/world/sunset-site.ts']);
  for (const [path, pin] of Object.entries(record.files)) {
    const bytes = readFileSync(path), original = readFileSync(pin.baselineCopy);
    assert.ok(beforeSiteArt(path, bytes).equals(original));
    assert.throws(() => beforeSiteArt(path, Buffer.concat([bytes, Buffer.from('\n// unrelated')])), path);
  }
  const path = 'src/world/sunset-site.ts', bytes = readFileSync(path, 'utf8');
  assert.throws(() => beforeSiteArt(path, Buffer.from(bytes.replace("girder('entrance', 0, 300, 560)", "girder('entrance', 0, 301, 560)"))));
});

test('all prepared rollout PNGs reproduce with exact RGBA, dimensions, CRC and committed-copy guards', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'sunset-steel-'));
  try {
    execFileSync(process.execPath, ['scripts/prepare-site-art.mjs', temporary]);
    const metadata = JSON.parse(readFileSync('public/assets/site/steel-v1/preparation.json'));
    const regenerated = JSON.parse(readFileSync(join(temporary, 'preparation.json')));
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(regenerated.artifacts.length, metadata.artifacts.length);
    for (const [index, expected] of metadata.artifacts.entries()) {
      const actual = readFileSync(join(temporary, expected.name)), committed = readFileSync(`public/assets/site/steel-v1/${expected.name}`);
      assertPngPixelContract(actual, committed, expected);
      assert.equal(hash(committed), expected.sha256, 'immutable committed PNG bytes');
      assert.equal(hash(actual), regenerated.artifacts[index].sha256, 'regenerated metadata binds actual PNG bytes');
      // Only the independently verified compressed-file digest is encoder-specific.
      // Every source, cell, dimension, alpha/pixel digest and other metadata field stays exact.
      regenerated.artifacts[index].sha256 = expected.sha256;
    }
    assert.equal(readFileSync(join(temporary, 'manifest.json'), 'utf8'), readFileSync('public/assets/site/steel-v1/manifest.json', 'utf8'));
    assert.deepEqual(regenerated, metadata);
    const first = ['manifest.json', 'preparation.json', ...metadata.artifacts.map(a => a.name)]
      .map(name => ({ name, bytes: readFileSync(join(temporary, name)) }));
    execFileSync(process.execPath, ['scripts/prepare-site-art.mjs', temporary]);
    for (const file of first) assert.ok(file.bytes.equals(readFileSync(join(temporary, file.name))), 'same-encoder deterministic bytes: ' + file.name);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
