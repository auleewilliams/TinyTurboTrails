import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng } from './spelling-stickers.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeTimbersPreview } from './timbers-preservation.mjs';

const source = 'assets/source/timbers/illustrated-v1/';
const record = JSON.parse(readFileSync(source + 'preparation.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('Timbers prepared images reproduce exact complete RGBA, PNG structure and source bindings', () => {
  for (const role of Object.values(record.sources)) assert.equal(hash(readFileSync(source + role.image)), role.sha256);
  const temp = mkdtempSync(join(tmpdir(), 'timbers-preparation-'));
  try {
    for (const directory of ['first', 'second']) execFileSync(process.execPath, ['scripts/prepare-timbers-art.mjs', join(temp, directory)]);
    const regeneratedRecord = JSON.parse(readFileSync(join(temp, 'first/preparation.json')));
    for (const [name, expected] of Object.entries(record.records)) {
      const committed = readFileSync('public/assets/timbers/terrain-kit-v1/' + name), regenerated = readFileSync(join(temp, 'first', name));
      assert.equal(hash(committed), expected.pngSha256);
      assertPngPixelContract(regenerated, committed, expected);
      assert.deepEqual(regenerated, readFileSync(join(temp, 'second', name)), 'same-encoder bytes');
      assert.equal(regeneratedRecord.records[name].pngSha256, hash(regenerated), 'generated metadata binds its actual PNG');
      // Only compressed PNG bytes may differ across encoders; all other metadata stays exact.
      regeneratedRecord.records[name].pngSha256 = expected.pngSha256;
    }
    assert.deepEqual(regeneratedRecord, record);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('Timbers whole end caps and centre provenance hold for every assembled pixel, without alpha thresholding', () => {
  const branch = decodePng(readFileSync('public/assets/timbers/terrain-kit-v1/branch-master.png'));
  const ground = decodePng(readFileSync('public/assets/timbers/terrain-kit-v1/ground-master.png'));
  for (const [name, expected] of Object.entries(record.records).filter(([, value]) => value.columns)) {
    const image = decodePng(readFileSync('public/assets/timbers/terrain-kit-v1/' + name));
    const master = name === 'ground.png' ? ground : branch, cap = name === 'ground.png' ? 12 : 27;
    assert.deepEqual(expected.columns.slice(0, cap), Array.from({ length: cap }, (_, x) => x));
    assert.deepEqual(expected.columns.slice(-cap), Array.from({ length: cap }, (_, x) => master.width - cap + x));
    for (let x = 0; x < image.width; x++) for (let y = 0; y < image.height; y++) {
      const i = (y * image.width + x) * 4, j = (y * master.width + expected.columns[x]) * 4;
      assert.deepEqual(image.data.subarray(i, i + 4), master.data.subarray(j, j + 4));
    }
    if (name !== 'ground.png') {
      assert.equal(image.height, 17);
      for (let x = 0; x < image.width; x++) assert.ok(image.data[((x === 0 ? 1 : 0) * image.width + x) * 4 + 3] > 0, 'continuous top, one rounded endpoint pixel');
    }
  }
  assert.ok(ground.data.every((value, index) => index % 4 !== 3 || value === 255), 'full opaque ground');
});

test('Timbers preservation allows only exact declared deltas and rejects unrelated edits in shared files', () => {
  const changes = JSON.parse(readFileSync(source + 'presentation-delta.json'));
  for (const [path, entry] of Object.entries(changes.files)) {
    const current = readFileSync(path);
    assert.equal(hash(beforeTimbersPreview(path, current)), entry.baselineSha256);
    assert.throws(() => beforeTimbersPreview(path, Buffer.concat([current, Buffer.from('\n// unrelated')])), { code: 'ERR_ASSERTION' });
  }
  for (const [old, replacement] of [["level.id === 'timbers'", "level.id === 'plains'"], ['y + 43 - offset.y', 'y + 44 - offset.y']]) {
    const renderer = readFileSync('src/world/renderer.ts', 'utf8'); assert.ok(renderer.includes(old));
    assert.throws(() => beforeTimbersPreview('src/world/renderer.ts', Buffer.from(renderer.replace(old, replacement))), { code: 'ERR_ASSERTION' });
  }
});
