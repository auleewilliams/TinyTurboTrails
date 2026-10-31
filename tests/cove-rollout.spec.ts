import { createRolloutEvidence } from './cove-rollout-evidence';
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { COVE_ROLLOUT_REGIONS } from './cove-rollout-route';
import { rolloutRoles, changedRolloutRoles } from './cove-rollout-assets';
import { coveRolloutObserverInit } from './cove-rollout-observer';
import { bay1KeyboardPilotInit } from './cove-bay1-input';
import { driveCove } from './cove-browser-pilot';
import { pilotSourceRevision } from './cove-bay1-provenance';
import { createHudResponseObserver } from './hud-response-observation';
import { surfaceY } from '../src/game/movement';
import { SANDY_COVE } from '../src/world/sandy-cove';
const repo=new URL('../',import.meta.url),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
// Filesystem-only binding: no subprocess, Git assumptions or forged revision.
const files: string[] = [];
const visit = (directory: string): void => {for(const entry of readdirSync(new URL(directory+'/',repo),{withFileTypes:true})){const path=directory+'/'+entry.name;if(entry.isDirectory())visit(path);else if(entry.isFile())files.push(path);}};
for(const directory of ['src','tests','scripts','docs','public/assets','assets/source'])visit(directory);
files.push('package.json','package-lock.json','playwright.config.ts','tsconfig.json','vite.config.ts');
const checkpoint=Object.fromEntries(files.sort().map(p=>[p,hash(readFileSync(new URL(p,repo)))]));
const {decodePng}=createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {decodePng(b:Buffer):{width:number;data:Uint8Array}};
const atlas=decodePng(readFileSync(new URL('../public/assets/cove/terrain-kit/atlas.png',import.meta.url)));
const environment=decodePng(readFileSync(new URL('../public/assets/cove/environment.png',import.meta.url)));
const coveManifest=JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json',import.meta.url),'utf8'));
const springFrame=[coveManifest.assets.spring%(environment.width/48)*48,Math.floor(coveManifest.assets.spring/(environment.width/48))*48];
const hollowAlpha=Array.from({length:840},(_,i)=>atlas.data[((126+Math.floor(i/140))*atlas.width+256+i%140)*4+3]);
for(const width of [426,320])for(const region of COVE_ROLLOUT_REGIONS)test(`Cove B ${region.name} ordinary input rests at ${width}px`,async({page,browser},info)=>{
  test.setTimeout(120_000);
  const evidence=createRolloutEvidence(info);
  const sourceRevision=pilotSourceRevision(process.env.BROWSER_REPORT_SOURCE_SHA,info.config.metadata),responses=createHudResponseObserver(),errors:string[]=[];
  page.on('response',responses.observe);page.on('pageerror',e=>errors.push(e.message));
  await evidence.attach('source-checkpoint',{body:JSON.stringify({sourceRevision,checkpoint,node:process.version,native:[426,240],requestedCssWidth:width,region:region.name,capturedRestNames:region.rests.map(r=>r.name),roles:rolloutRoles,distIndexSha256:hash(readFileSync(new URL('../dist/index.html',import.meta.url)))}),contentType:'application/json'});
  await page.setViewportSize({width,height:width===426?300:240});
  await page.addInitScript(coveRolloutObserverInit,{roles:rolloutRoles,hollowAlpha});
  await page.addInitScript(bay1KeyboardPilotInit,[]);
  await page.goto('/?debug=1');await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();await page.getByRole('button',{name:'Play SANDY COVE',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  const associated:Record<string,string>={'cove-hollow-shelf':'cove-bonus-1','cove-pool-stone-1':'cove-gem-16','cove-pool-stone-2':'cove-gem-21'},beforeReward:Record<string,number>={};
  for(const rest of region.rests){
    await driveCove(page,rest.stages);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const sample=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#game')!,r=c.getBoundingClientRect();return {status:document.querySelector('#status')!.textContent!,native:[c.width,c.height],css:{width:r.width,height:r.height},dpr:devicePixelRatio,png:c.toDataURL(),probe:(window as unknown as {coveRolloutProbe:unknown}).coveRolloutProbe};});
    // Retain actual captures/observations BEFORE assertions, including failed rests.
    await evidence.attach(rest.name+'-native',{body:Buffer.from(sample.png.split(',')[1],'base64'),contentType:'image/png'});
    await evidence.observe(rest.name+'-observed',{...sample,png:undefined,expected:rest});
    const css=await page.locator('#game').screenshot();await evidence.attach(rest.name+'-css',{body:css,contentType:'image/png'});await evidence.attach(rest.name+'-decoded-css-size',{body:JSON.stringify({width:css.readUInt32BE(16),height:css.readUInt32BE(20)}),contentType:'application/json'});
    expect(sample.native).toEqual([426,240]);expect(sample.css.width).toBe(width);expect(css.readUInt32BE(16)).toBe(width);
    const status=sample.status.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/)!;expect(status).not.toBeNull();expect(Math.abs(Number(status[1])-rest.x)).toBeLessThan(4);expect(Number(status[3])).toBe(0);
    const feet=Number(status[2])+34; if(rest.pose==='standing')expect(feet).toBe(rest.feet);else expect(Math.abs(feet-surfaceY(SANDY_COVE,Number(status[1])))).toBeLessThanOrEqual(1); // DOM rounds X/Y independently on slopes.
    const probe=sample.probe as unknown as {gemCount:number|null;frame:number;rocks:Record<string,{source:string;args:number[];alphaPixels:number;visiblePixels:number;cameraY:number}>;actor:{alphaPixels:number;visiblePixels:number;overlap:Record<string,number>;oldHollowOverlap:number;headGap:Record<string,number>}|null;entities:{source:string;args:number[];alphaPixels:number;visiblePixels:number}[];seen:string[]};
    const role=rolloutRoles.find(r=>r.id===rest.id)!,rock=probe.rocks[rest.id];expect(probe.frame).toBeGreaterThan(0);expect(rock).toBeDefined();expect(rock.source).toContain(role.path);expect(rock.args.slice(0,4)).toEqual([0,0,role.width,role.height]);expect(rock.args.slice(6)).toEqual([role.width,role.height]);expect(rock.alphaPixels).toBeGreaterThan(role.width);expect(rock.visiblePixels).toBe(rock.alphaPixels);
    expect(probe.actor).not.toBeNull();expect(probe.actor!.alphaPixels).toBeGreaterThan(100);expect(probe.actor!.visiblePixels).toBe(probe.actor!.alphaPixels);
    if(rest.pose==='standing')expect(feet-rock.cameraY).toBeCloseTo(rock.args[5],1);
    if(rest.pose==='underpass'){expect(probe.actor!.overlap[rest.id]).toBe(0);expect(probe.actor!.headGap[rest.id]).toBeGreaterThan(0);}
    if(associated[rest.id]&&(rest.pose==='underpass'||rest.pose==='standing')){const gem=SANDY_COVE.entities.find(e=>e.id===associated[rest.id])!,cameraX=role.x-rock.args[4],present=probe.entities.filter(e=>e.source.includes('/assets/gems/')&&e.args[4]===Math.round(gem.x-cameraX)-16&&e.args[5]===Math.round(gem.y-rock.cameraY)-24);await evidence.attach(rest.name+'-associated-reward',{body:JSON.stringify({id:gem.id,position:[gem.x,gem.y],sourceDraws:present,counter:probe.gemCount}),contentType:'application/json'});expect(probe.gemCount).not.toBeNull();if(rest.pose==='underpass'){expect(present.length).toBeGreaterThan(0);for(const p of present)expect(p.visiblePixels).toBe(p.alphaPixels);beforeReward[rest.id]=probe.gemCount!;}else{expect(present).toHaveLength(0);expect(probe.gemCount).toBe(beforeReward[rest.id]+1);if(rest.id==='cove-hollow-shelf'){const letterTile=probe.entities.filter(e=>e.source.endsWith('/assets/spelling/tile.png')&&e.args[4]===Math.round(1040-cameraX)-11&&e.args[5]===Math.round(role.top-32-rock.cameraY));expect(letterTile).toHaveLength(0);await evidence.attach('actual-letter-A-collected',{body:JSON.stringify({id:'cove-letter-a',supportY:role.top,sourceTileAbsent:true,underpassTilePreviouslyNonempty:true}),contentType:'application/json'});}}}
    // Ground underpass captures retain nearby actual world pickups/spring without HUD false witnesses.
    if(rest.pose==='underpass'&&!rest.name.includes('return')){const cameraX=role.x-rock.args[4];const neighbours=probe.entities.filter(e=>e.alphaPixels>0&&e.visiblePixels===e.alphaPixels&&e.args[4]>40&&e.args[4]<386&&Math.abs(e.args[4]+cameraX-rest.x)<210);expect(neighbours.length).toBeGreaterThan(0);if(rest.id==='cove-bay-ledge-3')expect(neighbours.some(e=>e.source.endsWith('/assets/cove/environment.png')&&e.args[0]===springFrame[0]&&e.args[1]===springFrame[1])).toBe(true);if(rest.name==='hollow-under-forward')expect(neighbours.some(e=>e.source.endsWith('/assets/spelling/tile.png'))).toBe(true);}
  }
  if(region.name==='Hollow/Pools'){const flights=await page.evaluate(()=>(window as unknown as {coveRolloutProbe:{flights:Record<string,{ascent?:{status:string;png:string};descent?:{status:string;png:string}}>}}).coveRolloutProbe.flights);for(const id of Object.keys(associated)){for(const pose of ['ascent','descent'] as const){const capture=flights[id]?.[pose];if(capture)await evidence.attach(id+'-'+pose,{body:Buffer.from(capture.png.split(',')[1],'base64'),contentType:'image/png'});expect(capture,id+' '+pose).toBeDefined();}}}
  await responses.settle();await evidence.attach('actual-served-resource-bodies',{body:JSON.stringify({sourceRevision,browser:browser.version(),records:responses.records}),contentType:'application/json'});responses.assertComplete(rolloutRoles.map(r=>r.path));
  for(const r of rolloutRoles)expect(responses.records.some(v=>new URL(v.url).pathname===r.path&&v.status===200&&v.sha256===r.sha256)).toBe(true);
  const seen=await page.evaluate(()=>(window as unknown as {coveRolloutProbe:{seen:string[]}}).coveRolloutProbe.seen);await evidence.attach('region-rest-and-draw-coverage',{body:JSON.stringify({region:region.name,capturedRestNames:region.rests.map(r=>r.name),capturedSupportIds:[...new Set(region.rests.map(r=>r.id))],observedDrawIds:seen,note:'Production draws all7 support images; draw IDs do not claim physical rest on every support in each region.'}),contentType:'application/json'});expect([...seen].sort()).toEqual(rolloutRoles.map(r=>r.id).sort());expect(errors).toEqual([]);await evidence.assertIntegrity();
});
for(const role of changedRolloutRoles)test(`Cove B required ${role.id} ordinary Retry`,async({page},info)=>{
  const evidence=createRolloutEvidence(info);
  const sourceRevision=pilotSourceRevision(process.env.BROWSER_REPORT_SOURCE_SHA,info.config.metadata),responses=createHudResponseObserver();page.on('response',responses.observe);
  await evidence.attach('source-checkpoint',{body:JSON.stringify({sourceRevision,checkpoint,distIndexSha256:hash(readFileSync(new URL('../dist/index.html',import.meta.url))),blocked:role}),contentType:'application/json'});
  const pattern='**'+role.path;await page.route(pattern,route=>route.abort());await page.goto('/?debug=1');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');await expect(page.getByRole('button',{name:/retry/i})).toBeVisible();
  await page.unroute(pattern);await page.getByRole('button',{name:/retry/i}).click();await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();await page.getByRole('button',{name:'Play SANDY COVE',exact:true}).click();await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  await responses.settle();await evidence.attach('ordinary-retry-resources',{body:JSON.stringify({sourceRevision,records:responses.records}),contentType:'application/json'});responses.assertComplete(rolloutRoles.map(r=>r.path));expect(responses.records.some(r=>new URL(r.url).pathname===role.path&&r.status===200&&r.sha256===role.sha256)).toBe(true);await evidence.assertIntegrity();
});
