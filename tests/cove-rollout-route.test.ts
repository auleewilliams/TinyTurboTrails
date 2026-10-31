import { expect, it } from 'vitest';
import { surfaceY } from '../src/game/movement';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { covePilot } from './cove-pilot';
import { COVE_ROLLOUT_RESTS, COVE_ROLLOUT_REGIONS } from './cove-rollout-route';
it('simulation-only mechanism route actually settles on every changed support, including pool3', () => {
  const pilot = covePilot();
  for (const rest of COVE_ROLLOUT_RESTS) {
    pilot.run(rest.stages);
    for(let frame=0;frame<6;frame++)pilot.tick();
    expect(pilot.player.onGround,rest.name).toBe(true);
    expect(pilot.player.vx,rest.name).toBe(0);
    expect(pilot.player.y+34,rest.name).toBeCloseTo(rest.pose==='standing'?rest.feet:surfaceY(SANDY_COVE,pilot.player.x),1);
    expect(Math.abs(pilot.player.x-rest.x),rest.name).toBeLessThan(4);
    if(rest.pose==='standing')expect(pilot.player.platformId,rest.name).toBe(rest.id);
    else expect(pilot.player.platformId,rest.name).not.toBe(rest.id);
  }
  expect(pilot.events.filter(e=>e.type==='spring')).toHaveLength(0);
});

// A captured stationary lower/underpass rest must fit Henry's full18px body
// plus the unchanged <4px target tolerance entirely on ONE flat surface.
const flatRestSurface = (x: number) => SANDY_COVE.surfaces.find(s => s.x1 <= x - 13 && s.x2 >= x + 13 && s.y1 === s.y2);
it('rejects the original slope rests and verifies nearby genuine flat lower catches', () => {
  for (const x of [1160,2510]) expect(flatRestSurface(x),`sloped old target ${x}`).toBeUndefined();
  for (const x of [960,2350,1840,3300]) expect(flatRestSurface(x),`flat lower catch ${x}`).toBeDefined();
});
it('all22 captured stationary rests use flat ground or the actual flat platform top', () => {
  expect(COVE_ROLLOUT_RESTS).toHaveLength(22);
  for (const rest of COVE_ROLLOUT_RESTS) {
    if (rest.pose !== 'standing') expect(flatRestSurface(rest.x),rest.name).toBeDefined();
    else { const p=SANDY_COVE.platforms!.find(p=>p.id===rest.id)!;expect(rest.x-13,rest.name).toBeGreaterThanOrEqual(p.from.x);expect(rest.x+13,rest.name).toBeLessThanOrEqual(p.from.x+p.width); }
  }
});

it('two regions preserve the exact22-rest multiset once per viewport with no dropped support/underpass', () => {
  expect(COVE_ROLLOUT_REGIONS.map(r=>[r.name,r.rests.length])).toEqual([['Hollow/Pools',15],['Bays',7]]);
  for (const width of [426,320]) {
    const union=COVE_ROLLOUT_REGIONS.flatMap(r=>r.rests);
    expect(union,width+'px').toHaveLength(22);
    expect(union.map(r=>JSON.stringify(r)).sort(),width+'px').toEqual(COVE_ROLLOUT_RESTS.map(r=>JSON.stringify(r)).sort());
    for(const original of COVE_ROLLOUT_RESTS){expect(union.filter(r=>r.name===original.name)).toHaveLength(1);expect(union.find(r=>r.name===original.name)).toBe(original);}
    expect(union.filter(r=>r.pose==='standing').map(r=>r.id).sort()).toEqual(['cove-hollow-shelf','cove-pool-stone-1','cove-pool-stone-2','cove-pool-stone-3','cove-bay-ledge-1','cove-bay-ledge-2','cove-bay-ledge-3'].sort());
  }
});
it('each region independently starts from the actual spawn and settles using simulation input only', () => {
  expect(COVE_ROLLOUT_REGIONS).toHaveLength(2);
  for(const region of COVE_ROLLOUT_REGIONS){
    const pilot=covePilot();expect(pilot.player.x).toBe(SANDY_COVE.start.x);
    for(const rest of region.rests){pilot.run(rest.stages);for(let frame=0;frame<6;frame++)pilot.tick();expect(pilot.player.onGround,rest.name).toBe(true);expect(pilot.player.vx,rest.name).toBe(0);expect(Math.abs(pilot.player.x-rest.x),rest.name).toBeLessThan(4);expect(pilot.player.y+34,rest.name).toBeCloseTo(rest.pose==='standing'?rest.feet:surfaceY(SANDY_COVE,pilot.player.x),1);if(rest.pose==='standing')expect(pilot.player.platformId,rest.name).toBe(rest.id);else expect(pilot.player.platformId,rest.name).not.toBe(rest.id);}
    expect(pilot.events.filter(e=>e.type==='spring')).toHaveLength(0);
  }
});
