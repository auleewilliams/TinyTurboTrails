import { projectQuarrySiteSource } from './quarry-site-integration.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../docs/evidence/issue-240/owner-revision1/amendment.json', import.meta.url));
assert.equal(hash(raw), 'dae2736f1159cccf76c09166c54ffff750dd743b34cbdd38cd38010da1e76ecb', 'sealed current Quarry owner amendment');
const record = JSON.parse(raw);
/** Reverse only the exact owner delta. Historical byte identities remain independent oracles. */
export function beforeQuarryOwnerRevision(path, bytes) {
  bytes = projectQuarrySiteSource(path, bytes, 'quarry');
  const entry = record.files[path];
  if (!entry) return bytes;
  const digest = hash(bytes);
  if (digest === entry.priorSHA256 || entry.historicalSHA256.includes(digest)) return bytes;
  assert.equal(digest, entry.currentSHA256, path + ': exact approved floor / owner feedback / frozen Quarry world / current owner amendment');
  const text = bytes.toString('utf8');
  assert.equal(text.slice(entry.offset, entry.offset + entry.after.length), entry.after, 'exact amendment hunk');
  const prior = Buffer.from(text.slice(0, entry.offset) + entry.before + text.slice(entry.offset + entry.after.length));
  assert.equal(hash(prior), entry.priorSHA256, 'complete pre-amendment identity');
  return prior;
}
