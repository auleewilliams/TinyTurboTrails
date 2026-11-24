import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeLetterFade } from './letter-fade-preservation.mjs';
import { beforeTouchPresentation } from './touch-presentation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';

test('letter fade projects only exact complete files before the touch and owner-HUD guards', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const record = JSON.parse(readFileSync(new URL('../assets/source/letter-fade/presentation.json', import.meta.url)));
  assert.equal(record.baselineRevision, 'e486e32a6982ced460b366cff40e96d840d21cf7');
  assert.deepEqual(Object.keys(record.files).sort(), ['src/game/adventure-scene.ts', 'src/game/hud.ts', 'tests/browser.spec.ts']);
  for (const [path, entry] of Object.entries(record.files)) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    const prior = beforeLetterFade(path, bytes);
    assert.equal(hash(prior), entry.baselineSha256);
    assert.equal(beforeLetterFade(path, prior), prior);
    assert.deepEqual(beforeTouchPresentation(path, bytes), beforeTouchPresentation(path, prior));
    if (path.startsWith('src/')) assert.doesNotThrow(() => beforeOwnerHud(path, bytes));
    for (const change of entry.changes) {
      const bad = Buffer.from(bytes.toString().replace(change.after, change.after + '// adversarial drift\n'));
      assert.notDeepEqual(bad, bytes);
      assert.equal(beforeLetterFade(path, bad), bad);
      if (path.startsWith('src/')) assert.throws(() => beforeOwnerHud(path, bad));
    }
    const unrelated = Buffer.concat([bytes, Buffer.from(' ')]);
    assert.equal(beforeLetterFade(path, unrelated), unrelated);
  }
  const physics = readFileSync(new URL('../src/game/movement.ts', import.meta.url));
  assert.equal(beforeLetterFade('src/game/movement.ts', physics), physics);
});
