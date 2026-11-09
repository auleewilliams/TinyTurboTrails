import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { projectFrostTrial, beforeFrostTrial, frostTrialRecord } from './frost-trial-preservation.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('four-file Frost projection retains independent original full-file hashes', () => {
  assert.deepEqual(Object.keys(frostTrialRecord).sort(), ['public/assets/frost/manifest.json', 'src/world/assets.ts', 'src/world/frost-ridge.ts', 'src/world/renderer.ts']);
  for (const [path, entry] of Object.entries(frostTrialRecord)) {
    const bytes = readFileSync(path), baseline = projectFrostTrial(path, bytes);
    assert.equal(hash(baseline), entry.beforeSHA256);
    assert.deepEqual(beforeFrostTrial(path, bytes), baseline);
    for (const bad of [Buffer.concat([bytes, Buffer.from('\n// unrelated')]), Buffer.from(bytes.toString().replace(entry.changes[0].after, entry.changes[0].after + ' '))]) {
      assert.throws(() => projectFrostTrial(path, bad), /exact Frost trial/);
      assert.equal(beforeFrostTrial(path, bad), bad, 'corruption reaches historical oracle unchanged');
    }
  }
  const world = readFileSync('src/world/frost-ridge.ts');
  for (const [a, b] of [['[3416, 3616, 372]', '[3415, 3615, 372]'], ['[2280, 2460, 500]', '[2281, 2461, 500]'], ['friction: 0.45', 'friction: 0.46']])
    assert.throws(() => projectFrostTrial('src/world/frost-ridge.ts', Buffer.from(world.toString().replace(a, b))));
});
