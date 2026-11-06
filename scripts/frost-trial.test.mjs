import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareFrostTrial, wholeImageAtWidth } from './prepare-frost-trial.mjs';
import { decodePng } from './timbers-art.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('whole isotropic sampler preserves ends, transparent holes and ceil padding', () => {
  const data = new Uint8Array(4 * 3 * 4);
  for (let y = 0; y < 3; y++) for (const x of [0, 3]) data.set([70, 120, 200, 255], (y * 4 + x) * 4);
  const image = wholeImageAtWidth({ width: 4, height: 3, data }, 2);
  assert.equal(image.width, 2); assert.equal(image.height, 2);
  assert.deepEqual([...image.data.slice(0, 4)], [70, 120, 200, 128]);
  assert.deepEqual([...image.data.slice(8, 12)], [70, 120, 200, 64]);
  const identity = wholeImageAtWidth({ width: 4, height: 3, data }, 4);
  assert.deepEqual(identity.data, data);
  const holed = new Uint8Array(6 * 2 * 4);
  for (let y = 0; y < 2; y++) for (const x of [0, 1, 4, 5]) holed.set([80, 160, 240, 255], (y * 6 + x) * 4);
  const filtered = wholeImageAtWidth({ width: 6, height: 2, data: holed }, 3);
  assert.equal(filtered.data[7], 0, 'surrounding transparent hole remains transparent');

});
test('four shipped PNGs exactly match deterministic whole-component preparation', () => {
  const first = prepareFrostTrial(), second = prepareFrostTrial();
  assert.deepEqual([...first.keys()], ['ledge-v2-180.png', 'ledge-v4-210.png', 'ledge-v6-200.png', 'ledge-v5-200.png', 'manifest.json', 'preparation.json']);
  for (const [name, bytes] of first) {
    assert.equal(hash(bytes), hash(second.get(name)));
    if (name === 'manifest.json') {
      const current = JSON.parse(readFileSync('public/assets/frost/ledge-trial-v1/manifest.json'));
      for (const [id, piece] of Object.entries(JSON.parse(bytes).platforms)) assert.deepEqual(current.platforms[id], piece);
    } else assert.equal(hash(readFileSync('public/assets/frost/ledge-trial-v1/' + name)), hash(bytes), name);
    if (name.endsWith('.png')) {
      const image = decodePng(bytes);
      assert.ok(image.height >= 24, 'approved deeper body retained');
      assert.ok(image.data.some((v, i) => i % 4 === 3 && v === 0), 'rounded/transparent regions retained');
    }
  }
});
