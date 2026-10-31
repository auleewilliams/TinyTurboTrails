import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bay1Hash } from './cove-bay1.mjs';
const root = new URL('../assets/source/cove/bay1-b-v1/', import.meta.url);
export function beforeBay1(path, bytes) {
  if (path !== 'src/world/cove-terrain.ts') return bytes;
  const recordBytes = readFileSync(new URL('presentation-delta.json', root));
  assert.equal(bay1Hash(recordBytes), '0ffd41beb9cce6807625a8cdff1b25059c3d26cbcbd629665a63e449de8d81a5', 'immutable exact presentation record');
  const record = JSON.parse(recordBytes);
  const baseline = readFileSync(new URL('baseline/cove-terrain.ts', root));
  assert.equal(record.baselineRevision, 'be0e8ec6d42826c6c61f064f01422bd33e0ded43');
  assert.equal(record.path, path);
  assert.equal(bay1Hash(baseline), record.baselineSha256);
  let expected = baseline.toString();
  for (const change of record.changes) {
    assert.ok(change.before.length && expected.split(change.before).length === 2, 'exact unique presentation delta');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(bay1Hash(Buffer.from(expected)), record.currentSha256);
  assert.equal(bytes.toString(), expected, 'only exact bay1 presentation changes permitted');
  return baseline;
}
