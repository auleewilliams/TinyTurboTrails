import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../docs/evidence/issue-241/owner-feedback/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '219a40d2e12eac2fd1c1afb1a6fd5b5e13b563721cfd77326c8bbf2065bbf6e9');
const record = JSON.parse(raw);

// Keep earlier art-only approvals immutable. Reverse precisely the subsequently
// requested marker removal and eleven new entities before historical byte oracles.
export function beforeTimbersOwnerFeedback(path, bytes) {
  const entry = record.files[path];
  if (!entry) return bytes;
  assert.equal(hash(bytes), entry.currentSha256, `${path}: exact owner feedback changes`);
  const lines = bytes.toString('utf8').split(/(?<=\n)/);
  for (const change of [...entry.changes].reverse()) {
    const count = change.after ? change.after.split(/(?<=\n)/).length : 0;
    assert.equal(lines.slice(change.afterLine, change.afterLine + count).join(''), change.after);
    lines.splice(change.afterLine, count, change.before);
  }
  const baseline = Buffer.from(lines.join(''));
  assert.equal(hash(baseline), entry.baselineSha256, `${path}: exact pre-feedback source`);
  return baseline;
}
