import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeHudRibbon, hudRibbonRecord } from './hud-ribbon-preservation.mjs';
import { beforePlainsContour } from './plains-contour-preservation.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';
import { beforeFrostRollout } from './frost-ground-rollout-preservation.mjs';
import { beforeFrostTrial } from './frost-trial-preservation.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('projects only the complete shared ribbon and real observer deltas', () => {
  assert.deepEqual(Object.keys(hudRibbonRecord).sort(), ['src/game/hud.ts', 'tests/browser.spec.ts', 'tests/hud-owner-layout.spec.ts']);
  for (const [path, entry] of Object.entries(hudRibbonRecord)) {
    const bytes = readFileSync(path), prior = beforeHudRibbon(path, bytes);
    assert.equal(hash(bytes), entry.currentSHA256);
    assert.equal(hash(prior), entry.beforeSHA256);
    assert.equal(beforeHudRibbon(path, prior), prior);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('TRAIL_RIBBON', 'WRONG_RIBBON'))]) {
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeHudRibbon(path, bad), bad);
      assert.equal(beforeFrostTrial(path, bad), bad);
    }
  }
  for (const path of ['src/game/adventure-scene.ts', 'src/world/renderer.ts', 'public/assets/frost/manifest.json']) {
    const bytes = readFileSync(path); assert.equal(beforeHudRibbon(path, bytes), bytes);
  }
});

test('composed Plains consumer preserves unknown HUD and physics bytes while owner entry normalizes HUD', () => {
  const composed = (path, bytes) => beforePlainsContour(path, beforeSiteArt(path, bytes));
  for (const path of ['src/game/hud.ts', 'src/game/movement.ts']) {
    const bytes = readFileSync(path), bad = Buffer.concat([bytes, Buffer.from('\n// unrelated mutation')]);
    assert.equal(composed(path, bytes), bytes, 'unknown current path retains buffer identity');
    assert.equal(composed(path, bad), bad, 'unknown corrupted path retains buffer identity');
    assert.equal(beforeFrostTrial(path, bytes), bytes, 'Frost chain does not own these paths');
  }
  const path = 'src/game/hud.ts', bytes = readFileSync(path);
  const record = JSON.parse(readFileSync('assets/source/hud-owner-layout/presentation.json'));
  assert.equal(hash(beforeOwnerHud(path, bytes)), record.files[path].baselineSha256);
  assert.throws(() => beforeOwnerHud(path, Buffer.concat([bytes, Buffer.from(' ')])));
});

test('Frost rollout consumes exactly the two authorized ribbon observer migrations', () => {
  for (const path of ['tests/browser.spec.ts', 'tests/hud-owner-layout.spec.ts']) {
    const bytes = readFileSync(path), prior = beforeHudRibbon(path, bytes);
    assert.notDeepEqual(prior, bytes);
    assert.deepEqual(beforeFrostRollout(path, bytes), prior);
    const bad = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeFrostRollout(path, bad), bad);
  }
});
