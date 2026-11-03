import { fileURLToPath } from 'node:url';
import { beforeTimbersRollout } from './timbers-rollout-preservation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng } from './timbers-art.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeTimbersTree } from './timbers-tree-preservation.mjs';

const source = 'assets/source/timbers/tree-v1/';
const record = JSON.parse(readFileSync(source + 'preparation.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('whole-tree uniform preparation reproduces exact RGBA and same-encoder PNG bytes, preserving prior terrain', () => {
  assert.equal(hash(readFileSync(source + record.source.image)), record.source.sha256);
  const temporary = mkdtempSync(join(tmpdir(), 'timbers-tree-'));
  try {
    // Reproduce the historical tree preparation against its exact accepted terrain inputs.
    // The rollout extends metadata; it does not regenerate or reinterpret accepted tree pixels.
    const fixture = join(temporary, 'accepted');
    for (const path of [...Object.keys(record.preservedTerrainFiles), source + record.source.image]) {
      const target = join(fixture, path);
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, beforeTimbersRollout(path, readFileSync(path)));
    }
    for (const directory of ['first', 'second']) execFileSync(process.execPath,
      [fileURLToPath(new URL('./prepare-timbers-tree.mjs', import.meta.url)), join(temporary, directory)], { cwd: fixture });
    const shipped = readFileSync('public/assets/timbers/tree-v1/tree.png');
    assert.equal(hash(shipped), record.native.pngSha256);
    const regenerated = readFileSync(join(temporary, 'first/tree.png'));
    assertPngPixelContract(regenerated, shipped, record.native);
    assert.deepEqual(regenerated, readFileSync(join(temporary, 'second/tree.png')), 'same-encoder bytes');
    const regeneratedRecord = JSON.parse(readFileSync(join(temporary, 'first/preparation.json')));
    assert.equal(regeneratedRecord.native.pngSha256, hash(regenerated), 'generated metadata binds its actual PNG');
    // Keep the historical record immutable while comparing all non-compression metadata exactly.
    regeneratedRecord.native.pngSha256 = record.native.pngSha256;
    assert.deepEqual(regeneratedRecord, record);
    assert.deepEqual(readFileSync(join(temporary, 'first/manifest.json')), readFileSync('public/assets/timbers/tree-v1/manifest.json'));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  for (const [path, expected] of Object.entries(record.preservedTerrainFiles)) assert.equal(hash(beforeTimbersRollout(path, readFileSync(path))), expected, path);
});

test('the tree has six separate outer limbs and a contiguous broad foot, without editing alpha', () => {
  const image = decodePng(readFileSync('public/assets/timbers/tree-v1/tree.png'));
  const a = (x, y) => image.data[(y * image.width + x) * 4 + 3];
  const regions = (left, right) => {
    let count = 0, previous = false;
    for (let y = 100; y < 850; y++) {
      let pixels = 0;
      for (let x = left; x < right; x++) if (a(x, y) >= 128) pixels++;
      const occupied = pixels >= 6;
      if (occupied && !previous) count++;
      previous = occupied;
    }
    return count;
  };
  assert.equal(regions(0, 300), 4, 'four left scenic limbs');
  assert.equal(regions(470, 576), 2, 'two right scenic limbs');
  const foot = record.grounding;
  for (let x = foot.baseLeft; x < foot.baseRight; x++) assert.ok(a(x, foot.baseRow) >= 128);
  assert.equal(foot.contiguousPixels, 210);
  const manifest = JSON.parse(readFileSync('public/assets/timbers/tree-v1/manifest.json'));
  assert.equal(manifest.y + foot.baseRow + 1, foot.worldPlane);
});

test('tree preservation reverses only pinned changes and rejects unrelated shared edits', () => {
  const delta = JSON.parse(readFileSync(source + 'presentation-delta.json'));
  for (const [path, entry] of Object.entries(delta.files)) {
    const bytes = readFileSync(path);
    assert.equal(hash(beforeTimbersTree(path, bytes)), entry.baselineSha256);
    assert.throws(() => beforeTimbersTree(path, Buffer.concat([bytes, Buffer.from('\n// unrelated')])), { code: 'ERR_ASSERTION' });
  }
  const renderer = readFileSync('src/world/renderer.ts', 'utf8');
  assert.throws(() => beforeTimbersTree('src/world/renderer.ts', Buffer.from(renderer.replace("level.id === 'timbers'", "level.id === 'plains'"))), { code: 'ERR_ASSERTION' });
});
