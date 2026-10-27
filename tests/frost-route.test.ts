import { expect, it } from 'vitest';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { hasFixedSupport, validateLevel, type LevelData } from '../src/world/level';
import { TRAIL_WORDS } from '../src/game/education';
it('authors three downhill terrain ice experiences with snow decisions and a higher summit', () => {
  expect(FROST_RIDGE.verticalCamera).toBe(true);
  expect(FROST_RIDGE.progressAxis).toBeUndefined();
  expect(FROST_RIDGE.checkpoints).toHaveLength(3);
  expect(FROST_RIDGE.entities.filter(e => e.kind === 'spring')).toHaveLength(1);
  expect(FROST_RIDGE.finish.y).toBeLessThan(FROST_RIDGE.checkpoints[0].y);
  const runs = FROST_RIDGE.surfaces.filter((s, i, a) => s.material === 'ice' && a[i - 1]?.material !== 'ice');
  expect(runs).toHaveLength(3);
  expect(runs.every(s => s.y2 > s.y1 && s.friction === 0.45)).toBe(true);
  for (const p of [FROST_RIDGE.start, FROST_RIDGE.finish, FROST_RIDGE.retrace!, ...FROST_RIDGE.checkpoints]) expect(p && hasFixedSupport(FROST_RIDGE, p)).toBe(true);
  expect(TRAIL_WORDS.find(w => w.id === 'frost')!.pickups.map(p => p.id)).toEqual(['frost-letter-s', 'frost-letter-n', 'frost-letter-o', 'frost-letter-w']);
  expect(() => validateLevel(FROST_RIDGE)).not.toThrow();
});

import { FROST_MAIN, FROST_RETURN, FROST_REASCENT, frostPilot } from './frost-pilot';
it('finishes zero-letter zero-spring, retraces every SNOW and deliberately finishes again through input', () => {
  const route = frostPilot(); route.run(FROST_MAIN);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount, JSON.stringify(route.scene.education.pickups.filter(p => route.scene.education.hasLetter(p.id)))).toBe(0);
  expect(route.events.filter(e => ['spring', 'damage', 'recover'].includes(e.type))).toEqual([]);
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(t => t.label === 'Find more letters')!.action();
  for (let i=0;i<20;i++) route.tick();
  expect(route.scene.screenState).toBe('playing');
  route.run(FROST_RETURN);
  expect(route.scene.education.letterCount).toBe(4);
  route.run(FROST_REASCENT);
  expect(route.scene.screenState).toBe('finish');
  expect(route.events.filter(e => ['spring', 'damage', 'recover'].includes(e.type))).toEqual([]);
});

import { FROST_DOWN_SUMMIT, FROST_UPPER_RETURN, FROST_BOWL_RETURN } from './frost-pilot';
import { walk } from './sunset-pilot';
import { createPlayer, simulatePlayer, surfaceAt, surfaceY } from '../src/game/movement';
import { platformBodiesAt } from '../src/game/platforms';
import { trailPosition } from '../src/game/hud';

it.each([{label:'16ms',cadence:[0.016]}, {label:'32ms',cadence:[0.032]}, {label:'mixed',cadence:[0.016,0.032,0.024]}])('keeps the complete missed-SNOW journey and all return supports at $label cadence', ({cadence}) => {
  const route=frostPilot(cadence); route.run(FROST_MAIN);
  expect(route.scene.education.letterCount).toBe(0);
  const gems=new Set(route.runState.collectedGems);
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  route.run(FROST_RETURN); route.run(FROST_REASCENT);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount).toBe(4);
  for(const id of gems) expect(route.runState.collectedGems.has(id)).toBe(true);
  for(const platform of FROST_RIDGE.platforms!) expect(route.supports.has(platform.id),platform.id).toBe(true);
  expect(route.events.filter(e=>['damage','recover','spring'].includes(e.type))).toEqual([]);
  expect(route.events.filter(e=>e.type==='checkpoint').map(e=>e.entityId)).toEqual([1,2,3,2,1,2,3].map(i=>`frost-checkpoint-${i}`));
  route.scene.activateFinish('Build your word');
  for(const [slot,pickup] of route.scene.education.pickups.entries()) {
    route.scene.menuTargets.find(t=>t.label===`Letter ${pickup.letter}`)!.action();
    route.scene.menuTargets.find(t=>t.label===`Space ${slot+1}: empty`)!.action();
  }
  expect(route.scene.education.hasWordSticker).toBe(true);
  expect(route.scene.education.stickers).toEqual(['Frost SNOW']);
});
it.each(['W','N/S'])('permits a bounded %s recovery trip from the actual finish', only => {
  const route=frostPilot(); route.run(only==='W' ? [walk(3100), {kind:'jump',x:3220,y:492}, walk(5265), {kind:'jump',x:5380,y:240}, {kind:'finish'}] : [...FROST_MAIN.slice(0,4),walk(3100),{kind:'jump',x:3220,y:492},walk(5400),{kind:'finish'}]);
  expect(route.scene.education.letterCount).toBe(only==='W'?3:2);
  route.scene.activateFinish('Build your word'); route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  if(only==='W') route.run([walk(5320), walk(5400), {kind:'finish'}]);
  else { route.run(FROST_RETURN); route.run(FROST_REASCENT); }
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.hasLetter(`frost-letter-${only==='W'?'w':'n'}`)).toBe(true);
  expect(route.scene.education.letterCount).toBe(4);
  expect(route.events.filter(e=>['damage','recover','spring'].includes(e.type))).toEqual([]);
});

