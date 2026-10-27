import { surfaceAt, surfaceY } from '../src/game/movement';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { routePilot, walk, jump, drop } from './sunset-pilot';
import type { TimberPilotStage } from './timbers-browser-pilot';
export const travel = (x:number,direction:1|-1):TimberPilotStage => ({kind:'travel',x,direction});
export const FROST_MAIN: readonly TimberPilotStage[] = [
  jump(145, 500), walk(620), walk(1140), jump(1250, 380), walk(2585),
  jump(2680, 540), walk(3100), jump(3220, 492), walk(5265), jump(5380, 240), { kind: 'finish' },
];
export const FROST_DOWN_SUMMIT: readonly TimberPilotStage[] = [walk(5320), travel(3900,-1)];
export const FROST_UPPER_RETURN: readonly TimberPilotStage[] = [walk(3780), jump(3740, 410), walk(3630), jump(3550, 372), drop(3440, -1, 3400, 444), walk(3180), jump(3100, 492), walk(2620)];
export const FROST_BOWL_RETURN: readonly TimberPilotStage[] = [walk(2430), jump(2400, 500), walk(2290), jump(2200, 452), walk(2100), jump(2010, 404), walk(1910), jump(1820, 356), walk(1720), jump(1630, 308), drop(1520, -1, 1480, 380), walk(1190)];
export const FROST_INTRO_RETURN: readonly TimberPilotStage[] = [walk(610), jump(580, 500), walk(510), jump(430, 450), walk(340), jump(250, 400), drop(140, -1, 110, 500)];
export const FROST_RETURN: readonly TimberPilotStage[] = [...FROST_DOWN_SUMMIT, ...FROST_UPPER_RETURN, ...FROST_BOWL_RETURN, ...FROST_INTRO_RETURN];
export const FROST_REASCENT: readonly TimberPilotStage[] = [travel(620,1), travel(3000,1), walk(3100), jump(3220, 492), travel(5400,1), { kind: 'finish' }];
export const frostPilot = (cadence: readonly number[] = [0.016], held = 0.24) => routePilot(FROST_RIDGE, cadence, held);

/** Every reward is earned in one run. landingX is the explicit old-landing negative-control seam. */
export function frostRewards(cadence: readonly number[] = [0.016], landingX = 3070) {
  const route = frostPilot(cadence);
  const gems = FROST_RIDGE.entities.filter(e => e.kind === 'gem' && !e.id.includes('bonus')).sort((a,b) => a.x-b.x);
  for (const gem of gems.filter(g => g.x <= 3110)) route.run([walk(gem.x)]);
  const steer = (x: number) => {
    const p=route.player, stop=p.x+Math.sign(p.vx)*p.vx**2/2400;
    return stop<x-3?1:stop>x+3?-1:0;
  };
  const springAttempts: { id: string; launches: number; x: number; feet: number }[] = [];
  for (const gem of FROST_RIDGE.entities.filter(e => e.id.includes('bonus'))) {
    // Account for setup as well as flight and the settled landing. Never reset events.
    const count=route.events.filter(e=>e.type==='spring').length;
    route.run([walk(3100)]);
    for(let f=0;f<120 && route.events.filter(e=>e.type==='spring').length===count;f++) route.tick(1);
    // A neighbouring bonus may already be in the bag; still complete this deliberate flight.
    let flight=0;
    for(let f=0;f<120 && (flight<0.24 || !route.runState.collectedGems.has(gem.id));f++) flight+=route.tick(steer(gem.x), false, true);
    if(!route.runState.collectedGems.has(gem.id)) throw new Error(`spring missed ${gem.id} at ${route.player.x},${route.player.y}`);
    const landingTarget = gem.x>3140 && landingX===3070 ? 3270 : landingX;
    for(let f=0;f<120 && !route.player.onGround;f++) route.tick(steer(landingTarget), false, true);
    for(let f=0;f<30;f++) route.tick(steer(landingTarget));
    const launches=route.events.filter(e=>e.type==='spring').length-count;
    const p=route.player;
    if(launches!==1 || !p.onGround || p.platformId || Math.abs(p.x-3140)<=48
      || Math.abs(p.y+34-surfaceY(FROST_RIDGE,p.x))>0.1 || surfaceAt(FROST_RIDGE,p.x).material==='ice'
      || Math.abs(p.vx)>=20) throw new Error(`unclear spring landing ${gem.id}: ${launches} launches at ${p.x},${p.y}`);
    springAttempts.push({id:gem.id,launches,x:p.x,feet:p.y+34});
    if(p.x>3140) {
      route.run([walk(3220)]);
      for(let f=0;f<120;f++) {
        route.tick(steer(3100),f===0,true);
        if(f>10 && p.onGround && Math.abs(p.x-3100)<4 && Math.abs(p.vx)<20) break;
      }
      route.run([walk(3100)]);
    }
    if(route.events.filter(e=>e.type==='spring').length-count!==1) throw new Error('extra spring launch during repositioning');
  }
  route.run([walk(3100), jump(3220,492)]);
  for (const gem of gems.filter(g => g.x > 3110)) route.run([walk(gem.x)]);
  route.run([{kind:'finish'}]);
  if(route.events.filter(e=>e.type==='spring').length!==3) throw new Error('extra spring launch outside attempts');
  return {...route,springAttempts};
}

export const FROST_MISS_S: readonly TimberPilotStage[] = [jump(145, 500), travel(3000,1), walk(3100), jump(3220, 492), travel(5400,1), { kind: 'finish' }];
