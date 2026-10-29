import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { prepareBay1, validateBay1Image } from './cove-bay1.mjs';
const source = readFileSync('assets/source/cove/bay1-b-v1/source.png');
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

test('ships the exact reproducible new PNG and preserves the original oracle through exact deltas', async () => {
  const { beforeBay1 } = await import('./bay1-preservation.mjs');
  const current = readFileSync(new URL('../src/world/cove-terrain.ts', import.meta.url));
  const baseline = readFileSync(new URL('../assets/source/cove/bay1-b-v1/baseline/cove-terrain.ts', import.meta.url));
  assert.deepEqual(beforeBay1('src/world/cove-terrain.ts', current), baseline);
  assert.throws(() => beforeBay1('src/world/cove-terrain.ts', Buffer.concat([current, Buffer.from('\n// mutation')])));
  assert.throws(() => beforeBay1('src/world/cove-terrain.ts', Buffer.from(current.toString().replace('body.width !== 140', 'body.width !== 139'))));
  const result = prepareBay1(source);
  assertPngPixelContract(result.png, readFileSync(new URL('../public/assets/cove/bay1-b-v1/platform.png', import.meta.url)), { width: 140, height: 30, pixelSha256: '52ee522781185b896c09302377b99cf9d16c0aaf0db73dc5d1239821b38fb1a6' });
  for (const name of ['../assets/source/cove/bay1-b-v1/prepared/platform.png', '../public/assets/cove/bay1-b-v1/platform.png']) assert.deepEqual(result.png, readFileSync(new URL(name, import.meta.url)));
});
