import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** HISTORICAL rejectedphase17 oracle, not activeassetpreparation. Reverse ONLY this exact bay2 presentation delta before immutable old oracles. */
export function beforeBay2(path, bytes) {
  if (path !== 'src/world/cove-terrain.ts') return bytes;
  const root = new URL('../assets/source/cove/rejected-bay2-mask-v1/', import.meta.url);
  const recordBytes = readFileSync(new URL('presentation-delta.json', root));
  assert.equal(hash(recordBytes), '86acd72ece5603f9b75b0bc8013706cebc4b5bf49223fe4546d2c455355a114a');
  const r = JSON.parse(recordBytes), baseline = readFileSync(new URL('baseline/cove-terrain.ts', root));
  assert.equal(r.path, path); assert.equal(r.baselineRevision, 'd82ec2ac37a7004650db8a6154df196da0d9af34');
  assert.equal(hash(baseline), r.baselineSha256); let expected = baseline.toString();
  for (const c of r.changes) { assert.ok(c.before.length && expected.split(c.before).length === 2); expected = expected.replace(c.before, c.after); }
  assert.equal(hash(Buffer.from(expected)), r.currentSha256);
  assert.equal(bytes.toString(), expected, 'only exact bay2 presentation delta'); return baseline;
}
