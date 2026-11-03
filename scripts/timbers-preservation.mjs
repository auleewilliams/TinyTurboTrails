import { beforeTimbersTree } from './timbers-tree-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../assets/source/timbers/illustrated-v1/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reverse only the pinned Timbers preview deltas before historical Cove byte oracles. */
export function beforeTimbersPreview(path, bytes) {
  bytes = beforeTimbersTree(path, bytes);
  if (!['src/world/assets.ts', 'src/world/renderer.ts', 'public/assets/timbers/manifest.json'].includes(path)) return bytes;
  const recordBytes = readFileSync(new URL('presentation-delta.json', root));
  assert.equal(hash(recordBytes), '8ed91ea5dfe04fac5e3e716f42d21af0cc6439a6a79fe6928e8bb4dc30213495', 'pinned Timbers presentation changes');
  const record = JSON.parse(recordBytes), entry = record.files[path];
  assert.equal(record.baselineRevision, '885b6c16d5397e061f1ccb40ca326856bc77db88');
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/timbers/manifest.json', 'src/world/assets.ts', 'src/world/renderer.ts']);
  const baseline = readFileSync(new URL(entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256);
  let expected = baseline.toString();
  for (const change of entry.changes) {
    assert.ok(change.before.length > 0);
    assert.equal(expected.split(change.before).length, 2, 'unique Timbers change');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(hash(Buffer.from(expected)), entry.currentSha256);
  assert.equal(bytes.toString(), expected, 'only exact approved Timbers presentation changes');
  return baseline;
}
