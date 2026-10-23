import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { decodePng, isChromaKey } from './spelling-stickers.mjs';
import { modeDownsample, prepareKitPiece } from './interface-kit.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const record = JSON.parse(read('assets/source/interface/preparation.json'));
const pieces = ['panel', 'button', 'button-selected', 'plaque'];
const image = (width, height, pixels) => ({ width, height, data: Uint8Array.from(pixels.flat()) });
const at = ({ width, data }, x, y) => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
const CLEAR = [0, 0, 0, 0], DARK = [23, 51, 59, 255], WOOD = [230, 150, 50, 255], WOOD2 = [228, 148, 52, 255];

test('mode downsampling keeps each block\'s majority colour and never invents a blend', () => {
  // Each 2 x 2 block becomes one pixel: majority wood (averaged within its colour bin),
  // a dark/wood tie resolved to the earlier bin, and a mostly clear block.
  const source = image(6, 2, [
    WOOD, WOOD2, DARK, WOOD, CLEAR, CLEAR,
    WOOD, DARK, WOOD, DARK, CLEAR, DARK,
  ]);
  const out = modeDownsample(source, { x: 0, y: 0, width: 6, height: 2 }, 3, 1);
  assert.deepEqual(at(out, 0, 0), [229, 149, 51, 255]);
  assert.deepEqual(at(out, 1, 0), DARK);
  assert.deepEqual(at(out, 2, 0), CLEAR, 'half or more clear stays transparent');
  for (let index = 0; index < out.data.length; index += 4) assert.ok(out.data[index + 3] === 0 || out.data[index + 3] === 255, 'binary alpha');
});

test('rejects a kit source with no visible artwork after keying', () => {
  assert.throws(() => prepareKitPiece(image(2, 2, Array(4).fill([255, 0, 255, 255])), { width: 4, height: 4 }), /No visible interface pixels/);
});

test('kit record lists four generated pieces with distinct sources, honest metadata and nine-slice insets', () => {
  assert.deepEqual(Object.keys(record.pieces), pieces);
  assert.equal(new Set(pieces.map(name => record.pieces[name].sourceSha256)).size, 4);
  for (const name of pieces) {
    const entry = record.pieces[name];
    assert.equal(entry.generation.provider, 'openai-codex');
    assert.ok(entry.generation.requestedQuality && entry.generation.reportedQuality && entry.generation.reportedSize, `${name} reports requested and returned tiers`);
    assert.ok(entry.generation.referenceImages.includes('assets/source/spelling/concepts/builder-kit-v1.png'));
    const { left, top, right, bottom } = entry.slice;
    assert.ok(left + right < entry.logicalSize.width && top + bottom < entry.logicalSize.height, `${name} has a tileable centre`);
  }
});

