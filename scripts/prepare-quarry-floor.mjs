// Reproduce the sealed owner-approved floor from immutable project-local inputs.
// Same source-specific classifier and rational sampling as Gfit1/prepare.py.
// Node encoder emits different PNG bytes; independently derive approved RGBA,
// validate the sealed exact approved PNG, then preserve that encoding verbatim.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statfsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePng } from './spelling-stickers.mjs';
import { mkdirSync } from 'node:fs';
const root = 'assets/source/quarry/floor-v1/';
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(process.argv[2], 'Explicit output directory required');
const raw=readFileSync(root+'source.png');
const tableBytes=readFileSync(root+'approved-donor-table.json');
const canonical=readFileSync(root+'approved-native.png');
const storage=statfsSync(process.env.TMPDIR);assert.ok(storage.bavail*storage.bsize>=2*1024**3,'Stop below2GiB');
assert.equal(hash(readFileSync(root+'owner-approval.json')),'eccb8c706f1f137772c642309bd4a3d648b3c920ca4d5501efb0f942a990d839');
assert.equal(hash(raw),'c8e1061038cb3355543a00e55692bf4e6beedbadb83cdbfc8005f80a35fc277f');
assert.equal(hash(tableBytes),'079198f38667452fd3eba6b88a1ed531bd8188d4d98dd8262bdc385b36732f43');
assert.equal(hash(canonical),'a36989f622677db21173d5c1bf2fa4025bfb4fd95df1c7278d28119639981fa9');
const source=decodePng(raw), {width:w,height:h,data}=source;
assert.deepEqual([w,h,source.channels],[2170,725,3]);
const key=new Uint8Array(w*h), exterior=new Uint8Array(w*h), queue=new Int32Array(w*h);
for(let i=0;i<w*h;i++) { const [r,g,b]=data.subarray(i*4,i*4+3);
  key[i]=Number(r>=220&&b>=200&&g<=50&&r-g>=170&&b-g>=150&&Math.abs(r-b)<=40); }
for(let x=0;x<w;x++)assert.ok(key[x]&&key[(h-1)*w+x]);
for(let y=0;y<h;y++)assert.ok(key[y*w]&&key[y*w+w-1]);
let end=1;queue[0]=0;exterior[0]=1;
const visit=i=>{if(i>=0&&key[i]&&!exterior[i]){exterior[i]=1;queue[end++]=i;}};
for(let n=0;n<end;n++) { const i=queue[n], x=i%w,y=Math.floor(i/w);
  if(x)visit(i-1);if(x+1<w)visit(i+1);if(y)visit(i-w);if(y+1<h)visit(i+w); }
assert.equal(end,1059967);
let x0=w,y0=h,x1=0,y1=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!exterior[y*w+x]) {x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
assert.deepEqual([x0,y0,x1,y1],[91,225,2079,484]);
const sw=x1-x0,W=820,H=Math.ceil((y1-y0)*W/sw), native=new Uint8Array(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
  const xx=x0+Math.floor((2*x+1)*sw/(2*W)), yy=y0+Math.floor((2*y+1)*sw/(2*W)),i=(y*W+x)*4;
  if(yy<y1){native.set(data.subarray((yy*w+xx)*4,(yy*w+xx)*4+3),i);native[i+3]=exterior[yy*w+xx]?0:255;}
}
const out=native.slice(),cells=JSON.parse(tableBytes).cells,ids=new Set();assert.equal(cells.length,48);
for(const c of cells) {
  const [x,y]=c.native,[dx,dy]=c.unalteredSourceDonorNative,i=(y*W+x)*4,d=(dy*W+dx)*4;
  assert.equal(x,0);assert.ok(y<100);assert.deepEqual([dx,dy],[1,y]);assert.ok(!ids.has(i));ids.add(i);
  for(const [n,s]of [[c.native,c.source],[c.unalteredSourceDonorNative,c.unalteredSourceDonorCoordinate]])assert.deepEqual(s,[91+Math.floor((2*n[0]+1)*1988/1640),225+Math.floor((2*n[1]+1)*1988/1640)]);
  assert.deepEqual([...native.subarray(i,i+4)],c.RGBA);assert.deepEqual([...native.subarray(d,d+4)],c.proposedRGBA);
  assert.equal(native[i+3],255);assert.equal(native[d+3],255);out.set(native.subarray(d,d+3),i);
}
let rgb=0,alpha=0,same=0;
for(let i=0;i<out.length;i+=4){const changed=out[i]!==native[i]||out[i+1]!==native[i+1]||out[i+2]!==native[i+2];rgb+=Number(changed);alpha+=Number(out[i+3]!==native[i+3]);same+=Number(!changed&&out[i+3]===native[i+3]);}
assert.deepEqual([rgb,alpha,same],[48,0,87692]);
for(let i=3;i<820*100*4;i+=4)assert.equal(out[i],255);
assert.equal(hash(out),'9ed5ec56a821dc6c5e00de900ab434a0259b43632e68af0f0b052ec5991f1bdc');
const approved=decodePng(canonical);assert.deepEqual([approved.width,approved.height],[820,107]);assert.deepEqual(out,approved.data);
const directory=resolve(process.argv[2]);mkdirSync(directory,{recursive:true});
const output=resolve(directory,'floor-820.png');
writeFileSync(output,canonical);
console.log(JSON.stringify({status:'PASS_INDEPENDENT_NODE_REPRODUCTION',output,PNGsha256:hash(canonical),RGBAsha256:hash(out),RGBEditedPixels:rgb,alphaEditedPixels:alpha,otherIdenticalPixels:same,node:process.version},null,2));
