import { beforePlainsMerge } from './timbers-plains-integration.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../assets/source/timbers/rollout-v1/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reverse only the complete mapping and required-declaration guard before older byte oracles. */
export function beforeTimbersRollout(path, bytes) {
  bytes = beforePlainsMerge(path, bytes);
  if (!['src/world/assets.ts', 'public/assets/timbers/terrain-kit-v1/manifest.json'].includes(path)) return bytes;
  const recordBytes = readFileSync(new URL('presentation-delta.json', root));
  assert.equal(hash(recordBytes), '90b0d575e1c5476d0636e3fcec35a2a989df932c20626323bcd86ef6025d1d26', 'pinned Timbers rollout changes');
  const record = JSON.parse(recordBytes), entry = record.files[path];
  assert.deepEqual(Object.keys(record.files).sort(), ['public/assets/timbers/terrain-kit-v1/manifest.json', 'src/world/assets.ts']);
  const baseline = readFileSync(new URL(entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256);
  let expected = baseline.toString();
  for (const change of entry.changes) {
    assert.ok(change.before.length > 0);
    assert.equal(expected.split(change.before).length, 2, 'unique rollout change');
    expected = expected.replace(change.before, change.after);
  }
  assert.equal(hash(Buffer.from(expected)), entry.currentSha256);
  assert.equal(bytes.toString(), expected, 'only exact authorized rollout changes');
  return baseline;
}
