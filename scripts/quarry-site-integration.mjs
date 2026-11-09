import { beforeFrostTrial } from './frost-trial-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/quarry/sunset-main-sync-v1/receipt.json', import.meta.url));
assert.equal(hash(raw), '6cee2c638afc8586f0a0e0c8d459470c86c35f8e9cc3175b6e045e78d4d9ee1c', 'sealed Quarry/Sunset integration receipt');
const record = JSON.parse(raw);
const pins = {
  "src/world/assets.ts": {
    "quarry": "e56ea56c04c1a2eef6404f6df8b1ee24c767df7b8114bdb0fb457fde139fe439",
    "sunset": "4bb004320b2af13ee15001b98564dfc70c92e351c61b24c7feef677bf00c9b1b",
    "shared": "168788660f680f8ceab6837fc465c80bc84d241527d35107a0dff770288f5e9a"
  },
  "src/world/renderer.ts": {
    "quarry": "0d829f43631ee468f0ecf2d01d3ebb5529d55fa823d266655e233bcc9ca40369",
    "sunset": "0bba8709945de30f18e5335881d84d222995866d9db645a8333b5a79ac7c83a1",
    "shared": "8c47f5ff878c9928f063cc150e711b582f027e135684f01e2fbaab308eed9a28"
  }
};
assert.deepEqual(Object.keys(record.files).sort(), Object.keys(pins).sort());

/** The only new accepted input is the exact combined file. Every historical
 * input/corruption passes unchanged to its original guard, with its original pins.
 * Reconstruct the combined file independently from each accepted whole-file copy
 * and its bounded hunks before returning that historical side.
 */
export function projectQuarrySiteSource(path, bytes, side = 'quarry', read = readFileSync) {
  bytes = beforeFrostTrial(path, bytes);
  const entry = record.files[path];
  if (!entry) return bytes;
  assert.ok(['quarry', 'sunset', 'shared'].includes(side), 'known integration projection');
  if (hash(bytes) !== entry.combinedSha256) return bytes;
  const projection = entry.projections[side];
  assert.equal(projection.sha256, pins[path][side], 'independent accepted side pin');
  const baseline = read(new URL('../' + projection.copy, import.meta.url));
  assert.equal(hash(baseline), pins[path][side], 'complete accepted integration side');
  let combined = baseline;
  for (const change of [...projection.changes].reverse()) {
    const before = Buffer.from(change.before), after = Buffer.from(change.after);
    assert.ok(Number.isInteger(change.offset) && change.offset >= 0 && change.offset + before.length <= combined.length, 'bounded integration hunk');
    assert.ok(combined.subarray(change.offset, change.offset + before.length).equals(before), 'exact integration hunk');
    combined = Buffer.concat([combined.subarray(0, change.offset), after, combined.subarray(change.offset + before.length)]);
  }
  assert.equal(hash(combined), entry.combinedSha256, 'independent complete combined source');
  assert.ok(combined.equals(bytes), 'only recorded Quarry/Sunset composition');
  return baseline;
}

/** Historical Timbers guards already accept this exact pre-campaign source. */
export function isSharedArtBaseline(path, bytes) {
  return Boolean(pins[path] && hash(bytes) === pins[path].shared);
}
