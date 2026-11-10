import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const recordBytes = readFileSync(new URL('../assets/source/touch-controls/presentation.json', import.meta.url));
assert.equal(hash(recordBytes), '5c8a012e1e8f29a2d90d86f3dde9138b3d2a72f462f2fcc333879543aacceb89', 'pinned tablet control delta');
const record = JSON.parse(recordBytes);

/** Only exact new feature bytes project; corrupt/old input reaches the original oracle unchanged. */
export function beforeTouchPresentation(path, bytes) {
  const entry = record.files[path];
  if (!entry || hash(bytes) !== entry.currentSha256) return bytes;
  let source = bytes.toString();
  for (const change of [...entry.changes].reverse()) {
    assert.ok(change.after.length > 0, 'nonempty touch instruction');
    assert.equal(source.split(change.after).length, 2, 'unique exact touch instruction');
    source = source.replace(change.after, change.before);
  }
  const baseline = Buffer.from(source);
  assert.equal(hash(baseline), entry.baselineSha256, 'complete pre-tablet identity');
  return baseline;
}
