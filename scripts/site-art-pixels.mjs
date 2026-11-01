import assert from 'node:assert/strict';

/** Whole-source isotropic area resampling, with exact rational overlap weights.
 * Alpha quantization floors every output pixel uniformly (error strictly <1/255).
 * This is not a colour key, alpha threshold, local repair or silhouette mask.
 * Transparent ceil padding covers any incomplete final source cell.
 */
export function resampleWhole(image, numerator, denominator = 1) {
  assert.ok(Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator)
    && numerator >= denominator && denominator > 0);
  const width = Math.ceil(image.width * denominator / numerator);
  const height = Math.ceil(image.height * denominator / numerator);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x0 = x * numerator, x1 = x0 + numerator, y0 = y * numerator, y1 = y0 + numerator;
    let alpha = 0, red = 0, green = 0, blue = 0;
    for (let sy = Math.floor(y0 / denominator); sy < Math.min(image.height, Math.ceil(y1 / denominator)); sy++) {
      const dy = Math.min(y1, (sy + 1) * denominator) - Math.max(y0, sy * denominator);
      for (let sx = Math.floor(x0 / denominator); sx < Math.min(image.width, Math.ceil(x1 / denominator)); sx++) {
        const dx = Math.min(x1, (sx + 1) * denominator) - Math.max(x0, sx * denominator);
        const index = (sy * image.width + sx) * 4, weighted = image.data[index + 3] * dx * dy;
        alpha += weighted;
        red += image.data[index] * weighted; green += image.data[index + 1] * weighted; blue += image.data[index + 2] * weighted;
      }
    }
    const index = (y * width + x) * 4;
    data[index + 3] = Math.floor(alpha / (numerator * numerator));
    if (data[index + 3]) {
      data[index] = Math.round(red / alpha); data[index + 1] = Math.round(green / alpha); data[index + 2] = Math.round(blue / alpha);
    }
  }
  return { width, height, data };
}

export function alphaBounds(image) {
  let left = image.width, top = image.height, right = -1, bottom = -1;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (!image.data[(y * image.width + x) * 4 + 3]) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  assert.ok(right >= left && bottom >= top, 'nonempty source');
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Extract a specifically planned module cell, never used to rescue a whole asset's fit. */
export function extractCell(image, { x, y, width, height }) {
  assert.ok([x, y, width, height].every(Number.isInteger) && x >= 0 && y >= 0 && width > 0 && height > 0
    && x + width <= image.width && y + height <= image.height);
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) data.set(image.data.subarray(((y + row) * image.width + x) * 4,
    ((y + row) * image.width + x + width) * 4), row * width * 4);
  return { width, height, data };
}

/** Only empty exterior padding is removed AFTER whole-source resampling. */
export function trimTransparentPadding(image) {
  const bounds = alphaBounds(image);
  return { bounds, image: extractCell(image, bounds) };
}
