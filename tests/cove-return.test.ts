import { expect, it } from 'vitest';
import { covePilot, COVE_MISS_ALL, COVE_LOWER, COVE_RETURN, COVE_A, COVE_N, walk, jump } from './cove-pilot';
import { SANDY_COVE } from '../src/world/sandy-cove';

function retrace(route:ReturnType<typeof covePilot>) {
  expect(route.scene.screenState).toBe('finish');
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(t=>t.label==='Find more letters')!.action();
  expect(route.scene.playerX).toBe(SANDY_COVE.retrace!.x);
  expect(route.player).toMatchObject({vx:0,vy:0,onGround:true});
}
it.each([
  {missing:'all four',out:COVE_MISS_ALL,back:COVE_RETURN,ids:['s','a','n','d']},
  {missing:'A only',out:COVE_LOWER,back:COVE_A,ids:['a']},
  {missing:'N only',out:[walk(1040),jump(1040,320),walk(1950),jump(2080,320),walk(4030),{kind:'finish' as const}],back:COVE_N,ids:['n']},
])('uses the actual finish for $missing return and manual SAND assembly',({out,back,ids})=>{
  const route=covePilot();route.run(out);
  expect(route.scene.education.pickups.filter(p=>!route.scene.education.hasLetter(p.id)).map(p=>p.id).sort()).toEqual(ids.map(id=>`cove-letter-${id}`).sort());
  const run=route.runState, earned=new Set(run.collectedGems);retrace(route);
  route.run(back);expect(route.scene.education.letterCount).toBe(4);
  expect(route.scene.education.hasWordSticker).toBe(false);
  route.run(COVE_LOWER);expect(route.scene.screenState).toBe('finish');
  expect((route.scene as unknown as {run:typeof run}).run).toBe(run);
  expect([...earned].every(id=>run.collectedGems.has(id))).toBe(true);
  route.scene.activateFinish('Build your word');
  for(const [slot,p]of route.scene.education.pickups.entries()) {
    route.scene.menuTargets.find(t=>t.label===`Letter ${p.letter}`)!.action();
    route.scene.menuTargets.find(t=>t.label===`Space ${slot+1}: empty`)!.action();
  }
  expect(route.scene.education.hasWordSticker).toBe(true);
  expect(route.events.filter(e=>['spring','damage','recover'].includes(e.type))).toEqual([]);
});
it('traverses the entire finish trigger band while unarmed, then deliberately leaves and re-enters',()=>{
  const route=covePilot();route.run(COVE_LOWER);retrace(route);
  route.run([walk(4180)]);expect(route.player.x).toBeGreaterThan(SANDY_COVE.finish.x+SANDY_COVE.finish.boundedWidth!);
  expect(route.scene.screenState).toBe('playing');
  route.run([walk(4030)]);expect(route.scene.screenState).toBe('playing');
  route.run([walk(3950),walk(4030),{kind:'finish'}]);expect(route.scene.screenState).toBe('finish');
});
it('detects the bounded always-armed negative control at the real trigger band',()=>{
  const route=covePilot();route.run(COVE_LOWER);retrace(route);
  // Explicit state-machine sabotage, never used by a gameplay witness or browser pilot.
  (route.scene as unknown as {finishArmed:boolean}).finishArmed=true;
  for(let f=0;f<120&&route.scene.screenState==='playing';f++)route.tick(1);
  expect(route.player.x).toBeGreaterThanOrEqual(SANDY_COVE.finish.x);
  expect(route.player.x).toBeLessThanOrEqual(SANDY_COVE.finish.x+SANDY_COVE.finish.boundedWidth!);
  expect(route.scene.screenState).toBe('finish');
});
