import { beforeFrostExtension } from './frost-extension-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/ledge-trial-v1/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '4ec92271e57ccaa88f5b8928019d3e8d096b38e0e7b950f036b585d6affe08ae', 'sealed Frost trial delta');
const record = JSON.parse(raw);
// Hash is sealed after the bounded four-file implementation; historical pins stay unchanged.
export const frostTrialRecord = record;
export function projectFrostTrial(path, bytes) {
  bytes = beforeFrostExtension(path, bytes);
  const entry = record[path];
  if (!entry) return bytes;
  assert.equal(hash(bytes), entry.currentSHA256, `${path}: exact Frost trial delta only`);
  let text = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.ok(change.before.length && change.after.length, 'bounded nonempty hunk');
    assert.equal(text.split(change.after).length, 2, 'unique Frost trial hunk');
    text = text.replace(change.after, change.before);
  }
  const baseline = Buffer.from(text);
  assert.equal(hash(baseline), entry.beforeSHA256, 'complete original Frost trial baseline');
  return baseline;
}
/** Historical inputs remain subject to their original guards. Only exact current bytes project. */
export function beforeFrostTrial(path, bytes) {
  bytes = beforeFrostExtension(path, bytes);
  return record[path] && hash(bytes) === record[path].currentSHA256 ? projectFrostTrial(path, bytes) : bytes;
}
