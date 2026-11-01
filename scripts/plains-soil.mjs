import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { decodePng } from './spelling-stickers.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function preparePlainsSoil(bytes) {
  assert.equal(hash(bytes), '0a30534d856f27481646d024593114b5d76c41415205d149e6f8330805cf75f2', 'C2 immutable source changed');
  const source = decodePng(bytes); assert.deepEqual([source.width, source.height], [1254, 1254]);
  const data = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const sx = Math.floor((x + 0.5) * 1254 / 64), sy = Math.floor((y + 0.5) * 1254 / 64);
    data.set(source.data.subarray((sy * 1254 + sx) * 4, (sy * 1254 + sx) * 4 + 4), (y * 64 + x) * 4);
  }
  assert.equal(hash(data), '9107d72ea692c52ab641d4b51c32807a58cc0049eb0614c17197ba0f18f61ada', 'C2 prepared pixels changed');
  return { width: 64, height: 64, data };
}
export function verifyPlainsSoil(sourceBytes, canonical) {
  const native = preparePlainsSoil(sourceBytes), decoded = decodePng(canonical);
  assert.equal(hash(canonical), '57aa4e04a67ec0a79c26a14b4c6a8baf63dbf06fed84e35a09204c3a4e064c85', 'C2 canonical PNG changed');
  assert.deepEqual([decoded.width, decoded.height], [64, 64]);
  assert.deepEqual(decoded.data, native.data, 'C2 canonical RGBA changed'); return native;
}