const exits=[360,2350,3650];
it.each(exits)('measures release/reversal/held movement and boundary jumps at snow exit %i', edge => {
  // Explicit velocity/contact seams, separate from the entrance-to-finish journeys.
  for(const speed of [80,220]) for(const command of [-1,0,1]) {
    const p=createPlayer(edge-1,FROST_RIDGE); p.vx=speed;
    const bodies=platformBodiesAt(FROST_RIDGE.platforms,0);
    let max=p.x;
    for(let f=0;f<60;f++) { simulatePlayer(p,{horizontal:command,jumpPressed:false,jumpHeld:false},FROST_RIDGE,1/60,bodies); max=Math.max(max,p.x); }
    if(command===0) { expect(p.vx).toBe(0); expect(max-edge).toBeLessThan(25); }
    if(command===-1) { expect(p.vx).toBeLessThan(0); expect(max-edge).toBeLessThan(30); }
    if(command===1) { expect(p.x-edge).toBeGreaterThan(180); expect(p.vx).toBeGreaterThan(150); }
    expect(p.onGround).toBe(true);
    console.info('Frost stopping', {edge,speed,command,maxForward:max-edge,finalX:p.x,finalV:p.vx});
  }
  for(const onset of [-12,0,12]) {
    const p=createPlayer(edge+onset,FROST_RIDGE); p.vx=220;
    for(let f=0;f<90;f++) simulatePlayer(p,{horizontal:f<35?1:0,jumpPressed:f===0,jumpHeld:f<16},FROST_RIDGE,1/60,platformBodiesAt(FROST_RIDGE.platforms,0));
    expect(p.onGround).toBe(true);
    expect(surfaceAt(FROST_RIDGE,p.x).material).toBeUndefined();
    // A boundary hop may deliberately board the normal-grip return. Its real edge reconnects to snow.
    if(p.platformId) {
      for(let f=0;f<180 && p.x<3860;f++) simulatePlayer(p,{horizontal:1,jumpPressed:false,jumpHeld:false},FROST_RIDGE,1/60,platformBodiesAt(FROST_RIDGE.platforms,0));
      for(let f=0;f<30;f++) simulatePlayer(p,{horizontal:0,jumpPressed:false,jumpHeld:false},FROST_RIDGE,1/60,platformBodiesAt(FROST_RIDGE.platforms,0));
    }
    expect(p.platformId).toBeNull();
    expect(p.onGround).toBe(true);
  }
});
it('clears the full forward sprite below permanent snow tops and reconnects every failed jump to terrain', () => {
  for(const platform of FROST_RIDGE.platforms!) {
    for(let x=platform.from.x-24;x<=platform.from.x+platform.width+24;x+=2) {
      expect(surfaceY(FROST_RIDGE,x)-platform.from.y-10,platform.id).toBeGreaterThanOrEqual(48);
    }
    expect(platform.from).toEqual(platform.to);
  }
  expect(trailPosition(FROST_RIDGE,2600,540)).toBeGreaterThan(trailPosition(FROST_RIDGE,1350,380));
});
it('rejects airborne finish entry at the arch and rearms only after deliberate departure', () => {
  const route=frostPilot();
  // Explicit finish contract seam, not an input journey.
  Object.assign(route.player,{x:5520,y:100,vx:0,vy:0,onGround:false}); route.tick();
  expect(route.scene.screenState).toBe('playing');
  Object.assign(route.player,{x:5520,y:206,vx:0,vy:0,onGround:true}); route.tick();
  expect(route.scene.screenState).toBe('finish');
  route.scene.activateFinish('Build your word'); route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  for(let f=0;f<80;f++) route.tick();
  expect(route.scene.screenState).toBe('playing');
  route.run([walk(5490)]); expect(route.scene.screenState).toBe('playing');
  route.run([walk(5320),walk(5400),{kind:'finish'}]); expect(route.scene.screenState).toBe('finish');
});

it('detects removal of snow-return support and removal of the spring bypass input', () => {
  // Explicit fault-injection seam after selecting the real Frost identity.
  const missing=frostPilot();
  (missing.scene as unknown as {level:LevelData}).level={...FROST_RIDGE,platforms:[]};
  missing.run(FROST_MAIN);
  missing.scene.activateFinish('Build your word'); missing.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  missing.run(FROST_DOWN_SUMMIT);
  expect(()=>missing.run(FROST_UPPER_RETURN)).toThrow(/stalled/);
  const bypass=frostPilot(); bypass.run([walk(3100),walk(3380)]);
  expect(bypass.events.some(e=>e.type==='spring')).toBe(true);
});
it.each(['intro','bowl','upper'])('a missed %s return jump lands on connected terrain and permits another ordinary attempt', chain => {
  const route=frostPilot(); route.run(FROST_MAIN);
  route.scene.activateFinish('Build your word'); route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  route.run(FROST_DOWN_SUMMIT);
  if(chain!=='upper') route.run(FROST_UPPER_RETURN);
  if(chain==='intro') route.run(FROST_BOWL_RETURN);
  const takeoff=chain==='upper'?3780:chain==='bowl'?2430:610;
  route.run([walk(takeoff)]);
  route.tick(0,true,false);
  for(let f=0;f<70;f++) route.tick();
  expect(route.player.onGround).toBe(true);
  expect(route.player.platformId).toBeNull();
  expect(route.player.y+34).toBe(surfaceY(FROST_RIDGE,route.player.x));
  route.run(chain==='upper'?FROST_UPPER_RETURN:chain==='bowl'?FROST_BOWL_RETURN:FROST_RETURN.slice(-7));
  expect(route.events.filter(e=>['damage','recover','spring'].includes(e.type))).toEqual([]);
});
