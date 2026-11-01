import { beforePlainsContour } from './plains-contour-preservation.mjs';
import { beforeRemainingTwo } from './remaining-two-preservation.mjs';
import { beforeWholeBay2 } from './whole-bay2-preservation.mjs';
import { beforeBay2 } from './bay2-preservation.mjs';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';
import { assertPngPixelContract } from './png-pixel-contract.mjs';
import { beforeBay1 } from './bay1-preservation.mjs';
import { beforeWaterLanding } from './water-landing-preservation.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { decodePng, removeEdgeKey, isChromaKey } from './spelling-stickers.mjs';
import { modeDownsample } from './interface-kit.mjs';
import { prepareCoveMaterials } from './cove-materials.mjs';
const root = new URL('../assets/source/cove/materials/', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = read('source.png'), record = JSON.parse(read('preparation.json'));
const result = prepareCoveMaterials(bytes, record);
const pixel = (im, x, y) => [...im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4)];

test('measured source has seven native roles at one exact isotropic 16:1 scale, never fit whole centre objects', () => {
  assert.equal(hash(bytes), 'f2f3e0497d2e4808b397d2dc707b1448aafaa53f5218474b97e321b49ff7fe11');
  const image = decodePng(bytes); assert.deepEqual([image.width, image.height], [1448, 1086]);
  const expected = { 'water-left': [8,8], 'water-repeat': [48,8], 'water-right': [8,8], 'water-ripples': [48,4], 'sand-left': [6,8], 'sand-repeat': [24,8], 'sand-right': [6,8] };
  assert.deepEqual(Object.keys(record.pieces).sort(), Object.keys(expected).sort());
  for (const [name, part] of Object.entries(record.pieces)) {
    assert.deepEqual([part.width, part.height], expected[name]);
    assert.equal(part.crop.width / part.width, 16); assert.equal(part.crop.height / part.height, 16);
  }
  assert.equal(record.pieces['water-repeat'].crop.width, 768);
  assert.equal(record.pieces['sand-repeat'].crop.width, 384);
  const bad = structuredClone(record); bad.pieces['sand-repeat'].width = 25; bad.pieces['sand-repeat'].crop.width = 400;
  assert.throws(() => prepareCoveMaterials(bytes, bad), /native role/);
});

test('real source RGBA preparation reproduces exact shipped pixels, retains cream and eliminates key/fringes', () => {
  const committed = read('prepared/atlas.png');
  assertPngPixelContract(result.png, committed, { width: 512, height: 160,
    pixelSha256: JSON.parse(read('prepared/pixel-hashes.json')).pixelSha256 });
  assert.deepEqual(committed, readFileSync(new URL('../public/assets/cove/materials/atlas.png', import.meta.url)));
  assert.equal(result.pixelSha256, JSON.parse(read('prepared/pixel-hashes.json')).pixelSha256);
  assert.deepEqual(prepareCoveMaterials(bytes, record).png, result.png);
  let clear = 0, cream = 0, partial = 0;
  for (let i = 0; i < result.image.data.length; i += 4) {
    const [r,g,b,a] = result.image.data.subarray(i,i+4);
    if (!a) { clear++; assert.equal(r+g+b,0); }
    else { assert.equal(isChromaKey(r,g,b),false); if(r>220&&g>190&&b>130)cream++; if(a<255)partial++; }
  }
  assert.ok(clear>1000); assert.ok(cream>100); assert.ok(partial>100);
  assert.throws(() => prepareCoveMaterials(Buffer.alloc(0), record), /source/);
  const bad = structuredClone(record); bad.pieces['water-repeat'].crop.height++;
  assert.throws(() => prepareCoveMaterials(bytes,bad), /isotropic/);
});

test('every native RGB value is independently derived from its actual source window; feathering changes alpha only', () => {
  const source = removeEdgeKey(decodePng(bytes)).image;
  for (const [name, part] of Object.entries(record.pieces)) {
    const native = modeDownsample(source, part.crop, part.width, part.height), rect = result.manifest.pieces[name];
    let nonempty=0;
    for(let y=0;y<part.height;y++)for(let x=0;x<part.width;x++){
      const actual=pixel(result.image,rect.x+x,rect.y+y), expected=pixel(native,x,y);
      assert.deepEqual(actual.slice(0,3),expected.slice(0,3),`${name} RGB ${x},${y}`);
      if(actual[3])nonempty++;
      if(name!=='water-ripples'&&y===0)assert.ok(actual[3]>0,`${name} native top coverage`);
    }
    assert.ok(nonempty>0,name);
  }
});

