import { expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { installQuarryPilotScript } from './quarry-pilot';
import { drawSlime } from '../src/world/renderer';
import { drawFacingSprite } from '../src/art/sprite';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { QUARRY_RUN, LEVELS } from '../src/world/levels';
import { entityState, type RunState } from '../src/game/interactions';
import type { Player } from '../src/game/movement';
import { QUARRY_DESCENT } from './quarry-route';

// Mechanism fixtures drive the actual serialized observer/controller and dispatch seam.
// These are legitimate observed positions/poses/latencies, not historical native replay.
function controller() {
  let status = '', callback: ((now: number) => void) | undefined;
  const keys = new Map<string, boolean>();
  class Image { complete = true; constructor(public src: string, public naturalWidth = 288, public naturalHeight = 48) {} }
  class Context {
    canvas = { id: 'game' }; fillStyle = ''; globalAlpha = 1;
    fillRect(..._a: number[]) {} drawImage(..._a: unknown[]) {}
    getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, transformPoint: (p: {x:number;y:number}) => p }; }
  }
  const win = { location: { origin: 'http://localhost' }, requestAnimationFrame: (cb: typeof callback) => { callback = cb; return 1; },
    dispatchEvent: (e: {code:string;type:string}) => keys.set(e.code, e.type === 'keydown') };
  runInNewContext(`(${installQuarryPilotScript.toString()})()`, { window: win, requestAnimationFrame: win.requestAnimationFrame,
    CanvasRenderingContext2D: Context, HTMLImageElement: Image, URL, DOMPoint: class { constructor(public x:number,public y:number){} },
    KeyboardEvent: class { constructor(public type:string,public init:{code:string}){} get code(){return this.init.code;} },
    document: { querySelector: () => ({ textContent: status }), createElement: () => ({ getContext: () => new Context() }) } });
  const pilot = (win as unknown as {quarryPilot:{active:boolean;route:typeof QUARRY_DESCENT;index:number;observations:object[];frame:unknown;recovery?:typeof QUARRY_DESCENT}}).quarryPilot;
  const ctx = new Context(), atlas = new Image('http://localhost/assets/slimes/slimes.png'), henry = new Image('http://localhost/assets/henry/henry-celebration.png');
  const render = (x:number,feet:number,slimeX:number,slimeY:number,squash?:number, extras: {x:number;y:number;squashed?:boolean}[] = [], omit = false) => {
    status = `Playing X ${x} Y ${feet-34} V 0`;ctx.fillRect(0,0,426,240);
    if (!omit) drawSlime(ctx as never,atlas as never,'miner',slimeX,slimeY,squash);
    for (const e of extras) drawSlime(ctx as never,atlas as never,'miner',e.x,e.y,e.squashed?1:undefined);
    drawFacingSprite(ctx as never,henry as never,{x:0,y:0,width:48,height:48},x-24,feet-44,48,48,1);
  };
  const tick = (time:number) => {win.requestAnimationFrame(()=>{});callback!(time);};
  return {pilot,keys,render,tick};
}
it.each([360,400,425])('jumps before a live miner at phase x=%i while leaving the low terrace', slimeX => {
  const h=controller();h.pilot.route=[{x:260,y:910,tag:'floor approach'}];h.pilot.active=true;
  h.render(slimeX+40,840,slimeX,840);h.tick(1000);
  expect(h.keys.get('Space')).toBe(true);
  expect(h.keys.get('ArrowLeft')).toBe(true);
});
it('does not jump for a flattened miner, another shelf or a stale pre-reset draw', () => {
  for(const [y,squash] of [[840,1],[560,undefined]] as const){const h=controller();h.pilot.route=[{x:260,y:910,tag:'floor approach'}];h.pilot.active=true;h.render(400,840,375,y,squash);h.tick(1000);expect(h.keys.get('Space')).not.toBe(true);}
});
it('clears a previous frame miner before dispatching the next frame input', () => {
  const h=controller();h.pilot.route=[{x:260,y:910,tag:'floor approach'}];h.pilot.active=true;
  h.render(400,840,375,840);h.render(400,840,375,840,undefined,[],true);h.tick(1000);
  expect(h.keys.get('Space')).not.toBe(true);
});

it('re-plans observed recovery through the already reached descent terraces without advancing the requested index', () => {
  const h=controller();
  // Build history through the exact real route targets using genuine status/draw inputs.
  for(const target of QUARRY_DESCENT.slice(0,10)){
    h.pilot.route=[target];h.pilot.index=0;h.pilot.active=true;
    h.render(target.x,target.y,700,280);h.tick(1000+target.y);
  }
  h.pilot.route=[{x:260,y:910,tag:'floor approach'}];h.pilot.index=0;h.pilot.active=true;
  h.render(400,840,700,280);h.tick(3000);
  h.render(450,700,700,280);h.tick(3017);
  expect(h.pilot.index).toBe(0);
  expect(h.pilot.recovery?.map(t=>t.tag)).toEqual(['lower approach','low terrace']);
  expect(h.keys.get('ArrowRight')).toBe(true);
  for (const [x,feet] of [[580,770],[400,840]]) { h.render(x,feet,700,280);h.tick(3034+feet);expect(h.pilot.index).toBe(0); }
  h.render(260,910,700,280);h.tick(5000);expect(h.pilot.index).toBe(1);
});

it.each([0, 30, 90, 180])('serialized controls negotiate real descent with neutral starting phase %i (mechanism fixture)', phase => {
  const scene = new AdventureScene({} as never, {} as never, Object.fromEntries(LEVELS.map(l=>[l.atlas,{} as never])),new SilentAudio(),QUARRY_RUN);
  scene.startSelected();
  const live = scene as unknown as {player:Player;run:RunState;events:{type:string}[]};
  const h=controller();let time=0,previousJump=false;
  const step=()=>{
    const p=live.player,slime=entityState(live.run,'quarry-slime-lower')!;
    h.render(Math.round(p.x),Math.round(p.y+34),slime.x,slime.y,slime.squashed?1:undefined, live.run.entities.filter(e=>e.id==='quarry-slime-upper'||e.id==='quarry-slime-middle'));
    h.tick(time+=1000/60);
    const jumping=h.keys.get('Space')??false;
    scene.update(1/60,{horizontal:h.keys.get('ArrowRight')?1:h.keys.get('ArrowLeft')?-1:0,jumpPressed:jumping&&!previousJump,jumpHeld:jumping,pausePressed:false,mutePressed:false});
    previousJump=jumping;
  };
  for(let i=0;i<phase;i++)step();
  for(const target of QUARRY_DESCENT){
    h.pilot.route=[target];h.pilot.index=0;h.pilot.active=true;
    for(let i=0;i<900&&h.pilot.active;i++)step();
    expect(h.pilot.index,`${phase}: ${target.tag}, feet ${live.player.y+34}`).toBe(1);
    // Ordinary host/DOM latency while the next route segment is prepared.
    for(let i=0;i<6;i++)step();
  }
  expect(live.player.y+34).toBe(980);
});
