import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/ledge-trial-v1/extension/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '87b15eeefd8bb631a4e8fb8f45a66883c72ce2df9dba1b81bd98e45927dbcb75', 'sealed six-placement delta');
export const frostExtensionRecord = JSON.parse(raw);
/** Exact full-file presentation projection; corruption passes to historical guards unchanged. */
export function beforeFrostExtension(path, bytes) {
  const entry = frostExtensionRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  assert.equal(hash(Buffer.from(entry.after)), entry.currentSHA256);
  assert.ok(bytes.equals(Buffer.from(entry.after)), 'complete extension source');
  const prior = Buffer.from(entry.before);
  assert.equal(hash(prior), entry.beforeSHA256, 'independent complete accepted-four baseline');
  return prior;
}
