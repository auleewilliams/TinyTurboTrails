import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareRemaining} from './cove-remaining-two.mjs';
import {decodePng,encodePng} from './spelling-stickers.mjs';
import {assertPngPixelContract} from './png-pixel-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=readFileSync('assets/source/cove/bay1-b-v1/prepared/platform.png'),atlas=readFileSync('public/assets/cove/terrain-kit/atlas.png');
test('two actual artifacts preserve whole uniform pool3 and EXACT hollow alpha',()=>{
 const r=prepareRemaining(source,atlas),s=decodePng(source),a=decodePng(atlas),m=JSON.parse(readFileSync('public/assets/cove/terrain-kit/manifest.json')).platforms['hollow-140'];
 assert.equal(r.pool3.width,90);assert.equal(r.pool3.height,18);assert.equal(r.hollow.width,140);assert.equal(r.hollow.height,6);
 for(let y=0;y<20;y++)for(let x=0;x<90;x++){const sx=Math.floor((x+.5)*14/9),sy=Math.floor((y+.5)*14/9),p=(sy*140+sx)*4;if(y>=18){assert.equal(sy<30?s.data[p+3]:0,0);continue;}const at=(y*90+x)*4;assert.deepEqual([...r.pool3.data.slice(at,at+4)],sy<30?[...s.data.slice(p,p+4)]:[0,0,0,0]);}
 for(let y=0;y<6;y++)for(let x=0;x<140;x++){const at=(y*140+x)*4,alpha=a.data[((m.y+y)*a.width+m.x+x)*4+3];assert.equal(r.hollow.data[at+3],alpha);if(alpha)assert.deepEqual([...r.hollow.data.slice(at,at+3)],[...s.data.slice(at,at+3)]);}
 for(const image of [r.hollow,r.pool3])for(let x=0;x<image.width;x++){assert.equal(image.data[x*4+3],255);let bottom=-1;for(let y=0;y<image.height;y++)if(image.data[(y*image.width+x)*4+3])bottom=y;for(let y=0;y<=bottom;y++)assert.equal(image.data[(y*image.width+x)*4+3],255);}
 assert.ok(r.representedOpaqueSourcePixels<2621);assert.ok(r.representedOpaqueSourcePixels>900);
 const rawRecord=readFileSync('assets/source/cove/remaining-two-v1/preparation.json');assert.equal(hash(rawRecord),'38688927321923fd6c26de2c50176671995e845405f3fdf4d50b8d6c5e9be40f');const records=JSON.parse(rawRecord);
 let maximum=0;for(let x=0;x<90;x++)for(let y=0;y<18;y++)if(r.pool3.data[(y*90+x)*4+3])maximum=Math.max(maximum,y+1);assert.equal(maximum,17);
 assert.equal(hash(readFileSync('assets/source/cove/remaining-two-v1/source.png')),hash(source));
 for(const name of ['hollow','pool3']){const generated=encodePng(r[name]),again=encodePng(prepareRemaining(source,atlas)[name]),committed=readFileSync(`assets/source/cove/remaining-two-v1/prepared/${name}.png`),publicCopy=readFileSync(`public/assets/cove/remaining-two-v1/${name}.png`),record=records.outputs[name];assert.equal(generated.equals(again),true);assert.equal(committed.equals(publicCopy),true);assert.equal(hash(committed),record.pngSha256);assertPngPixelContract(generated,committed,{width:r[name].width,height:r[name].height,pixelSha256:record.pixelSha256});
 for(const channel of [0,3,(Math.floor(r[name].height/2)*r[name].width+Math.floor(r[name].width/2))*4+3,(r[name].width*r[name].height-1)*4+3]){const bad={...r[name],data:Uint8Array.from(r[name].data)};bad.data[channel]^=1;assert.throws(()=>assertPngPixelContract(encodePng(bad),committed,record));}const crc=Buffer.from(generated);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,committed,record));assert.throws(()=>assertPngPixelContract(encodePng({...r[name],width:r[name].width-1}),committed,record));}
 assert.throws(()=>prepareRemaining(Buffer.concat([source,Buffer.from('x')]),atlas));const badAtlas=Buffer.from(atlas);badAtlas[30]^=1;assert.throws(()=>prepareRemaining(source,badAtlas));
});

import {beforeRemainingTwo} from './remaining-two-preservation.mjs';
test('exact current projection rejects unrelated source/ID/geometry changes',()=>{const p='src/world/cove-terrain.ts',b=readFileSync(p);assert.equal(beforeRemainingTwo(p,b).equals(readFileSync('assets/source/cove/remaining-two-v1/baseline/cove-terrain.ts')),true);for(const bad of [Buffer.concat([b,Buffer.from('\n// unrelated')]),Buffer.from(b.toString().replace("body.width !== width","body.width !== width + 1")),Buffer.from(b.toString().replace("'cove-pool-stone-3'","'cove-pool-stone-1'"))])assert.throws(()=>beforeRemainingTwo(p,bad));const level=readFileSync('src/world/sandy-cove.ts');assert.equal(beforeRemainingTwo('src/world/sandy-cove.ts',level),level);});
