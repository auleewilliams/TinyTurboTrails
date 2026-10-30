import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { prepareBay2, validateBay2Image } from './cove-bay2.mjs';
const source=readFileSync('assets/source/cove/bay2-mask-v1/source.png');
test('real source crop/mask keeps full flat top, source colours, no holes, gem gap and exact loss',()=>{
 const r=prepareBay2(source);validateBay2Image(r.image);
 assert.equal(r.loss.sourcePaintOutsideCrop,11772);
 for(let x=0;x<160;x++)assert.equal(r.image.data[x*4+3],255);
 for(let i=0;i<r.image.data.length;i+=4)if(r.image.data[i+3])assert.equal(Buffer.from(r.image.data.slice(i,i+4)).equals(Buffer.from(r.raw.data.slice(i,i+4))),true);
 assert.equal(260+12+3,275,'reserved gem top, 3px gap');
 assert.equal(prepareBay2(source).png.equals(prepareBay2(source).png),true);
});
test('rejects top/holes/caps/source corruption without filler',()=>{
 const r=prepareBay2(source);
 for(const [x,y,a]of [[0,0,0],[40,2,0],[90,12,255]]){const bad={...r.image,data:Uint8Array.from(r.image.data)};bad.data[(y*160+x)*4+3]=a;assert.throws(()=>validateBay2Image(bad));}
 assert.throws(()=>prepareBay2(Buffer.concat([source,Buffer.from('x')])));
});

test('strict pixel reproduction, immutable committed copies and crossencoder-safe family contract',async()=>{
 const { createHash }=await import('node:crypto');const { assertPngPixelContract }=await import('./png-pixel-contract.mjs');const {encodePng,decodePng}=await import('./spelling-stickers.mjs');
 const hash=b=>createHash('sha256').update(b).digest('hex'),record=JSON.parse(readFileSync('assets/source/cove/bay2-mask-v1/preparation.json'));
 const generated=prepareBay2(source).png,prepared=readFileSync('assets/source/cove/bay2-mask-v1/prepared/platform.png'),publicCopy=readFileSync('public/assets/cove/bay2-mask-v1/platform.png');
 assert.equal(hash(prepared),record.pngSha256);assert.equal(hash(publicCopy),record.pngSha256);assert.equal(prepared.equals(publicCopy),true);
 const spec={width:160,height:30,pixelSha256:record.pixelSha256};assertPngPixelContract(generated,prepared,spec);assertPngPixelContract(generated,publicCopy,spec);
 const r=prepareBay2(source);assert.deepEqual(r.loss,record.loss);assert.equal(hash(r.image.data),record.pixelSha256);
 const wrong=decodePng(generated);wrong.data[4]^=1;assert.throws(()=>assertPngPixelContract(encodePng(wrong),prepared,spec));
 const crc=Buffer.from(generated);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,prepared,spec));
 assert.throws(()=>assertPngPixelContract(generated.subarray(0,-1),prepared,spec));
});

test('exact new reverse delta preserves original bay1 oracle and rejects unrelated edits',async()=>{
 const {beforeBay2}=await import('./bay2-preservation.mjs');const {beforeBay1}=await import('./bay1-preservation.mjs');
 const current=readFileSync('src/world/cove-terrain.ts'),baseline=readFileSync('assets/source/cove/bay2-mask-v1/baseline/cove-terrain.ts');
 assert.equal(beforeBay2('src/world/cove-terrain.ts',current).equals(baseline),true);
 assert.equal(beforeBay1('src/world/cove-terrain.ts',baseline).equals(readFileSync('assets/source/cove/bay1-b-v1/baseline/cove-terrain.ts')),true);
 for(const bad of [Buffer.concat([current,Buffer.from('\n// unrelated')]),Buffer.from(current.toString().replace('body.width !== 160','body.width !== 159'))])assert.throws(()=>beforeBay2('src/world/cove-terrain.ts',bad));
 const movement=readFileSync('src/game/movement.ts');assert.equal(beforeBay2('src/game/movement.ts',movement),movement);
});

test('valid alternate compression is accepted while alpha/dimensions/profile corruption fails',async()=>{
 const {assertPngPixelContract}=await import('./png-pixel-contract.mjs');const {encodePng,decodePng}=await import('./spelling-stickers.mjs');const{inflateSync,deflateSync,crc32}=await import('node:zlib');
 const committed=readFileSync('public/assets/cove/bay2-mask-v1/platform.png'),record=JSON.parse(readFileSync('assets/source/cove/bay2-mask-v1/preparation.json')),spec={width:160,height:30,pixelSha256:record.pixelSha256};
 const idatLength=committed.readUInt32BE(33),payload=deflateSync(inflateSync(committed.subarray(41,41+idatLength)),{level:1}),chunk=Buffer.alloc(payload.length+12);
 chunk.writeUInt32BE(payload.length);chunk.write('IDAT',4);payload.copy(chunk,8);chunk.writeUInt32BE(crc32(chunk.subarray(4,-4)),chunk.length-4);
 const alternate=Buffer.concat([committed.subarray(0,33),chunk,committed.subarray(45+idatLength)]);
 assert.equal(alternate.equals(committed),false);assertPngPixelContract(alternate,committed,spec);
 const alpha=decodePng(committed);alpha.data[3]=254;assert.throws(()=>assertPngPixelContract(encodePng(alpha),committed,spec));
 const width=decodePng(committed);width.width=159;width.data=width.data.slice(0,159*30*4);assert.throws(()=>assertPngPixelContract(encodePng(width),committed,spec));
 const profile=Buffer.from(committed);profile[24]=16;profile.writeUInt32BE(crc32(profile.subarray(12,29)),29);assert.throws(()=>assertPngPixelContract(profile,committed,spec));
});
