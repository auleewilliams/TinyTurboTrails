import { prepareQuarryRollout } from './quarry-rollout-preparation.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { wholeSample } from './quarry-representative.mjs';
import { beforeQuarryFloor } from './quarry-floor-preservation.mjs';
import { beforeQuarryRollout } from './quarry-rollout-preservation.mjs';
function equalBytes(actual, expected) {
  assert.equal(actual.constructor.name, expected.constructor.name, 'binary comparator type');
  assert.equal(actual.byteLength, expected.byteLength, 'binary comparator length');
  assert.ok(Buffer.from(actual).equals(Buffer.from(expected)), `binary mismatch: ${hash(actual)} / ${hash(expected)}`);
}
const root = 'assets/source/quarry/rollout-v1/', hash = b => createHash('sha256').update(b).digest('hex');
const contract = JSON.parse(readFileSync(root + 'preparation-contract.json'));
function checked(raw) {
  let offset = 8;
  while (offset < raw.length) { const n = raw.readUInt32BE(offset), end = offset + n + 12; assert.ok(end <= raw.length); assert.equal(crc32(raw.subarray(offset + 4, end - 4)), raw.readUInt32BE(end - 4), 'CRC'); offset = end; }
  assert.equal(offset, raw.length); return decodePng(raw);
}
test('all new whole sources reproduce exact isotropic PNG/RGBA, full rims, alpha and whole ends without repairs', () => {
  const prepared = prepareQuarryRollout(readFileSync(root + 'preparation-contract.json'), readFileSync);
  assert.equal(hash(readFileSync('src/world/quarry-run.ts')), contract.frozenSourceSHA256);
  for (const [file, p] of Object.entries(contract.files)) {
    const raw = readFileSync(p.source); assert.equal(hash(raw), p.sourceSHA256); const source = checked(raw);
    assert.equal(hash(source.data), p.sourceRGBAsha256); assert.deepEqual([source.width, source.height], p.sourceSize);
    assert.deepEqual(p.box, [0, 0, source.width, source.height]); assert.equal(p.scale[1], source.width);
    const out = wholeSample(source, p.box, ...p.scale); assert.deepEqual([out.width, out.height], p.size); assert.equal(hash(out.data), p.RGBAsha256);
    const bytes = readFileSync('public/assets/quarry/rollout-v1/' + file); assert.equal(hash(bytes), p.PNGsha256); equalBytes(checked(bytes).data, out.data);
    equalBytes(bytes, readFileSync(root + 'prepared/' + file));
    equalBytes(bytes, prepared[file].bytes);
    for (const x of [0, out.width - 1]) assert.ok(Array.from({ length: out.height }, (_, y) => out.data[(y * out.width + x) * 4 + 3]).some(a => a === 255), 'whole ends');
    const corrupt = Buffer.from(bytes); corrupt[corrupt.length - 1] ^= 1; assert.throws(() => checked(corrupt), /CRC/);
    const bad = { ...source, data: source.data.slice() }; bad.data[3] = 0; assert.throws(() => wholeSample(bad, p.box, source.width, source.width), /standing rim/);
    assert.throws(() => wholeSample(source, p.box, 0, 1), /isotropic/);
  }
});
test('exact additive source projection preserves published preview and rejects unrelated renderer and loader mutations', () => {
  for (const path of ['src/world/assets.ts', 'src/world/renderer.ts']) {
    const raw = beforeQuarryFloor(path, readFileSync(path)), old = readFileSync(root + 'baseline/' + path.split('/').pop());
    assert.deepEqual(beforeQuarryRollout(path, raw), old); assert.deepEqual(beforeQuarryRollout(path, old), old);
    for (const bad of [Buffer.concat([raw, Buffer.from('// unrelated')]), Buffer.from(raw.toString().replace('quarryRollout', 'unapprovedRollout')), Buffer.from(raw.toString().replace("'quarry'", "'cove'"))]) if (!bad.equals(raw)) assert.throws(() => beforeQuarryRollout(path, bad), /exact (?:representative rollout|approved floor)/);
  }
});

