import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { projectQuarrySiteSource, isSharedArtBaseline } from './quarry-site-integration.mjs';
import { beforeQuarryFloor } from './quarry-floor-preservation.mjs';
import { beforeQuarryOwnerRevision } from './quarry-owner-revision-preservation.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';
import { beforeTimbersOwnerFeedback } from './timbers-owner-feedback.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(readFileSync('assets/source/quarry/sunset-main-sync-v1/receipt.json'));

test('only the two exact shared files project to both independent accepted sides and shared main', () => {
  assert.deepEqual(Object.keys(receipt.files).sort(), ['src/world/assets.ts', 'src/world/renderer.ts']);
  for (const [path, entry] of Object.entries(receipt.files)) {
    const combined = readFileSync(path);
    assert.equal(hash(combined), entry.combinedSha256, 'current complete combined file');
    for (const [side, pin] of Object.entries(entry.projections)) {
      const accepted = readFileSync(pin.copy);
      assert.equal(hash(accepted), pin.sha256);
      assert.deepEqual(projectQuarrySiteSource(path, combined, side), accepted);
      assert.equal(projectQuarrySiteSource(path, accepted, side), accepted, 'historical bytes remain unchanged for their original guards');
      assert.throws(() => projectQuarrySiteSource(path, combined, side, url => Buffer.concat([readFileSync(url), Buffer.from(' ')])), /complete accepted integration side/);
    }
    const shared = projectQuarrySiteSource(path, combined, 'shared');
    assert.equal(isSharedArtBaseline(path, shared), true);
    assert.equal(isSharedArtBaseline(path, Buffer.concat([shared, Buffer.from(' ')])), false);
    assert.deepEqual(beforeTimbersOwnerFeedback(path, combined), beforeTimbersOwnerFeedback(path, shared));
    assert.deepEqual(beforeSiteArt(path, combined), shared);
    assert.deepEqual(beforeQuarryOwnerRevision(path, combined), beforeQuarryOwnerRevision(path, projectQuarrySiteSource(path, combined)));
  }
  const gameplay = readFileSync('src/game/movement.ts');
  assert.equal(projectQuarrySiteSource('src/game/movement.ts', gameplay), gameplay);
  assert.equal(isSharedArtBaseline('src/game/movement.ts', gameplay), false);
});

test('each composed hunk and unrelated byte still fails through the original named guards', () => {
  for (const [path, entry] of Object.entries(receipt.files)) {
    const combined = readFileSync(path);
    const corruptions = [Buffer.concat([combined, Buffer.from('// unrelated')])];
    for (const projection of Object.values(entry.projections)) {
      for (const change of projection.changes) if (change.after) {
        const corrupted = Buffer.from(combined.toString().replace(change.after, change.after + '// changed\n'));
        assert.notDeepEqual(corrupted, combined, 'real integration-hunk mutation');
        corruptions.push(corrupted);
      }
    }
    for (const corrupted of corruptions) {
      assert.equal(projectQuarrySiteSource(path, corrupted), corrupted, 'no normalization of corrupt input');
      assert.throws(() => beforeQuarryFloor(path, corrupted), /exact approved floor|current owner amendment/);
      assert.throws(() => beforeSiteArt(path, corrupted), /exact bounded Sunset rollout source/);
      assert.throws(() => beforeTimbersOwnerFeedback(path, corrupted), { code: 'ERR_ASSERTION' });
    }
  }
});

test('neither marker suppression nor trail kit dispatch can be removed by composition', () => {
  const path = 'src/world/renderer.ts', combined = readFileSync(path);
  for (const [from, to] of [
    ["level.id !== 'quarry' && level.id !== 'sunset' &&", "level.id !== 'quarry' &&"],
    ["level.id !== 'quarry' && level.id !== 'sunset' &&", "level.id !== 'sunset' &&"],
    ['drawSitePlatform(ctx, assets.siteTerrain, level, body, offset)', 'false'],
    ['drawQuarryRollout(ctx, assets.quarryRollout!, body, offset)', 'false'],
  ]) {
    const corrupted = Buffer.from(combined.toString().replace(from, to));
    assert.notDeepEqual(corrupted, combined);
    assert.throws(() => beforeQuarryOwnerRevision(path, corrupted), /current owner amendment/);
    assert.throws(() => beforeSiteArt(path, corrupted), /exact bounded Sunset rollout source/);
  }
});
