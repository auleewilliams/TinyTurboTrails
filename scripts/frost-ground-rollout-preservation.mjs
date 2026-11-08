import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = readFileSync(new URL('../assets/source/frost/ground-rollout-v1/presentation-delta.json', import.meta.url));
assert.equal(hash(raw), '144c7a617f48a6cc23536f71b23755ab6d83dcb4c5b5a2c31aea7c93c027dea7', 'sealed full Frost ground rollout delta');
export const frostRolloutRecord = JSON.parse(raw);
/** Exact authorized presentation/test bytes project to 77 before immutable pilot guards. */
export function beforeFrostRollout(path, bytes) {
  const entry = frostRolloutRecord[path];
  if (!entry || hash(bytes) !== entry.currentSHA256) return bytes;
  assert.equal(hash(Buffer.from(entry.after)), entry.currentSHA256);
  assert.ok(bytes.equals(Buffer.from(entry.after)), 'complete full Frost rollout source');
  const prior = Buffer.from(entry.before);
  assert.equal(hash(prior), entry.beforeSHA256, 'independent 77 baseline identity');
  return prior;
}