test('the CLI preparation path is deterministic and rejects changed contracts, sources and either sealed copy', () => {
  const contractBytes = readFileSync(root + 'preparation-contract.json');
  const first = prepareQuarryRollout(contractBytes, readFileSync), second = prepareQuarryRollout(contractBytes, readFileSync);
  for (const file of Object.keys(contract.files)) {
    equalBytes(first[file].bytes, second[file].bytes);
    equalBytes(first[file].encoded, second[file].encoded);
    equalBytes(first[file].bytes, readFileSync('public/assets/quarry/rollout-v1/' + file));
  }
  for (const field of ['sourceSHA256', 'sourceRGBAsha256', 'RGBAsha256', 'PNGsha256', 'scale', 'size', 'box']) {
    const bad = structuredClone(contract); bad.files['shelf-360.png'][field] = 'unapproved';
    assert.throws(() => prepareQuarryRollout(Buffer.from(JSON.stringify(bad)), readFileSync), /sealed rollout preparation contract/);
  }
  const flip = bytes => { const bad = Buffer.from(bytes); bad[bad.length - 1] ^= 1; return bad; };
  for (const path of new Set(['src/world/quarry-run.ts', ...Object.values(contract.files).map(p => p.source),
    ...Object.keys(contract.files).flatMap(file => [root + 'prepared/' + file, 'public/assets/quarry/rollout-v1/' + file])])) {
    assert.throws(() => prepareQuarryRollout(contractBytes, p => p === path ? flip(readFileSync(p)) : readFileSync(p)), /frozen Quarry world|immutable .* PNG/);
  }
});

test('whole preparation rejects RGB, alpha, dimensions, CRC and PNG structure corruption at the actual encoder seam', () => {
  const contractBytes = readFileSync(root + 'preparation-contract.json');
  for (const kind of ['RGB', 'alpha', 'dimensions', 'CRC', 'structure']) {
    let calls = 0;
    assert.throws(() => prepareQuarryRollout(contractBytes, readFileSync, out => {
      calls++;
      const bad = { width: out.width, height: out.height, data: out.data.slice() };
      if (kind === 'RGB') bad.data[0] ^= 1;
      if (kind === 'alpha') bad.data[3] = 0;
      if (kind === 'dimensions') bad.width--;
      const encoded = encodePng(bad);
      if (kind === 'CRC') encoded[encoded.length - 1] ^= 1;
      return kind === 'structure' ? Buffer.concat([encoded, Buffer.from('unapproved')]) : encoded;
    }), /encoded\/derived RGBA|encoded dimensions|PNG/);
    assert.equal(calls, 1, 'actual encoder was reached before rejection');
  }
  for (const kind of ['RGB', 'alpha', 'dimensions', 'CRC']) {
    const path = contract.files['shelf-360.png'].source, source = decodePng(readFileSync(path));
    if (kind === 'RGB') source.data[0] ^= 1;
    if (kind === 'alpha') source.data[3] = 0;
    if (kind === 'dimensions') source.width--;
    const bytes = encodePng(source); if (kind === 'CRC') bytes[bytes.length - 1] ^= 1;
    assert.throws(() => prepareQuarryRollout(contractBytes, p => p === path ? bytes : readFileSync(p)), /immutable source PNG/);
  }
});

test('sealed copies reject pixel, alpha, dimension, CRC and encoding-only replacements through whole preparation', () => {
  const contractBytes = readFileSync(root + 'preparation-contract.json');
  const file = 'shelf-360.png', canonical = readFileSync(root + 'prepared/' + file);
  for (const path of [root + 'prepared/' + file, 'public/assets/quarry/rollout-v1/' + file]) {
    for (const kind of ['RGB', 'alpha', 'dimensions', 'CRC', 'encoding-only']) {
      const image = decodePng(canonical);
      if (kind === 'RGB') image.data[0] ^= 1;
      if (kind === 'alpha') image.data[3] = 0;
      if (kind === 'dimensions') image.width--;
      let bytes = encodePng(image);
      if (kind === 'CRC') bytes[bytes.length - 1] ^= 1;
      // A valid tEXt ancillary chunk changes encoding only, not decoded pixels.
      if (kind === 'encoding-only') {
        const payload = Buffer.from('scope\0unapproved encoding'), chunk = Buffer.alloc(payload.length + 12);
        chunk.writeUInt32BE(payload.length); chunk.write('tEXt', 4, 'ascii'); payload.copy(chunk, 8);
        chunk.writeUInt32BE(crc32(chunk.subarray(4, chunk.length - 4)), chunk.length - 4);
        bytes = Buffer.concat([canonical.subarray(0, canonical.length - 12), chunk, canonical.subarray(canonical.length - 12)]);
        equalBytes(decodePng(bytes).data, image.data);
      }
      assert.notEqual(hash(bytes), hash(canonical), 'negative control changes bytes');
      assert.throws(() => prepareQuarryRollout(contractBytes, p => p === path ? bytes : readFileSync(p)), /immutable (?:prepared|public) PNG/);
    }
  }
});
