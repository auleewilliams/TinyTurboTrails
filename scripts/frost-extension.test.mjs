import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareFrostTrial, prepareFrostExtension, assertFrostPreparedPng } from './prepare-frost-trial.mjs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { decodePng, encodePng } from './timbers-art.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const shipped = name => readFileSync('public/assets/frost/ledge-trial-v1/' + name);
test('remaining six use exact deterministic whole sources and preserve accepted four bytes and fields', () => {
  const old = prepareFrostTrial(), first = prepareFrostExtension(), second = prepareFrostExtension();
  const manifest = JSON.parse(first.get('manifest.json'));
  assert.equal(Object.keys(manifest.platforms).length, 10);
  for (const [id, piece] of Object.entries(JSON.parse(old.get('manifest.json')).platforms)) {
    assert.deepEqual(manifest.platforms[id], piece);
    assert.ok(first.get(piece.image).equals(shipped(piece.image)), 'accepted original bytes copied, not regenerated');
    const expected = JSON.parse(first.get('preparation.json')).records[piece.image];
    assertFrostPreparedPng(old.get(piece.image), first.get(piece.image), expected);
  }
  assert.ok(first.get('preparation.json').equals(shipped('preparation.json')));
  assert.equal(hash(first.get('preparation.json')), '131e93d19cbcd93a878bd5d89b54459feac217d45522cbec6c666aaec7fa5578');
  const historicalExtension = readFileSync('assets/source/frost/ledge-trial-v1/extension/preparation.json');
  assert.ok(historicalExtension.equals(shipped('extension-preparation.json')), 'immutable source/public receipt copies');
  const { records: expectedRecords, ...expectedFields } = JSON.parse(historicalExtension);
  const { records: generatedRecords, ...generatedFields } = JSON.parse(first.get('extension-preparation.json'));
  assert.deepEqual(generatedFields, expectedFields);
  assert.deepEqual(Object.keys(generatedRecords), Object.keys(expectedRecords));
  for (const [name, record] of Object.entries(generatedRecords)) {
    const { pngSha256, ...fields } = record;
    const { pngSha256: committedHash, ...expected } = expectedRecords[name];
    assert.equal(pngSha256, hash(first.get(name)), 'actual returned generated encoding hash');
    assert.equal(committedHash, hash(shipped(name)), 'immutable canonical encoding hash');
    assert.deepEqual(fields, expected, 'exact noncompression extension metadata');
  }
  const pins = { 'ledge-v1-140.png': '5897de57c44b1c194266519d6cae9c9558b294f64e2fce6fa14029c91f785f07',
    'ledge-v3-190.png': 'c9c938700b14b6bdd8e38250a9548361c9a9608d7c4c101d5e10e4336942504c',
    'ledge-v4-210.png': 'bdcfa27e460280365a5c6a6dfe77fa8b120ba44312c4c02669a70f3764081065' };
  for (const [name, digest] of Object.entries(pins)) assert.equal(hash(shipped(name)), digest);
  for (const id of [3, 6, 7, 8]) assert.equal(manifest.platforms[`frost-return-${id}`].image, 'ledge-v4-210.png');
  for (const [name, bytes] of first) {
    assert.ok(bytes.equals(second.get(name)), name + ' deterministic');
    if (expectedRecords[name]) assertFrostPreparedPng(bytes, shipped(name), expectedRecords[name]);
    else if (name !== 'extension-preparation.json') assert.ok(bytes.equals(shipped(name)), name + ' shipped');
    if (name.endsWith('.png')) assert.equal(hash(decodePng(bytes).data), hash(decodePng(second.get(name)).data));
  }
});

test('strict shared normalizer accepts only the exact named extension and retains historical pins', async () => {
  const { frostExtensionRecord, beforeFrostExtension } = await import('./frost-extension-preservation.mjs');
  for (const [path, entry] of Object.entries(frostExtensionRecord)) {
    const bytes = readFileSync(path);
    assert.equal(hash(beforeFrostExtension(path, bytes)), entry.beforeSHA256);
    for (const bad of [Buffer.concat([bytes, Buffer.from(' ')]), Buffer.from(bytes.toString().replace('140', '141'))]) {
      assert.ok(beforeFrostExtension(path, bad).equals(bad), 'unrelated edits reach original oracle');
      assert.notEqual(hash(beforeFrostExtension(path, bad)), entry.beforeSHA256);
    }
  }
});

// Recompress real preparation output without changing its scanline bytes.
function withRows(png, change) {
  const header = png.subarray(0, 33), idatLength = png.readUInt32BE(33);
  const rows = inflateSync(png.subarray(41, 41 + idatLength));
  const data = deflateSync(change(Buffer.from(rows)), { level: 0 });
  const size = Buffer.alloc(4), crc = Buffer.alloc(4), type = Buffer.from('IDAT');
  size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([header, size, type, data, crc, png.subarray(-12)]);
}

test('Frost preparation validator accepts alternate compression and rejects pixels, structure and canonical replacement', () => {
  const trial = prepareFrostTrial(), extension = prepareFrostExtension();
  const records = { ...JSON.parse(shipped('preparation.json')).records,
    ...JSON.parse(shipped('extension-preparation.json')).records };
  assert.equal(Object.keys(records).length, 6, 'all six whole sources exercised');
  for (const [name, expected] of Object.entries(records)) {
    const actual = trial.get(name) ?? extension.get(name), committed = shipped(name);
    const alternate = withRows(actual, rows => rows);
    assert.ok(!alternate.equals(actual), name + ' nonvacuous encoding control');
    assertFrostPreparedPng(actual, committed, expected);
    assertFrostPreparedPng(alternate, committed, expected);
    // The same valid alternate is permitted only on the generated side.
    assert.throws(() => assertFrostPreparedPng(actual, alternate, expected), /immutable approved/);
    for (const channel of [0, 3]) {
      const image = decodePng(actual); image.data[channel] ^= 1;
      const bad = encodePng(image);
      assert.throws(() => assertFrostPreparedPng(bad, committed, expected), /RGBA|pixel hash/);
      assert.throws(() => assertFrostPreparedPng(actual, bad, expected), /immutable approved/);
    }
    const image = decodePng(actual), dimensions = encodePng({ ...image, width: image.height, height: image.width });
    assert.throws(() => assertFrostPreparedPng(dimensions, committed, expected), /width|height|dimensions/);
    const badCrc = Buffer.from(actual); badCrc[badCrc.length - 1] ^= 1;
    assert.deepEqual(decodePng(badCrc).data, image.data, 'CRC corruption alone still decodes');
    const badStructure = Buffer.concat([actual.subarray(0, 33), actual.subarray(8)]);
    const badFilter = withRows(actual, rows => { rows[0] = 5; return rows; });
    const shortRows = withRows(actual, rows => rows.subarray(0, -1));
    for (const bad of [badCrc, badStructure, badFilter, shortRows, actual.subarray(0, -12), Buffer.concat([actual, Buffer.from([0])])]) {
      assert.throws(() => assertFrostPreparedPng(bad, committed, expected), name + ' malformed generated PNG');
      assert.throws(() => assertFrostPreparedPng(actual, bad, expected), /immutable approved/);
    }
    assert.throws(() => assertFrostPreparedPng(actual, committed, { ...expected, pixelSha256: '0'.repeat(64) }), /pixel hash/);
  }
});
