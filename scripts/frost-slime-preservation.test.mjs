import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeFrostSlimes, frostSlimeRecord } from './frost-slime-preservation.mjs';
import { beforeFrostGround } from './frost-ground-preservation.mjs';
import { beforeFrostTrial, projectFrostTrial } from './frost-trial-preservation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');

test('exact two-file slime delta projects independently to the accepted shorter Frost baseline', () => {
  assert.deepEqual(Object.keys(frostSlimeRecord).sort(), ['src/world/frost-ridge.ts', 'tests/sunset-pilot.ts']);
  for (const [path, entry] of Object.entries(frostSlimeRecord)) {
    const bytes = readFileSync(path);
    assert.equal(hash(bytes), entry.currentSHA256);
    assert.equal(hash(beforeFrostSlimes(path, bytes)), entry.beforeSHA256);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('slime', 'corrupt'))]) {
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeFrostSlimes(path, bad), bad);
      assert.equal(beforeFrostGround(path, bad), bad);
      assert.equal(beforeFrostTrial(path, bad), bad);
    }
  }
});

test('unrelated terrain, friction, return10, reward, spring, checkpoint, finish and theme edits never project', () => {
  const path = 'src/world/frost-ridge.ts', bytes = readFileSync(path);
  for (const [from, to] of [
    ['[3416, 3616, 372]', '[3415, 3615, 372]'], ['[0, 500]', '[0, 501]'],
    ['friction: 0.45', 'friction: 0.46'], ['[130, 240, 340', '[131, 240, 340'],
    ["'spring', 3140", "'spring', 3141"], ['[1350, 2760, 4040]', '[1351, 2760, 4040]'],
    ['x: 5520', 'x: 5519'], ["slimeAccessory: 'bobble'", "slimeAccessory: 'leaf'"],
    ['minX: 1430', 'minX: 1429'], ["'slime', 2900", "'slime', 2901"],
    ["'slime', 1475", "'slime', 1460"], ["'slime', 4520", "'slime', 4230"],
    ['minX: 4490', 'minX: 4170'],
  ]) {
    const bad = Buffer.from(bytes.toString().replace(from, to));
    assert.notDeepEqual(bad, bytes, from);
    assert.equal(beforeFrostSlimes(path, bad), bad);
    assert.equal(beforeFrostGround(path, bad), bad);
    assert.equal(beforeFrostTrial(path, bad), bad);
    assert.throws(() => projectFrostTrial(path, bad), /exact Frost trial/);
  }
  for (const path of ['src/game/movement.ts', 'src/game/interactions.ts', 'public/assets/frost/ledge-trial-v1/manifest.json']) {
    const bytes = readFileSync(path), bad = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeFrostSlimes(path, bytes), bytes);
    assert.equal(beforeFrostSlimes(path, bad), bad);
    assert.notEqual(hash(bad), hash(bytes));
  }
});
