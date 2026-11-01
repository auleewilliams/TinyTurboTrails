import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareBay3} from './cove-bay3.mjs';
import {decodePng,encodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
import {assertPngPixelContract} from './png-pixel-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),root='assets/source/cove/bay3-b-v1/',source=readFileSync(root+'source.png');
test('whole natural bay3 retains all paint and ONLY three authorized endpoint repairs',()=>{
 const r=prepareBay3(source),key=removeEdgeKey(decodePng(source)).image,raw=modeDownsample(key,{x:47,y:393,width:1442,height:30*721/90},180,30);
 assert.equal(r.image.width,180);assert.equal(r.image.height,30);assert.equal(r.sourcePaintOutsideWindow,0);assert.equal(r.scale,721/90);assert.equal(r.repairs.length,3);
 const repairs=new Map(r.repairs.map(p=>[p.y*180+p.x,p]));assert.deepEqual([...repairs.keys()].sort((a,b)=>a-b),[0,1,180]);
 for(let p=0;p<180*30;p++){const before=[...raw.data.slice(p*4,p*4+4)],after=[...r.image.data.slice(p*4,p*4+4)];if(!repairs.has(p)){assert.deepEqual(after,before);continue;}const v=repairs.get(p);assert.equal(before[3],0);assert.deepEqual(v.before,before);const d=(v.donor[1]*180+v.donor[0])*4;assert.deepEqual(after,[...raw.data.slice(d,d+4)]);assert.deepEqual(v.after,after);}
 assert.deepEqual(r.repairs.map(p=>[p.x,p.y,p.donor]),[[0,0,[2,0]],[1,0,[2,0]],[0,1,[1,1]]]);
 const caps=JSON.parse(readFileSync(root+'caps.json'));for(let x=0;x<180;x++){assert.equal(r.image.data[x*4+3],255);let bottom=-1;for(let y=0;y<30;y++)if(r.image.data[(y*180+x)*4+3])bottom=y;assert.ok(bottom<caps[x]);for(let y=0;y<=bottom;y++)assert.equal(r.image.data[(y*180+x)*4+3],255);}
 const record=JSON.parse(readFileSync(root+'preparation.json')),committed=readFileSync(root+'prepared/platform.png'),publicCopy=readFileSync('public/assets/cove/bay3-b-v1/platform.png');assert.equal(hash(committed),record.pngSha256);assert.equal(committed.equals(publicCopy),true);assert.equal(encodePng(r.image).equals(encodePng(prepareBay3(source).image)),true);assertPngPixelContract(encodePng(r.image),committed,record);
 for(const at of [0,3,(10*180+60)*4+3,(29*180+179)*4+3]){const bad={...r.image,data:Uint8Array.from(r.image.data)};bad.data[at]^=1;assert.throws(()=>assertPngPixelContract(encodePng(bad),committed,record));}const crc=Buffer.from(committed);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,committed,record));assert.throws(()=>assertPngPixelContract(encodePng({...r.image,width:179}),committed,record));assert.throws(()=>prepareBay3(Buffer.concat([source,Buffer.from('x')])));
});

import {beforeBay3} from './bay3-preservation.mjs';
test('exact bay3 projection/record pins reject unrelated width/source/ID edits',()=>{const p='src/world/cove-terrain.ts',b=readFileSync(p);assert.equal(beforeBay3(p,b).equals(readFileSync(root+'baseline/cove-terrain.ts')),true);for(const bad of [Buffer.concat([b,Buffer.from('unrelated')]),Buffer.from(b.toString().replace("body.width !== 180","body.width !== 181")),Buffer.from(b.toString().replace("'cove-bay-ledge-3'","'cove-pool-stone-1'"))])assert.throws(()=>beforeBay3(p,bad));assert.equal(hash(readFileSync(root+'preparation.json')),'124b88ab5025254e72b5770450c12e29d8990c29339cd85196c1c73074989bf5');assert.equal(hash(readFileSync(root+'caps.json')),'66f447ff54778a923e6d6e7e76082b8469a4bdb5e01cade0424f9b391fd09807');});
