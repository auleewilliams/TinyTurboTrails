import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const recordBytes = readFileSync(new URL('../assets/source/letter-fade/presentation.json', import.meta.url));
assert.equal(hash(recordBytes), '010f3a96dc381101ab164bf4ed03fb33145ab690f4b42118a972e55f4363be90', 'pinned reduced-motion letter fade delta');
const record = JSON.parse(recordBytes);

/** Only the exact reduced-motion pickup fade projects; any other drift reaches older guards unchanged. */
export function beforeLetterFade(path, bytes) {
  const entry = record.files[path];
  if (!entry || hash(bytes) !== entry.currentSha256) return bytes;
  let source = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.ok(change.after.length > 0, 'nonempty letter fade hunk');
    assert.equal(source.split(change.after).length, 2, 'unique exact letter fade hunk');
    source = source.replace(change.after, change.before);
  }
  const baseline = Buffer.from(source);
  assert.equal(hash(baseline), entry.baselineSha256, 'complete shipped touch-overlay identity');
  return baseline;
}
