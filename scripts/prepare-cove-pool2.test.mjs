import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preparePool2} from './cove-pool2.mjs';
import {decodePng,encodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
import {assertPngPixelContract} from './png-pixel-contract.mjs';
const root='assets/source/cove/pool2-b-v1/',hash=b=>createHash('sha256').update(b).digest('hex'),source=readFileSync(root+'source.png');
test('whole natural pool2 uniform scale trims ONLY a transparent last row with NO repairs',()=>{
 const r=preparePool2(source),key=removeEdgeKey(decodePng(source)).image,raw=modeDownsample(key,{x:239,y:487,width:1058,height:7*1058/90},90,7);assert.equal(r.scale,1058/90);assert.equal(r.sourcePaintOutsideWindow,0);assert.equal(r.repairs,0);assert.equal(r.transparentBottomRowsRemoved,1);assert.deepEqual(r.rowOpaque,[90,90,88,83,54,22,0]);assert.deepEqual([r.image.width,r.image.height],[90,6]);assert.equal(Buffer.from(r.image.data).equals(Buffer.from(raw.data.slice(0,90*6*4))),true,'every unmodified native RGBA matches shared whole sampler');for(let x=0;x<90;x++)assert.equal(raw.data[(6*90+x)*4+3],0);
 for(let x=0;x<90;x++){assert.equal(r.image.data[x*4+3],255);let last=-1;for(let y=0;y<6;y++)if(r.image.data[(y*90+x)*4+3])last=y;assert.ok(last<6);for(let y=0;y<=last;y++)assert.equal(r.image.data[(y*90+x)*4+3],255);}
 const record=JSON.parse(readFileSync(root+'preparation.json')),committed=readFileSync(root+'prepared/platform.png'),publicCopy=readFileSync('public/assets/cove/pool2-b-v1/platform.png');assert.equal(hash(committed),record.pngSha256);assert.equal(committed.equals(publicCopy),true);assert.equal(encodePng(r.image).equals(encodePng(preparePool2(source).image)),true);assertPngPixelContract(encodePng(r.image),committed,record);
 for(const at of [0,3,(3*90+45)*4+3,(5*90+89)*4+3]){const bad={...r.image,data:Uint8Array.from(r.image.data)};bad.data[at]^=1;assert.throws(()=>assertPngPixelContract(encodePng(bad),committed,record));}const crc=Buffer.from(committed);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,committed,record));assert.throws(()=>assertPngPixelContract(encodePng({...r.image,width:89}),committed,record));assert.throws(()=>preparePool2(Buffer.concat([source,Buffer.from('x')])));
});

import {beforePool2} from './pool2-preservation.mjs';
test('exact source projection rejects unrelated width/ID/source and preserves immutable prepared records',()=>{const p='src/world/cove-terrain.ts',b=readFileSync(p);assert.equal(beforePool2(p,b).equals(readFileSync(root+'baseline/cove-terrain.ts')),true);for(const bad of [Buffer.concat([b,Buffer.from('unrelated')]),Buffer.from(b.toString().replace("body.width !== 90","body.width !== 91")),Buffer.from(b.toString().replace("'cove-pool-stone-2'","'cove-pool-stone-1'"))])assert.throws(()=>beforePool2(p,bad));assert.equal(hash(readFileSync(root+'preparation.json')),'4f9380ad29d8908bea4a25b50741109b18634c78a424dbd2caf537f86fb3193a');});
