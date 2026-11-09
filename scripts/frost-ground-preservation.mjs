import { beforeFrostRollout } from './frost-ground-rollout-preservation.mjs';
import { beforeFrostSlimes } from './frost-slime-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/ground-ice-v1/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '21280764113190d453efde3a93fe3fc6a18b50c7301b9f24205b78b35786137a', 'sealed bounded Frost ground delta');
export const frostGroundRecord = JSON.parse(raw);
/** Only complete exact approved presentation bytes project to the accepted ten-ledge tip. */
export function beforeFrostGround(path, bytes) {
  bytes = beforeFrostRollout(path, bytes);
  bytes = beforeFrostSlimes(path, bytes);
  const entry = frostGroundRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  assert.equal(hash(Buffer.from(entry.after)), entry.currentSHA256);
  assert.ok(bytes.equals(Buffer.from(entry.after)), 'complete bounded Frost ground source');
  const before = Buffer.from(entry.before);
  assert.equal(hash(before), entry.beforeSHA256, 'complete accepted ten-ledge baseline');
  return before;
}

const boundRaw = readFileSync(new URL('../assets/source/frost/ground-ice-v1/implementation-bindings.json', import.meta.url));
assert.equal(hash(boundRaw), '9c8ff2704bf00b3a5709b523f60b0d8dc705e56fa701f98a9c8725f0e58af058', 'sealed bounded implementation identities');
export const frostGroundBindings = JSON.parse(boundRaw);
export function verifyFrostGroundFiles(read = readFileSync) {
  for (const [path, digest] of Object.entries(frostGroundBindings)) assert.equal(hash(beforeFrostRollout(path, read(new URL('../' + path, import.meta.url)))), digest, path + ': exact bounded source/asset bytes');
}
