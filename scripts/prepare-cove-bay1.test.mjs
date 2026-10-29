import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { readFileSync } from 'node:fs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { prepareBay1, validateBay1Image } from './cove-bay1.mjs';
const source = readFileSync('assets/source/cove/bay1-b-v1/source.png');
const bay1Pixels = { width: 140, height: 30, pixelSha256: '52ee522781185b896c09302377b99cf9d16c0aaf0db73dc5d1239821b38fb1a6' };
const readCommitted = () => [
  readFileSync(new URL('../assets/source/cove/bay1-b-v1/prepared/platform.png', import.meta.url)),
  readFileSync(new URL('../public/assets/cove/bay1-b-v1/platform.png', import.meta.url)),
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// One family comparison path, used by both actual preparation and recovered CI regression.
function assertBay1Reproduction(generated, prepared, publicCopy) {
  const committedSha256 = 'e1809f4f247e693c96968ce7661e2e2126d46d28567b032e534634ee6a2b94cc';
  assert.equal(hash(prepared), committedSha256, 'immutable prepared PNG bytes');
  assert.equal(hash(publicCopy), committedSha256, 'immutable public PNG bytes');
  assert.equal(prepared.equals(publicCopy), true, 'committed prepared/public copies are byte-identical');
  assertPngPixelContract(generated, prepared, bay1Pixels);
  assertPngPixelContract(generated, publicCopy, bay1Pixels);
}

test('cleans only the two measured endpoints; preserves all opaque pixels and every cap', () => {
  const { raw, image, repairs } = prepareBay1(source);
  assert.equal(Array.from({length:140},(_,x)=>image.data[x*4+3]).filter(a=>a===255).length,140);
  assert.deepEqual(repairs.map(p=>[p.x,p.y,p.donorX,p.donorY]),[[0,0,1,0],[139,0,138,0]]);
  const caps = JSON.parse(readFileSync('assets/source/cove/bay1-b-v1/caps.json'));
  validateBay1Image(image, caps);
  for(let x=0;x<140;x++) {
    let bottom=-1;
    for(let y=0;y<30;y++) {
      const at=(y*140+x)*4;
      if(raw.data[at+3])assert.deepEqual(image.data.slice(at,at+4),raw.data.slice(at,at+4));
      if(image.data[at+3])bottom=y;
    }
    const limit=caps[x];
    for(let y=0;y<=bottom;y++)assert.equal(image.data[(y*140+x)*4+3],255);
    assert.ok(bottom<limit);
  }
  assert.deepEqual(prepareBay1(source).png,prepareBay1(source).png);
  assert.throws(()=>prepareBay1(Buffer.concat([source,Buffer.from('x')])),/source/);
});

test('rejects damaged tops, internal holes and cap violations without changing the real asset', () => {
  const { image } = prepareBay1(source), caps = JSON.parse(readFileSync('assets/source/cove/bay1-b-v1/caps.json'));
  for (const [x,y] of [[1,0],[70,2]]) {
    const bad = { ...image, data: Uint8Array.from(image.data) }; bad.data[(y*140+x)*4+3]=0;
    assert.throws(()=>validateBay1Image(bad,caps), /top|hole/);
  }
  const bad={...image,data:Uint8Array.from(image.data)};bad.data[(29*140)*4+3]=255;
  assert.throws(()=>validateBay1Image(bad,caps),/cap/);
});

test('ships exact reproducible bay1 pixels and immutable committed PNG copies, preserving the original oracle through exact deltas', async () => {
  const { beforeBay1 } = await import('./bay1-preservation.mjs');
  const current = readFileSync(new URL('../src/world/cove-terrain.ts', import.meta.url));
  const baseline = readFileSync(new URL('../assets/source/cove/bay1-b-v1/baseline/cove-terrain.ts', import.meta.url));
  assert.deepEqual(beforeBay1('src/world/cove-terrain.ts', current), baseline);
  assert.throws(() => beforeBay1('src/world/cove-terrain.ts', Buffer.concat([current, Buffer.from('\n// mutation')])));
  assert.throws(() => beforeBay1('src/world/cove-terrain.ts', Buffer.from(current.toString().replace('body.width !== 140', 'body.width !== 139'))));
  const result = prepareBay1(source);
  assertBay1Reproduction(result.png, ...readCommitted());
});

test('actual CI40959778644 alternate encoding passes the same bay1 family comparison', () => {
  const actual = readFileSync(new URL('../tests/fixtures/cove-bay1-ci-40959778644/actual.png', import.meta.url));
  const provenance = JSON.parse(readFileSync(new URL('../tests/fixtures/cove-bay1-ci-40959778644/provenance.json', import.meta.url)));
  assert.equal(provenance.runId, 40959778644);
  assert.equal(provenance.head, '56404ba6031d0f7c8dba63f93d96c26a78da57c1');
  assert.equal(provenance.sha256, hash(actual));
  assert.equal(provenance.rgbaSha256, bay1Pixels.pixelSha256);
  assert.deepEqual(provenance.nativeSize, [140, 30]);
  assert.equal(actual.length, 8136);
  assert.equal(hash(actual), '3bcac0f1a7607797de3e0d431ed829066f76a52f4546a73829280224e757bf9d');
  const [prepared, publicCopy] = readCommitted();
  assert.equal(actual.equals(prepared), false, 'fixture exercises different real encoded bytes');
  assertBay1Reproduction(actual, prepared, publicCopy);
  assertBay1Reproduction(prepared, prepared, publicCopy);
});

test('bay1 family rejects pixel/alpha/dimension/PNG corruption and changed committed encodings', () => {
  const actual = readFileSync(new URL('../tests/fixtures/cove-bay1-ci-40959778644/actual.png', import.meta.url));
  const [prepared, publicCopy] = readCommitted();
  const decoded = decodePng(actual);
  // Negative-only in-memory corruptions; the recovered fixture/artwork is never rewritten.
  const rgb = { ...decoded, data: Uint8Array.from(decoded.data) }; rgb.data[40] ^= 1;
  const alpha = { ...decoded, data: Uint8Array.from(decoded.data) }; alpha.data[43] = 254;
  const wrongSize = { width: 139, height: 30, data: decoded.data.slice(0, 139 * 30 * 4) };
  const crc = Buffer.from(actual); crc[29] ^= 1;
  const profile = Buffer.from(actual); profile[24] = 16; profile.writeUInt32BE(crc32(profile.subarray(12,29)),29);
  const chunk = Buffer.from(actual), length = chunk.readUInt32BE(33);
  chunk.write('tEXt',37,4,'ascii'); chunk.writeUInt32BE(crc32(chunk.subarray(37,41+length)),41+length);
  for (const [label, bytes] of [
    ['RGB', encodePng(rgb)], ['alpha', encodePng(alpha)], ['dimensions', encodePng(wrongSize)],
    ['CRC', crc], ['profile', profile], ['chunk', chunk], ['truncation', actual.subarray(0,-1)],
    ['trailing bytes', Buffer.concat([actual,Buffer.from([0])])],
  ]) assert.throws(() => assertBay1Reproduction(bytes, prepared, publicCopy), undefined, label);
  assert.throws(() => assertBay1Reproduction(actual, prepared, actual), /immutable public PNG bytes/);
  assert.throws(() => assertBay1Reproduction(actual, actual, actual), /immutable prepared PNG bytes/);
});
