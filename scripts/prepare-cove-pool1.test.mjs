import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preparePool1} from './cove-pool1.mjs';
import {decodePng,encodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
import {assertPngPixelContract} from './png-pixel-contract.mjs';
const root='assets/source/cove/pool1-b-v1/',hash=b=>createHash('sha256').update(b).digest('hex'),source=readFileSync(root+'source.png');
test('whole natural pool1 uniform scale trims ONLY a transparent last row with NO repairs',()=>{
 const r=preparePool1(source),key=removeEdgeKey(decodePng(source)).image,raw=modeDownsample(key,{x:289,y:487,width:958,height:6*958/100},100,6);assert.equal(r.scale,958/100);assert.equal(r.sourcePaintOutsideWindow,0);assert.equal(r.repairs,0);assert.equal(r.transparentBottomRowsRemoved,1);assert.deepEqual(r.rowOpaque,[100,100,98,95,74,0]);assert.deepEqual([r.image.width,r.image.height],[100,5]);assert.equal(Buffer.from(r.image.data).equals(Buffer.from(raw.data.slice(0,100*5*4))),true,'every unmodified native RGBA matches shared whole sampler');for(let x=0;x<100;x++)assert.equal(raw.data[(5*100+x)*4+3],0);
 for(let x=0;x<100;x++){assert.equal(r.image.data[x*4+3],255);let last=-1;for(let y=0;y<5;y++)if(r.image.data[(y*100+x)*4+3])last=y;assert.ok(last<5);for(let y=0;y<=last;y++)assert.equal(r.image.data[(y*100+x)*4+3],255);}
 const record=JSON.parse(readFileSync(root+'preparation.json')),committed=readFileSync(root+'prepared/platform.png'),publicCopy=readFileSync('public/assets/cove/pool1-b-v1/platform.png');assert.equal(hash(committed),record.pngSha256);assert.equal(committed.equals(publicCopy),true);assert.equal(encodePng(r.image).equals(encodePng(preparePool1(source).image)),true);assertPngPixelContract(encodePng(r.image),committed,record);
 for(const at of [0,3,(3*100+45)*4+3,(4*100+99)*4+3]){const bad={...r.image,data:Uint8Array.from(r.image.data)};bad.data[at]^=1;assert.throws(()=>assertPngPixelContract(encodePng(bad),committed,record));}const crc=Buffer.from(committed);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,committed,record));assert.throws(()=>assertPngPixelContract(encodePng({...r.image,width:99}),committed,record));assert.throws(()=>preparePool1(Buffer.concat([source,Buffer.from('x')])));
});


import {beforePool1} from './pool1-preservation.mjs';
test('exact source projection rejects unrelated width/ID/source and retains actual quality/request pins',()=>{const p='src/world/cove-terrain.ts',b=readFileSync(p);assert.equal(beforePool1(p,b).equals(readFileSync(root+'baseline/cove-terrain.ts')),true);for(const bad of [Buffer.concat([b,Buffer.from('unrelated')]),Buffer.from(b.toString().replace("body.width !== 100","body.width !== 101")),Buffer.from(b.toString().replace("'cove-pool-stone-1'","'cove-pool-stone-2'"))])assert.throws(()=>beforePool1(p,bad));assert.equal(hash(readFileSync(root+'preparation.json')),'6bed7858e23895d58856f229d6f58076018f152907efa0194e228d18efbcb032');const record=JSON.parse(readFileSync(root+'preparation.json'));assert.equal(record.requestedQuality,'medium');assert.equal(record.reportedQuality,'low');assert.equal(JSON.parse(readFileSync(root+'generation-result.json')).reported_quality,'low');for(const [p,h]of Object.entries(record.bindings))assert.equal(hash(readFileSync(root+p)),h);});

test('pool1 provenance truthfully identifies its current role and actual native dimensions',()=>{
 const record=JSON.parse(readFileSync(root+'preparation.json'));
 assert.equal(record.currentReuseRole,'cove-pool-stone-1 native100x5');
 assert.deepEqual([record.width,record.height],[100,5]);
 const actual=preparePool1(source).image;
 assert.deepEqual([actual.width,actual.height],[record.width,record.height]);
});
