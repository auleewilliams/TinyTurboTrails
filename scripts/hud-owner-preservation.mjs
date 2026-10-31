import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../assets/source/hud-owner-layout/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** Reverse only the two exact owner-HUD deltas before existing immutable oracles. */
export function beforeOwnerHud(path, bytes) {
  if (path !== 'src/game/hud.ts' && path !== 'src/game/adventure-scene.ts') return bytes;
  const recordBytes = readFileSync(new URL('presentation.json', root));
  assert.equal(hash(recordBytes), 'b2108a895522dd9b537f9499e298fb53d3d16b8464d2072335a432ea0306b467', 'pinned owner-HUD presentation record');
  const record = JSON.parse(recordBytes);
  assert.equal(record.baselineRevision, 'be0e8ec6d42826c6c61f064f01422bd33e0ded43');
  assert.deepEqual(Object.keys(record.files).sort(), ['src/game/adventure-scene.ts', 'src/game/hud.ts']);
  const entry = record.files[path], baseline = readFileSync(new URL(entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256);
  let expected = baseline.toString();
  for (const change of entry.changes) {
    assert.ok(change.before.length > 0, 'nonempty original literal');
    assert.equal(expected.split(change.before).length, 2, 'unique original literal');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(hash(Buffer.from(expected)), entry.currentSha256);
  assert.equal(bytes.toString(), expected, `${path}: only exact owner-HUD presentation deltas`);
  return baseline;
}
