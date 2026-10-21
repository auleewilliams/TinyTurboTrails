import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { decodePng, encodePng, fitRect, isChromaKey, prepareSticker, removeEdgeKey, visibleBounds } from './spelling-stickers.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(read('assets/source/spelling/sprites/preparation.json'));
const trails = ['plains', 'quarry', 'timbers', 'sunset', 'frost', 'cove'];
const generated = ['plains', 'quarry', 'timbers', 'frost', 'cove'];
const image = (width, height, pixels) => ({ width, height, data: Uint8Array.from(pixels.flat()) });
const at = ({ width, data }, x, y) => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
const MAGENTA = [255, 0, 255, 255], DARK = [23, 51, 59, 255], CREAM = [250, 246, 228, 255], WHITE = [255, 255, 255, 255];

test('decodes RGB and RGBA PNG rows through every filter and re-encodes RGBA losslessly', () => {
  const chunk = (kind, payload) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(payload.length);
    return Buffer.concat([length, Buffer.from(kind), payload, Buffer.alloc(4)]);
  };
  // Each row reconstructs to RGB (10,20,30), (50,60,70); literal bytes exercise each filter.
  const rows = [[0, 10, 20, 30, 50, 60, 70], [1, 10, 20, 30, 40, 40, 40], [2, 0, 0, 0, 0, 0, 0],
    [3, 5, 10, 15, 20, 20, 20], [4, 0, 0, 0, 0, 0, 0]];
  const header = Buffer.alloc(13); header.writeUInt32BE(2); header.writeUInt32BE(5, 4); header[8] = 8; header[9] = 2;
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from(rows.flat()))), chunk('IEND', Buffer.alloc(0))]);
  const decoded = decodePng(png);
  assert.deepEqual([decoded.width, decoded.height, decoded.channels], [2, 5, 3]);
  for (let y = 0; y < 5; y++) assert.deepEqual([at(decoded, 0, y), at(decoded, 1, y)], [[10, 20, 30, 255], [50, 60, 70, 255]]);
  const rgba = image(2, 1, [[1, 2, 3, 0], [4, 5, 6, 128]]);
  const again = decodePng(encodePng(rgba));
  assert.equal(again.channels, 4); assert.deepEqual([...again.data], [...rgba.data]);
});

test('keys out only edge-connected chroma background and its blended fringe', () => {
  // A magenta interior pocket and white/cream/dark details are enclosed by the keyline.
  const K = MAGENTA, D = DARK, C = CREAM, W = WHITE, F = [140, 30, 150, 255];
  const source = image(7, 5, [
    K, K, K, K, K, K, K,
    K, F, D, D, D, D, K,
    K, D, C, W, K, D, K,
    K, D, D, D, D, D, K,
    K, K, K, K, K, K, K,
  ]);
  const { image: keyed, removed } = removeEdgeKey(source);
  assert.equal(removed, 21);
  assert.equal(at(keyed, 1, 1)[3], 0, 'blended fringe is background');
  assert.deepEqual(at(keyed, 2, 2), C); assert.deepEqual(at(keyed, 3, 2), W);
  assert.deepEqual(at(keyed, 4, 2), K, 'enclosed chroma-like detail is not edge-connected');
  assert.deepEqual(at(keyed, 1, 2), D);
  assert.equal(isChromaKey(...WHITE), false); assert.equal(isChromaKey(...CREAM), false);
  assert.equal(isChromaKey(...DARK), false); assert.equal(isChromaKey(200, 230, 255), false);
  // The most magenta-leaning interior pixel measured in the generated sources.
  assert.equal(isChromaKey(155, 131, 154), false); assert.equal(isChromaKey(80, 40, 90), true);
});

test('fits and centers content exactly like the reviewed Sunset preparation', () => {
  const sunset = record.sprites['sunset-sticker'];
  assert.deepEqual(fitRect(sunset.sourceBounds, sunset.logicalSize, sunset.padding), sunset.contentRect);
  const square = image(4, 4, Array(16).fill([0, 0, 0, 0]));
  for (const [x, y] of [[1, 1], [2, 2], [1, 2]]) square.data[(y * 4 + x) * 4 + 3] = 255;
  assert.deepEqual(visibleBounds(square), { x: 1, y: 1, width: 2, height: 2 });
});

test('six trail stickers are recorded with distinct source, prepared and runtime files', () => {
  const names = trails.map(trail => `${trail}-sticker`);
  for (const name of names) assert.ok(record.sprites[name], name);
  assert.equal(new Set(names.map(name => record.sprites[name].source)).size, 6);
  assert.equal(new Set(names.map(name => record.sprites[name].outputSha256)).size, 6);
  // The approved Sunset sprite is retained byte-for-byte.
  assert.equal(record.sprites['sunset-sticker'].outputSha256, '854702e0cdd510926209e434775a70abf90310ce7625f782523f71d37ec7cb01');
  assert.equal(sha256(read('public/assets/spelling/sunset-sticker.png')), record.sprites['sunset-sticker'].outputSha256);
});

