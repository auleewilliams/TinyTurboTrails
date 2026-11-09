import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/checkpoint-grounding-v1/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), 'b109b89f3a54e718a2bdfc8aa52bc526b274b7ee100ca87b13afe9e7724c7bf1', 'sealed checkpoint-only grounding delta');
export const frostCheckpointRecord = JSON.parse(raw);
/** Only exact checkpoint anchor/attached-overlay bytes project before historical guards.
 * Atlas artwork, geometry, other anchors and all historical pins remain independent. */
export function beforeFrostCheckpoints(path, bytes) {
  const entry = frostCheckpointRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  let text = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.equal(text.split(change.after).length, 2, 'unique checkpoint presentation hunk');
    text = text.replace(change.after, change.before);
  }
  const prior = Buffer.from(text);
  assert.equal(hash(prior), entry.beforeSHA256, 'complete pre-checkpoint-fix source');
  return prior;
}
