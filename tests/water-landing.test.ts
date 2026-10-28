import { expect, it, vi } from 'vitest';
import { SilentAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { GameplayPreviewScene } from '../src/game/gameplay-preview';
import { Feedback } from '../src/game/feedback';
import { type Player } from '../src/game/movement';
import { LEVELS } from '../src/world/levels';
import { SANDY_COVE } from '../src/world/sandy-cove';

const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
function setup(preview: boolean) {
  const audio = new SilentAudio(), play = vi.spyOn(audio, 'play');
  const scene = preview ? new GameplayPreviewScene({} as never, {} as never, audio, SANDY_COVE)
    : new AdventureScene({} as never, {} as never, Object.fromEntries(LEVELS.map(l => [l.atlas, {} as never])), audio, SANDY_COVE);
  if (scene instanceof AdventureScene) scene.startSelected();
  const live = scene as unknown as { player: Player; feedback: Feedback };
  return { scene, live, play };
}
// Explicit unit poses, not native input journeys: real unchanged movement resolves each contact.
it.each([false, true])('water terrain landing replaces dust in preview=%s without repeated walking bursts or sound changes', preview => {
  const { scene, live, play } = setup(preview);
  Object.assign(live.player, { x: 1830, y: 344 - 34 - 1, onGround: false, vy: 400 });
  scene.update(1 / 60, neutral);
  expect(live.feedback.effects.filter(e => e.kind !== 'gem').map(e => e.kind)).toEqual(['splash']);
  expect(play.mock.calls.filter(([kind]) => kind === 'landing')).toHaveLength(1);
  for (let i = 0; i < 10; i++) scene.update(1 / 60, neutral);
  expect(live.feedback.effects.filter(e => String(e.kind) === 'splash')).toHaveLength(1);
  expect(play.mock.calls.filter(([kind]) => kind === 'landing')).toHaveLength(1);
});

it('classifies the resolved centre contact and exact shared-edge ownership without changing player state', () => {
  const feedback = new Feedback();
  const base = setup(true).live.player;
  for (const [x, feet, platformId, expected] of [
    [1830,344,null,'splash'], [1750,296,'cove-pool-stone-1','landing'],
    [1750,296,null,'landing'], [1659.99,343.994,null,'landing'],
    [1660,344,null,'landing'], [1660.01,344,null,'splash'],
    [1860,344,null,'splash'], [1860.01,343.994,null,'landing'],
    [550,352,null,'landing'], [100,360,null,'landing'],
  ] as const) {
    const player = { ...base, x, y:feet-34, onGround:true, platformId };
    const before = structuredClone(player);feedback.clear();feedback.addLanding(player,SANDY_COVE);
    expect(feedback.effects.map(e=>e.kind),`${x}/${feet}/${platformId}`).toEqual([expected]);
    expect(player).toEqual(before);
  }
});

it.each([false,true])('keeps the impact threshold, recovery exclusion and major HUD filter in preview=%s', preview => {
  for (const velocity of [180,181]) {
    const {scene,live,play}=setup(preview);
    const hud=scene as unknown as {hud:{update:(...args:unknown[])=>void}};
    const update=vi.spyOn(hud.hud,'update');
    Object.assign(live.player,{x:1830,y:309,onGround:false,vy:velocity});
    scene.update(1/60,neutral);
    expect(live.feedback.effects.filter(e=>e.kind==='splash')).toHaveLength(velocity>180?1:0);
    expect(play.mock.calls.filter(([k])=>k==='landing')).toHaveLength(velocity>180?1:0);
    expect(update.mock.calls.at(-1)![4]).toBe(false);
  }
  const {scene,live,play}=setup(preview);
  // Pit fixture: ordinary Cove ground would resolve the deliberately low pose before recovery.
  (scene as unknown as {level:typeof SANDY_COVE}).level={...SANDY_COVE,surfaces:[{x1:0,x2:4200,y1:10000,y2:10000}]};
  Object.assign(live.player,{x:1830,y:600,onGround:false,vy:400});
  scene.update(1/60,neutral);
  expect(live.feedback.effects.filter(e=>e.kind==='splash'||e.kind==='landing')).toEqual([]);
  expect(play.mock.calls.filter(([k])=>k==='landing')).toEqual([]);
});

it('draws bounded turquoise/cream droplets instead of dust, suppresses reduced motion and restores canvas state', () => {
  const feedback=new Feedback();feedback.add('splash',100,140);
  const calls:{color:string;rect:number[]}[]=[],images:unknown[][]=[];
  const state={fillStyle:'#123456',globalAlpha:.4},stack:typeof state[]=[];
  const ctx={...state,save(this:typeof state){stack.push({fillStyle:this.fillStyle,globalAlpha:this.globalAlpha});},restore(this:typeof state){Object.assign(this,stack.pop());},
    fillRect(this:typeof state,...rect:number[]){calls.push({color:this.fillStyle,rect});},drawImage(...args:unknown[]){images.push(args);}} as unknown as CanvasRenderingContext2D;
  feedback.tick(.1);const before=structuredClone(feedback.effects);
  feedback.draw(ctx,{} as never,{x:0,y:0},false);
  expect(calls).toHaveLength(6);expect(new Set(calls.map(c=>c.color))).toEqual(new Set(['#63cddd','#fff2cf']));
  expect(calls.every(c=>c.rect[0]>=75&&c.rect[0]<=125&&c.rect[1]>=125&&c.rect[1]<=142)).toBe(true);
  expect(images).toEqual([]);expect(ctx.fillStyle).toBe(state.fillStyle);expect(ctx.globalAlpha).toBe(state.globalAlpha);
  expect(feedback.effects).toEqual(before);calls.length=0;
  feedback.draw(ctx,{} as never,{x:0,y:0},true);expect(calls).toEqual([]);
  // Dry dust still uses the identical atlas primitive/scale and reduced-motion suppression.
  feedback.clear();feedback.add('landing',100,140);
  const assets={atlas:{},manifest:{cellSize:48,assets:{dust:0}}} as never;
  feedback.draw(ctx,assets,{x:0,y:0},false);expect(images).toHaveLength(1);
  expect(images[0].slice(-2)).toEqual([48*.35,48*.35]);
  feedback.draw(ctx,assets,{x:0,y:0},true);expect(images).toHaveLength(1);
});

it('shares fixed-step duration, bounded queue, pause freeze and restart clearing with dust', async () => {
  const { SimulationClock }=await import('../src/core/clock');
  const { MAX_EFFECTS }=await import('../src/game/feedback');
  const feedback=new Feedback();for(let i=0;i<30;i++)feedback.add('splash',i,100);
  expect(feedback.effects).toHaveLength(MAX_EFFECTS);expect(feedback.effects.every(e=>e.duration===.3)).toBe(true);
  const clock=new SimulationClock();clock.advance(0,dt=>feedback.tick(dt));clock.setPaused(true);
  const before=structuredClone(feedback.effects);clock.advance(10000,dt=>feedback.tick(dt));expect(feedback.effects).toEqual(before);
  feedback.tick(.3);expect(feedback.effects).toEqual([]);
  const {scene,live}=setup(false);live.feedback.add('splash',100,100);
  const reload=scene as unknown as {loadLevel:(level:typeof SANDY_COVE)=>void};reload.loadLevel(SANDY_COVE);
  expect(live.feedback.effects).toEqual([]);
});

it('normalizes only exact approved presentation deltas and rejects unrelated source/gameplay changes', async () => {
  const { createRequire }=await import('node:module');
  const {readFileSync}=await import('node:fs');
  const {createHash}=await import('node:crypto');
  const {beforeWaterLanding}=createRequire(import.meta.url)('../scripts/water-landing-preservation.mjs');
  const record=JSON.parse(readFileSync(new URL('../assets/source/cove/water-landing/presentation.json',import.meta.url),'utf8'));
  for(const [path,entry]of Object.entries(record.files) as [string,{baselineSha256:string}][]) {
    const bytes=readFileSync(new URL('../'+path,import.meta.url));
    expect(createHash('sha256').update(beforeWaterLanding(path,bytes)).digest('hex')).toBe(entry.baselineSha256);
    for(const bad of [Buffer.concat([bytes,Buffer.from('\n// unrelated edit')]),Buffer.from(bytes.toString().replace('this.player.x','this.player.x + 1'))]) {
      if(bad.equals(bytes))continue;
      expect(()=>beforeWaterLanding(path,bad)).toThrow();
    }
  }
  const movement=readFileSync(new URL('../src/game/movement.ts',import.meta.url));
  expect(beforeWaterLanding('src/game/movement.ts',movement)).toBe(movement);
});

it.each([false,true])('actual movement lands on a dry platform above water with unchanged dust in preview=%s', preview => {
  const {scene,live,play}=setup(preview);
  Object.assign(live.player,{x:1750,y:296-34-1,vy:400,onGround:false});
  scene.update(1/60,neutral);
  expect(live.player.platformId).toBe('cove-pool-stone-1');
  expect(live.player.y+34).toBe(296);
  expect(live.feedback.effects.filter(e=>e.kind==='landing')).toHaveLength(1);
  expect(live.feedback.effects.some(e=>e.kind==='splash')).toBe(false);
  expect(play.mock.calls.filter(([kind])=>kind==='landing')).toHaveLength(1);
});
