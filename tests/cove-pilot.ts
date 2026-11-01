import { SANDY_COVE } from '../src/world/sandy-cove';
import { routePilot, walk, jump, drop } from './sunset-pilot';
import type { TimberPilotStage } from './timbers-browser-pilot';
export const covePilot = (cadence: readonly number[] = [0.016], held = 0.24) => routePilot(SANDY_COVE, cadence, held);
export const COVE_LOWER: readonly TimberPilotStage[] = [walk(1320), walk(2070), walk(3660), walk(4030), {kind:'finish'}];
// Jump over S, N and D; A is above the walkable hollow floor.
export const COVE_MISS_ALL: readonly TimberPilotStage[] = [walk(235), jump(340,312), walk(1950), jump(2080,320), walk(3800), jump(3900,248), walk(4030), {kind:'finish'}];
export const COVE_RETURN: readonly TimberPilotStage[] = [walk(3850),walk(2000),walk(1040),jump(1040,297),walk(280)];
export const COVE_A: readonly TimberPilotStage[] = [walk(1040),jump(1040,297)];
export const COVE_N: readonly TimberPilotStage[] = [walk(2000)];
export const COVE_SUPPORT_APPROACH: readonly (readonly TimberPilotStage[])[] = [
  [walk(1040),jump(1040,297)],
  [walk(1690),jump(1750,283)],
  [walk(2210),jump(2260,285)],
  [walk(2380),jump(2420,284)],
  [walk(2940),jump(3020,272)],
  [walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3210)],
  [walk(3360),jump(3360,272)],
];
export { walk, jump, drop };

/** Entrance-to-finish collection; no player, run, collectible or event state injection. */
export function coveRewards(cadence: readonly number[] = [0.016], unsafeLanding = false) {
  const route=covePilot(cadence);
  const groundGems=SANDY_COVE.entities.filter(e=>e.kind==='gem'&&!e.id.includes('bonus')&&![1750,2260,2420].includes(e.x));
  for(const gem of groundGems.filter(e=>e.x<=900)) route.run([walk(gem.x)]);
  route.run([walk(950),jump(950,368),walk(1040),jump(1040,297),walk(1065)]);
  for(const gem of groundGems.filter(e=>e.x>900&&e.x<=1660)) route.run([walk(gem.x)]);
  route.run([walk(1690),jump(1750,283)]);
  for(const gem of groundGems.filter(e=>e.x>1750&&e.x<=2150)) route.run([walk(gem.x)]);
  route.run([walk(2210),jump(2260,285),walk(2300),jump(2395,284),walk(2420)]);
  for(const gem of groundGems.filter(e=>e.x>2420&&e.x<=3160)) route.run([walk(gem.x)]);
  route.run([walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3240),walk(3320),walk(3300),walk(3360),jump(3360,272)]);
  const steer=(x:number)=>{
    const p=route.player, stop=p.x+Math.sign(p.vx)*p.vx**2/2400;
    return stop<x-3?1:stop>x+3?-1:0;
  };
  const count=()=>route.events.filter(e=>e.type==='spring').length;
  const springAttempts:object[]=[];
  for(const gem of SANDY_COVE.entities.filter(e=>['cove-bonus-3','cove-bonus-5','cove-bonus-6'].includes(e.id))) {
    const before=count();
    route.run([walk(3390)]);
    for(let f=0;f<120&&count()===before;f++) route.tick(.35);
    for(let f=0;f<120&&!route.runState.collectedGems.has(gem.id);f++) route.tick(steer(gem.x),false,true);
    if(!route.runState.collectedGems.has(gem.id)) throw new Error(`missed spring gem ${gem.id}: ${route.player.x},${route.player.y}, launches ${count()}, gems ${[...route.runState.collectedGems]}`);
    const landing=unsafeLanding?3420:gem.x>3420?3500:3360;
    for(let f=0;f<120&&!route.player.onGround;f++) route.tick(steer(landing),false,true);
    // Include settling and repositioning in the launch budget. The unsafe control
    // intentionally returns to the live spring and must fail for a second launch.
    for(let f=0;f<45;f++) route.tick(steer(landing));
    if(count()-before!==1) throw new Error(`second spring launch violation: ${count()-before} at ${gem.id}`);
    if(!route.player.onGround||route.player.platformId!=='cove-bay-ledge-3'||Math.abs(route.player.vx)>=20
      ||Math.abs(route.player.x-3420)<=42) throw new Error(`unclear spring landing ${gem.id}`);
    springAttempts.push({id:gem.id,launches:count()-before,x:route.player.x,feet:route.player.y+34});
    if(landing>3420) route.run([walk(3480),jump(3380,272),walk(3360)]);
    if(count()-before!==1) throw new Error(`second spring launch violation: ${count()-before} during repositioning`);
  }
  // Cross above the spring with an ordinary deliberate hop, then rejoin the beach.
  route.run([walk(3370),jump(3480,272),walk(3540)]);
  for(const gem of groundGems.filter(e=>e.x>3540)) route.run([walk(gem.x)]);
  route.run([{kind:'finish'}]);
  if(count()!==3) throw new Error(`extra spring launch outside attempts: ${count()}`);
  return {...route,springAttempts};
}
