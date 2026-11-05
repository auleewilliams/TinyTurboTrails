import { beforeQuarryFloor } from './quarry-floor-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const root = new URL('../assets/source/quarry/rollout-v1/', import.meta.url);
const raw = readFileSync(new URL('presentation-delta.json', root));
assert.equal(hash(raw), '534f1c8a3ee3afcc7c38368d95f6e9ccce0b6219771f4a6a8943efd3675af7f5', 'sealed additive rollout delta');
const record = JSON.parse(raw);
export function beforeQuarryRollout(path, bytes) {
  const p = record.files[path]; if (!p || hash(bytes) === p.baselineSHA256) return bytes;
  bytes = beforeQuarryFloor(path, bytes);
  assert.equal(hash(bytes), p.currentSHA256, path + ': exact representative rollout delta');
  const baseline = readFileSync(new URL('baseline/' + p.baselineCopy, root));
  assert.equal(hash(baseline), p.baselineSHA256); return baseline;
}