for (const name of pieces) test(`${name} is reproduced from its generated source as true RGBA nine-slice art`, () => {
  const entry = record.pieces[name];
  const sourceBytes = read(`assets/source/interface/${entry.source}`);
  assert.equal(sha256(sourceBytes), entry.sourceSha256);
  const source = decodePng(sourceBytes);
  // The provider returned opaque RGB over flat magenta, not genuine transparency.
  assert.deepEqual([source.width, source.height, source.channels], [entry.sourceSize.width, entry.sourceSize.height, 3]);
  for (const [x, y] of [[0, 0], [source.width - 1, 0], [0, source.height - 1], [source.width - 1, source.height - 1]]) {
    assert.ok(isChromaKey(...at(source, x, y)), `${name} corner is chroma background`);
  }
  const prepared = prepareKitPiece(source, entry.logicalSize);
  assert.deepEqual(prepared.sourceBounds, entry.sourceBounds);
  assert.equal(prepared.removed, entry.removedBackgroundPixels);
  const committed = read(`assets/source/interface/${entry.image}`);
  const runtime = read(`public/assets/interface/${name}.png`);
  assert.equal(sha256(committed), entry.outputSha256); assert.deepEqual(runtime, committed);
  const decoded = decodePng(runtime);
  assert.deepEqual([decoded.width, decoded.height, decoded.channels], [entry.logicalSize.width, entry.logicalSize.height, 4]);
  assert.deepEqual([...decoded.data], [...prepared.image.data], 'committed pixels match deterministic preparation');
  assert.equal(sha256(decoded.data), entry.pixelSha256);
  let keyed = 0, partial = 0;
  for (let index = 0; index < decoded.data.length; index += 4) {
    const [r, g, b, a] = decoded.data.subarray(index, index + 4);
    if (a && isChromaKey(r, g, b)) keyed++;
    if (a && a < 255) partial++;
  }
  assert.equal(keyed, 0, 'no chroma remnants'); assert.equal(partial, 0, 'binary alpha only');
  // Tiled edge lines must not carry holes: alpha is uniform along every line of each
  // edge strip, and each edge's outermost opaque line is the dark outline.
  const { width, height } = entry.logicalSize, { left, top, right, bottom } = entry.slice;
  const line = (cells) => {
    const alpha = new Set(cells.map(([x, y]) => at(decoded, x, y)[3]));
    assert.equal(alpha.size, 1, `${name} edge line alpha is uniform`);
    return alpha.has(255) ? cells.reduce((sum, [x, y]) => sum + at(decoded, x, y).slice(0, 3).reduce((a, b) => a + b, 0) / 3, 0) / cells.length : undefined;
  };
  const span = (from, to) => Array.from({ length: to - from }, (_, index) => from + index);
  const edges = {
    top: span(0, top).map(y => span(left, width - right).map(x => [x, y])),
    bottom: span(height - bottom, height).reverse().map(y => span(left, width - right).map(x => [x, y])),
    left: span(0, left).map(x => span(top, height - bottom).map(y => [x, y])),
    right: span(width - right, width).reverse().map(x => span(top, height - bottom).map(y => [x, y])),
  };
  for (const [side, lines] of Object.entries(edges)) {
    const brightness = lines.map(line).filter(value => value !== undefined);
    assert.ok(brightness.length >= lines.length - 1, `${name} ${side} edge is substantially opaque`);
    assert.ok(brightness[0] < 90, `${name} ${side} outline is dark (${brightness[0].toFixed(0)})`);
  }
  for (let y = top; y < height - bottom; y++) for (let x = left; x < width - right; x++) assert.equal(at(decoded, x, y)[3], 255);
});

test('text interiors stay quiet: centre tiles have low contrast against their mean', () => {
  for (const name of pieces) {
    const entry = record.pieces[name], art = decodePng(read(`public/assets/interface/${name}.png`));
    const { left, top, right, bottom } = entry.slice, values = [];
    for (let y = top; y < entry.logicalSize.height - bottom; y++) for (let x = left; x < entry.logicalSize.width - right; x++) {
      const [r, g, b] = at(art, x, y); values.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
    assert.ok(deviation < 12, `${name} centre luminance deviation ${deviation.toFixed(1)}`);
  }
});

test('normal and selected buttons share one silhouette and differ in face colour', () => {
  const normal = decodePng(read('public/assets/interface/button.png')), selected = decodePng(read('public/assets/interface/button-selected.png'));
  assert.deepEqual([normal.width, normal.height], [selected.width, selected.height]);
  let mismatch = 0;
  for (let index = 3; index < normal.data.length; index += 4) if ((normal.data[index] > 0) !== (selected.data[index] > 0)) mismatch++;
  assert.ok(mismatch <= normal.width * 0.1, `alpha masks differ at ${mismatch} pixels`);
  const centre = (art, x, y) => at(art, x, y);
  const [nr, ng, nb] = centre(normal, normal.width >> 1, normal.height >> 1), [sr, sg, sb] = centre(selected, selected.width >> 1, selected.height >> 1);
  assert.ok(sr + sg > nr + ng + 200 && sb < sr, 'selected face is warm and light; normal face is dark');
  assert.ok(nb >= nr, 'normal face is blue-green slate');
});
