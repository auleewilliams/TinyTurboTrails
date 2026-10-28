import { expect, test } from '@playwright/test';
import { COVE_ART_PILOT_STAGES } from './cove-art-pilot-stages';
import { startCove, driveCove, observeCove } from './cove-browser-pilot';
import { COVE_LOWER, COVE_MISS_ALL, COVE_RETURN, COVE_A, COVE_N, walk, jump } from './cove-pilot';

for(const width of [426,320]) test(`Cove lower dune, island pools and beach viewpoint at ${width}px`,async({page,browser},info)=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:width===426?300:240});
  const evidence=observeCove(page,info);await startCove(page);await evidence.paint('start');
  const records:object[]=[];
  for(const [name,stages]of [
    ['dune', [walk(280)]],['hollow-underpass',[walk(1040)]],['first-bank',[walk(1600)]],
    ['first-wade',[walk(1750)]],['dry-island',[walk(2070)]],['second-wade',[walk(2350)]],
    ['far-bank',[walk(2600)]],['bay-arrival',[walk(2940)]],['lower-shore',[walk(3240)]],
    ['bay-rejoin',[walk(3660)]],['viewpoint-rest',[walk(4030)]],['finish',[{kind:'finish'}]],
  ] as const) {records.push({name,result:await driveCove(page,stages)});await evidence.paint(name);}
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await expect(page.getByRole('button',{name:'Letter A',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Leave activity',exact:true}).click();
  await expect(page.getByRole('button',{name:'Map',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Replay',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  await info.attach('lower-input-journey',{body:JSON.stringify(records),contentType:'application/json'});await evidence.finish(browser.version());
});

for(const scenario of [
  {name:'all four missed',out:COVE_MISS_ALL,back:COVE_RETURN,count:0},
  {name:'A only',out:COVE_LOWER,back:COVE_A,count:3},
  {name:'N only',out:[walk(1040),jump(1040,320),walk(1950),jump(2080,320),walk(4030),{kind:'finish' as const}],back:COVE_N,count:3},
])test(`Cove actual finish retraces ${scenario.name} and manually assembles SAND`,async({page,browser},info)=>{
  test.setTimeout(120_000);await page.setViewportSize({width:426,height:300});
  const evidence=observeCove(page,info);await startCove(page);const records:object[]=[];
  records.push(await driveCove(page,scenario.out));await evidence.paint('actual-finish');
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await expect(page.locator('#status')).toContainText(`Bag ${scenario.count}/4`);
  await page.getByRole('button',{name:'Find more letters',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 4030 Y 166 V 0');
  await evidence.paint('return-start');
  records.push(await driveCove(page,[walk(4180),walk(4030)]));
  await expect(page.locator('#status')).toContainText('Playing');await evidence.paint('unrearmed-full-band');
  // Reverse through resting banks and the bay before the deliberate A hop.
  for(const x of [3660,3300,2600,2070,1600]) {
    const target= scenario.name==='N only'?Math.max(x,2000):x;
    records.push(await driveCove(page,[walk(target)]));await evidence.paint(`reverse-${target}`);
    if(scenario.name==='N only'&&target===2000)break;
  }
  records.push(await driveCove(page,scenario.back));
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');await evidence.paint('letters-recovered');
  records.push(await driveCove(page,COVE_LOWER));
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  for(const [slot,letter]of [...'SAND'].entries()) {
    await page.getByRole('button',{name:`Letter ${letter}`,exact:true}).click();
    await page.getByRole('button',{name:`Space ${slot+1}: empty`,exact:true}).click();
  }
  await expect(page.locator('#status')).toContainText('SAND sticker earned!');await evidence.paint('manual-word');
  await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByRole('button',{name:'Map',exact:true})).toBeFocused();
  await info.attach('finish-return-journey',{body:JSON.stringify(records),contentType:'application/json'});await evidence.finish(browser.version());
});

test('Cove lower route accepts standard controller movement through the final trail finish',async({page,browser},info)=>{
  test.setTimeout(90_000);await page.setViewportSize({width:426,height:300});
  const evidence=observeCove(page,info);await startCove(page,true);const result=await driveCove(page,COVE_LOWER);
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await page.getByRole('button',{name:'Leave activity',exact:true}).click();
  await expect(page.getByRole('button',{name:'Map',exact:true})).toBeFocused();await evidence.paint('controller-finish');
  const boundary=await page.evaluate(()=>(window as unknown as {covePadEvents:object[]}).covePadEvents.length);
  await page.waitForFunction(index=>(window as unknown as {covePadEvents:{kind:string;axis?:number;jump?:boolean}[]}).covePadEvents
    .slice(index).some(e=>e.kind==='poll'&&e.axis===0&&!e.jump),boundary);
  await page.evaluate(()=>{const p=(window as unknown as {covePad:{buttons:{pressed:boolean;value:number}[]}}).covePad;p.buttons[0].pressed=true;p.buttons[0].value=1;});
  await expect(page.getByRole('button',{name:'Play SANDY COVE',exact:true})).toBeVisible();
  await page.evaluate(()=>{const p=(window as unknown as {covePad:{buttons:{pressed:boolean;value:number}[]}}).covePad;p.buttons[0].pressed=false;p.buttons[0].value=0;});
  const polls=await page.evaluate(()=>(window as unknown as {covePadEvents:object[]}).covePadEvents);
  expect(polls.length).toBeGreaterThan(100);
  await info.attach('controller-input-and-accepted-route',{body:JSON.stringify({result,polls}),contentType:'application/json'});await evidence.finish(browser.version());
});

test('Cove cached map preview renders fixed stones and its initial dune framing',async({page,browser},info)=>{
  await page.setViewportSize({width:426,height:300});const evidence=observeCove(page,info);
  await page.addInitScript(()=>{
    const fills=new Map<HTMLCanvasElement,{x:number;y:number;width:number;height:number}[]>();
    const urls=new Set<string>();
    const probe={tops:[] as object[],png:'',sources:0,kitUrls:[] as string[]};Object.assign(window,{covePreviewProbe:probe});
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>){
      const [image,sx,,sw,sh,dx,dy,dw,dh]=args;
      if(this.canvas.id!=='game'&&image instanceof HTMLImageElement&&image.src.endsWith('/assets/cove/terrain-kit/atlas.png')
        &&sx===256&&sw===dw&&sh===dh&&sw>=90&&sw<=180) {
        urls.add(image.src);
        const rows=fills.get(this.canvas)??[];
        const row=rows.find(row=>row.y===dy&&row.x+row.width===dx);
        if(row){row.width+=dw;row.height=Math.max(row.height,dh);}else rows.push({x:dx,y:dy,width:dw,height:dh});
        fills.set(this.canvas,rows);
      }
      Reflect.apply(draw,this,args);
      if(image instanceof HTMLCanvasElement&&image.width===426&&image.height===240&&fills.has(image)) {
        probe.tops=fills.get(image)!;probe.png=image.toDataURL();probe.sources=fills.size;probe.kitUrls=[...urls];
      }
    } as typeof draw;
  });
  await page.goto('/?debug=1');await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {covePreviewProbe:{tops:object[]}}).covePreviewProbe.tops.length)).toBe(7);
  const first=await page.evaluate(()=>(window as unknown as {covePreviewProbe:{tops:{x:number}[];png:string;sources:number;kitUrls:string[]}}).covePreviewProbe);
  expect(first.tops).toContainEqual({x:1700,y:74,width:100,height:6});
  expect(first.tops.map(top=>top.x)).toEqual([980,1700,2230,2380,2960,3140,3340]);
  expect(first.kitUrls).toEqual([expect.stringContaining('/assets/cove/terrain-kit/atlas.png')]);
  await info.attach('actual-cached-preview-source',{body:Buffer.from(first.png.split(',')[1],'base64'),contentType:'image/png'});
  for(const width of [426,320]) {await page.setViewportSize({width,height:width===426?300:240});await evidence.paint(`cached-preview-${width}`);}
  await page.getByRole('button',{name:'PLAINS',exact:true}).click();await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();
  expect(await page.evaluate(()=>(window as unknown as {covePreviewProbe:{png:string}}).covePreviewProbe.png)).toBe(first.png);
  await evidence.finish(browser.version());
});

test('Cove all 42 gems use native input, fixed stones, low finds and three optional spring attempts',async({page,browser},info)=>{
  test.setTimeout(150_000);await page.setViewportSize({width:426,height:300});
  const evidence=observeCove(page,info);await startCove(page);const records:object[]=[];
  const drive=async(stages:Parameters<typeof driveCove>[1])=>{records.push(await driveCove(page,stages));};
  await drive([walk(100),walk(180),walk(260),walk(330),walk(450),walk(550),walk(680),walk(780),walk(900),walk(950),jump(950,368),walk(1040),jump(1040,320),walk(1065)]);
  await evidence.paint('A-low-find');
  await drive([walk(1140),walk(1260),walk(1360),walk(1480),walk(1590),walk(1660),walk(1690),jump(1750,296)]);
  await evidence.paint('first-stone-rest');
  await drive([walk(1850),walk(1950),walk(2050),walk(2150),walk(2210),jump(2260,296),walk(2300),jump(2395,284),walk(2420)]);
  await evidence.paint('second-stones-rest');
  await drive([walk(2530),walk(2640),walk(2760),walk(2870),walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3280),jump(3360,272)]);
  await evidence.paint('upper-bay-rest');
  // Each flight uses only public keyboard input and rendered debug positions.
  // The launch/landing trace is observational; production event counts are separately asserted in simulation.
  for(const target of [3380,3420,3460]) {
    await drive([walk(3390)]);
    const landing=target>3420?3500:3360;
    const flight=await page.evaluate(async({target,landing})=>{
      const trace:object[]=[];let phase=0,stable=0,settled=0,minY=238;
      const send=(code:string,down:boolean)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));
      for(let frame=0;frame<180;frame++) {
        const text=document.querySelector('#status')!.textContent!,match=text.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/)!;
        const [x,y,vx]=match.slice(1).map(Number);minY=Math.min(minY,y);
        if(phase===0&&y<230)phase=1;
        if(phase===1&&y<145)phase=2;
        const goal=phase<2?target:landing,stop=x+Math.sign(vx)*vx**2/2400;
        const direction=phase===0?(frame%3<2?1:0):stop<goal-3?1:stop>goal+3?-1:0;
        send('ArrowRight',direction>0);send('ArrowLeft',direction<0);send('Space',phase>0&&phase<3);
        trace.push({frame,phase,x,y,vx,direction});
        if(phase===2&&y===238&&Math.abs(x-landing)<5&&Math.abs(vx)<20)stable++;else stable=0;
        if(stable>=3)phase=3;
        if(phase===3&&++settled>=30) {send('ArrowRight',false);send('ArrowLeft',false);send('Space',false);return {trace,minY,x,y,vx,settled};}
        await new Promise<void>(r=>requestAnimationFrame(()=>r()));
      }
      send('ArrowRight',false);send('ArrowLeft',false);send('Space',false);throw new Error(`bounded Cove spring flight failed ${JSON.stringify(trace.slice(-8))}`);
    },{target,landing});
    expect(flight.minY).toBeLessThan(145);expect(flight.y).toBe(238);records.push({target,landing,flight});
    await evidence.paint(`spring-${target}-settled`);
    if(landing>3420)await drive([walk(3480),jump(3380,272),walk(3360)]);
  }
  await drive([jump(3280,260),walk(3160),jump(3080,272),walk(3020),walk(2940)]);
  await evidence.paint('reverse-upper-bank');
  await drive([walk(3060),walk(3160),walk(3240)]);
  // A short ordinary tap collects the low shoreline find without mounting the ledge above it.
  await page.evaluate(async()=>{
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
    for(let frame=0;frame<4;frame++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));
    window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
  });
  await expect.poll(()=>page.locator('#status').innerText()).toContain('Y 310 V 0');
  await drive([walk(3300),walk(3540),walk(3640),walk(3750),walk(3850),walk(3990),walk(4090),{kind:'finish'}]);
  await expect(page.locator('#status')).toContainText('Gems 42/42');await evidence.paint('all-42-finish');
  await info.attach('all-42-input-journey',{body:JSON.stringify(records),contentType:'application/json'});await evidence.finish(browser.version());
});

