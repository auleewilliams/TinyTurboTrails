import { crc32, deflateSync, inflateSync } from 'node:zlib';

// Dependency-free helpers for preparing generated trail stickers. The image
// provider returns opaque RGB art over a flat magenta chroma-key background, so
// transparency is derived here from edge-connected background pixels only.

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

/** Decodes 8-bit, non-interlaced RGB or RGBA PNGs into RGBA pixels. */
export function decodePng(bytes) {
  if (!SIGNATURE.equals(bytes.subarray(0, 8))) throw new Error('Not a PNG');
  let offset = 8, header, idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset), kind = bytes.toString('latin1', offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') header = payload; else if (kind === 'IDAT') idat.push(payload); else if (kind === 'IEND') break;
    offset += length + 12;
  }
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4);
  const [depth, colorType, , , interlace] = header.subarray(8, 13);
  if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) throw new Error('Unsupported PNG format');
  const channels = colorType === 6 ? 4 : 3, stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? rows[y * stride + x - channels] : 0;
      const up = y ? rows[(y - 1) * stride + x] : 0;
      const corner = y && x >= channels ? rows[(y - 1) * stride + x - channels] : 0;
      const estimate = left + up - corner;
      const [pa, pb, pc] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - corner)];
      const predictor = [0, left, up, (left + up) >> 1, pa <= pb && pa <= pc ? left : pb <= pc ? up : corner][filter];
      if (predictor === undefined) throw new Error(`Unsupported PNG filter ${filter}`);
      rows[y * stride + x] = (line[x] + predictor) & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index++) {
    data.set(rows.subarray(index * channels, index * channels + 3), index * 4);
    data[index * 4 + 3] = channels === 4 ? rows[index * 4 + 3] : 255;
  }
  return { width, height, channels, data };
}

/** Encodes RGBA pixels as an unfiltered 8-bit PNG. */
export function encodePng({ width, height, data }) {
  const chunk = (kind, payload) => {
    const length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(payload.length);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(kind, 'latin1'), payload])));
    return Buffer.concat([length, Buffer.from(kind, 'latin1'), payload, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rows.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Magenta background, including its blend with the dark keyline. The generated
 * sticker interiors peak at 23 on this red/blue-over-green measure, and cream,
 * white, blue and the dark outline are far below it.
 */
export function isChromaKey(r, g, b) {
  return r - g >= 24 && b - g >= 24;
}

/** Clears chroma-key pixels 4-connected to the image edge; enclosed details are preserved. */
export function removeEdgeKey(source) {
  const { width, height } = source, data = Uint8Array.from(source.data);
  const seen = new Uint8Array(width * height), queue = [];
  const visit = index => {
    if (seen[index]) return;
    seen[index] = 1;
    if (isChromaKey(data[index * 4], data[index * 4 + 1], data[index * 4 + 2])) queue.push(index);
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  let removed = 0;
  while (queue.length) {
    const index = queue.pop(), x = index % width, y = (index - x) / width;
    data.fill(0, index * 4, index * 4 + 4); removed++;
    if (x) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (y) visit(index - width);
    if (y < height - 1) visit(index + width);
  }
  return { image: { width, height, channels: 4, data }, removed };
}

/** Bounding rectangle of pixels with alpha of at least 128. */
export function visibleBounds({ width, height, data }) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 128) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Aspect-preserving fit inside the padded cell, rounded and centered with floor. */
export function fitRect(bounds, cell, padding) {
  const scale = Math.min((cell.width - padding * 2) / bounds.width, (cell.height - padding * 2) / bounds.height);
  const width = Math.round(bounds.width * scale), height = Math.round(bounds.height * scale);
  return { x: Math.floor((cell.width - width) / 2), y: Math.floor((cell.height - height) / 2), width, height };
}

/** Keys out the background, then nearest-neighbour samples the visible art into a transparent cell. */
export function prepareSticker(source, cell, padding) {
  const { image: keyed, removed } = removeEdgeKey(source);
  const sourceBounds = visibleBounds(keyed), contentRect = fitRect(sourceBounds, cell, padding);
  const data = new Uint8Array(cell.width * cell.height * 4);
  for (let y = 0; y < contentRect.height; y++) for (let x = 0; x < contentRect.width; x++) {
    const sx = sourceBounds.x + Math.floor((x + 0.5) * sourceBounds.width / contentRect.width);
    const sy = sourceBounds.y + Math.floor((y + 0.5) * sourceBounds.height / contentRect.height);
    const from = (sy * keyed.width + sx) * 4, to = ((contentRect.y + y) * cell.width + contentRect.x + x) * 4;
    data.set(keyed.data.subarray(from, from + 4), to);
  }
  return { image: { width: cell.width, height: cell.height, channels: 4, data }, sourceBounds, contentRect, removed };
}
