import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/slime-restoration-v1/gameplay-delta.json', import.meta.url));
assert.equal(hash(raw), '546260d63d4c9b53091a6f3c6a6ef4e5e560efc3e3450fa50cfca34b710deab8', 'sealed three-slime gameplay delta');
export const frostSlimeRecord = JSON.parse(raw);
const baseline = {
  'src/world/frost-ridge.ts': '05378e7a8e0523c735a74a65cfae8cdd300120782f5ea31fef8d39dcb205a4b2',
  'tests/sunset-pilot.ts': 'd7ae6f1c9dc271531713bd554dacd161db081bf24edd82823016220c92d15384',
};
assert.deepEqual(Object.keys(frostSlimeRecord).sort(), Object.keys(baseline).sort());
/** Exact restoration bytes alone project to f3c00bf; older presentation seals stay intact. */
export function beforeFrostSlimes(path, bytes) {
  const entry = frostSlimeRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  assert.ok(bytes.equals(Buffer.from(entry.after)), 'complete three-slime source');
  const before = Buffer.from(entry.before);
  assert.equal(hash(before), baseline[path], 'independent accepted f3c00bf source');
  assert.equal(entry.beforeSHA256, baseline[path]);
  return before;
}
