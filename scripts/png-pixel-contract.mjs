import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc32, inflateSync } from 'node:zlib';
import { decodePng } from './spelling-stickers.mjs';

const signature = Buffer.from('89504e470d0a1a0a', 'hex');
const hash = data => createHash('sha256').update(data).digest('hex');

/** TEST ONLY: strict prepared RGBA PNG profile. The production decoder omits CRC/length checks. */
function checkedPixels(bytes, expected) {
  assert.ok(bytes.subarray(0, 8).equals(signature), 'PNG signature');
  let offset = 8, header, ended = false;
  const idat = [];
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'truncated PNG chunk');
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    assert.ok(end <= bytes.length, 'truncated PNG payload');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, end - 4);
    assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), 'PNG CRC');
    if (type === 'IHDR') {
      assert.ok(offset === 8 && !header && length === 13, 'PNG IHDR structure');
      header = payload;
      assert.equal(header.readUInt32BE(0), expected.width, 'PNG IHDR width');
      assert.equal(header.readUInt32BE(4), expected.height, 'PNG IHDR height');
      assert.ok(header.subarray(8).equals(Buffer.from([8, 6, 0, 0, 0])), 'PNG IHDR prepared RGBA profile');
    } else if (type === 'IDAT') {
      assert.ok(header && !ended, 'PNG IDAT order');
      idat.push(payload);
    } else if (type === 'IEND') {
      assert.ok(header && idat.length && length === 0 && end === bytes.length, 'PNG IEND/trailing data');
      ended = true;
    } else {
      assert.fail('Unsupported chunk in prepared PNG profile');
    }
    offset = end;
  }
  assert.ok(ended, 'missing PNG IEND');
  const compressed = Buffer.concat(idat), rowSize = expected.width * 4 + 1;
  const rawSize = rowSize * expected.height;
  const inflated = inflateSync(compressed, { info: true, maxOutputLength: rawSize + 1 });
  assert.equal(inflated.engine.bytesWritten, compressed.length, 'trailing PNG deflate data');
  assert.equal(inflated.buffer.length, rawSize, 'PNG scanline length');
  for (let y = 0; y < expected.height; y++) assert.ok(inflated.buffer[y * rowSize] <= 4, 'PNG scanline filter');
  const image = decodePng(bytes);
  assert.equal(image.width, expected.width, 'decoded PNG width');
  assert.equal(image.height, expected.height, 'decoded PNG height');
  assert.equal(image.data.length, expected.width * expected.height * 4, 'complete RGBA byte count');
  return image.data;
}

/** Exact pixels/alpha and immutable pixel hash; compressed IDAT bytes may vary across encoders. */
export function assertPngPixelContract(actual, committed, expected) {
  assert.ok(Number.isSafeInteger(expected.width) && expected.width > 0
    && Number.isSafeInteger(expected.height) && expected.height > 0, 'expected PNG dimensions');
  assert.match(expected.pixelSha256, /^[a-f0-9]{64}$/, 'immutable pixel hash format');
  const actualPixels = checkedPixels(actual, expected), committedPixels = checkedPixels(committed, expected);
  // Compare every byte without constructing a huge Buffer-diff diagnostic on failure.
  assert.equal(Buffer.compare(Buffer.from(actualPixels), Buffer.from(committedPixels)), 0, 'exact RGBA pixels including alpha');
  assert.equal(hash(actualPixels), expected.pixelSha256, 'regenerated decoded pixel hash');
  assert.equal(hash(committedPixels), expected.pixelSha256, 'committed decoded pixel hash');
}
