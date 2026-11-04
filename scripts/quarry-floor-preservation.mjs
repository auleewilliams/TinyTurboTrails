import { beforeQuarryOwnerRevision } from './quarry-owner-revision-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const root = new URL('../assets/source/quarry/floor-v1/', import.meta.url);
const raw = readFileSync(new URL('presentation-delta.json', root));
assert.equal(hash(raw), '1e78d7e014f521647a0e9f5d28a46421cad16fce4da925c19e8fcf1d237965e1', 'sealed approved floor delta');
const record = JSON.parse(raw);
export function beforeQuarryFloor(path, bytes) {
  bytes = beforeQuarryOwnerRevision(path, bytes);
  const p = record.files[path]; if (!p || hash(bytes) === p.baselineSHA256) return bytes;
  assert.equal(hash(bytes), p.currentSHA256, path + ': exact approved floor delta');
  const baseline = readFileSync(new URL('baseline/' + p.baselineCopy, root));
  assert.equal(hash(baseline), p.baselineSHA256); return baseline;
}
