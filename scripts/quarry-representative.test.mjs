import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRepresentative, wholeSample } from './quarry-representative.mjs';
import { decodePng } from './spelling-stickers.mjs';
const contract = readFileSync('assets/source/quarry/representative-v1/preparation-contract.json');
test('reproduces all four whole-source rasters, rejects changed source/output/contracts and frozen gameplay', () => {
 const read = p => readFileSync(p), result = prepareRepresentative(contract, read);
 assert.equal(Object.keys(result).length,4);
 for(const path of ['assets/source/quarry/representative-v1/L01-source.png','public/assets/cove/bay1-b-v1/platform.png','public/assets/quarry/representative-v1/catch-108.png','src/game/platforms.ts']) assert.throws(()=>prepareRepresentative(contract,p=>{const b=read(p);return p===path?Buffer.concat([b,Buffer.from('x')]):b;}));
 const bad=JSON.parse(contract);bad.files['dock-60.png'].scale=[1,1];assert.throws(()=>prepareRepresentative(Buffer.from(JSON.stringify(bad)),read),/contract/);
});
test('full rim/real alpha are independent guards; one scalar whole transform preserves ends without anisotropy',()=>{
 const source=decodePng(readFileSync('public/assets/quarry/whole-ledges-v1/shelf-160.png'));
 const out=wholeSample(source,[0,0,160,32],60,160);assert.equal(out.width,60);assert.equal(out.height,12);
 const broken={...source,data:source.data.slice()};broken.data[4*1+3]=0;
 assert.throws(()=>wholeSample(broken,[0,0,160,32],160,160),/standing/);
 assert.throws(()=>wholeSample(source,[0,0,160,32],0,160),/scale/);
});
