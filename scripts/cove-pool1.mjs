import {createHash} from 'node:crypto';
import {decodePng,removeEdgeKey} from './spelling-stickers.mjs';
import {modeDownsample} from './interface-kit.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function preparePool1(bytes){
 if(hash(bytes)!=='6f5b53354c9d846b0a7821bd473e44b0d5f7d3cd7e548fe54d6d6ecd1a13337b')throw Error('Changed original generated shallow source');
 const keyed=removeEdgeKey(decodePng(bytes)).image,scale=958/100,window={x:289,y:487,width:958,height:6*scale},raw=modeDownsample(keyed,window,100,6);
 let sourcePaintOutsideWindow=0;for(let y=0;y<keyed.height;y++)for(let x=0;x<keyed.width;x++)if(keyed.data[(y*keyed.width+x)*4+3]&&(x<289||x>=1247||y<487||y>=487+Math.floor(window.height)))sourcePaintOutsideWindow++;
 if(sourcePaintOutsideWindow)throw Error('Whole shallow source paint crop');
 const rowOpaque=Array.from({length:6},(_,y)=>{let n=0;for(let x=0;x<100;x++)if(raw.data[(y*100+x)*4+3])n++;return n;});
 if(rowOpaque[5]!==0)throw Error('Opaque bottom row cannot trim');
 const image={width:100,height:5,data:raw.data.slice(0,100*5*4)};
 return {image,scale,window,sourcePaintOutsideWindow,rowOpaque,transparentBottomRowsRemoved:1,repairs:0,rawRgbaSha256:hash(raw.data)};
}
