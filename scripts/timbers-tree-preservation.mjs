import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../assets/source/timbers/tree-v1/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reverse only the exact separately authorized tree addition, retaining the older preview oracle. */
export function beforeTimbersTree(path, bytes) {
  if (!['src/world/assets.ts', 'src/world/renderer.ts', 'public/assets/timbers/manifest.json'].includes(path)) return bytes;
  const recordBytes = readFileSync(new URL('presentation-delta.json', root));
  assert.equal(hash(recordBytes), 'fcbc0dc4709721ac5159a0fb5b7b69a1b3e4ed17bc386c2912ae20931a2ed1ec', 'pinned Timbers tree changes');
  const record = JSON.parse(recordBytes);
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/timbers/manifest.json', 'src/world/assets.ts', 'src/world/renderer.ts']);
  const entry = record.files[path], baseline = readFileSync(new URL(entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256);
  let expected = baseline.toString();
  for (const change of entry.changes) {
    assert.ok(change.before.length > 0);
    assert.equal(expected.split(change.before).length, 2, 'unique tree change');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(hash(Buffer.from(expected)), entry.currentSha256);
  assert.equal(bytes.toString(), expected, 'only exact authorized tree changes');
  return baseline;
}
