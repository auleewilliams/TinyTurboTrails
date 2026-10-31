import { observeCoveMaterialFill, coveMaterialContact, coveMaterialSelection, coveMaterialHenryContract } from './cove-material-probe';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { transformSync } from 'rolldown/utils';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { COVE_LOWER, COVE_RETURN } from './cove-pilot';
import { startCove, driveCove, observeCove } from './cove-browser-pilot';
import type { CoveMaterialAssets } from '../src/world/surface-materials';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
const henryManifest = JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8'));
const henryPng = readFileSync(new URL(`../public/assets/henry/${henryManifest.image}`, import.meta.url));
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs');
const henryImage = decodePng(henryPng);
const henryContract = coveMaterialHenryContract(henryManifest, henryImage.data, henryImage.width);
const atlas = readFileSync(new URL('../public/assets/cove/materials/atlas.png', import.meta.url)).toString('base64');
const code = transformSync('surface-materials.ts', readFileSync(new URL('../src/world/surface-materials.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/\bexport /g, ''), {}).code;

for (const width of [426, 320]) test(`Cove generated materials use forward reverse input and paused reduced motion at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  const evidence = observeCove(page, info);
  await page.addInitScript(({ manifest, sky, fillObserverSource, contactSource, selectionSource, henryContract, henryImageName }) => {
    const observeFill = new Function(`return (${fillObserverSource});`)() as typeof observeCoveMaterialFill;
    const contact = new Function(`return (${contactSource});`)() as typeof coveMaterialContact;
    const select = new Function(`return (${selectionSource});`)() as typeof coveMaterialSelection;
    type Draw = { index: number; x: number; y: number; width: number; sx: number; alpha: number; ripple: boolean };
    const probe = { direction: 'forward', henrySeen: false, henry: undefined as Parameters<typeof coveMaterialContact>[0], firstCrossings: [] as {key:string}[], frame: [] as Draw[], captures: [] as { key: string; status: string; draw: Draw; png: string; css: object; backing: number[] }[],
      last: [] as Draw[], sample: false, samples: [] as { draws: Draw[]; pixels: number[]; status: string }[] };
    Object.assign(window, { coveMaterialProbe: probe });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x,y,w,h) {
      observeFill(probe, this.canvas.id, x, y, w, h, this.fillStyle, sky);
      if (!probe.henrySeen) probe.henry = undefined;
      fill.call(this,x,y,w,h);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>) {
      const [image,sx,sy,sw,sh,dx,dy,dw,dh] = args;
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.endsWith(`/assets/henry/${henryImageName}`) && sw === 48 && sh === 48 && this.globalAlpha > 0) {
        const m=this.getTransform();probe.henrySeen=true;probe.henry={sx,sy,sw,sh,x:dx,y:dy,width:dw,height:dh,alpha:this.globalAlpha,matrix:[m.a,m.b,m.c,m.d,m.e,m.f]};
      }
      if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.src.endsWith('/assets/cove/materials/atlas.png')) {
        const index = manifest.bands.findIndex((b: { base: { y: number }; ripple?: { y: number } }) => b.base.y === sy || b.ripple?.y === sy);
        if (index >= 0 && sw === dw && sh === dh) probe.frame.push({ index, x: dx, y: dy, width: dw, sx, alpha: this.globalAlpha, ripple: sh === 4 });
      }
      Reflect.apply(draw,this,args);
    } as typeof draw;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(now => {
      callback(now);
      const canvas = document.querySelector<HTMLCanvasElement>('#game'), status = document.querySelector('#status')?.textContent ?? '';
      if (!canvas) return;
      probe.last = probe.frame;
      if (probe.sample && probe.samples.length < 160) {
        const water = probe.frame.find(d => !d.ripple && d.index === 3);
        if (water) {
          const x = Math.max(0,Math.ceil(water.x)+2), y = Math.ceil(water.y)+2, w = Math.min(426-x,water.width-4);
          if (w > 12 && y >= 0 && y+4 < 240) probe.samples.push({ draws: structuredClone(probe.frame), status,
            pixels: [...canvas.getContext('2d')!.getImageData(x,y,w,4).data] });
        }
      }
      if (!status.includes('Playing') || !probe.henrySeen) return;
      const x = Number(status.match(/X (-?\d+)/)?.[1]), velocity = Number(status.match(/V (-?\d+)/)?.[1]);
      if (probe.direction === 'forward' ? velocity <= 20 : velocity >= -20) return;
      for (const d of probe.frame.filter(d => !d.ripple)) {
        const band = manifest.bands[d.index], progress = (x-band.x1)/(band.x2-band.x1);
        if (progress < 0 || progress >= 1 || d.y < 0 || d.y+8 > 240) continue;
        const region = progress < 1/3 ? 'entry' : progress < 2/3 ? 'centre' : 'exit', key = `${probe.direction}-${d.index}-${region}`;
        const plane=contact(probe.henry,d,Number(status.match(/F (-?\d+)/)?.[1]),henryContract);
        const choice=select(key,plane,probe.firstCrossings,probe.captures);
        if(!choice.first&&!choice.grounded)continue;
        const rect = canvas.getBoundingClientRect();
        const record={key,status,draw:d,contact:plane,henry:probe.henry,png:canvas.toDataURL(),css:{width:rect.width,height:rect.height},backing:[canvas.width,canvas.height]};
        if(choice.first)probe.firstCrossings.push(record);if(choice.grounded)probe.captures.push(record);
      }
    });
  }, { manifest, sky: SANDY_COVE.theme.sky, fillObserverSource: observeCoveMaterialFill.toString(), contactSource:coveMaterialContact.toString(), selectionSource:coveMaterialSelection.toString(), henryContract, henryImageName:henryManifest.image });
  let crossingsAttached=false;
  const attachCrossings = async () => {
    const p=await page.evaluate(() => (window as unknown as {coveMaterialProbe:{captures:{key:string;png:string;contact:{kind:string}}[];firstCrossings:{key:string;png:string;contact:{kind:string}}[]}}).coveMaterialProbe);
    for(const [scope,rows]of [['first-crossing-diagnostic',p.firstCrossings],['grounded-witness',p.captures]]as const)
      for(const row of rows)await info.attach(`${scope}-${row.key}-${row.contact.kind}`,{body:Buffer.from(row.png.split(',')[1],'base64'),contentType:'image/png'});
    await info.attach('retained-crossings-even-on-failure',{body:JSON.stringify({firstCrossings:p.firstCrossings.map(({png:_png,...c})=>c),captures:p.captures.map(({png:_png,...c})=>c)}),contentType:'application/json'});
    crossingsAttached=true;
  };
  try {
  await startCove(page);
  await driveCove(page, COVE_LOWER.slice(0,2)); // unchanged normal-input route; stop at its existing2070 checkpoint
  const sample = async (frames: number) => page.evaluate(async frames => {
    const p = (window as unknown as { coveMaterialProbe: { sample: boolean; samples: unknown[] } }).coveMaterialProbe;
    p.samples = []; p.sample = true;
    for (let i=0;i<frames;i++) await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    p.sample = false; return p.samples;
  }, frames) as Promise<{ draws: { index: number; ripple: boolean; sx: number; alpha: number }[]; pixels: number[]; status: string }[]>;
  const moving = await sample(40);
  await info.attach('moving-actual-material-samples-before-assertions',{body:JSON.stringify(moving),contentType:'application/json'});
  expect(moving.length).toBeGreaterThan(20);
  expect(new Set(moving.map(s => JSON.stringify(s.pixels))).size).toBeGreaterThan(1);
  expect(moving.every(s => s.draws.some(d => d.index === 3 && d.ripple))).toBe(true);
  expect(new Set(moving.map(s => JSON.stringify(s.draws.filter(d => d.index === 3 && d.ripple).map(d => ({ sx: d.sx, alpha: d.alpha }))))).size).toBeGreaterThan(1);
  expect(new Set(moving.map(s => JSON.stringify(s.draws.filter(d => !d.ripple)))).size).toBe(1);
  await page.keyboard.press('Escape'); await expect(page.locator('#status')).toContainText('Paused');
  const paused = await sample(6);
  await info.attach('paused-actual-material-samples-before-assertions',{body:JSON.stringify(paused),contentType:'application/json'}); expect(paused.length).toBeGreaterThan(2);
  expect(new Set(paused.map(s => JSON.stringify(s.draws))).size).toBe(1);
  expect(new Set(paused.map(s => JSON.stringify(s.pixels))).size).toBe(1);
  await page.getByRole('button',{ name:'Resume',exact:true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await sample(8);
  await info.attach('reduced-actual-material-samples-before-assertions',{body:JSON.stringify(reduced),contentType:'application/json'}); expect(reduced.length).toBeGreaterThan(2);
  expect(new Set(reduced.map(s => JSON.stringify(s.draws))).size).toBe(1);
  expect(new Set(reduced.map(s => JSON.stringify(s.pixels))).size).toBe(1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Established project focus EVENT boundary. Headless tab activation emitted no
  // browser focus signals; this does NOT certify native OS/tab focus behavior.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#status')).toHaveText('Paused · Return to the game to continue');
  const unfocused = await sample(6);
  await info.attach('unfocused-actual-material-samples-before-assertions',{body:JSON.stringify(unfocused),contentType:'application/json'}); expect(unfocused.length).toBeGreaterThan(2);
  expect(unfocused.every(s => s.pixels.length > 0
    && s.draws.some(d => d.index === 3 && !d.ripple)
    && s.draws.some(d => d.index === 3 && d.ripple)
    && s.status === 'Paused · Return to the game to continue')).toBe(true);
  expect(new Set(unfocused.map(s => JSON.stringify(s.draws))).size).toBe(1);
  expect(new Set(unfocused.map(s => JSON.stringify(s.pixels))).size).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#status')).toContainText('Playing');
  const focusEvidence = { scope: 'DOM blur/focus event-boundary through existing application handlers',
    actualNativeOsOrTabFocus: 'UNPERFORMED', samples: unfocused };
  await driveCove(page,COVE_LOWER.slice(2)); await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button',{ name:'Build your word',exact:true }).click();
  await page.getByRole('button',{ name:'Find more letters',exact:true }).click();
  await page.evaluate(()=>{(window as unknown as { coveMaterialProbe: { direction: string } }).coveMaterialProbe.direction='reverse';});
  await driveCove(page,COVE_RETURN);
  // RETURN ends at280. A normal held Left (no new waypoint pilot/state injection)
  // traverses the remaining initial dune so the30px patch has reverse witnesses.
  await page.keyboard.down('ArrowLeft');
  try { await expect.poll(async()=>Number((await page.locator('#status').innerText()).match(/X (-?\d+)/)?.[1])).toBeLessThan(65); }
  finally { await page.keyboard.up('ArrowLeft'); }
  const observations = await page.evaluate(() => {
    const p=(window as unknown as {coveMaterialProbe:{captures:unknown[];firstCrossings:unknown[]}}).coveMaterialProbe;
    return {captures:p.captures,firstCrossings:p.firstCrossings};
  }) as {captures:{key:string;png:string;backing:number[];css:{width:number};status:string;draw:{index:number};contact:{kind:string;footY:number;bandY:number}}[];firstCrossings:{key:string;png:string;contact:{kind:string}}[]};
  const captures=observations.captures;
  await attachCrossings();
  await info.attach('all-material-crossings-before-assertions',{body:JSON.stringify({ ...observations,
    captures:captures.map(({png:_png,...c})=>c),firstCrossings:observations.firstCrossings.map(({png:_png,...c})=>c),
    henryManifestSha256:createHash('sha256').update(readFileSync(new URL('../public/assets/henry/manifest.json',import.meta.url))).digest('hex'),
    henryPngSha256:createHash('sha256').update(henryPng).digest('hex'),henryContract,
    scope:'exact rendered logical anchor contact plus shipped source-alpha feet; PNGs require actual gameplay visual inspection' }),contentType:'application/json'});
  const expected = ['forward','reverse'].flatMap(direction=>manifest.bands.flatMap((_: unknown,index: number)=>['entry','centre','exit'].map(region=>`${direction}-${index}-${region}`)));
  expect(captures.map(c=>c.key).sort()).toEqual(expected.sort());
  expect(observations.firstCrossings.map(c=>c.key).sort()).toEqual(expected.sort());
  for(const c of captures){expect(c.contact.kind).toBe('GROUNDED');expect(c.contact.footY).toBe(c.contact.bandY);}
  for(const c of captures){expect(Number(c.status.match(/Y (-?\d+)/)?.[1])+34).toBe(manifest.bands[c.draw.index].top);expect(c.backing).toEqual([426,240]);expect(c.css.width).toBeCloseTo(width,1);await info.attach(c.key+'-actual-game-native',{body:Buffer.from(c.png.split(',')[1],'base64'),contentType:'image/png'});}
  await info.attach('actual-input-material-observations',{body:JSON.stringify({ captures:captures.map(({png:_png,...c})=>c), moving, paused, reduced, unfocused, focusEvidence }),contentType:'application/json'});
  await evidence.paint('materials-reverse-dune-css');await evidence.finish(browser.version());
  } finally { if(!crossingsAttached)await attachCrossings(); }
});

test('Cove actual material rasters retain contiguous coverage and fixed bases at fractional cameras', async ({ page, browser }, info) => {
  // Isolated PRODUCTION renderer raster fixture with generated source; NOT input gameplay/time replay.
  await page.setContent('<canvas width="426" height="240"></canvas>');
  await page.addScriptTag({content:`${code}\nwindow.materialRaster={drawSurfaceMaterials,validateCoveMaterials};`});
  const result = await page.evaluate(async ({manifest,atlas,level})=>{
    const helper=(window as unknown as {materialRaster:{drawSurfaceMaterials:(ctx:CanvasRenderingContext2D,level:typeof SANDY_COVE,offset:{x:number;y:number},kit:CoveMaterialAssets,time:number,reduced:boolean)=>void;validateCoveMaterials:(m:unknown)=>void}}).materialRaster;
    helper.validateCoveMaterials(manifest);const image=new Image();image.src=`data:image/png;base64,${atlas}`;await image.decode();
    const kit={image,manifest},ctx=document.querySelector('canvas')!.getContext('2d',{willReadFrequently:true})!;ctx.imageSmoothingEnabled=false;
    const source=document.createElement('canvas');source.width=512;source.height=160;const sc=source.getContext('2d')!;sc.drawImage(image,0,0);
    const pixels=sc.getImageData(0,0,512,160).data;let opaqueSamples=0,transparentSourceExcluded=0,motionChanges=0,frames=0;const errors:object[]=[];
    for(const band of manifest.bands)for(const fraction of[0,.25,.5,.75]){
      const offset={x:band.x1-10+fraction,y:band.top-40+fraction};
      const render=(time:number,reduced=false)=>{ctx.clearRect(0,0,426,240);helper.drawSurfaceMaterials(ctx,level,offset,kit,time,reduced);frames++;return [...ctx.getImageData(0,0,426,240).data];};
      const a=render(0),b=render(1),frozen=render(1),reducedA=render(1,true),reducedB=render(3,true);
      if(JSON.stringify(b)!==JSON.stringify(frozen)||JSON.stringify(reducedA)!==JSON.stringify(reducedB))errors.push({kind:'time/reduced freeze',fraction,x1:band.x1});
      if(band.material==='water'&&JSON.stringify(a)!==JSON.stringify(b))motionChanges++;
      if(band.material==='sand'&&JSON.stringify(a)!==JSON.stringify(b))errors.push({kind:'sand moved',fraction});
      for(let x=14;x<Math.min(420,band.base.width+6);x++)for(const y of[41]){
        const sx=Math.floor(x+.5-10+fraction),sy=Math.floor(y+.5-40+fraction);
        let opaque=true;
        for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)if(pixels[((band.base.y+sy+oy)*512+sx+ox)*4+3]!==255)opaque=false;
        if(!opaque){transparentSourceExcluded++;continue;}opaqueSamples++;
        if(a[(y*426+x)*4+3]!==255)errors.push({kind:'internal coverage gap',fraction,x,y,alpha:a[(y*426+x)*4+3]});
      }
      // Above/below and beyond authored bounds remain clear; alpha feather is intentional inside.
      for(const[x,y]of[[8,42],[12,38],[12,49]])if(a[(y*426+x)*4+3]!==0)errors.push({kind:'outside band',fraction,x,y});
    }
    return {errors,opaqueSamples,transparentSourceExcluded,motionChanges,frames,png:ctx.canvas.toDataURL(),scope:'isolated actual-source production renderer raster; fixture time parameters; no gameplay replay'};
  },{manifest,atlas,level:SANDY_COVE});
  await info.attach('materials-raster-observations',{body:JSON.stringify({...result,png:undefined,browser:browser.version()}),contentType:'application/json'});
  await info.attach('materials-raster-fixture-not-gameplay',{body:Buffer.from(result.png.split(',')[1],'base64'),contentType:'image/png'});
  expect(result.opaqueSamples).toBeGreaterThan(1000);expect(result.motionChanges).toBe(12);expect(result.frames).toBe(100);expect(result.errors).toEqual([]);
});

for(const resource of ['manifest.json','atlas.png'])test(`Cove material ${resource} failure recovers through ordinary Retry`,async({page},info)=>{
  let fail=true;
  const blocked:string[]=[], recovered:{resource:string;status:number;bytes:number;sha256:string}[]=[], pending:Promise<void>[]=[];
  const requestPhase=new WeakMap<object,boolean>();
  page.on('request',request=>requestPhase.set(request,!fail));
  page.on('response',response=>{
    const name=response.url().split('/').pop()!;
    if(!response.url().includes('/assets/cove/materials/')||!['manifest.json','atlas.png'].includes(name)||!requestPhase.get(response.request()))return;
    pending.push((async()=>{const bytes=await response.body();recovered.push({resource:name,status:response.status(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});})());
  });
  await page.route(`**/assets/cove/materials/${resource}`,async route=>{
    if(fail){blocked.push(route.request().url());await route.abort();}else await route.continue();
  });
  await page.goto('/?debug=1');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect.poll(()=>blocked.length).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'Retry loading',exact:true})).toBeVisible();
  fail=false;
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.getByRole('button',{name:'Retry loading',exact:true}).click()]);
  await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();await page.getByRole('button',{name:'Play SANDY COVE',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  await Promise.all(pending);
  for(const name of ['manifest.json','atlas.png']){
    const actual=readFileSync(new URL(`../public/assets/cove/materials/${name}`,import.meta.url));
    expect(recovered).toContainEqual({resource:name,status:200,bytes:actual.length,sha256:createHash('sha256').update(actual).digest('hex')});
  }
  expect(blocked.every(url=>url.endsWith(`/assets/cove/materials/${resource}`))).toBe(true);
  await info.attach('material-retry-actual-request-response-bindings',{body:JSON.stringify({blocked,recovered}),contentType:'application/json'});
});
