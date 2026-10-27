import { expect, it } from 'vitest';
import { createPlayer, surfaceAt, surfaceY } from '../src/game/movement';
import { createRun, damagePlayer, recoverFromFall } from '../src/game/interactions';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { covePilot, coveRewards, COVE_LOWER, COVE_SUPPORT_APPROACH, walk, jump, drop } from './cove-pilot';

it('preserves Cove totals and collectible identities with three firm checkpoints and one optional spring', () => {
  expect(()=>validateLevel(SANDY_COVE)).not.toThrow();
  expect(SANDY_COVE.entities.filter(e=>e.kind==='gem').map(e=>e.id).sort()).toEqual([
    ...Array.from({length:36},(_,i)=>`cove-gem-${i+1}`),...Array.from({length:6},(_,i)=>`cove-bonus-${i+1}`),
  ].sort());
  expect(SANDY_COVE.entities.filter(e=>['special','hazard','slime','crumbling-ledge'].includes(e.kind))).toEqual([]);
  expect(SANDY_COVE.entities.filter(e=>e.kind==='spring')).toHaveLength(1);
  expect(SANDY_COVE.checkpoints).toHaveLength(3);
  for(const p of [SANDY_COVE.start,...SANDY_COVE.checkpoints,SANDY_COVE.retrace!]) {
    expect(hasFixedSupport(SANDY_COVE,p)).toBe(true);
    for(const x of [p.x-9,p.x,p.x+9]) expect(surfaceAt(SANDY_COVE,x).material).toBeUndefined();
  }
});
it('keeps two short pool beds and bay shallows continuous with brief sand and unchanged movement multipliers', () => {
  expect(SANDY_COVE.surfaces.filter(s=>s.material==='water').map(s=>[s.x1,s.x2,s.speedMultiplier])).toEqual([[1660,1860,.65],[2200,2500,.65],[3040,3220,.65]]);
  expect(SANDY_COVE.surfaces.filter(s=>s.material==='sand').map(s=>[s.x1,s.x2,s.speedMultiplier])).toEqual([[75,105,.8],[520,600,.8]]);
  for(const [i,s] of SANDY_COVE.surfaces.entries()) {
    const next=SANDY_COVE.surfaces[i+1];
    if(next) {expect(s.x2).toBe(next.x1);expect(s.y2).toBe(next.y1);}
    expect(Math.abs((s.y2-s.y1)/(s.x2-s.x1))).toBeLessThanOrEqual(.65);
  }
});
it.each([[.016],[.032],[.01,.022,.016]].map(cadence=>({cadence})))('finishes and replays the lower route with no optional support, spring, damage or recovery at %j cadence', ({cadence}) => {
  const route=covePilot(cadence);route.run(COVE_LOWER);
  expect(route.scene.screenState).toBe('finish');
  expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
  expect(route.supports.size).toBe(0);expect(route.runState.health).toBe(3);
  route.scene.activateFinish('Replay');expect(route.scene.playerX).toBe(60);
  const replay=(route.scene as unknown as {run: typeof route.runState}).run;
  expect(replay.collectedGems.size).toBe(0);expect(replay.seconds).toBe(0);
});
it.each([[.016],[.032],[.01,.022,.016]].map(cadence=>({cadence})))('earns all 42 gems through complete ordinary-input discoveries at %j cadence', ({cadence})=>{
  const route=coveRewards(cadence);
  expect(route.scene.screenState).toBe('finish');expect(route.runState.collectedGems.size).toBe(42);
  expect(route.springAttempts).toHaveLength(3);
  expect(route.events.filter(e=>['damage','recover'].includes(e.type))).toEqual([]);
});
it('bounds the unsafe landing negative control to an actual second spring launch',()=>{
  expect(()=>coveRewards([.016],true)).toThrow(/second spring launch violation: [2-9]/);
});
it.each((SANDY_COVE.platforms??[]).map((platform,index)=>({platform,index})))('misses the actual union edge of $platform.id, lands supported and rejoins both banks before retrying',({platform,index})=>{
  for(const cadence of [[.016],[.032]]) for(const direction of [-1,1] as const) {
    const route=covePilot(cadence);route.run(COVE_SUPPORT_APPROACH[index]);
    expect(route.player.platformId).toBe(platform.id);
    if(index===6&&direction===1)route.run([walk(3370),jump(3480,272)]);
    const edge=direction<0?platform.from.x:platform.from.x+platform.width;
    const target=edge+direction*28;
    route.run([drop(edge,direction,target,surfaceY(SANDY_COVE,target))]);
    expect(direction<0?route.player.x+9<edge:route.player.x-9>edge).toBe(true);
    expect(route.player.platformId).toBeNull();expect(route.player.onGround).toBe(true);
    // Continue away from the miss, reverse to the far bank and retry the support.
    const pool=SANDY_COVE.surfaces.find(s=>s.material==='water'
      &&platform.from.x>=s.x1&&platform.from.x<s.x2);
    const banks=pool?[pool.x1-60,pool.x2+80]:index===0?[840,1320]:[2920,3660];
    route.run([walk(banks[0]),walk(banks[1]),...COVE_SUPPORT_APPROACH[index]]);
    expect(route.player.platformId).toBe(platform.id);
    expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
  }
});
it('retains actual earned rewards and completion through zero-motion start and checkpoint recovery and earlier reactivation',()=>{
  const route=covePilot();route.run(COVE_LOWER);const gems=new Set(route.runState.collectedGems);
  route.scene.activateFinish('Build your word');route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  for(const cp of [...SANDY_COVE.checkpoints].reverse()) {
    route.run([walk(cp.x)]);expect(route.runState.checkpointId).toBe(cp.id);
    const before=route.events.filter(e=>e.type==='checkpoint').length;
    for(let f=0;f<30;f++)route.tick();expect(route.events.filter(e=>e.type==='checkpoint')).toHaveLength(before);
    for(const cause of ['fall','health']) {
      if(cause==='fall')recoverFromFall(route.runState,route.player,[],SANDY_COVE);
      else {route.runState.health=1;route.runState.invulnerableSeconds=0;damagePlayer(route.runState,route.player,1,[],SANDY_COVE);}
      expect(route.player).toMatchObject({x:cp.x,y:cp.y-34,vx:0,vy:0,onGround:true,platformId:null,jumpBufferSeconds:0});
      expect(route.runState.collectedGems).toEqual(gems);expect(route.scene.session.results.has('cove')).toBe(true);
    }
  }
  const all=coveRewards();
  for(const cause of ['fall','health']) {
    if(cause==='fall') recoverFromFall(all.runState,all.player,[],SANDY_COVE);
    else {all.runState.health=1;all.runState.invulnerableSeconds=0;damagePlayer(all.runState,all.player,1,[],SANDY_COVE);}
    expect(all.runState.collectedGems.size).toBe(42);
    expect(all.scene.session.results.has('cove')).toBe(true);
    expect(all.player).toMatchObject({vx:0,vy:0,onGround:true,platformId:null});
  }
  const player=createPlayer(60,SANDY_COVE),run=createRun(SANDY_COVE);player.vx=200;player.vy=100;
  recoverFromFall(run,player,[],SANDY_COVE);expect(player).toMatchObject({x:60,y:326,vx:0,vy:0,onGround:true});
});

