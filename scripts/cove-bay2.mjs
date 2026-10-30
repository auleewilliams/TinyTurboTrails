import { createHash } from 'node:crypto';
import { decodePng, encodePng, removeEdgeKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';
export const bay2Caps = Array.from({length:160},(_,x)=>x<78?30:x<122?12:18);
export const bay2Mask = bay2Caps.map((v,x)=>Math.min(v,4+2*x,4+2*(159-x)));
const hash = b => createHash('sha256').update(b).digest('hex');
export function validateBay2Image(image) {
  if(image.width!==160||image.height!==30)throw Error('Bay2 dimensions');
  for(let x=0;x<160;x++){
    if(image.data[x*4+3]!==255)throw Error('Bay2 full top');let bottom=-1;
    for(let y=0;y<30;y++)if(image.data[(y*160+x)*4+3]){if(y>=bay2Mask[x])throw Error('Bay2 cap/mask');bottom=y;}
    for(let y=0;y<=bottom;y++)if(image.data[(y*160+x)*4+3]!==255)throw Error('Bay2 internal hole');
  }
}
export function prepareBay2(bytes) {
  if(hash(bytes)!=='9f233313fccf660149ee7734172089e4adda39b671b1d2142d2bc699603929be')throw Error('Bay2 changed source');
  const source=decodePng(bytes);if(source.width!==1536||source.height!==1024)throw Error('Bay2 source size');
  const keyed=removeEdgeKey(source).image,raw=modeDownsample(keyed,{x:128,y:392,width:1280,height:240},160,30);
  const image={...raw,data:Uint8Array.from(raw.data)};let nativeOpaquePixelsMasked=0,nativeOpaquePixelsRetained=0,sourcePaintOutsideCrop=0,sourcePaintInsideCropOutsideMask=0;
  for(let y=0;y<30;y++)for(let x=0;x<160;x++){const i=(y*160+x)*4;if(y>=bay2Mask[x]&&raw.data[i+3]){nativeOpaquePixelsMasked++;image.data.fill(0,i,i+4);}if(image.data[i+3])nativeOpaquePixelsRetained++;}
  for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)if(keyed.data[(y*1536+x)*4+3]){if(x<128||x>=1408||y<392||y>=632)sourcePaintOutsideCrop++;else if(y-392>=bay2Mask[Math.floor((x-128)/8)]*8)sourcePaintInsideCropOutsideMask++;}
  validateBay2Image(image);return {raw,image,loss:{sourcePaintOutsideCrop,sourcePaintInsideCropOutsideMask,nativeOpaquePixelsMasked,nativeOpaquePixelsRetained},png:encodePng(image)};
}
