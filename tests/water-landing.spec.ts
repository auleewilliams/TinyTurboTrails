import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { startCove, driveCove, observeCove } from './cove-browser-pilot';
import { COVE_LOWER, COVE_SUPPORT_APPROACH, walk } from './cove-pilot';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));

test('Cove ordinary water landing splashes while the dry pool stone landing retains dust', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 426, height: 300 });
  const evidence = observeCove(page, info);
  // Observe actual production drawing and pixels; no scene/player/clock access.
  await page.addInitScript(({manifest}) => {
    type Mark = {kind:string;rect:number[];color?:string};
    const p={armed:'',frame:[] as Mark[],captures:[] as {kind:string;status:string;marks:Mark[];png:string;pixels:number[];backing:number[]}[]};
    Object.assign(window,{waterLandingWitness:p});
    const fill=CanvasRenderingContext2D.prototype.fillRect,draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
      if(this.canvas.id==='game'){
        if(x===0&&y===0&&w===426&&h===240&&this.fillStyle==='#a9e8ec')p.frame=[];
        if((this.fillStyle==='#63cddd'||this.fillStyle==='#fff2cf')&&w===2&&(h===2||h===3))p.frame.push({kind:'splash',rect:[x,y,w,h],color:String(this.fillStyle)});
      }
      fill.call(this,x,y,w,h);
    };
    CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>){
      const [image,sx,sy,sw,sh,dx,dy,dw,dh]=args;
      if(this.canvas.id==='game'&&image instanceof HTMLImageElement&&image.src.endsWith(`/assets/cove/${manifest.image}`)
        &&sx===(manifest.assets.dust%4)*manifest.cellSize&&sy===Math.floor(manifest.assets.dust/4)*manifest.cellSize&&sw===48&&sh===48)
        p.frame.push({kind:'dust',rect:[dx,dy,dw,dh]});
      Reflect.apply(draw,this,args);
    } as typeof draw;
    const raf=requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(now=>{
      callback(now);
      if(!p.armed||p.captures.some(c=>c.kind===p.armed))return;
      const status=document.querySelector('#status')?.textContent??'',x=Number(status.match(/X (-?\d+)/)?.[1]),feet=Number(status.match(/Y (-?\d+)/)?.[1])+34;
      if(!status.includes('Playing'))return;
      const valid=p.armed==='splash'?feet===344&&x>1809&&x<1851:feet===296&&x>=1700&&x<=1800;
      const marks=p.frame.filter(m=>m.kind===p.armed);
      if(!valid||!(p.armed==='splash'?marks.length===6:marks.length>0))return;
      const canvas=document.querySelector<HTMLCanvasElement>('#game')!,ctx=canvas.getContext('2d')!;
      const pixels=marks.flatMap(m=>{const[x,y,w,h]=m.rect;return [...ctx.getImageData(Math.floor(x),Math.floor(y),Math.max(1,Math.ceil(w)),Math.max(1,Math.ceil(h))).data];});
      p.captures.push({kind:p.armed,status,marks:structuredClone(p.frame),png:canvas.toDataURL(),pixels,backing:[canvas.width,canvas.height]});
    });
  },{manifest});
  try {
    await startCove(page);
    await driveCove(page,COVE_LOWER.slice(0,1));
    await driveCove(page,[walk(1830)]);
    await expect(page.locator('#status')).toContainText('Y 310 V 0');
    await page.evaluate(()=>{(window as unknown as {waterLandingWitness:{armed:string}}).waterLandingWitness.armed='splash';});
    await page.keyboard.down('Space');
    try {await expect.poll(async()=>Number((await page.locator('#status').innerText()).match(/Y (-?\d+)/)?.[1])).toBeLessThan(300);}
    finally {await page.keyboard.up('Space');}
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {waterLandingWitness:{captures:{kind:string}[]}}).waterLandingWitness.captures.some(c=>c.kind==='splash'))).toBe(true);
    await page.evaluate(()=>{(window as unknown as {waterLandingWitness:{armed:string}}).waterLandingWitness.armed='dust';});
    await driveCove(page,COVE_SUPPORT_APPROACH[1]);
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {waterLandingWitness:{captures:{kind:string}[]}}).waterLandingWitness.captures.some(c=>c.kind==='dust'))).toBe(true);
  } finally {
    const captures=await page.evaluate(()=>(window as unknown as {waterLandingWitness:{captures:{kind:string;status:string;png:string;pixels:number[];marks:{kind:string;color?:string}[];backing:number[]}[]}}).waterLandingWitness.captures);
    for(const c of captures)await info.attach(`${c.kind}-actual-input-effect-stage-native`,{body:Buffer.from(c.png.split(',')[1],'base64'),contentType:'image/png'});
    await info.attach('actual-water-stone-landing-observations',{body:JSON.stringify(captures.map(({png:_png,...c})=>c)),contentType:'application/json'});
    expect(captures.map(c=>c.kind).sort()).toEqual(['dust','splash']);
    for(const c of captures){expect(c.backing).toEqual([426,240]);expect(c.pixels.length).toBeGreaterThan(0);expect(c.pixels.some((v,i)=>i%4===3&&v>0)).toBe(true);}
    const splash=captures.find(c=>c.kind==='splash')!;
    expect(splash.marks.filter(m=>m.kind==='dust')).toEqual([]);
    expect(new Set(splash.marks.map(m=>m.color))).toEqual(new Set(['#63cddd','#fff2cf']));
    expect(captures.find(c=>c.kind==='dust')!.marks.some(m=>m.kind==='splash')).toBe(false);
  }
  await evidence.finish(browser.version());
});
