import {createHash} from 'node:crypto';
import {decodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function preparePool2(bytes){
 if(hash(bytes)!=='b871de8b554c4ec1cb84842161dab324de4087a8784e459ab5823b4443080331')throw Error('Changed original generated shallow source');
 const keyed=removeEdgeKey(decodePng(bytes)).image,scale=1058/90,window={x:239,y:487,width:1058,height:7*scale},raw=modeDownsample(keyed,window,90,7);
 let sourcePaintOutsideWindow=0;for(let y=0;y<keyed.height;y++)for(let x=0;x<keyed.width;x++)if(keyed.data[(y*keyed.width+x)*4+3]&&(x<239||x>=1297||y<487||y>=487+Math.floor(window.height)))sourcePaintOutsideWindow++;
 if(sourcePaintOutsideWindow)throw Error('Whole shallow source paint crop');
 const rowOpaque=Array.from({length:7},(_,y)=>{let n=0;for(let x=0;x<90;x++)if(raw.data[(y*90+x)*4+3])n++;return n;});
 if(rowOpaque[6]!==0)throw Error('Opaque bottom row cannot trim');
 const image={width:90,height:6,data:raw.data.slice(0,90*6*4)};
 return {image,scale,window,sourcePaintOutsideWindow,rowOpaque,transparentBottomRowsRemoved:1,repairs:0,rawRgbaSha256:hash(raw.data)};
}
