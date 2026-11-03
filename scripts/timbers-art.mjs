import { decodePng, encodePng } from './spelling-stickers.mjs';
export { decodePng, encodePng };

/** Whole-image isotropic box filtering. Transparent ceil padding; no alpha key/threshold. */
export function downsampleWhole(image, factor) {
  if (!Number.isInteger(factor) || factor < 1) throw new Error('Invalid uniform sampling factor');
  const width = Math.ceil(image.width / factor), height = Math.ceil(image.height / factor);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let alpha = 0, red = 0, green = 0, blue = 0;
    for (let sy = y * factor; sy < Math.min((y + 1) * factor, image.height); sy++) {
      for (let sx = x * factor; sx < Math.min((x + 1) * factor, image.width); sx++) {
        const i = (sy * image.width + sx) * 4, a = image.data[i + 3];
        alpha += a; red += image.data[i] * a; green += image.data[i + 1] * a; blue += image.data[i + 2] * a;
      }
    }
    const target = (y * width + x) * 4;
    data[target + 3] = Math.round(alpha / (factor * factor));
    if (data[target + 3]) {
      data[target] = Math.round(red / alpha); data[target + 1] = Math.round(green / alpha); data[target + 2] = Math.round(blue / alpha);
    }
  }
  return { width, height, data };
}

export function alphaBounds(image) {
  let x = image.width, y = image.height, right = -1, bottom = -1;
  for (let py = 0; py < image.height; py++) for (let px = 0; px < image.width; px++) {
    if (!image.data[(py * image.width + px) * 4 + 3]) continue;
    x = Math.min(x, px); y = Math.min(y, py); right = Math.max(right, px); bottom = Math.max(bottom, py);
  }
  if (right < 0) throw new Error('Empty Timbers image');
  return { x, y, width: right - x + 1, height: bottom - y + 1 };
}

export function crop(image, rect) {
  const data = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) data.set(image.data.subarray(((y + rect.y) * image.width + rect.x) * 4,
    ((y + rect.y) * image.width + rect.x + rect.width) * 4), y * rect.width * 4);
  return { width: rect.width, height: rect.height, data };
}

/** Exact integer-weight box filter at source.height/height on BOTH axes. */
export function wholeImageAtHeight(image, height) {
  const numerator = image.height, denominator = height;
  const width = Math.ceil(image.width * denominator / numerator);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = x * numerator, right = (x + 1) * numerator, top = y * numerator, bottom = (y + 1) * numerator;
    let alpha = 0, red = 0, green = 0, blue = 0;
    for (let sy = Math.floor(top / denominator); sy < Math.min(image.height, Math.ceil(bottom / denominator)); sy++) {
      for (let sx = Math.floor(left / denominator); sx < Math.min(image.width, Math.ceil(right / denominator)); sx++) {
        const weight = (Math.min(right, (sx + 1) * denominator) - Math.max(left, sx * denominator))
          * (Math.min(bottom, (sy + 1) * denominator) - Math.max(top, sy * denominator));
        const i = (sy * image.width + sx) * 4, a = image.data[i + 3] * weight;
        alpha += a; red += image.data[i] * a; green += image.data[i + 1] * a; blue += image.data[i + 2] * a;
      }
    }
    const target = (y * width + x) * 4;
    data[target + 3] = Math.round(alpha / (numerator * numerator));
    if (data[target + 3]) {
      data[target] = Math.round(red / alpha); data[target + 1] = Math.round(green / alpha); data[target + 2] = Math.round(blue / alpha);
    }
  }
  return { width, height, data };
}

/** Preserve both whole designed end caps; repeat/mirror only the interior centre. */
export function assembleWood(master, width, capWidth) {
  if (!Number.isInteger(width) || width < capWidth * 2 || capWidth < 1 || capWidth * 2 >= master.width) throw new Error('Invalid wood assembly');
  const height = master.height, data = new Uint8Array(width * height * 4), columns = [];
  const centre = master.width - capWidth * 2;
  for (let x = 0; x < width; x++) {
    const phase = (x - capWidth) % (centre * 2);
    const sx = x < capWidth ? x : x >= width - capWidth ? master.width - (width - x)
      : capWidth + (phase < centre ? phase : centre * 2 - phase - 1);
    columns.push(sx);
    for (let y = 0; y < height; y++) data.set(master.data.subarray((y * master.width + sx) * 4, (y * master.width + sx + 1) * 4), (y * width + x) * 4);
  }
  return { width, height, data, columns };
}