test('full strips preserve native caps, world-X mirrored repeats and partial remainder pixels on all five spans', () => {
  const mirror=(x,w)=>{const n=x%(w*2);return n<w?n:w*2-n-1;};
  assert.deepEqual(result.manifest.bands.map(b=>b.x2-b.x1),[30,80,200,300,180]);
  for(const band of result.manifest.bands){
    const width=band.x2-band.x1,cap=band.material==='sand'?6:8,base=band.base;
    for(let x=0;x<width;x++)for(let y=0;y<8;y++){
      const kind=x<cap?'left':x>=width-cap?'right':'repeat',p=result.manifest.pieces[`${band.material}-${kind}`];
      const sx=kind==='left'?x:kind==='right'?x-width+cap:mirror(band.x1+x,p.width);
      assert.deepEqual(pixel(result.image,base.x+x,base.y+y),pixel(result.image,p.x+sx,p.y+y));
      if(x>=cap&&x<width-cap&&y<6)assert.equal(pixel(result.image,base.x+x,base.y+y)[3],255,'opaque readable interior');
    }
    // Native cap seams must stay within the same material palette at every row.
    for(const x of [cap,width-cap])for(let y=0;y<8;y++){
      const a=pixel(result.image,base.x+x,base.y+y),b=pixel(result.image,base.x+x-1,base.y+y);
      // Compare visible joins on both backgrounds. The deliberately feathered
      // bottom has alpha85, so unassociated RGB alone overstates its contrast.
      for (const background of [[255,245,220],[20,52,68]]) {
        const composite = p => p.slice(0,3).map((v,i)=>Math.round(v*p[3]/255+background[i]*(1-p[3]/255)));
        const ca=composite(a),cb=composite(b);
        const contrast=Math.max(...ca.map((v,i)=>Math.abs(v-cb[i])));
        // One generated cream glint ends at row1; distinguish that isolated
        // painted highlight from a vertical material/coverage seam.
        if(contrast>100){
          assert.equal(band.material,'water');assert.equal(x,cap);assert.equal(y,1);
          assert.ok([a,b].some(p=>p[0]>220&&p[1]>190&&p[2]>130),'actual isolated source cream glint');
          assert.equal(a[3],255);assert.equal(b[3],255);
        }
      }
    }
    if(band.ripple){let visible=0;for(let x=0;x<band.ripple.width;x++)for(let y=0;y<4;y++)if(pixel(result.image,x,band.ripple.y+y)[3])visible++;assert.ok(visible>10,'actual generated ripple layer nonempty');}
  }
});

test('generation record preserves requested versus returned size and literal prompt', () => {
  const generation=JSON.parse(read('generation-record.json'));
  assert.deepEqual(generation.prompt_requested_canvas,[1024,768]);assert.equal(generation.tool_requested_size,'1536x1024');
  assert.deepEqual(generation.actual_size,[1448,1086]);assert.equal(generation.reported_quality,'medium');
  assert.match(read('executed-generation-prompt.txt').toString(),/UNIFORM ISOTROPIC 6x/);
});

test('current feature record pins exact presentation deltas and every unrelated1687 source/art byte', () => {
  assert.equal(hash(read('prechange-byte-pins.json')),'9f563f442fdf0f593502af648f37ba434b6b47e338b4f4bd4876c0a801d84449','immutable1687 baseline catalog');
  const pins=JSON.parse(read('prechange-byte-pins.json')), feature=JSON.parse(read('current-presentation.json'));
  assert.equal(feature.baselineRevision,'1687f5525b757221b47a21287f6b8c48e5403ae0');
  assert.deepEqual(Object.keys(feature.files).sort(),['public/assets/cove/manifest.json','src/world/assets.ts','src/world/renderer.ts','src/world/surface-materials.ts']);
  const check=(path,bytes)=>assert.equal(hash(beforeWaterLanding(path, beforeBay1(path, beforeBay2(path, beforeWholeBay2(path, beforeRemainingTwo(path, beforeOwnerHud(path, beforePlainsContour(path, bytes)))))))),feature.files[path]?.currentSha256??pins.files[path],path);
  for(const[path,baseline]of Object.entries(pins.files)){
    if(feature.files[path]){assert.equal(feature.files[path].baselineSha256,baseline);assert.equal(hash(read(feature.files[path].baselineCopy)),baseline);}
    check(path,readFileSync(new URL(`../${path}`,import.meta.url)));
    if (path === 'src/world/level.ts') for (const [from, to] of [["[150, 'flowers']", "[151, 'flowers']"], ["[2342, 'flowers']", "[2343, 'flowers']"], ["[2342, 'flowers']", "[2342, 'stone']"]]) {
      const bytes = readFileSync(new URL('../' + path, import.meta.url)), bad = Buffer.from(bytes.toString().replace(from, to));
      assert.notDeepEqual(bad, bytes);
      assert.throws(() => check(path, bad), { code: 'ERR_ASSERTION' });
    }
  }
  for(const path of ['src/world/surface-materials.ts','src/world/sandy-cove.ts','src/game/movement.ts']){
    const bytes=readFileSync(new URL(`../${path}`,import.meta.url));
    assert.throws(()=>check(path,Buffer.concat([bytes,Buffer.from('\n// unapproved edit')])) ,{code:'ERR_ASSERTION'});
  }
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json',import.meta.url)));
  for(const mutate of [m=>m.surfaceKit='other.json',m=>m.anchors.tree.y++,m=>m.extra=true]){
    const bad=structuredClone(manifest);mutate(bad);assert.throws(()=>check('public/assets/cove/manifest.json',Buffer.from(JSON.stringify(bad))),{code:'ERR_ASSERTION'});
  }
});
