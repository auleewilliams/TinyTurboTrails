import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeHudRibbon, hudRibbonRecord, beforeHudFixture, hudFixtureRecord } from './hud-ribbon-preservation.mjs';
import { beforePlainsContour } from './plains-contour-preservation.mjs';
import { beforeSiteArt } from './site-art-preservation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';
import { beforeFrostRollout } from './frost-ground-rollout-preservation.mjs';
import { beforeFrostTrial } from './frost-trial-preservation.mjs';
import { beforeTouchPresentation } from './touch-presentation.mjs';
// Historical ribbon oracles receive exact current-main bytes after the newer tablet layer.
const readBeforeTouch = path => beforeTouchPresentation(path, readFileSync(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('projects only the complete shared ribbon and real observer deltas', () => {
  assert.deepEqual(Object.keys(hudRibbonRecord).sort(), ['src/game/hud.ts', 'tests/browser.spec.ts', 'tests/hud-owner-layout.spec.ts']);
  for (const [path, entry] of Object.entries(hudRibbonRecord)) {
    const bytes = readBeforeTouch(path), prior = beforeHudRibbon(path, bytes);
    assert.equal(hash(beforeHudFixture(path, bytes)), entry.currentSHA256);
    assert.equal(hash(prior), entry.beforeSHA256);
    assert.equal(beforeHudRibbon(path, prior), prior);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('TRAIL_RIBBON', 'WRONG_RIBBON'))]) {
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeHudRibbon(path, bad), bad);
      assert.equal(beforeFrostTrial(path, bad), bad);
    }
  }
  for (const path of ['src/game/adventure-scene.ts', 'src/world/renderer.ts', 'public/assets/frost/manifest.json']) {
    const bytes = readBeforeTouch(path); assert.equal(beforeHudRibbon(path, bytes), bytes);
  }
});

test('composed Plains consumer preserves unknown HUD and physics bytes while owner entry normalizes HUD', () => {
  const composed = (path, bytes) => beforePlainsContour(path, beforeSiteArt(path, bytes));
  for (const path of ['src/game/hud.ts', 'src/game/movement.ts']) {
    const bytes = readBeforeTouch(path), bad = Buffer.concat([bytes, Buffer.from('\n// unrelated mutation')]);
    assert.equal(composed(path, bytes), bytes, 'unknown current path retains buffer identity');
    assert.equal(composed(path, bad), bad, 'unknown corrupted path retains buffer identity');
    assert.equal(beforeFrostTrial(path, bytes), bytes, 'Frost chain does not own these paths');
  }
  const path = 'src/game/hud.ts', bytes = readBeforeTouch(path);
  const record = JSON.parse(readFileSync('assets/source/hud-owner-layout/presentation.json'));
  assert.equal(hash(beforeOwnerHud(path, bytes)), record.files[path].baselineSha256);
  assert.throws(() => beforeOwnerHud(path, Buffer.concat([bytes, Buffer.from(' ')])));
});

test('Frost rollout consumes exactly the two authorized ribbon observer migrations', () => {
  for (const path of ['tests/browser.spec.ts', 'tests/hud-owner-layout.spec.ts']) {
    const bytes = readBeforeTouch(path), prior = beforeHudRibbon(path, bytes);
    assert.notDeepEqual(prior, bytes);
    assert.deepEqual(beforeFrostRollout(path, bytes), prior);
    const bad = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeFrostRollout(path, bad), bad);
  }
});

test('fixture correction composes only exact browser bytes before the sealed ribbon and Frost observer guards', () => {
  assert.deepEqual(Object.keys(hudFixtureRecord.files), ['tests/browser.spec.ts']);
  const path = 'tests/browser.spec.ts', bytes = readBeforeTouch(path);
  const entry = hudFixtureRecord.files[path], prior = beforeHudFixture(path, bytes);
  assert.equal(hash(bytes), entry.currentSHA256);
  assert.equal(hash(prior), entry.beforeSHA256);
  assert.equal(entry.beforeSHA256, hudRibbonRecord[path].currentSHA256);
  assert.equal(hash(beforeHudRibbon(path, bytes)), hudRibbonRecord[path].beforeSHA256);
  assert.deepEqual(beforeFrostRollout(path, bytes), beforeHudRibbon(path, bytes));
  assert.equal(beforeHudFixture(path, prior), prior);
  for (const [file, digest] of Object.entries(hudFixtureRecord.coverageBindings)) {
    assert.equal(hash(readBeforeTouch(file)), digest, file + ': actual predicate and CPU caller coverage');
  }
  for (const bad of [
    Buffer.concat([bytes, Buffer.from('\n// unrelated mutation')]),
    Buffer.from(bytes.toString().replace('hudFixtureRectanglesOverlap(sample.henryRect, TRAIL_RIBBON)', 'true')),
    Buffer.from(bytes.toString().replace('toBeGreaterThan(59)', 'toBeGreaterThan(58)')),
    Buffer.from(bytes.toString().replace('expect(bandHenry.right)', 'expect(bandHenry.top)')),
  ]) {
    assert.notDeepEqual(bad, bytes);
    assert.equal(beforeHudFixture(path, bad), bad);
    assert.equal(beforeHudRibbon(path, bad), bad);
    assert.equal(beforeFrostRollout(path, bad), bad);
    assert.notEqual(hash(beforeFrostRollout(path, bad)), hudRibbonRecord[path].beforeSHA256);
  }
  for (const file of ['src/game/hud.ts', 'src/game/movement.ts', 'tests/hud-owner-layout.spec.ts', 'tests/hud-fixture-geometry.ts']) {
    const original = readBeforeTouch(file), corrupt = Buffer.concat([original, Buffer.from(' ')]);
    assert.equal(beforeHudFixture(file, original), original);
    assert.equal(beforeHudFixture(file, corrupt), corrupt);
  }
});