for (const resource of ['manifest.json', 'atlas.png', 'ground.png']) test(`Cove terrain kit ${resource} failure recovers through ordinary Retry`, async ({ page }) => {
  const path = `**/assets/cove/terrain-kit/${resource}`;
  await page.route(path, route => route.abort());
  await page.goto('/?debug=1');
  await expect(page.locator('#status')).toHaveText('Artwork could not load. Reload to retry.');
  await expect(page.locator('#retry')).toBeVisible();
  await page.unroute(path);
  await page.locator('#retry').click();
  await expect(page.getByRole('button', { name: 'SANDY COVE', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'SANDY COVE', exact: true }).click();
  await page.getByRole('button', { name: 'Play SANDY COVE', exact: true }).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
});

for (const width of [426, 320]) test(`Cove illustrated kit keeps underpass and upper-return rests at ${width}px`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: width === 426 ? 300 : 240 });
  const evidence = observeCove(page, info);
  await page.addInitScript(() => {
    const probe = { afterHenryKit: 0, paintedHenry: false, kitColumns: 0 };
    Object.assign(window, { coveArtOrder: probe });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
      if (this.canvas.id === 'game' && x === 0 && y === 0 && w === 426 && h === 240) {
        probe.afterHenryKit = 0; probe.paintedHenry = false; probe.kitColumns = 0;
      }
      fill.call(this, x, y, w, h);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>) {
      if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement) {
        if (args[0].src.endsWith('/assets/cove/terrain-kit/atlas.png')) {
          probe.kitColumns++; if (probe.paintedHenry) probe.afterHenryKit++;
        }
        if (args[0].src.endsWith('/assets/henry/henry-celebration.png')) probe.paintedHenry = true;
      }
      Reflect.apply(draw, this, args);
    } as typeof draw;
  });
  await startCove(page);
  const captures = async (name: string, stages: readonly { kind: string; x?: number; y?: number }[]) => {
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game')!, rect = canvas.getBoundingClientRect();
      return { backing: [canvas.width, canvas.height], css: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        status: document.querySelector('#status')!.textContent!, dpr: devicePixelRatio, order: (window as unknown as { coveArtOrder: { afterHenryKit: number; paintedHenry: boolean; kitColumns: number } }).coveArtOrder,
        native: canvas.toDataURL() };
    });
    const target = stages.at(-1)!, position = geometry.status.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/)!;
    expect(position).not.toBeNull();
    expect(Math.abs(Number(position[1]) - target.x!)).toBeLessThan(8);
    expect(Math.abs(Number(position[3]))).toBeLessThan(20);
    if (target.kind === 'jump') expect(Number(position[2])).toBe(target.y! - 34);
    expect(geometry.backing).toEqual([426, 240]); expect(geometry.css.width).toBeCloseTo(width, 1);
    expect(geometry.order.paintedHenry).toBe(true); expect(geometry.order.kitColumns).toBeGreaterThan(0);
    expect(geometry.order.afterHenryKit).toBe(0);
    await info.attach(`${name}-native-backing`, { body: Buffer.from(geometry.native.split(',')[1], 'base64'), contentType: 'image/png' });
    await info.attach(`${name}-spaces`, { body: JSON.stringify({ ...geometry, native: undefined }), contentType: 'application/json' });
    await evidence.paint(name);
  };
  await driveCove(page, COVE_ART_PILOT_STAGES.underpass); await captures('actual-A-underpass-rest', COVE_ART_PILOT_STAGES.underpass);
  await driveCove(page, COVE_ART_PILOT_STAGES.hollowSlope); await captures('actual-hollow-right-slope', COVE_ART_PILOT_STAGES.hollowSlope);
  await driveCove(page, COVE_ART_PILOT_STAGES.firstStone); await captures('actual-first-stone-rest', COVE_ART_PILOT_STAGES.firstStone);
  await driveCove(page, COVE_ART_PILOT_STAGES.upperLanding);
  await captures('actual-upper-bay-lower-landing-before-step', COVE_ART_PILOT_STAGES.upperLanding);
  await driveCove(page, COVE_ART_PILOT_STAGES.upperRest); await captures('actual-upper-bay-rest', COVE_ART_PILOT_STAGES.upperRest);
  await driveCove(page, COVE_ART_PILOT_STAGES.reverseBank);
  await captures('actual-reverse-bank-rest', COVE_ART_PILOT_STAGES.reverseBank);
  await evidence.finish(browser.version());
});
