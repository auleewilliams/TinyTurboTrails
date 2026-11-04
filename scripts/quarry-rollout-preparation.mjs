import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc32, inflateSync } from 'node:zlib';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { wholeSample } from './quarry-representative.mjs';

const root = 'assets/source/quarry/rollout-v1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function equalBytes(actual, expected, label) {
  assert.equal(actual.byteLength, expected.byteLength, `${label}: length ${hash(actual)} / ${hash(expected)}`);
  assert.ok(Buffer.from(actual).equals(Buffer.from(expected)), `${label}: bytes ${hash(actual)} / ${hash(expected)}`);
}
function checked(bytes) {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')), 'PNG signature');
  const chunks = [], idat = [];
  let offset = 8;
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'PNG chunk header');
    const length = bytes.readUInt32BE(offset), end = offset + length + 12;
    assert.ok(end <= bytes.length, 'PNG chunk length');
    assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), 'PNG CRC');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, bytes: bytes.subarray(offset, end) });
    if (type === 'IDAT') idat.push(bytes.subarray(offset + 8, end - 4));
    offset = end;
  }
  assert.equal(chunks[0]?.type, 'IHDR', 'PNG header order');
  assert.equal(chunks.filter(c => c.type === 'IHDR').length, 1, 'PNG single header');
  assert.equal(chunks.at(-1)?.type, 'IEND', 'PNG end order');
  assert.equal(chunks.filter(c => c.type === 'IEND').length, 1, 'PNG single end');
  assert.equal(chunks.at(-1).bytes.length, 12, 'PNG empty end');
  assert.ok(idat.length, 'PNG image data');
  return { ...decodePng(bytes), chunks, scanlines: inflateSync(Buffer.concat(idat)) };
}

/** Independently derive pixels, verify the current encoder, then retain sealed encoding.
 * zlib releases may change IDAT compression, never the approved PNG or scanlines.
 * The CLI and tests both use this complete path. Encoder injection tests rejection
 * at the real encoding seam; ordinary callers use the unchanged shared encoder.
 */
export function prepareQuarryRollout(contractBytes, read, encode = encodePng) {
  assert.equal(hash(contractBytes), 'aa13c0f67bd4768aafe080b4142f1b8ff622be711b2009f65ed0e047e4ee368d', 'sealed rollout preparation contract');
  const contract = JSON.parse(contractBytes), result = {};
  assert.equal(hash(read('src/world/quarry-run.ts')), contract.frozenSourceSHA256, 'frozen Quarry world');
  for (const [file, p] of Object.entries(contract.files)) {
    const raw = read(p.source);
    assert.equal(hash(raw), p.sourceSHA256, 'immutable source PNG');
    const source = checked(raw);
    assert.deepEqual([source.width, source.height], p.sourceSize, 'source dimensions');
    assert.equal(hash(source.data), p.sourceRGBAsha256, 'source RGBA');
    assert.deepEqual(p.box, [0, 0, source.width, source.height], 'whole source bounds');
    assert.equal(p.scale[1], source.width, 'whole source scale');
    const out = wholeSample(source, p.box, ...p.scale);
    assert.deepEqual([out.width, out.height], p.size, 'native dimensions');
    assert.equal(hash(out.data), p.RGBAsha256, 'independently derived RGBA');
    const bytes = read(root + 'prepared/' + file), publicBytes = read('public/assets/quarry/rollout-v1/' + file);
    assert.equal(hash(bytes), p.PNGsha256, 'immutable prepared PNG');
    assert.equal(hash(publicBytes), p.PNGsha256, 'immutable public PNG');
    equalBytes(bytes, publicBytes, 'prepared/public identity');
    const canonical = checked(bytes);
    assert.deepEqual([canonical.width, canonical.height], p.size, 'approved dimensions');
    equalBytes(canonical.data, out.data, 'approved/derived RGBA');
    const identity = p.scale[0] === p.scale[1], encoded = identity ? raw : encode(out), candidate = checked(encoded);
    assert.deepEqual([candidate.width, candidate.height], p.size, 'encoded dimensions');
    equalBytes(candidate.data, out.data, 'encoded/derived RGBA');
    if (identity) equalBytes(encoded, bytes, 'identity source PNG');
    else {
      // Exact IHDR/IEND and chunk order; only IDAT payload compression may vary.
      assert.deepEqual(candidate.chunks.map(c => c.type), ['IHDR', 'IDAT', 'IEND'], 'encoded PNG structure');
      assert.deepEqual(canonical.chunks.map(c => c.type), ['IHDR', 'IDAT', 'IEND'], 'approved PNG structure');
      for (const i of [0, 2]) equalBytes(candidate.chunks[i].bytes, canonical.chunks[i].bytes, 'non-IDAT chunk');
      const rows = Buffer.alloc((out.width * 4 + 1) * out.height);
      for (let y = 0; y < out.height; y++) rows.set(out.data.subarray(y * out.width * 4, (y + 1) * out.width * 4), y * (out.width * 4 + 1) + 1);
      equalBytes(candidate.scanlines, rows, 'encoded unfiltered scanlines');
      equalBytes(canonical.scanlines, rows, 'approved unfiltered scanlines');
    }
    result[file] = { bytes, encoded, ...out };
  }
  return result;
}