for (const trail of generated) test(`${trail} sticker is reproduced from its generated source as clean RGBA`, () => {
  const entry = record.sprites[`${trail}-sticker`];
  const sourceBytes = read(`assets/source/spelling/sprites/${entry.source}`);
  assert.equal(sha256(sourceBytes), entry.sourceSha256);
  const source = decodePng(sourceBytes);
  // The provider returned opaque RGB over flat magenta, not genuine transparency.
  assert.deepEqual([source.width, source.height, source.channels], [entry.sourceSize.width, entry.sourceSize.height, 3]);
  for (const [x, y] of [[0, 0], [source.width - 1, 0], [0, source.height - 1], [source.width - 1, source.height - 1]]) {
    assert.ok(isChromaKey(...at(source, x, y)), `${trail} corner is chroma background`);
  }
  const { image: prepared, sourceBounds, contentRect, removed } = prepareSticker(source, entry.logicalSize, entry.padding);
  assert.deepEqual(sourceBounds, entry.sourceBounds); assert.deepEqual(contentRect, entry.contentRect);
  assert.equal(removed, entry.removedBackgroundPixels);
  const committed = read(`assets/source/spelling/sprites/${entry.image}`);
  const runtime = read(`public/assets/spelling/${trail}-sticker.png`);
  assert.equal(sha256(committed), entry.outputSha256); assert.deepEqual(runtime, committed);
  const decoded = decodePng(runtime);
  assert.deepEqual([decoded.width, decoded.height, decoded.channels], [56, 56, 4]);
  assert.deepEqual([...decoded.data], [...prepared.data], 'committed pixels match deterministic preparation');
  assert.equal(sha256(decoded.data), entry.pixelSha256);
});

for (const trail of trails) test(`${trail} runtime sticker has true alpha, clear padding and a legible centered silhouette`, () => {
  const sticker = decodePng(read(`public/assets/spelling/${trail}-sticker.png`));
  assert.deepEqual([sticker.width, sticker.height, sticker.channels], [56, 56, 4]);
  let visible = 0, transparent = 0, edge = 0, keyed = 0, cream = 0, dark = 0;
  for (let y = 0; y < 56; y++) for (let x = 0; x < 56; x++) {
    const [r, g, b, a] = at(sticker, x, y);
    if (!a) { transparent++; continue; }
    visible++;
    if (x < 2 || y < 2 || x > 53 || y > 53) edge++;
    if (isChromaKey(r, g, b)) keyed++;
    if (r > 225 && g > 215 && b > 180 && r - b > 8) cream++;
    if (r + g + b < 180) dark++;
  }
  assert.equal(edge, 0, 'two-pixel transparent padding'); assert.equal(keyed, 0, 'no chroma remnants');
  assert.ok(transparent > 300, 'genuinely transparent background');
  assert.ok(visible > 56 * 56 * 0.4, 'substantial silhouette at native size');
  assert.ok(cream > 60, 'opaque cream die-cut border'); assert.ok(dark > 60, 'dark keyline and outlines');
  const bounds = visibleBounds(sticker);
  assert.ok(Math.abs(bounds.x * 2 + bounds.width - 56) <= 1 && Math.abs(bounds.y * 2 + bounds.height - 56) <= 1, 'centered');
  assert.ok(Math.max(bounds.width, bounds.height) >= 50, 'fills its logical cell');
});

test('trail silhouettes remain distinct at the ~31 px collection scale', () => {
  const masks = trails.map(trail => {
    const sticker = decodePng(read(`public/assets/spelling/${trail}-sticker.png`));
    // Nearest-neighbour sample at the collection's 0.55 scale.
    return Array.from({ length: 31 * 31 }, (_, index) => at(sticker, Math.floor(((index % 31) + 0.5) * 56 / 31),
      Math.floor((Math.floor(index / 31) + 0.5) * 56 / 31))[3] > 0);
  });
  for (const [index, mask] of masks.entries()) {
    assert.ok(mask.filter(Boolean).length > 31 * 31 * 0.4, `${trails[index]} stays solid at collection size`);
    for (const other of masks.slice(index + 1)) {
      const union = mask.filter((value, cell) => value || other[cell]).length;
      const overlap = mask.filter((value, cell) => value && other[cell]).length;
      assert.ok(overlap / union < 0.9, 'silhouettes differ');
    }
  }
});

test('six sticker images differ and Frost snow survives background removal', () => {
  const digests = trails.map(trail => sha256(decodePng(read(`public/assets/spelling/${trail}-sticker.png`)).data));
  assert.equal(new Set(digests).size, 6);
  const frost = decodePng(read('public/assets/spelling/frost-sticker.png'));
  let snow = 0;
  for (let index = 0; index < frost.data.length; index += 4) {
    const [r, g, b, a] = frost.data.subarray(index, index + 4);
    if (a && b >= 235 && g >= 230 && b >= r) snow++;
  }
  assert.ok(snow > 40, 'white/pale-blue snow survives background removal');
});