it.each([[.016],[.032]].map(cadence=>({cadence})))('crosses the dry upper bay reversibly without launching the spring at $cadence',({cadence})=>{
  const route=covePilot(cadence);
  route.run([walk(2940),jump(3020,272),walk(3080),jump(3170,260),walk(3280),jump(3360,272),walk(3370),jump(3480,272),walk(3500)]);
  route.run([walk(3480),jump(3380,272),walk(3360),jump(3280,260),walk(3160),jump(3080,272),walk(3020),walk(2920)]);
  expect(route.player.platformId).toBeNull();expect(route.player.onGround).toBe(true);
  expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
  route.run(COVE_LOWER);expect(route.scene.screenState).toBe('finish');
});
it.each([[.016],[.032]].map(cadence=>({cadence})))('takes off at reduced water speed and settles on each pool stone at $cadence',({cadence})=>{
  for(const platform of SANDY_COVE.platforms!.filter(p=>p.id.includes('pool-stone'))) {
    const route=covePilot(cadence);route.run([walk(platform.from.x-40)]);
    for(let f=0;f<80&&route.player.x<platform.from.x-8;f++)route.tick(1);
    expect(route.player.vx).toBeGreaterThan(130);expect(route.player.vx).toBeLessThanOrEqual(143);
    route.run([jump(platform.from.x+platform.width/2,platform.from.y)]);
    expect(route.player.platformId).toBe(platform.id);expect(route.player.onGround).toBe(true);
    expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
  }
});
