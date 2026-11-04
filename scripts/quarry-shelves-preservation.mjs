import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const root = new URL('../assets/source/quarry/whole-ledges-v1/', import.meta.url);
const raw = readFileSync(new URL('presentation-delta.json', root));
assert.equal(hash(raw), '54bdcd2d7ac9191ac23c255d3b16fd98b74ba71068d7f43b9d16f4683ba8334f', 'exact Quarry pilot source delta');
const record = JSON.parse(raw);
/** Reverse only the exact four-shelf presentation addition before immutable accepted layers. */
export function beforeQuarryShelves(path, bytes) {
  const entry = record.files[path]; if (!entry) return bytes;
  if (hash(bytes) === entry.baselineSha256) return bytes;
  assert.equal(hash(bytes), entry.currentSha256, `${path}: only the exact Quarry pilot source delta`);
  const baseline = readFileSync(new URL('baseline/' + entry.baselineCopy, root));
  assert.equal(hash(baseline), entry.baselineSha256); return baseline;
}
