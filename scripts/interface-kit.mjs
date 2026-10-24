import { removeEdgeKey, visibleBounds } from './spelling-stickers.mjs';

// Interface-kit preparation. The generated pixel art uses a coarse, slightly
// irregular grid, so each logical pixel takes the majority colour of its source
// block instead of a single point sample. Thin outlines and cream rims survive,
// and no colour is blended across a boundary.

/** Majority-colour downsample of `bounds` into `width` x `height`, with binary alpha. */
export function modeDownsample(source, bounds, width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x0 = bounds.x + Math.floor(x * bounds.width / width), x1 = bounds.x + Math.floor((x + 1) * bounds.width / width);
    const y0 = bounds.y + Math.floor(y * bounds.height / height), y1 = bounds.y + Math.floor((y + 1) * bounds.height / height);
    const bins = new Map();
    let clear = 0, total = 0;
    for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
      const index = (sy * source.width + sx) * 4;
      total++;
      if (source.data[index + 3] < 128) { clear++; continue; }
      // 4-bit colour bins group the generator's slight per-pixel noise.
      const key = (source.data[index] >> 4) << 8 | (source.data[index + 1] >> 4) << 4 | source.data[index + 2] >> 4;
      const bin = bins.get(key) ?? [0, 0, 0, 0];
      bin[0]++; bin[1] += source.data[index]; bin[2] += source.data[index + 1]; bin[3] += source.data[index + 2];
      bins.set(key, bin);
    }
    if (clear * 2 >= total) continue;
    // Ties keep the first-encountered bin (Map order), so output is deterministic.
    let best;
    for (const bin of bins.values()) if (!best || bin[0] > best[0]) best = bin;
    data.set([Math.round(best[1] / best[0]), Math.round(best[2] / best[0]), Math.round(best[3] / best[0]), 255], (y * width + x) * 4);
  }
  return { width, height, channels: 4, data };
}

/** Keys out the edge-connected chroma background, then fills the logical cell with the visible art. */
export function prepareKitPiece(source, size) {
  const { image: keyed, removed } = removeEdgeKey(source);
  const sourceBounds = visibleBounds(keyed);
  if (sourceBounds.width < 1) throw new Error('No visible interface pixels after removing the background');
  return { image: modeDownsample(keyed, sourceBounds, size.width, size.height), sourceBounds, removed };
}
