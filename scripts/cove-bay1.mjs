import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, removeEdgeKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';
export const bay1Hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function prepareBay1(bytes) {
  if (bay1Hash(bytes) !== '2602a27083566049e701104c27534d7426b7a601e8f37e0e4921aba460346d93') throw new Error('Changed bay1 source');
  const decoded = decodePng(bytes);
  if (decoded.width !== 1536 || decoded.height !== 1024) throw new Error('Changed bay1 dimensions');
  const keyed = removeEdgeKey(decoded).image;
  const raw = modeDownsample(keyed, { x: 208, y: 437, width: 1120, height: 240 }, 140, 30);
  const image = { ...raw, data: Uint8Array.from(raw.data) };
  const repairs = [];
  const defects = [];
  for (let y = 0; y < 30; y++) for (let x = 0; x < 140; x++) {
    let last = -1;
    for (let row = y; row < 30; row++) if (raw.data[(row * 140 + x) * 4 + 3]) last = row;
    if (last >= y && !raw.data[(y * 140 + x) * 4 + 3]) defects.push([x, y]);
  }
  if (JSON.stringify(defects) !== '[[0,0],[139,0]]') throw new Error('Unexpected bay1 cleanup set');
  for (const [x, y, donorX, donorY] of [[0, 0, 1, 0], [139, 0, 138, 0]]) {
    const at = (y * 140 + x) * 4, donorAt = (donorY * 140 + donorX) * 4;
    const before = [...raw.data.slice(at, at + 4)], after = [...raw.data.slice(donorAt, donorAt + 4)];
    if (before[3] !== 0 || after[3] !== 255) throw new Error('Invalid bay1 repair donor');
    image.data.set(after, at); repairs.push({ x, y, donorX, donorY, before, after });
  }
  const capBytes = readFileSync(new URL('../assets/source/cove/bay1-b-v1/caps.json', import.meta.url));
  if (bay1Hash(capBytes) !== '1d04bdf8b2562bc0faa75fb220eb582b3993a4a37a9b76135c53a4f84ea4132e') throw new Error('Changed bay1 caps');
  validateBay1Image(image, JSON.parse(capBytes));
  return { raw, image, repairs, png: encodePng(image) };
}

export function validateBay1Image(image, caps) {
  if (image.width !== 140 || image.height !== 30 || caps.length !== 140) throw new Error('Invalid bay1 shape');
  for (let x = 0; x < 140; x++) {
    if (image.data[x * 4 + 3] !== 255) throw new Error('Incomplete bay1 top');
    let bottom = -1;
    for (let y = 0; y < 30; y++) if (image.data[(y * 140 + x) * 4 + 3]) bottom = y;
    if (bottom >= caps[x]) throw new Error('Bay1 cap exceeded');
    for (let y = 0; y <= bottom; y++) if (image.data[(y * 140 + x) * 4 + 3] !== 255) throw new Error('Bay1 internal alpha hole');
  }
}
