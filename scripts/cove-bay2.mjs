import { createHash } from 'node:crypto';
import { decodePng, encodePng } from './spelling-stickers.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function validateBay2Image(image){
 if(image.width!==160||image.height!==35)throw Error('Whole bay2 dimensions');
 for(let x=0;x<160;x++){if(image.data[x*4+3]!==255)throw Error('Whole bay2 flat top');let bottom=-1;for(let y=0;y<35;y++)if(image.data[(y*160+x)*4+3])bottom=y;for(let y=0;y<=bottom;y++)if(image.data[(y*160+x)*4+3]!==255)throw Error('Whole bay2 internal hole');}
 if(hash(image.data)!=='2586197f928142b5027c1d6213820336c565f5ea935c646b6f22a0b693b51653')throw Error('Whole bay2 outline/RGBA differs');
}
export function prepareBay2(bytes){
 if(hash(bytes)!=='e1809f4f247e693c96968ce7661e2e2126d46d28567b032e534634ee6a2b94cc')throw Error('Changed approved whole source');
 const source=decodePng(bytes);if(source.width!==140||source.height!==30)throw Error('Source size');
 const image={width:160,height:35,data:new Uint8Array(160*35*4)},covered=new Set();let opaque=0;
 for(let y=0;y<35;y++)for(let x=0;x<160;x++){
  const sx=Math.floor((x+.5)*7/8),sy=Math.floor((y+.5)*7/8);if(sx>=140||sy>=30)continue;
  const at=(sy*140+sx)*4;image.data.set(source.data.subarray(at,at+4),(y*160+x)*4);if(source.data[at+3]){covered.add(sy*140+sx);opaque++;}
 }
 if(covered.size!==2621)throw Error('Lost approved opaque source pixels');validateBay2Image(image);
 return {image,png:encodePng(image),sourceOpaquePixelsRepresented:covered.size,opaquePixelsDropped:0,outlineMaskedPixels:0,outputOpaquePixels:opaque};
}
