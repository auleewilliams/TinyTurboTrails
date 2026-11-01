import { afterEach, expect, it, vi } from 'vitest';
import { coveRolloutObserverInit } from './cove-rollout-observer';
afterEach(()=>vi.unstubAllGlobals());
it('actual shared observer resets at world ground, retains Henry across overlay fills and compares old hollow alpha',()=>{
  class Image { constructor(public src:string,public naturalWidth=1,public naturalHeight=1) {} }
  class Context {
    canvas={id:'game'};
    drawImage(..._args:unknown[]) {}
    fillRect(..._args:number[]) {}
    fillText(..._args:unknown[]) {}
    getTransform(){return {a:1,b:0,c:0,d:1,e:0,f:0};}
    getImageData(){return {data:new Uint8ClampedArray([1,2,3,255])};}
  }
  const scope={} as {coveRolloutProbe:{frame:number;actor:unknown;rocks:Record<string,unknown>}};
  vi.stubGlobal('window',scope);vi.stubGlobal('HTMLImageElement',Image);vi.stubGlobal('CanvasRenderingContext2D',Context);
  vi.stubGlobal('requestAnimationFrame',()=>1);
  vi.stubGlobal('document',{querySelector:()=>null,createElement:()=>({width:1,height:1,getContext:()=>new Context()})});
  coveRolloutObserverInit({roles:[{id:'cove-hollow-shelf',path:'/rock.png',x:0,top:0,width:1,height:1}],hollowAlpha:[255]});
  const c=new Context(),draw=(path:string)=>c.drawImage(new Image(path),0,0,1,1,0,0,1,1);
  draw('/assets/cove/terrain-kit/ground.png');draw('/rock.png');draw('/assets/henry/henry-celebration.png');
  const actor=scope.coveRolloutProbe.actor;expect(actor).toMatchObject({alphaPixels:1,visiblePixels:1,oldHollowOverlap:1,overlap:{'cove-hollow-shelf':1}});
  c.fillRect(0,0,426,240);expect(scope.coveRolloutProbe.actor).toBe(actor);expect(scope.coveRolloutProbe.frame).toBe(1);
  draw('/assets/cove/terrain-kit/ground.png');expect(scope.coveRolloutProbe.actor).toBeNull();expect(scope.coveRolloutProbe.rocks).toEqual({});expect(scope.coveRolloutProbe.frame).toBe(2);
});
