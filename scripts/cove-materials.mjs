import { createHash } from 'node:crypto';
import { decodePng, encodePng, removeEdgeKey, isChromaKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';

/** Only generated RGB is sampled. Feathering changes alpha, never paints a seam. */
export function prepareCoveMaterials(bytes, record) {
  const hash = data => createHash('sha256').update(data).digest('hex');
  if (hash(bytes) !== record.source.sha256) throw new Error('Changed Cove material source');
  const decoded = decodePng(bytes);
  if (decoded.width !== record.source.width || decoded.height !== record.source.height) throw new Error('Invalid material source dimensions');
  const { image: source, removed } = removeEdgeKey(decoded);
  const image = { width: 512, height: 160, data: new Uint8Array(512 * 160 * 4) };
  const pixels = (im, x, y) => im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4);
  const parts = {}, pieces = {};
  const positions = { 'water-left': [0, 0], 'water-repeat': [16, 0], 'water-right': [72, 0], 'water-ripples': [16, 16], 'sand-left': [0, 32], 'sand-repeat': [16, 32], 'sand-right': [48, 32] };
  function put(im, x, y) {
    if (x < 0 || y < 0 || x + im.width > image.width || y + im.height > image.height) throw new Error('Out of bounds material output');
    for (let py = 0; py < im.height; py++) for (let px = 0; px < im.width; px++) image.data.set(pixels(im, px, py), ((y + py) * image.width + x + px) * 4);
    return { x, y, width: im.width, height: im.height };
  }
  const nativeRoles = { 'water-left': [8,8], 'water-repeat': [48,8], 'water-right': [8,8], 'water-ripples': [48,4], 'sand-left': [6,8], 'sand-repeat': [24,8], 'sand-right': [6,8] };
  if (Object.keys(record.pieces).sort().join() !== Object.keys(nativeRoles).sort().join()) throw new Error('Invalid native roles');
  for (const [name, part] of Object.entries(record.pieces)) {
    if (part.width !== nativeRoles[name][0] || part.height !== nativeRoles[name][1]) throw new Error(`Invalid native role: ${name}`);
    const { crop, width, height } = part, scale = record.materialScales[name.startsWith('water') ? 'water' : 'sand'];
    if (![crop.x, crop.y, crop.width, crop.height, width, height, scale].every(Number.isInteger) || scale < 1
      || crop.width !== width * scale || crop.height !== height * scale || crop.x < 0 || crop.y < 0
      || crop.x + crop.width > source.width || crop.y + crop.height > source.height) throw new Error(`Non-isotropic/out-of-bounds material crop: ${name}`);
    const native = modeDownsample(source, crop, width, height);
    let visible = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      if (!native.data[at + 3]) continue;
      if (isChromaKey(...native.data.subarray(at, at + 3))) throw new Error(`Material chroma fringe: ${name}`);
      visible++;
      if (name !== 'water-ripples') {
        const edge = name.endsWith('left') ? x : name.endsWith('right') ? width - 1 - x : 2;
        native.data[at + 3] = Math.round(255 * Math.min(1, (8 - y) / 3) * Math.min(1, (edge + 1) / 3));
      }
    }
    if (!visible) throw new Error(`Empty material crop: ${name}`);
    parts[name] = native; pieces[name] = put(native, ...positions[name]);
  }
  const mirror = (x, width) => { const n = ((x % (width * 2)) + width * 2) % (width * 2); return n < width ? n : width * 2 - n - 1; };
  const specs = [['sand',75,105,360,64],['sand',520,600,352,72],['water',1660,1860,344,80],['water',2200,2500,344,96],['water',3040,3220,344,112]];
  const bands = specs.map(([material, x1, x2, top, row], index) => {
    const width = x2 - x1, cap = material === 'sand' ? 6 : 8;
    const strip = { width, height: 8, data: new Uint8Array(width * 8 * 4) };
    for (let x = 0; x < width; x++) for (let y = 0; y < 8; y++) {
      const key = x < cap ? 'left' : x >= width - cap ? 'right' : 'repeat', part = parts[`${material}-${key}`];
      const sx = key === 'left' ? x : key === 'right' ? x - width + cap : mirror(x1 + x, part.width);
      strip.data.set(pixels(part, sx, y), (y * width + x) * 4);
    }
    const band = { material, x1, x2, top, base: put(strip, 0, row) };
    if (material === 'water') {
      const ripple = parts['water-ripples'], layer = { width: width + 2, height: 4, data: new Uint8Array((width + 2) * 4 * 4) };
      for (let x = 0; x < layer.width; x++) for (let y = 0; y < 4; y++) {
        const value = Uint8Array.from(pixels(ripple, mirror(x1 + x - 1, ripple.width), y));
        value[3] = Math.round(value[3] * Math.max(0, Math.min(1, (x - 8) / 3, (width - 7 - x) / 3)));
        if (!value[3]) value.fill(0);
        layer.data.set(value, (y * layer.width + x) * 4);
      }
      band.ripple = put(layer, 0, 128 + (index - 2) * 8);
    }
    return band;
  });
  const manifest = { version: 1, image: 'atlas.png', width: image.width, height: image.height, pieces, bands };
  return { image, png: encodePng(image), manifest, removed, pixelSha256: hash(image.data) };
}
