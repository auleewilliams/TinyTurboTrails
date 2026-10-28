import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../assets/source/cove/water-landing/', import.meta.url);
const record = JSON.parse(readFileSync(new URL('presentation.json', root)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** Reverse only recorded literal presentation deltas; immutable historical pins still check every baseline byte. */
export function beforeWaterLanding(path, bytes) {
  const entry = record.files[path];
  if (!entry) return bytes;
  assert.deepEqual(Object.keys(record.files).sort(), ['src/game/adventure-scene.ts', 'src/game/feedback.ts', 'src/game/gameplay-preview.ts']);
  assert.equal(record.baselineRevision, 'ca340905424b544ad83d9041112f6ecc4bda49be');
  const baseline = readFileSync(new URL(entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256);
  let expected = baseline.toString('utf8');
  for (const change of entry.changes) {
    assert.ok(change.before.length > 0, 'bounded nonempty original literal');
    assert.equal(expected.split(change.before).length, 2, 'unique original presentation literal');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(bytes.toString('utf8'), expected, `${path}: only exact presentation deltas`);
  assert.equal(hash(bytes), entry.currentSha256);
  return baseline;
}
