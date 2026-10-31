import {createHash} from 'node:crypto';
import {decodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function prepareBay3(bytes){
 if(hash(bytes)!=='2d7e2101f1363fc4a219ed4e9e51617677ee4ba15703bf12c931b3f3119d5e69')throw Error('Changed bay3 generated source');
 const keyed=removeEdgeKey(decodePng(bytes)).image,scale=721/90,window={x:47,y:393,width:1442,height:30*scale},image=modeDownsample(keyed,window,180,30);
 let sourcePaintOutsideWindow=0;for(let y=0;y<keyed.height;y++)for(let x=0;x<keyed.width;x++)if(keyed.data[(y*keyed.width+x)*4+3]&&(x<47||x>=1489||y<393||y>=393+Math.floor(window.height)))sourcePaintOutsideWindow++;
 if(sourcePaintOutsideWindow)throw Error('Whole bay3 paint crop');
 const beforeRgbaSha256=hash(image.data),repairs=[];
 for(const [x,y,dx,dy] of [[0,0,2,0],[1,0,2,0],[0,1,1,1]]){const at=(y*180+x)*4,donor=(dy*180+dx)*4;if(image.data[at+3]!==0||image.data[donor+3]!==255)throw Error('Unexpected bay3 repair eligibility');const before=[...image.data.slice(at,at+4)],after=[...image.data.slice(donor,donor+4)];image.data.set(after,at);repairs.push({x,y,donor:[dx,dy],before,after});}
 return {image,scale,window,sourcePaintOutsideWindow,beforeRgbaSha256,afterRgbaSha256:hash(image.data),repairs};
}
