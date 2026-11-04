import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { resolve, sep } from 'node:path';
import { decodePng, encodePng } from './spelling-stickers.mjs';
import { beforeQuarryFloor } from './quarry-floor-preservation.mjs';
import { beforeQuarryRollout } from './quarry-rollout-preservation.mjs';
import { beforeQuarryRepresentative } from './quarry-representative-preservation.mjs';
const root = 'assets/source/quarry/floor-v1/', hash = b => createHash('sha256').update(b).digest('hex');
const recipe = readFileSync('scripts/prepare-quarry-floor.mjs', 'utf8').replace(/^import .*;\n/gm, '');
function prepare(mutate = (p, b) => b) {
  let output;
  runInNewContext(recipe, { assert, readFileSync: p => mutate(p, readFileSync(p)), writeFileSync: (_p, b) => { output = b; }, mkdirSync() {},
    statfsSync: () => ({ bavail: 3 * 1024 ** 3, bsize: 1 }), createHash, resolve, sep, decodePng,
    process: { argv: ['node', 'recipe', '/evidence'], env: { TMPDIR: process.env.TMPDIR }, version: process.version }, Uint8Array, Int32Array, console: { log() {} }, Buffer });
  return output;
}
test('independent preparation seals source/table/approval, exact PNG and decoded RGBA without re-encoding', () => {
  const output = prepare(), canonical = readFileSync(root + 'approved-native.png');
  assert.ok(output.equals(canonical));
  assert.equal(hash(output), 'a36989f622677db21173d5c1bf2fa4025bfb4fd95df1c7278d28119639981fa9');
  assert.equal(hash(decodePng(output).data), '9ed5ec56a821dc6c5e00de900ab434a0259b43632e68af0f0b052ec5991f1bdc');
  for (const p of [root + 'source.png', root + 'approved-donor-table.json', root + 'owner-approval.json', root + 'approved-native.png']) {
    assert.throws(() => prepare((path, bytes) => { if (path !== p) return bytes; const b = Buffer.from(bytes); b[b.length - 1] ^= 1; return b; }));
  }
  for (const p of [root + 'prepared/floor-820.png', 'public/assets/quarry/floor-v1/floor-820.png']) assert.ok(readFileSync(p).equals(output), p);
});
test('exact presentation projection composes before all older guards and rejects altered loader/draw/source', () => {
  for (const path of ['src/world/assets.ts', 'src/world/renderer.ts']) {
    const raw = readFileSync(path), old = readFileSync(root + 'baseline/' + path.split('/').pop());
    assert.ok(beforeQuarryFloor(path, raw).equals(old));
    assert.ok(beforeQuarryFloor(path, old).equals(old));
    beforeQuarryRollout(path, raw); beforeQuarryRepresentative(path, raw);
    for (const bad of [Buffer.concat([raw, Buffer.from('//unapproved')]), Buffer.from(raw.toString().replace('quarryFloor', 'wrongFloor')), Buffer.from(raw.toString().replace("'./quarry-floor'", "'./wrong-floor'"))]) assert.throws(() => beforeQuarryFloor(path, bad), /exact approved floor/);
  }
});

test('immutable prepared/public byte guard rejects RGB, alpha, dimensions and CRC corruption', () => {
  const approved = readFileSync(root + 'approved-native.png');
  const copies = [root + 'prepared/floor-820.png', 'public/assets/quarry/floor-v1/floor-820.png'];
  const verify = read => { for (const p of copies) { const b = read(p); assert.equal(b.length, approved.length, 'sealed floor length'); assert.ok(b.equals(approved), `sealed floor bytes ${hash(b)} / ${hash(approved)}`); } };
  verify(readFileSync);
  const rgb = decodePng(approved); rgb.data[0] ^= 1;
  const alpha = decodePng(approved); alpha.data[3] = 0;
  const dimensions = decodePng(approved); dimensions.width = 819;
  const crc = Buffer.from(approved); crc[crc.length - 1] ^= 1;
  for (const path of copies) for (const corrupt of [encodePng(rgb), encodePng(alpha), encodePng(dimensions), crc]) {
    assert.throws(() => verify(p => p === path ? corrupt : readFileSync(p)), /sealed floor/);
  }
});
