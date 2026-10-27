import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { startFrost, driveFrost } from './frost-browser-pilot';
import { FROST_MAIN, FROST_REASCENT, FROST_DOWN_SUMMIT, FROST_UPPER_RETURN, FROST_BOWL_RETURN, FROST_INTRO_RETURN } from './frost-pilot';

async function attachPaints(page:Page,info:TestInfo):Promise<void> {
  const frames=await page.evaluate(()=>(window as unknown as {frostPaintFrames:Record<string,{png:string;status:string;screen:{x:number;y:number};images:string[]}>}).frostPaintFrames);
  expect(Object.keys(frames).filter(k=>k.startsWith('forward')).length).toBeGreaterThanOrEqual(8);
  for(const [name,frame] of Object.entries(frames)) {
    expect(frame.screen.y).toBeGreaterThan(10); expect(frame.screen.y).toBeLessThan(200);
    expect(frame.images.some(url=>url.endsWith('/assets/frost/background.png'))).toBe(true);
    await info.attach(`moving-${name}`,{body:Buffer.from(frame.png.split(',')[1],'base64'),contentType:'image/png'});
  }
  await info.attach('paint-observations',{body:JSON.stringify(Object.fromEntries(Object.entries(frames).map(([k,{png,...rest}])=>[k,rest]))),contentType:'application/json'});
}

for(const width of [426,320]) test(`Frost three ice runs and snow summit use real keyboard input at ${width}px`, async({page,browser},info)=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===426?300:240});
  await startFrost(page);
  const records:object[]=[];
  for(const [name,stages] of [
    ['intro',FROST_MAIN.slice(0,2)], ['fir-ridge',FROST_MAIN.slice(2,4)],
    ['bowl-runout',FROST_MAIN.slice(4,6)], ['spring-bypass',FROST_MAIN.slice(6,8)],
    ['upper-glide-summit',FROST_MAIN.slice(8,10)], ['finish',FROST_MAIN.slice(10)],
  ] as const) {
    records.push({name,result:await driveFrost(page,stages)});
    await info.attach(name,{body:await page.locator('#game').screenshot(),contentType:'image/png'});
  }
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await attachPaints(page,info);
  await info.attach('journey',{body:JSON.stringify({source:process.env.BROWSER_REPORT_SOURCE_SHA,browser:browser.version(),width,records}),contentType:'application/json'});
});

test('Frost actual finish returns over every snow ledge and manually assembles SNOW',async({page,browser},info)=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width:426,height:300}); await startFrost(page);
  const outward=await driveFrost(page,FROST_MAIN);
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  await page.getByRole('button',{name:'Find more letters',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 5410 Y 206 V 0');
  const returns:object[]=[];
  for(const [name,stages] of [['summit',FROST_DOWN_SUMMIT],['upper',FROST_UPPER_RETURN],['bowl',FROST_BOWL_RETURN],['intro',FROST_INTRO_RETURN]] as const) {
    returns.push({name,result:await driveFrost(page,stages)});
    await info.attach(`reverse-${name}`,{body:await page.locator('#game').screenshot(),contentType:'image/png'});
  }
  await expect(page.locator('#status')).toContainText('Letter bag: 4/4');
  const back=await driveFrost(page,FROST_REASCENT);
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  for(const [slot,letter] of [...'SNOW'].entries()) {
    await page.getByRole('button',{name:`Letter ${letter}`,exact:true}).click();
    await page.getByRole('button',{name:`Space ${slot+1}: empty`,exact:true}).click();
  }
  await expect(page.locator('#status')).toContainText('SNOW sticker earned!');
  await attachPaints(page,info);
  await info.attach('actual-retrace',{body:JSON.stringify({source:process.env.BROWSER_REPORT_SOURCE_SHA,browser:browser.version(),outward,returns,back}),contentType:'application/json'});
});

test('Frost controller accepts movement and jumps through the actual summit finish',async({page},info)=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width:426,height:300}); await startFrost(page,true);
  const result=await driveFrost(page,FROST_MAIN);
  await expect(page.locator('#status')).toContainText('Finish');
  await page.getByRole('button',{name:'Build your word',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Bag 0/4');
  const events=await page.evaluate(()=>(window as unknown as {frostPadEvents:object[]}).frostPadEvents);
  expect(events.length).toBeGreaterThan(100);
  const observed=events as {kind:string;code?:string;down?:boolean;status?:string}[];
  const press=observed.findIndex(e=>e.kind==='dispatch'&&e.code==='Space'&&e.down);
  expect(press).toBeGreaterThanOrEqual(0);
  expect(observed.slice(press+1).some(e=>e.kind==='poll'
    && Number(e.status?.match(/X (-?\d+)/)?.[1])<160
    && Number(e.status?.match(/Y (-?\d+)/)?.[1])<430)).toBe(true);
  await info.attach('controller-polls-and-accepted-route',{body:JSON.stringify({events,result}),contentType:'application/json'});
});
