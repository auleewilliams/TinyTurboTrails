import { expect, type Page } from '@playwright/test';
import { installTimberKeyboardPilot } from './timbers-browser-pilot';
export { driveSunset as driveFrost } from './sunset-browser-pilot';

/** Reuse the existing bounded pilot's decisions with the real Gamepad API. */
export async function startFrost(page: Page, controller = false): Promise<void> {
  await installTimberKeyboardPilot(page);
  // Capture commitments during actual paints, including reverse descents.
  await page.addInitScript(() => {
    const frames: Record<string,{status:string;png:string;screen:{x:number;y:number};images:string[]}>={};
    const images=new Set<string>();
    Object.assign(window,{frostPaintFrames:frames});
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>) {
      Reflect.apply(draw,this,args);
      if(!(args[0] instanceof HTMLImageElement)||this.canvas.id!=='game') return;
      images.add(args[0].src);
      if(!args[0].src.includes('/assets/henry/')) return;
      const status=document.querySelector('#status')?.textContent??'';
      if(!status.includes('Playing')) return;
      const x=Number(status.match(/X (-?\d+)/)?.[1]),vx=Number(status.match(/V (-?\d+)/)?.[1]);
      const direction=vx>50?'forward':vx< -50?'reverse':'';
      if(!direction)return;
      const anchors=direction==='forward'?[150,340,1540,1750,2180,2340,3440,3640,4380,5180]:[5180,4980,4780,4580,4380,3430,1510,130];
      for(const anchor of anchors) if(Math.abs(x-anchor)<9&&!frames[`${direction}-${anchor}`]) {
        const point=this.getTransform().transformPoint(new DOMPoint(Number(args[5])+24,Number(args[6])+24));
        frames[`${direction}-${anchor}`]={status,png:this.canvas.toDataURL(),screen:{x:point.x,y:point.y},images:[...images]};
      }
    } as typeof draw;
  });
  if(controller) await page.addInitScript(() => {
    const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
    const events: object[]=[];
    Object.assign(window,{frostPad:pad,frostPadEvents:events});
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
      events.push({kind:'poll',time:performance.now(),axis:pad.axes[0],jump:pad.buttons[0].pressed,status:document.querySelector('#status')?.textContent});
      return [pad];
    }});
    const dispatch=window.dispatchEvent.bind(window);
    window.dispatchEvent=(event:Event):boolean=>{
      if(event instanceof KeyboardEvent && ['ArrowRight','ArrowLeft','Space'].includes(event.code)) {
        const down=event.type==='keydown';
        if(event.code==='Space') { pad.buttons[0].pressed=down; pad.buttons[0].value=down?1:0; }
        else if(down) pad.axes[0]=event.code==='ArrowRight'?1:-1;
        else if(pad.axes[0]===(event.code==='ArrowRight'?1:-1)) pad.axes[0]=0;
        events.push({kind:'dispatch',time:performance.now(),code:event.code,down,status:document.querySelector('#status')?.textContent});
        return true;
      }
      return dispatch(event);
    };
  });
  await page.goto('/?debug=1');
  await page.getByRole('button',{name:'FROST RIDGE',exact:true}).click();
  await page.getByRole('button',{name:'Play FROST RIDGE',exact:true}).click();
  await expect(page.locator('#status')).toContainText('X 60 Y 466 V 0');
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
