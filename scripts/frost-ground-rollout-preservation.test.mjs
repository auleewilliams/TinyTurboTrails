import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeFrostRollout, frostRolloutRecord } from './frost-ground-rollout-preservation.mjs';
import { verifyFrostGroundFiles, beforeFrostGround } from './frost-ground-preservation.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
test('full rollout projects only complete presentation bytes to independent 77 identities', () => {
  assert.deepEqual(Object.keys(frostRolloutRecord).sort(), [
    'scripts/frost-ground-preservation.mjs', 'scripts/frost-ground-preservation.test.mjs',
    'src/world/frost-ground.ts', 'tests/frost-ground-preview.test.ts', 'tests/frost-ground.test.ts', 'tests/renderer-fixtures.test.ts', 'tests/renderer.test.ts',
  ]);
  for (const [path, entry] of Object.entries(frostRolloutRecord)) {
    const bytes = readFileSync(path);
    assert.equal(hash(bytes), entry.currentSHA256, path);
    assert.equal(hash(beforeFrostRollout(path, bytes)), entry.beforeSHA256, path);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace(/Frost|frost/, 'CORRUPT'))]) {
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeFrostRollout(path, bad), bad);
      assert.equal(beforeFrostGround(path, bad), bad);
    }
  }
  assert.equal(frostRolloutRecord['src/world/frost-ground.ts'].beforeSHA256, '97ee2ac8955540c9c41bb5b7d446f300f376c05d8f3d46e55d64c3ec6444362d');
  verifyFrostGroundFiles();
});
test('rollout never normalizes level, physics, images, approvals or unrelated sources', () => {
  for (const path of ['src/world/frost-ridge.ts', 'src/game/movement.ts', 'public/assets/frost/ground-ice-v1/terrain.png', 'public/assets/frost/ground-ice-v1/ice.png', 'assets/source/frost/ground-ice-v1/originals/approval/bounded-ground-application.json']) {
    const bytes = readFileSync(path), bad = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeFrostRollout(path, bytes), bytes);
    assert.equal(beforeFrostRollout(path, bad), bad);
  }
});
