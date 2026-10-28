import { createHash } from 'node:crypto';
import { decodePng, encodePng, isChromaKey, removeEdgeKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';

/** All output pixels are selected from generated art. No runtime column compositing. */
export function prepareCoveKit(sources, record, level) {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const keyed = {}, removed = {}, parts = {};
  for (const name of ['ground', 'platform']) {
    if (hash(sources[name]) !== record.sources[name].sha256) throw new Error(`Changed Cove source: ${name}`);
    const image = decodePng(sources[name]), expected = record.sources[name];
    if (image.width !== expected.width || image.height !== expected.height) throw new Error(`Invalid Cove source size: ${name}`);
    const result = removeEdgeKey(image); keyed[name] = result.image; removed[name] = result.removed;
  }
  const { width, height } = record.atlasSize;
  const image = { width, height, channels: 4, data: new Uint8Array(width * height * 4) };
  const occupied = new Uint8Array(width * height), pieces = {};
  const pixel = (source, x, y) => source.data.subarray((y * source.width + x) * 4, (y * source.width + x) * 4 + 4);
  const put = (source, rect) => {
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const at = (rect.y + y) * width + rect.x + x;
      if (occupied[at] || rect.x + x >= width || rect.y + y >= height) throw new Error('Overlapping Cove output');
      occupied[at] = 1; image.data.set(pixel(source, x, y), at * 4);
    }
  };
  for (const [name, entry] of Object.entries(record.pieces)) {
    const source = keyed[entry.source], crop = entry.crop, out = entry.output, scale = record.materialScales[entry.source];
    for (const rect of [crop, out]) if (![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)
      || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1) throw new Error(`Invalid Cove crop: ${name}`);
    if (!Number.isInteger(scale) || scale < 1 || crop.width !== out.width * scale || crop.height !== out.height * scale) throw new Error(`Non-isotropic Cove source scale: ${name}`);
    if (!source || crop.x + crop.width > source.width || crop.y + crop.height > source.height
      || out.x + out.width > width || out.y + out.height > height) throw new Error(`Out of bounds Cove crop: ${name}`);
    const part = modeDownsample(source, crop, out.width, out.height);
    let visible = 0;
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const [r, g, b, a] = pixel(part, x, y);
      if (a) { visible++; if (isChromaKey(r, g, b)) throw new Error(`Residual Cove chroma: ${name}`); }
      if (name.startsWith('stone') && y === 0 && a !== 255) throw new Error(`Incomplete Cove landing top: ${name}`);
    }
    if (visible < out.width) throw new Error(`Empty Cove crop: ${name}`);
    parts[name] = part; put(part, out); pieces[name] = { ...out };
  }
  if (!level || level.width !== 4200 || level.height !== 480) throw new Error('Missing pinned Cove preparation contour');
  // Half-open slope joins keep junction indices in 0..15. Preserve material
  // ownership at unrelated flat-to-flat boundaries and the final world endpoint.
  const surfaceAt = x => level.surfaces.find((s, index) => {
    if (x < s.x1 || x > s.x2) return false;
    const next = level.surfaces[index + 1];
    return x < s.x2 || !next || (s.y1 === s.y2 && next.y1 === next.y2);
  });
  const groundY = x => { const s = surfaceAt(x); return s.y1 + (s.y2 - s.y1) * (x - s.x1) / (s.x2 - s.x1); };
  const repeat = (x, size) => { const p = ((x % (size * 2)) + size * 2) % (size * 2); return p < size ? p : size * 2 - p - 1; };
  const shelf = level.platforms.find(p => p.id === 'cove-hollow-shelf');
  if (!shelf || shelf.width !== 140) throw new Error('Missing pinned hollow support');
  const platforms = {}; let row = 2;
  for (const kind of ['thin', 'regular']) for (const span of [90, 100, 140, 160, 180]) makePlatform(`${kind}-${span}`, kind, span);
  makePlatform('regular-alt-160', 'regular', 160, true);
  makePlatform('hollow-140', 'thin', 140, false, true);
  function makePlatform(name, kind, span, alternate = false, hollow = false) {
    const left = parts[`stone-${kind}-left`], right = parts[`stone-${kind}-right`];
    const center = parts[`stone-${kind}-repeat${alternate ? '-alt' : ''}`];
    const strip = { width: span, height: left.height, data: new Uint8Array(span * left.height * 4) };
    for (let x = 0; x < span; x++) {
      const source = x < left.width ? left : x >= span - right.width ? right : center;
      const sx = source === left ? x : source === right ? x - (span - right.width) : repeat(x - left.width, center.width);
      const depth = hollow ? Math.min(6, Math.max(1, Math.floor(groundY(shelf.from.x + x) - shelf.from.y - 42))) : source.height;
      for (let y = 0; y < depth; y++) strip.data.set(pixel(source, sx, y), (y * span + x) * 4);
    }
    const rect = { x: 256, y: row, width: span, height: strip.height }; put(strip, rect); platforms[name] = rect; row += strip.height + 2;
  }
  const ground = { width: level.width, height: level.height, channels: 4, data: new Uint8Array(level.width * level.height * 4) };
  for (let x = 0; x < ground.width; x++) {
    const s = surfaceAt(x), top = Math.floor(groundY(x)), slope = s.y2 - s.y1;
    const lip = parts[s.material === 'water' ? 'wet-sand-lip' : 'sand-lip'];
    for (let y = top; y < ground.height; y++) {
      const fill = parts['sand-fill'], at = (y * ground.width + x) * 4, depth = y - top;
      ground.data.set(pixel(fill, repeat(x, 64), repeat(y, 64)), at);
      let paint = depth < lip.height ? pixel(lip, repeat(x, lip.width), depth) : null;
      if (slope && depth < 16) {
        const start = x < s.x1 + 16, end = x >= s.x2 - 16;
        if (start || end) {
          const name = slope < 0 ? (end ? 'up-to-flat' : 'flat-to-up') : (end ? 'down-to-flat' : 'flat-to-down');
          paint = pixel(parts[name], end ? x - s.x2 + 16 : x - s.x1, depth);
        }
      }
      if (x < 16 && depth < 64) paint = pixel(parts['cliff-left'], x, depth);
      if (x >= ground.width - 16 && depth < 64) paint = pixel(parts['cliff-right'], x - ground.width + 16, depth);
      if (paint?.[3]) ground.data.set(paint, at);
      if (ground.data[at + 3] !== 255) throw new Error('Unexpected internal Cove ground alpha hole');
    }
  }
  return { image, png: encodePng(image), ground, groundPng: encodePng(ground),
    manifest: { version: 2, image: 'atlas.png', width, height, pieces, platforms, ground: { image: 'ground.png', width: ground.width, height: ground.height } }, removed };
}
