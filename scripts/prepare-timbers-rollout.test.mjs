import { beforePlainsMerge } from './timbers-plains-integration.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng } from './timbers-art.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeTimbersRollout } from './timbers-rollout-preservation.mjs';

const source = 'assets/source/timbers/rollout-v1/';
const kit = 'public/assets/timbers/terrain-kit-v1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(readFileSync(source + 'preparation.json'));
const accepted = JSON.parse(readFileSync(source + 'accepted-preview.json'));

test('rollout preserves accepted artwork, all gameplay and other worlds byte-for-byte', () => {
  assert.equal(hash(readFileSync(source + 'accepted-preview.json')), 'c041eab1ea162093482a40e2e7a1ea0e5ae335c98e3763535c49cd0850df84a5');
  const changed = new Set(['src/world/assets.ts', 'src/world/timbers-terrain.ts', kit + 'manifest.json']);
  for (const [path, expected] of Object.entries(accepted.files)) {
    if (!changed.has(path)) assert.equal(hash(beforePlainsMerge(path, readFileSync(path))), expected, path);
  }
  const before = JSON.parse(readFileSync(source + 'accepted-manifest.json'));
  const after = JSON.parse(readFileSync(kit + 'manifest.json'));
  assert.deepEqual(after.ground, before.ground);
  for (const [id, piece] of Object.entries(before.platforms)) assert.deepEqual(after.platforms[id], piece, id);
  assert.equal(Object.keys(before.platforms).length, 12);
  assert.equal(Object.keys(after.platforms).length, 44);
});

test('rollout exact pixels, PNG structure, provenance and same-encoder determinism reproduce', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'timbers-rollout-'));
  try {
    for (const sub of ['first', 'second']) execFileSync(process.execPath, ['scripts/prepare-timbers-rollout.mjs', join(temporary, sub)]);
    const regenerated = JSON.parse(readFileSync(join(temporary, 'first/rollout-preparation.json')));
    for (const [name, expected] of Object.entries(record.records)) {
      const shipped = readFileSync(kit + name), first = readFileSync(join(temporary, 'first', name));
      assert.equal(hash(shipped), expected.pngSha256);
      assertPngPixelContract(first, shipped, expected);
      assert.deepEqual(first, readFileSync(join(temporary, 'second', name)), 'same-encoder bytes');
      assert.equal(hash(first), regenerated.records[name].pngSha256);
      // Compressed bytes are encoder-dependent; every other record field and RGBA byte is exact.
      regenerated.records[name].pngSha256 = expected.pngSha256;
    }
    assert.deepEqual(regenerated, record);
    assert.deepEqual(readFileSync(join(temporary, 'first/manifest.json')), readFileSync(kit + 'manifest.json'));
    assert.deepEqual(readFileSync(kit + 'rollout-preparation.json'), readFileSync(source + 'preparation.json'));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('all 44 supported bodies retain whole caps, exact copied pixels and their measured clearance envelopes', () => {
  const master = decodePng(readFileSync(kit + 'branch-master.png'));
  const manifest = JSON.parse(readFileSync(kit + 'manifest.json'));
  const inventory = JSON.parse(readFileSync('docs/evidence/issue-241/inventory.json'));
  assert.deepEqual(Object.keys(manifest.platforms).sort(), inventory.supports.map(s => s.id).sort());
  for (const support of inventory.supports) {
    const piece = manifest.platforms[support.id], proof = record.records[piece.image];
    assert.equal(piece.width, support.width);
    assert.equal(piece.height, 17);
    for (const interval of support.maximumDepthIntervals) assert.ok(piece.height <= interval.depth, support.id);
    const image = decodePng(readFileSync(kit + piece.image));
    assert.deepEqual(proof.columns.slice(0, 27), Array.from({ length: 27 }, (_, x) => x));
    assert.deepEqual(proof.columns.slice(-27), Array.from({ length: 27 }, (_, x) => master.width - 27 + x));
    for (let x = 0; x < image.width; x++) for (let y = 0; y < image.height; y++) {
      const actual = (y * image.width + x) * 4, original = (y * master.width + proof.columns[x]) * 4;
      assert.deepEqual(image.data.subarray(actual, actual + 4), master.data.subarray(original, original + 4));
    }
    for (let x = 0; x < image.width; x++) assert.ok(image.data[((x === 0 ? 1 : 0) * image.width + x) * 4 + 3] > 0);
  }
});

test('rollout reversal accepts only pinned mapping/declaration changes and rejects foreign edits', () => {
  const delta = JSON.parse(readFileSync(source + 'presentation-delta.json'));
  for (const [path, entry] of Object.entries(delta.files)) {
    const bytes = readFileSync(path);
    assert.equal(hash(beforeTimbersRollout(path, bytes)), entry.baselineSha256);
    assert.throws(() => beforeTimbersRollout(path, Buffer.concat([bytes, Buffer.from(' ')])), { code: 'ERR_ASSERTION' });
  }
  const manifest = JSON.parse(readFileSync(kit + 'manifest.json'));
  delete manifest.platforms['timber-low-1'];
  assert.throws(() => beforeTimbersRollout(kit + 'manifest.json', Buffer.from(JSON.stringify(manifest))), { code: 'ERR_ASSERTION' });
});
