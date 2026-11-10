import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { beforeTouchPresentation } from './touch-presentation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';

test('touch instructions reverse exactly without accepting unrelated HUD or gameplay edits', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const record = JSON.parse(readFileSync(new URL('../assets/source/touch-controls/presentation.json', import.meta.url)));
  for (const [path, entry] of Object.entries(record.files)) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    const baseline = beforeTouchPresentation(path, bytes);
    assert.equal(hash(baseline), entry.baselineSha256);
    const unrelated = Buffer.concat([bytes, Buffer.from('\n// unrelated drift')]);
    assert.equal(beforeTouchPresentation(path, unrelated), unrelated);
    const instruction = entry.changes[0].after;
    const changed = Buffer.from(bytes.toString().replace(instruction, instruction + '// changed\n'));
    assert.equal(beforeTouchPresentation(path, changed), changed);
    if (path === 'src/game/hud.ts' || path === 'src/game/adventure-scene.ts') {
      assert.doesNotThrow(() => beforeOwnerHud(path, bytes));
      assert.throws(() => beforeOwnerHud(path, unrelated));
      assert.throws(() => beforeOwnerHud(path, changed));
    }
  }
});
