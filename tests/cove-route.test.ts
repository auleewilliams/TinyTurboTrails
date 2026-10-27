import { expect, it } from 'vitest';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { surfaceAt } from '../src/game/movement';
import { routePilot, walk, jump } from './sunset-pilot';

it('connects compact dunes, two island pools and the lower bay to the viewpoint without optional jumps', () => {
  expect(SANDY_COVE.width).toBeLessThanOrEqual(4400);
  expect(()=>validateLevel(SANDY_COVE)).not.toThrow();
  const route=routePilot(SANDY_COVE);
  route.run([walk(1320),walk(2070),walk(3660),walk(4030),{kind:'finish'}]);
  expect(route.scene.screenState).toBe('finish');
  expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
  expect(route.events.filter(e=>e.type==='checkpoint')).toHaveLength(3);
  expect(route.supports.size).toBe(0);
  expect(route.runState.health).toBe(3);
  expect(hasFixedSupport(SANDY_COVE,SANDY_COVE.start)).toBe(true);
  expect(surfaceAt(SANDY_COVE,SANDY_COVE.start.x).material).toBeUndefined();
});

it('keeps optional A above the hollow underpass and reaches every permanent pool and bay support', () => {
  const route=routePilot(SANDY_COVE);
  route.run([walk(1040)]);
  expect(route.scene.education.hasLetter('cove-letter-a')).toBe(false);
  route.run([jump(1040,320)]);
  expect(route.player.platformId).toBe('cove-hollow-shelf');
  expect(route.scene.education.hasLetter('cove-letter-a')).toBe(true);
  route.run([walk(1320),walk(1690),jump(1750,296),walk(2070),walk(2210),jump(2260,296),walk(2300),jump(2395,284),walk(2800),walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3280),jump(3360,272)]);
  expect([...route.supports]).toEqual(expect.arrayContaining(['cove-hollow-shelf','cove-pool-stone-1','cove-pool-stone-2','cove-pool-stone-3','cove-bay-ledge-1','cove-bay-ledge-2','cove-bay-ledge-3']));
  expect(route.events.filter(e=>['damage','recover','spring'].includes(e.type))).toEqual([]);
});

it('offers exactly one optional fixed-ledge spring above the bypass with a clear settled landing', () => {
  const spring=SANDY_COVE.entities.filter(e=>e.kind==='spring');
  expect(spring).toHaveLength(1);
  expect(hasFixedSupport(SANDY_COVE,spring[0])).toBe(true);
  const route=routePilot(SANDY_COVE);
  route.run([walk(3360),jump(3360,272)]);
  const count=()=>route.events.filter(e=>e.type==='spring').length;
  for(let f=0;f<120 && count()===0;f++) route.tick(1);
  expect(count()).toBe(1);
  for(let f=0;f<120 && !route.player.onGround;f++) {
    const stop=route.player.x+Math.sign(route.player.vx)*route.player.vx**2/2400;
    route.tick(stop<3500-3?1:stop>3500+3?-1:0,false,true);
  }
  route.run([walk(3500)]);
  for(let f=0;f<30;f++) route.tick();
  expect(route.player.onGround).toBe(true);
  expect(route.player.platformId).toBe('cove-bay-ledge-3');
  expect(route.player.x-9).toBeGreaterThan(spring[0].x+24);
  expect(Math.abs(route.player.vx)).toBeLessThan(20);
  expect(count()).toBe(1);
});
