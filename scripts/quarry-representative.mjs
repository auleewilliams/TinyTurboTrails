import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { decodePng } from './spelling-stickers.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
function checked(bytes) {
 assert.ok(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'PNG signature');let offset=8;
 while(offset<bytes.length){const n=bytes.readUInt32BE(offset),end=offset+n+12;assert.ok(end<=bytes.length,'PNG length');assert.equal(crc32(bytes.subarray(offset+4,end-4)),bytes.readUInt32BE(end-4),'PNG CRC');offset=end;}
 assert.equal(offset,bytes.length);return decodePng(bytes);
}
/** Same-centre inverse nearest sampling on BOTH axes, full bounds, transparent ceil canvas. */
export function wholeSample(source, box, num, den) {
 assert.ok(Number.isInteger(num)&&num>0&&Number.isInteger(den)&&den>0,'one positive isotropic scale');
 const [x0,y0,x1,y1]=box,width=Math.round((x1-x0)*num/den),height=Math.ceil((y1-y0)*num/den),data=new Uint8Array(width*height*4);
 assert.equal(width,(x1-x0)*num/den,'exact target width');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=x0+Math.floor((2*x+1)*den/(2*num)),sy=y0+Math.floor((2*y+1)*den/(2*num));
  if(sx>=x1||sy>=y1)continue;const i=(sy*source.width+sx)*4;data.set(source.data.subarray(i,i+4),(y*width+x)*4);
 }
 for(let x=0;x<width;x++)assert.equal(data[x*4+3],255,'full standing rim');
 assert.ok(data.some((v,i)=>i%4===3&&v===0),'real underside alpha');return {width,height,data};
}
export function prepareRepresentative(contractBytes, read) {
 assert.equal(hash(contractBytes),'5730085531c0ac914f97effc1bc3f6f11cbdd01f56de15b6b402c53d8692ac7d','exact source-specific representative contract');const contract=JSON.parse(contractBytes),result={};
 for(const [path,pin]of Object.entries({...contract.frozenGameplay,...contract.frozenS}))assert.equal(hash(read(path)),pin,'frozen gameplay/S');
 for(const [file,p]of Object.entries(contract.files)){
  const raw=read(p.source);assert.equal(hash(raw),p.sourceSHA256,'immutable whole source');const source=checked(raw);let box=p.sourceBBoxExclusive??[0,0,source.width,source.height];
  if(file==='carriage-96.png'){
   const {width:w,height:h,data}=source,exterior=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
   const eligible=i=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2];return r>=220&&b>=200&&g<=50&&r-g>=170&&b-g>=150&&Math.abs(r-b)<=40;};
   const add=i=>{if(!exterior[i]&&eligible(i)){exterior[i]=1;queue[tail++]=i;}};
   for(let x=0;x<w;x++){assert.ok(eligible(x)&&eligible((h-1)*w+x),'declared border');add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){assert.ok(eligible(y*w)&&eligible(y*w+w-1),'declared border');add(y*w);add(y*w+w-1);}
   while(head<tail){const i=queue[head++],x=i%w;if(x)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<w*(h-1))add(i+w);}
   let minX=w,minY=h,maxX=-1,maxY=-1;for(let i=0;i<w*h;i++){assert.ok(!eligible(i)||exterior[i],'no internal magenta');data[i*4+3]=exterior[i]?0:255;if(!exterior[i]){minX=Math.min(minX,i%w);maxX=Math.max(maxX,i%w);minY=Math.min(minY,Math.floor(i/w));maxY=Math.max(maxY,Math.floor(i/w));}}
   assert.deepEqual([minX,minY,maxX+1,maxY+1],box,'whole source bounds');
  }
  const out=wholeSample(source,box,...p.scale);assert.deepEqual([out.width,out.height],p.size,'whole isotropic dimensions');
  if(file==='carriage-96.png')assert.ok(out.height<=18,'carriage envelope');
  assert.equal(hash(out.data),p.RGBAsha256,'exact original sampled RGB/alpha');
  const bytes=read(`public/assets/quarry/representative-v1/${file}`);assert.equal(hash(bytes),p.PNGsha256,'prepared PNG identity');const decoded=checked(bytes);assert.deepEqual([...decoded.data],[...out.data],'independent prepared RGBA equality');result[file]={...out,bytes};
 }
 return result;
}
