import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, wholeImageAtHeight } from './timbers-art.mjs';

// This new task's preparation entry is check-only: preserve the already accepted PNG bytes.
assert.equal(process.execPath, '/usr/bin/node', 'canonical PNG producer executable');
assert.equal(process.version, 'v22.22.1', 'canonical PNG producer Node');
assert.equal(process.versions.zlib, '1.3.1', 'canonical PNG producer codec');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = new URL('../assets/source/frost/ground-ice-v1/', import.meta.url);
const prepared = [];
for (const [role, raw, height, sourceHash, pngHash, rgbaHash] of [
  ['terrain', 'Terrain1-raw.png', 440, '7e4a1c06801dbf49cd8b18e338df0dca6952e52b7232b4d9e880cdfca7f2420c', 'f6ba00cfa6ca8d4040e00fe44fd5e2510f292375a7794ff07e74632bd2cea9ab', '7379c999ee4db35b3e7f2cd320ed3944928288aa6d6e7f4119894acccbe899ee'],
  ['ice', 'Ice1-raw.png', 8, '28068fc63a0c736e46e993867c356500e509a8d89d4b60ca93934f56437be4f2', '5e849141b1af83a288f7d1a4298815cc381df3b57be8a6c73dbde9d7e96e8864', 'dfe69e31908d459e67cc0fcf3d5c416de80151207cb8222b32741a49e648d7e5'],
]) {
  const source = readFileSync(new URL(raw, root)); assert.equal(hash(source), sourceHash);
  const image = decodePng(source); assert.equal(image.width, 1254); assert.equal(image.height, 1254);
  const result = wholeImageAtHeight(image, height);
  const png = encodePng(result);
  assert.equal(hash(result.data), rgbaHash); assert.equal(hash(png), pngHash);
  assert.deepEqual(png, readFileSync(new URL(`${role}.png`, root)));
  assert.deepEqual(png, readFileSync(new URL(`../public/assets/frost/ground-ice-v1/${role}.png`, import.meta.url)));
  prepared.push({ role, sourceHash, pngHash, rgbaHash, width: result.width, height: result.height });
}
console.log(JSON.stringify({ executable: process.execPath, node: process.version, zlib: process.versions.zlib, prepared }, null, 2));
