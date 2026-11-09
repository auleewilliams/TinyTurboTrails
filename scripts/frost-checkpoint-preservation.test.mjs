import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeFrostCheckpoints, frostCheckpointRecord } from './frost-checkpoint-preservation.mjs';
import { beforeFrostTrial } from './frost-trial-preservation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('projects only the measured Frost anchor and its attached active overlay', () => {
  assert.deepEqual(Object.keys(frostCheckpointRecord).sort(), ['public/assets/frost/manifest.json', 'src/world/renderer.ts']);
  for (const [path, entry] of Object.entries(frostCheckpointRecord)) {
    const bytes = readFileSync(path), prior = beforeFrostCheckpoints(path, bytes);
    assert.equal(hash(bytes), entry.currentSHA256);
    assert.equal(hash(prior), entry.beforeSHA256);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('checkpoint', 'wrong-checkpoint'))]) {
      assert.equal(beforeFrostCheckpoints(path, bad), bad);
      assert.equal(beforeFrostTrial(path, bad), bad);
    }
  }
  const p = 'public/assets/frost/manifest.json', bytes = readFileSync(p);
  const original = JSON.parse(beforeFrostCheckpoints(p, bytes));
  const current = JSON.parse(bytes);
  assert.deepEqual(current.anchors.checkpoint, { x: 17, y: 41 });
  current.anchors.checkpoint.y = 44;
  assert.deepEqual(current, original, 'no other manifest value changes');
  for (const p of ['src/world/frost-ridge.ts', 'src/game/interactions.ts', 'public/assets/frost/environment.png']) {
    const bytes = readFileSync(p); assert.equal(beforeFrostCheckpoints(p, bytes), bytes);
  }
});
