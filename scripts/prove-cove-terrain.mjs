import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { transformSync } from 'rolldown/utils';
import { createHash } from 'node:crypto';
import { decodePng, encodePng } from './spelling-stickers.mjs';

// Software unit compositions of actual production-helper draw operations.
// These are asset/constraint proofs, never browser screenshots or gameplay evidence.
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/prove-cove-terrain.mjs TASK_EVIDENCE_DIRECTORY');
await mkdir(destination, { recursive: true });
const names = ['game/movement.ts', 'game/platforms.ts', 'world/sandy-cove.ts', 'world/cove-terrain.ts'];
const code = (await Promise.all(names.map(async name => transformSync(name,
  (await readFile(`src/${name}`, 'utf8')).replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code))).join('\n');
const { ground, platform, level, bodies, groundY } = new Function(`${code}\nreturn { ground: drawCoveGround, platform: drawCovePlatform, level: SANDY_COVE, bodies: platformBodiesAt(SANDY_COVE.platforms,0), groundY: coveGroundY };`)();
const atlas = decodePng(await readFile('public/assets/cove/terrain-kit/atlas.png'));
const manifest = JSON.parse(await readFile('public/assets/cove/terrain-kit/manifest.json', 'utf8'));
const kit = { image: atlas, manifest };
const records = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function emit(name, image, detail) {
  const png = encodePng(image); await writeFile(`${destination}/${name}.png`, png);
  records.push({ name, width: image.width, height: image.height, sha256: hash(png), kind: 'software asset/unit composition, NOT browser or gameplay', ...detail });
}
function canvas(width, height, color) {
  const image = { width, height, data: new Uint8Array(width * height * 4) };
  for (let i = 0; i < width * height; i++) image.data.set([...color, 255], i * 4);
  let matrix = [1, 0, 0, 1, 0, 0], stack = [];
  const ctx = {
    mask: () => true,
    save() { stack.push([...matrix]); }, restore() { matrix = stack.pop(); },
    transform(a, b, c, d, e, f) {
      const [aa, bb, cc, dd, ee, ff] = matrix;
      matrix = [aa*a+cc*b,bb*a+dd*b,aa*c+cc*d,bb*c+dd*d,aa*e+cc*f+ee,bb*e+dd*f+ff];
    },
    translate(x,y) { this.transform(1,0,0,1,x,y); }, scale(x,y) { this.transform(x,0,0,y,0,0); },
    drawImage(source,sx,sy,sw,sh,dx,dy,dw,dh) {
      const [a,b,c,d,e,f] = matrix, det = a*d-b*c;
      const vertices = [[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f]);
      const left=Math.max(0,Math.floor(Math.min(...vertices.map(v=>v[0])))),right=Math.min(width,Math.ceil(Math.max(...vertices.map(v=>v[0]))));
      const top=Math.max(0,Math.floor(Math.min(...vertices.map(v=>v[1])))),bottom=Math.min(height,Math.ceil(Math.max(...vertices.map(v=>v[1]))));
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
        if(!this.mask(x+.5,y+.5))continue;
        const px=x+.5-e,py=y+.5-f,lx=(d*px-c*py)/det,ly=(-b*px+a*py)/det;
        if(lx<dx||ly<dy||lx>=dx+dw||ly>=dy+dh)continue;
        const ix=Math.floor(sx+(lx-dx)*sw/dw),iy=Math.floor(sy+(ly-dy)*sh/dh);
        const at=(iy*source.width+ix)*4,alpha=source.data[at+3]/255,to=(y*width+x)*4;
        for(let ch=0;ch<3;ch++) image.data[to+ch]=Math.round(source.data[at+ch]*alpha+image.data[to+ch]*(1-alpha));
      }
    },
  };
  return { image, ctx };
}
function resize(source,width,height) {
  const out={width,height,data:new Uint8Array(width*height*4)};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const sx=Math.min(source.width-1,Math.floor((x+.5)*source.width/width)),sy=Math.min(source.height-1,Math.floor((y+.5)*source.height/height));
    out.data.set(source.data.subarray((sy*source.width+sx)*4,(sy*source.width+sx)*4+4),(y*width+x)*4);
  }
  return out;
}
for(const [name,color]of [['light',[242,234,211]],['dark',[19,37,44]]]) {
  const proof=canvas(256,128,color);proof.ctx.drawImage(atlas,0,0,256,128,0,0,256,128);
  await emit(`atlas-native-${name}`,proof.image,{});await emit(`atlas-small-${name}`,resize(proof.image,192,96),{scale:.75});
  const widths=canvas(426,190,color);
  for(const [row,width]of [90,100,140,160,180].entries())for(const [column,id]of ['cove-pool-stone-1','cove-pool-stone-3'].entries()) {
    platform(widths.ctx,kit,level,{id,x:8+column*210,y:12+row*36,width,height:10,vx:0,vy:0},{x:0,y:0});
  }
  await emit(`widths-native-${name}`,widths.image,{rowWidths:[90,100,140,160,180],columns:['independently painted thin6','regular12']});
  await emit(`widths-small-${name}`,resize(widths.image,320,143),{scale:320/426});
}
const poses=[['dune',{x:80,y:200}],['hollow',{x:850,y:220}],['water-edge',{x:1580,y:200}],['upper-bay',{x:2940,y:160}],['viewpoint',{x:3740,y:80}]];
for(const [name,offset]of poses) {
  const proof=canvas(426,240,[242,234,211]);
  proof.ctx.mask=(x,y)=>x+offset.x>=level.minX&&x+offset.x<=level.maxX&&y+offset.y>=groundY(level,x+offset.x);
  ground(proof.ctx,kit,level,offset,level.minX,level.maxX);
  proof.ctx.mask=()=>true;
  for(const body of bodies)platform(proof.ctx,kit,level,body,offset);
  await emit(`contour-unit-${name}`,proof.image,{offset,mask:'existing linear contour; software nearest-neighbour rasterizer, no browser antialias claim'});
  await emit(`contour-unit-${name}-small`,resize(proof.image,320,181),{offset,scale:320/426});
}
// Two authentic Henry frame cutouts, composed AFTER the shelf as the real scene does.
const henryManifest=JSON.parse(await readFile('public/assets/henry/manifest.json','utf8'));
const henry=decodePng(await readFile(`public/assets/henry/${henryManifest.image}`));
const proof=canvas(426,120,[19,37,44]),offset={x:900,y:280},shelf=bodies[0];
platform(proof.ctx,kit,level,shelf,offset);
for(const x of [1040,1118]) {
  const foot=groundY(level,x),frame=henryManifest.frames[0];
  proof.ctx.drawImage(henry,frame.x,frame.y,48,48,x-offset.x-24,foot-offset.y-44,48,48);
}
await emit('hollow-visibility-unit',proof.image,{positions:[1040,1118],note:'composed actual idle pixels over shelf; sprite painting order proof, not a claim of nonexistent physical clearance or played route'});
const constraints = [];
for (const body of bodies) {
  const calls = [];
  platform({ save() {}, restore() {}, drawImage(...args) { calls.push(args); } }, kit, level, body, { x: 0, y: 0 });
  const topAlphas = calls.map(([, sx, sy]) => atlas.data[(sy * atlas.width + sx) * 4 + 3]);
  const seamDeltas = [16, body.width - 16].map(boundary => {
    const left = calls[boundary - 1], right = calls[boundary];
    let maxRgbSum = 0;
    for (let y = 0; y < Math.min(left[4], right[4]); y++) {
      const a = ((left[2] + y) * atlas.width + left[1]) * 4, b = ((right[2] + y) * atlas.width + right[1]) * 4;
      if (atlas.data[a + 3] && atlas.data[b + 3]) maxRgbSum = Math.max(maxRgbSum,
        [0, 1, 2].reduce((sum, ch) => sum + Math.abs(atlas.data[a + ch] - atlas.data[b + ch]), 0));
    }
    return { boundary, maxRgbSum };
  });
  constraints.push({ id: body.id, x: body.x, topY: body.y, width: body.width, nominalCollisionHeight: body.height,
    actualTopOpaqueColumns: topAlphas.filter(a => a === 255).length,
    nativeDepths: calls.map(call => call[4]), seamDeltas,
    sourceBoundsChecked: calls.every(call => call[1] >= 0 && call[2] >= 0 && call[1] + call[3] <= atlas.width && call[2] + call[4] <= atlas.height),
    destinationBoundsChecked: calls.every(call => call[5] >= body.x && call[5] + call[7] <= body.x + body.width && call[6] === body.y && call[4] === call[8]) });
}
await writeFile(`${destination}/constraint-diagnostics.json`, `${JSON.stringify({ kind: 'actual prepared-pixel/production-helper unit diagnostics, not gameplay', constraints }, null, 2)}\n`);
const sourceModuleHashes = Object.fromEntries(await Promise.all(names.map(async name => [name, hash(await readFile(`src/${name}`))])));
await writeFile(`${destination}/proof-ledger.json`, `${JSON.stringify({ kind: 'asset/unit proofs only', sourceModuleHashes, records }, null, 2)}\n`);
console.log(JSON.stringify({destination,proofs:records.length,kind:'software asset/unit proofs only; no browser launched'}));
