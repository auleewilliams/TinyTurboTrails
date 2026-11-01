import { createHash } from 'node:crypto';
import {decodePng} from './spelling-stickers.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
/** Whole-area uniform centre-inverse NN; hollow is explicitly a surface RGB adaptation. */
export function prepareRemaining(sourceBytes,atlasBytes){
 if(hash(sourceBytes)!=="e1809f4f247e693c96968ce7661e2e2126d46d28567b032e534634ee6a2b94cc"||hash(atlasBytes)!=="2aa8847a4538069e4207661b424ff71ddd74af3dbc7d391c19f550e73d40fe4a")throw Error('Changed approved source/mask');
 const source=decodePng(sourceBytes),atlas=decodePng(atlasBytes),pool3={width:90,height:18,data:new Uint8Array(90*18*4)},hollow={width:140,height:6,data:new Uint8Array(140*6*4)},covered=new Set();
 for(let y=0;y<20;y++)for(let x=0;x<90;x++){const sx=Math.floor((x+.5)*14/9),sy=Math.floor((y+.5)*14/9);if(sy>=30)continue;const at=(sy*140+sx)*4;if(y>=18){if(source.data[at+3])throw Error('Opaque bottom trim');continue;}pool3.data.set(source.data.subarray(at,at+4),(y*90+x)*4);if(source.data[at+3])covered.add(sy*140+sx);}
 const mask={"x": 256, "y": 126, "width": 140, "height": 6};
 for(let y=0;y<6;y++)for(let x=0;x<140;x++){const at=(y*140+x)*4,a=atlas.data[((mask.y+y)*atlas.width+mask.x+x)*4+3];if(a){if(source.data[at+3]!==255)throw Error('Uncovered hollow texture eligibility');hollow.data.set(source.data.subarray(at,at+3),at);hollow.data[at+3]=a;}}
 return {pool3,hollow,representedOpaqueSourcePixels:covered.size};
}
