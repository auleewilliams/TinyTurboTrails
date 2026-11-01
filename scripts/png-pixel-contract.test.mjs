import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { prepareCoveMaterials } from './cove-materials.mjs';
import { decodePng, encodePng } from './spelling-stickers.mjs';
const root = new URL('../assets/source/cove/materials/', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const committed = read('prepared/atlas.png');
const current = prepareCoveMaterials(read('source.png'), JSON.parse(read('preparation.json'))).png;
const expected = { width: 512, height: 160, pixelSha256: JSON.parse(read('prepared/pixel-hashes.json')).pixelSha256 };
const chunk = (type, data) => {
  const tag = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([size, tag, data, crc]);
};
function parts(png) {
  const result = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    result.push({ type: png.toString('ascii', at + 4, at + 8), data: png.subarray(at + 8, at + 8 + length) });
    at += length + 12;
  }
  return result;
}
function rewrite(png, change) {
  return Buffer.concat([png.subarray(0, 8), ...change(parts(png)).map(p => chunk(p.type, p.data))]);
}
const idat = png => Buffer.concat(parts(png).filter(p => p.type === 'IDAT').map(p => p.data));
const scanlines = inflateSync(idat(current));
const alternate = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: deflateSync(scanlines, { level: 0 }) } : p));

test('real regenerated PNG accepts a different valid compression stream with identical exact pixels', () => {
  assert.equal(current.equals(alternate), false, 'encoding control actually differs');
  assert.deepEqual(inflateSync(idat(alternate)), scanlines);
  assertPngPixelContract(current, committed, expected);
  assertPngPixelContract(alternate, committed, expected);
  const split = rewrite(alternate, list => list.flatMap(p => p.type === 'IDAT'
    ? [{ ...p, data: p.data.subarray(0, 20) }, { ...p, data: p.data.subarray(20) }] : [p]));
  assertPngPixelContract(split, committed, expected);
});

test('rejects one RGB byte, alpha only, wrong dimensions/IHDR and wrong immutable pixel hash', () => {
  for (const channel of [0, 3]) {
    const image = decodePng(current); image.data[channel] ^= 1;
    assert.throws(() => assertPngPixelContract(encodePng(image), committed, expected), /RGBA|pixel hash/);
  }
  const image = decodePng(current);
  assert.throws(() => assertPngPixelContract(encodePng({ ...image, width: 256, height: 320 }), committed, expected), /IHDR|dimensions/);
  const badHeader = rewrite(current, list => list.map(p => {
    if (p.type !== 'IHDR') return p;
    const data = Buffer.from(p.data); data[8] = 16; return { ...p, data };
  }));
  assert.throws(() => assertPngPixelContract(badHeader, committed, expected), /IHDR/);
  assert.throws(() => assertPngPixelContract(current, committed, { ...expected, pixelSha256: '0'.repeat(64) }), /pixel hash/);
  assert.throws(() => assertPngPixelContract(current, alternate, { ...expected, width: 513 }), /IHDR|dimensions/);
});

test('rejects malformed/truncated PNG, bad CRC even when pixels decode, and corrupt or mis-sized scanlines', () => {
  const badCrc = Buffer.from(current); badCrc[29] ^= 1;
  assert.deepEqual(decodePng(badCrc).data, decodePng(current).data, 'old decoder does not validate CRC');
  const badStream = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: Buffer.from([0, 0, 1, 2]) } : p));
  const shortRows = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: deflateSync(scanlines.subarray(0, -1)) } : p));
  const extraRows = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: deflateSync(Buffer.concat([scanlines, Buffer.from([0])])) } : p));
  const badFilter = Buffer.from(scanlines); badFilter[0] = 5;
  const invalidFilter = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: deflateSync(badFilter) } : p));
  const trailingStream = rewrite(current, list => list.map(p => p.type === 'IDAT' ? { ...p, data: Buffer.concat([p.data, Buffer.from([0])]) } : p));
  const missingEnd = rewrite(current, list => list.filter(p => p.type !== 'IEND'));
  const duplicateHeader = rewrite(current, list => [list[0], ...list]);
  const badLength = Buffer.from(current); badLength.writeUInt32BE(0xffffffff, 8);
  const chunkCrcCorruptions = [];
  for (let offset = 8; offset < current.length;) {
    const length = current.readUInt32BE(offset), bad = Buffer.from(current);
    bad[offset + 8 + length] ^= 1; chunkCrcCorruptions.push(bad); offset += length + 12;
  }
  for (const bad of [Buffer.alloc(0), current.subarray(0, -1), badCrc, badStream, shortRows, extraRows,
    invalidFilter, trailingStream, missingEnd, duplicateHeader, badLength, ...chunkCrcCorruptions, Buffer.concat([current, Buffer.from([0])])]) {
    assert.throws(() => assertPngPixelContract(bad, committed, expected));
    assert.throws(() => assertPngPixelContract(current, bad, expected), 'committed side is equally strict');
  }
});
