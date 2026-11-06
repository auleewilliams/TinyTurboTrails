import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareFrostTrial, prepareFrostExtension } from './prepare-frost-trial.mjs';
import { decodePng } from './timbers-art.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('remaining six use exact deterministic whole sources and preserve accepted four bytes and fields', () => {
  const old = prepareFrostTrial(), first = prepareFrostExtension(), second = prepareFrostExtension();
  const manifest = JSON.parse(first.get('manifest.json'));
  assert.equal(Object.keys(manifest.platforms).length, 10);
  for (const [id, piece] of Object.entries(JSON.parse(old.get('manifest.json')).platforms)) {
    assert.deepEqual(manifest.platforms[id], piece);
    assert.ok(first.get(piece.image).equals(old.get(piece.image)));
  }
  assert.ok(first.get('preparation.json').equals(old.get('preparation.json')));
  const pins = { 'ledge-v1-140.png': '5897de57c44b1c194266519d6cae9c9558b294f64e2fce6fa14029c91f785f07',
    'ledge-v3-190.png': 'c9c938700b14b6bdd8e38250a9548361c9a9608d7c4c101d5e10e4336942504c',
    'ledge-v4-210.png': 'bdcfa27e460280365a5c6a6dfe77fa8b120ba44312c4c02669a70f3764081065' };
  for (const [name, digest] of Object.entries(pins)) assert.equal(hash(first.get(name)), digest);
  for (const id of [3, 6, 7, 8]) assert.equal(manifest.platforms[`frost-return-${id}`].image, 'ledge-v4-210.png');
  for (const [name, bytes] of first) {
    assert.ok(bytes.equals(second.get(name)), name + ' deterministic');
    assert.ok(bytes.equals(readFileSync('public/assets/frost/ledge-trial-v1/' + name)), name + ' shipped');
    if (name.endsWith('.png')) assert.equal(hash(decodePng(bytes).data), hash(decodePng(second.get(name)).data));
  }
});

test('strict shared normalizer accepts only the exact named extension and retains historical pins', async () => {
  const { frostExtensionRecord, beforeFrostExtension } = await import('./frost-extension-preservation.mjs');
  for (const [path, entry] of Object.entries(frostExtensionRecord)) {
    const bytes = readFileSync(path);
    assert.equal(hash(beforeFrostExtension(path, bytes)), entry.beforeSHA256);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('140', '141'))]) {
      assert.ok(beforeFrostExtension(path, bad).equals(bad), 'unrelated edits reach original oracle');
      assert.notEqual(hash(beforeFrostExtension(path, bad)), entry.beforeSHA256);
    }
  }
});
