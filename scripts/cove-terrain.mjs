import { createHash } from 'node:crypto';
import { decodePng, encodePng, isChromaKey, removeEdgeKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';

/** Pure preparation: verify both originals, derive every piece, then pack; never writes. */
export function prepareCoveKit(sources, record) {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const keyed = {}, removed = {};
  for (const name of ['ground', 'platform']) {
    if (hash(sources[name]) !== record.sources[name].sha256) throw new Error(`Changed Cove source: ${name}`);
    const image = decodePng(sources[name]), expected = record.sources[name];
    if (image.width !== expected.width || image.height !== expected.height) throw new Error(`Invalid Cove source size: ${name}`);
    const result = removeEdgeKey(image); keyed[name] = result.image; removed[name] = result.removed;
  }
  const { width, height } = record.atlasSize;
  const image = { width, height, channels: 4, data: new Uint8Array(width * height * 4) };
  const occupied = new Uint8Array(width * height), pieces = {};
  for (const [name, entry] of Object.entries(record.pieces)) {
    const source = keyed[entry.source], crop = entry.crop, out = entry.output;
    for (const rect of [crop, out]) if (![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)
      || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1) throw new Error(`Invalid Cove crop: ${name}`);
    if (!source || crop.x + crop.width > source.width || crop.y + crop.height > source.height
      || out.x + out.width > width || out.y + out.height > height) throw new Error(`Out of bounds Cove crop: ${name}`);
    const part = modeDownsample(source, crop, out.width, out.height);
    let visible = 0;
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const from = (y * out.width + x) * 4, at = (out.y + y) * width + out.x + x;
      if (occupied[at]) throw new Error(`Overlapping Cove output: ${name}`);
      occupied[at] = 1;
      const [r, g, b, a] = part.data.subarray(from, from + 4);
      if (a) {
        visible++;
        if (isChromaKey(r, g, b)) throw new Error(`Residual Cove chroma: ${name}`);
      }
      if (name.startsWith('stone') && y === 0 && a !== 255) throw new Error(`Incomplete Cove landing top: ${name}`);
      image.data.set(part.data.subarray(from, from + 4), at * 4);
    }
    if (visible < out.width) throw new Error(`Empty Cove crop: ${name}`);
    pieces[name] = { ...out };
  }
  return { image, png: encodePng(image), manifest: { version: 1, image: 'atlas.png', width, height, pieces }, removed };
}
