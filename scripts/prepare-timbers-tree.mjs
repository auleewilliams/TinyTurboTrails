import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, wholeImageAtHeight, alphaBounds } from './timbers-art.mjs';

const source = 'assets/source/timbers/tree-v1/';
const output = process.argv[2] ?? 'public/assets/timbers/tree-v1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = readFileSync(source + 't-02-original.png');
const image = decodePng(original), native = wholeImageAtHeight(image, 960);
if (image.width !== 971 || image.height !== 1620 || native.width !== 576) throw new Error('Changed tree source or uniform preparation');
// This measures the substantial foot, not a transparency key or an image edit.
const baseRow = 939, baseLeft = 277, baseRight = 487, basePlane = baseRow + 1;
for (let x = baseLeft; x < baseRight; x++) {
  if (native.data[(baseRow * native.width + x) * 4 + 3] < 128) throw new Error('Tree no longer has its broad grounded base');
}
const png = encodePng(native);
const manifest = { version: 1, image: 'tree.png', width: native.width, height: native.height,
  x: 32, y: 1080 - basePlane, groundY: 1080, basePlane, baseLeft, baseRight };
const terrain = 'public/assets/timbers/terrain-kit-v1/';
const record = { source: { image: 't-02-original.png', sha256: hash(original), width: image.width, height: image.height },
  uniformScale: [960, 1620], method: 'Whole-image integer-weight premultiplied box filtering on both axes. Ceil padding only; no crop, alpha key/threshold, tint, repair, mask, or axis-only scale.',
  native: { image: 'tree.png', width: native.width, height: native.height, pngSha256: hash(png), pixelSha256: hash(native.data), alphaBounds: alphaBounds(native) },
  grounding: { alphaAtLeast: 128, baseRow, baseLeft, baseRight, contiguousPixels: baseRight - baseLeft, worldPlane: 1080,
    note: 'Align the entire 210px substantial base to the real ground. The faint native fringe beneath it remains in the bitmap and is occluded by the existing foreground ground layer.' },
  preservedTerrainFiles: Object.fromEntries(readdirSync(terrain).sort().map(name => [terrain + name, hash(readFileSync(terrain + name))])) };
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/tree.png`, png);
writeFileSync(`${output}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(`${output}/preparation.json`, JSON.stringify(record, null, 2) + '\n');
console.log(`Prepared one whole ${native.width}x${native.height} Timbers tree in ${output}`);
