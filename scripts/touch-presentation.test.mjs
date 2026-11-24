import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeTouchOverlay, beforeTouchPresentation } from './touch-presentation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';
import { beforeLetterFade } from './letter-fade-preservation.mjs';

test('touch instructions reverse exactly without accepting unrelated HUD or gameplay edits', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const record = JSON.parse(readFileSync(new URL('../assets/source/touch-controls/presentation.json', import.meta.url)));
  for (const [path, entry] of Object.entries(record.files)) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    const baseline = beforeTouchPresentation(path, bytes);
    assert.equal(hash(baseline), entry.baselineSha256);
    const unrelated = Buffer.concat([bytes, Buffer.from('\n// unrelated drift')]);
    assert.equal(beforeTouchPresentation(path, unrelated), unrelated);
    const overlay = JSON.parse(readFileSync(new URL('../assets/source/touch-controls/overlay-presentation.json', import.meta.url)));
    const instruction = (overlay.files[path] ?? entry).changes[0].after;
    const changed = Buffer.from(bytes.toString().replace(instruction, instruction + '// changed\n'));
    assert.equal(beforeTouchPresentation(path, changed), changed);
    if (path === 'src/game/hud.ts' || path === 'src/game/adventure-scene.ts') {
      assert.doesNotThrow(() => beforeOwnerHud(path, bytes));
      assert.throws(() => beforeOwnerHud(path, unrelated));
      assert.throws(() => beforeOwnerHud(path, changed));
    }
  }
});

test('overlay projects only exact complete files before the original tablet guards', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const overlay = JSON.parse(readFileSync(new URL('../assets/source/touch-controls/overlay-presentation.json', import.meta.url)));
  assert.equal(overlay.baselineRevision, 'ee0708f3fe4cad519b4143b7ef8379ccb9b35516');
  assert.deepEqual(Object.keys(overlay.files).sort(), ['src/core/viewport.ts', 'src/main.ts', 'src/style.css', 'tests/browser.spec.ts']);
  for (const [path, entry] of Object.entries(overlay.files)) {
    // Later sealed layers project first; this guard checks the shipped overlay bytes.
    const bytes = beforeLetterFade(path, readFileSync(new URL('../' + path, import.meta.url)));
    const prior = beforeTouchOverlay(path, bytes);
    assert.equal(hash(prior), entry.baselineSha256);
    assert.equal(beforeTouchOverlay(path, prior), prior);
    for (const change of entry.changes) {
      const bad = Buffer.from(bytes.toString().replace(change.after, change.after + '// adversarial drift\n'));
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeTouchOverlay(path, bad), bad);
      assert.equal(beforeTouchPresentation(path, bad), bad);
    }
    const unrelated = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeTouchPresentation(path, unrelated), unrelated);
    assert.deepEqual(beforeTouchPresentation(path, bytes), beforeTouchPresentation(path, prior));
  }
  const physics = readFileSync(new URL('../src/game/movement.ts', import.meta.url));
  assert.equal(beforeTouchOverlay('src/game/movement.ts', physics), physics);
});
