import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePng, removeEdgeKey } from './spelling-stickers.mjs';

// Reproduce only the immutable owner-authorized A preparation, not B or art repair.
const base = new URL('../assets/source/plains/contour-prototype-v1/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = readFileSync(new URL('original-A-R1.png', base));
if (hash(source) !== '39235164f53d441cac0d25a95a87e0409a8547d1df82b8a1d66b8ac0ceb7e212') throw new Error('A original source changed');
const { image } = removeEdgeKey(decodePng(source));
const native = Buffer.alloc(80 * 16 * 4);
for (let y = 0; y < 16; y++) for (let x = 0; x < 80; x++) {
  const sx = Math.floor(51 + (x + 0.5) * 14.4), sy = Math.floor(558 + (y + 0.5) * 14.4);
  native.set(image.data.subarray((sy * image.width + sx) * 4, (sy * image.width + sx) * 4 + 4), (y * 80 + x) * 4);
}
const target = (1 * 80 + 43) * 4, donor = (2 * 80 + 43) * 4;
if (!native.subarray(target, target + 4).equals(Buffer.from([135, 113, 144, 255]))
  || !native.subarray(donor, donor + 4).equals(Buffer.from([108, 207, 4, 255]))) throw new Error('A repair witness changed');
native.set(native.subarray(donor, donor + 4), target);
const canonical = readFileSync(new URL('prepared-master.png', base));
if (hash(canonical) !== '618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654') throw new Error('A canonical PNG changed');
const decoded = decodePng(canonical);
if (decoded.width !== 80 || decoded.height !== 16 || !native.equals(Buffer.from(decoded.data))) throw new Error('A reproduced RGBA differs');
// Keep the exact approved PNG encoding as well as its reproduced RGBA; no new pixel edits.
const destination = new URL('../public/assets/plains/contour-prototype-v1/', import.meta.url);
mkdirSync(destination, { recursive: true });
writeFileSync(new URL('grass.png', destination), canonical);
console.log(JSON.stringify({ pngSha256: hash(canonical), rgbaSha256: hash(native), dimensions: [80, 16], repairs: 1 }));
