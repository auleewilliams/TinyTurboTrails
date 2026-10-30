import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareBay2,validateBay2Image} from './cove-bay2.mjs';
import {decodePng,encodePng} from './spelling-stickers.mjs';
import {assertPngPixelContract} from './png-pixel-contract.mjs';
import {beforeWholeBay2,beforeWholeBay2Level} from './whole-bay2-preservation.mjs';
const root='assets/source/cove/bay2-whole-v1/',source=readFileSync(root+'source.png'),hash=b=>createHash('sha256').update(b).digest('hex');
test('wholeapprovedsource is uniform8/7 with zeroopaqueedge/bodyloss and noRGBpainting',()=>{
 const r=prepareBay2(source),s=decodePng(source);assert.equal(r.sourceOpaquePixelsRepresented,2621);assert.equal(r.opaquePixelsDropped,0);assert.equal(r.outlineMaskedPixels,0);assert.equal(r.outputOpaquePixels,3421);
 for(let y=0;y<35;y++)for(let x=0;x<160;x++){const sx=Math.floor((x+.5)*7/8),sy=Math.floor((y+.5)*7/8),a=(y*160+x)*4;if(sy<30)assert.equal(Buffer.from(r.image.data.slice(a,a+4)).equals(Buffer.from(s.data.slice((sy*140+sx)*4,(sy*140+sx)*4+4))),true);else assert.equal(r.image.data[a+3],0);}
 validateBay2Image(r.image);assert.equal(prepareBay2(source).png.equals(r.png),true);
 const record=JSON.parse(readFileSync(root+'preparation.json')),prepared=readFileSync(root+'prepared/platform.png'),publicCopy=readFileSync('public/assets/cove/bay2-whole-v1/platform.png');
 assert.equal(hash(prepared),record.pngSha256);assert.equal(hash(publicCopy),record.pngSha256);assert.equal(prepared.equals(publicCopy),true);assertPngPixelContract(r.png,prepared,{width:160,height:35,pixelSha256:record.pixelSha256});
});
test('rejects top/body/outlineRGB/dimension/source/CRC corruption without masking or fillers',()=>{
 const r=prepareBay2(source);for(const [x,y,a]of[[0,0,0],[70,10,0],[0,34,255]]){const b={...r.image,data:Uint8Array.from(r.image.data)};b.data[(y*160+x)*4+3]=a;assert.throws(()=>validateBay2Image(b));}
 assert.throws(()=>prepareBay2(Buffer.concat([source,Buffer.from('x')])));
 const record=JSON.parse(readFileSync(root+'preparation.json')),spec={width:160,height:35,pixelSha256:record.pixelSha256};
 const rgb={...r.image,data:Uint8Array.from(r.image.data)};rgb.data[0]^=1;assert.throws(()=>assertPngPixelContract(encodePng(rgb),r.png,spec));
 assert.throws(()=>assertPngPixelContract(encodePng({...r.image,width:159,data:r.image.data.slice(0,159*35*4)}),r.png,spec));
 const crc=Buffer.from(r.png);crc[29]^=1;assert.throws(()=>assertPngPixelContract(crc,r.png,spec));assert.throws(()=>assertPngPixelContract(r.png.subarray(0,-1),r.png,spec));
});
test('exactsource and completelevel normalizers permit ONLY wholeassetlinkage and ONE bonusgem',()=>{
 for(const p of ['src/world/cove-terrain.ts','src/world/sandy-cove.ts']){const b=readFileSync(p);assert.equal(beforeWholeBay2(p,b).equals(readFileSync(root+'baseline/'+p.split('/').at(-1))),true);assert.throws(()=>beforeWholeBay2(p,Buffer.concat([b,Buffer.from('\n// unrelated')])));}
 const level=JSON.parse(readFileSync(root+'baseline/level.json'));level.entities.find(e=>e.id==='cove-bonus-4').y=242;assert.equal(beforeWholeBay2Level(level).entities.find(e=>e.id==='cove-bonus-4').y,299);
 for(const change of [v=>v.entities.find(e=>e.id==='cove-bonus-4').x++,v=>v.entities.find(e=>e.id==='cove-bonus-3').y++,v=>v.entities.push({...v.entities[0],id:'extra'}),v=>v.platforms[0].width++,v=>v.entities.find(e=>e.id==='cove-bonus-4').id='changed']){const bad=structuredClone(level);change(bad);assert.throws(()=>beforeWholeBay2Level(bad));}
 const movement=readFileSync('src/game/movement.ts');assert.equal(beforeWholeBay2('src/game/movement.ts',movement),movement);
});
