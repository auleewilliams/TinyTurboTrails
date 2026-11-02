import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../docs/evidence/issue-241/main-integration/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '15a7f9825d0def087f7f73bf49e014bfe933034112845c38e10bcde5e27d3714', 'immutable main integration projections');
const record = JSON.parse(raw);

// Each historical oracle receives its original parent bytes only after the full
// merged file and every reversed hunk have matched these separate integration pins.
function project(name, path, bytes) {
  const entry = record.projections[name][path];
  if (!entry) return bytes;
  assert.equal(hash(bytes), entry.mergedSha256, `${path}: exact integrated presentation`);
  const lines = bytes.toString('utf8').split(/(?<=\n)/);
  for (const change of [...entry.changes].reverse()) {
    const count = change.after ? change.after.split(/(?<=\n)/).length : 0;
    assert.equal(lines.slice(change.afterLine, change.afterLine + count).join(''), change.after);
    lines.splice(change.afterLine, count, change.before);
  }
  const baseline = Buffer.from(lines.join(''));
  assert.equal(hash(baseline), entry.baselineSha256, `${path}: complete parent projection`);
  return baseline;
}
export const beforePlainsMerge = (path, bytes) => project('beforePlainsMerge', path, bytes);
export const beforeTimbersMerge = (path, bytes) => project('beforeTimbersMerge', path, bytes);
