import { expect, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { installTimberKeyboardPilot, runTimberStages, type TimberPilotStage } from './timbers-browser-pilot';

/** Cove explicitly selects the bounded fixed-support input protocol; never dispatch by camera mode. */
export async function installCovePilot(page:Page):Promise<void> {
  await installTimberKeyboardPilot(page);
}
export async function driveCove(page:Page,stages:readonly TimberPilotStage[]):Promise<object> {
  let x=Number((await page.locator('#status').innerText()).match(/X (-?\d+)/)?.[1]);
  const bounded:TimberPilotStage[]=[];
  for(const stage of stages) {
    if(stage.kind==='walk'||stage.kind==='travel') while(Math.abs(stage.x!-x)>320) {
      const direction=Math.sign(stage.x!-x) as -1|1;x+=direction*300;
      bounded.push({kind:'travel',x,direction});
    }
    bounded.push(stage);if(stage.x!==undefined)x=stage.x;
  }
  const result=await runTimberStages(page,bounded);
  expect(result,JSON.stringify(result)).toMatchObject({done:true,error:''});return result;
}
export async function startCove(page:Page,controller=false):Promise<void> {
  await installCovePilot(page);
  if(controller) await page.addInitScript(()=>{
    const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
    const events:object[]=[];Object.assign(window,{covePad:pad,covePadEvents:events});
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
      events.push({kind:'poll',axis:pad.axes[0],jump:pad.buttons[0].pressed,status:document.querySelector('#status')?.textContent});return [pad];
    }});
    const dispatch=window.dispatchEvent.bind(window);
    window.dispatchEvent=(e:Event)=>{
      if(e instanceof KeyboardEvent&&['ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        const down=e.type==='keydown';
        if(e.code==='Space'){pad.buttons[0].pressed=down;pad.buttons[0].value=down?1:0;}
        else if(down)pad.axes[0]=e.code==='ArrowRight'?1:-1;
        else if(pad.axes[0]===(e.code==='ArrowRight'?1:-1))pad.axes[0]=0;
        events.push({kind:'dispatch',code:e.code,down});return true;
      }
      return dispatch(e);
    };
  });
  await page.goto('/?debug=1');await page.getByRole('button',{name:'SANDY COVE',exact:true}).click();
  await page.getByRole('button',{name:'Play SANDY COVE',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 326 V 0');
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
}

/** Bind actual served response bytes and exported screenshots, including cached preview source canvases. */
export function observeCove(page:Page,info:TestInfo) {
  const bodies:{url:string;status:number;bytes:number;sha256:string}[]=[],pending:Promise<void>[]=[];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>pending.push((async()=>{
    const bytes=await response.body();bodies.push({url:response.url(),status:response.status(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  })()));
  const captures:object[]=[];
  return {
    async paint(name:string) {
      const png=await page.locator('#game').screenshot();
      captures.push({name,sha256:createHash('sha256').update(png).digest('hex'),status:await page.locator('#status').innerText(),viewport:page.viewportSize()});
      await info.attach(name,{body:png,contentType:'image/png'});
    },
    async finish(browser:string) {
      await Promise.all(pending);
      expect(errors).toEqual([]);expect(bodies.every(body=>body.status<400)).toBe(true);
      await info.attach('source-bundle-png-bindings',{body:JSON.stringify({source:process.env.BROWSER_REPORT_SOURCE_SHA,browser,viewport:page.viewportSize(),bodies,captures}),contentType:'application/json'});
    },
  };
}
