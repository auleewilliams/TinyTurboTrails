import { expect, it } from 'vitest';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { surfaceAt, surfaceY } from '../src/game/movement';
import { damagePlayer, recoverFromFall } from '../src/game/interactions';
import { frostPilot, frostRewards, FROST_MAIN } from './frost-pilot';

it('preserves every main and bonus collectible identity while replacing the retired geometry', () => {
  expect(FROST_RIDGE.entities.filter(e => e.kind === 'gem').map(e => e.id).sort()).toEqual([
    ...Array.from({length:36},(_,i)=>`frost-gem-${i+1}`), ...Array.from({length:3},(_,i)=>`frost-bonus-${i+1}`),
  ].sort());
  expect(FROST_RIDGE.entities.filter(e => e.kind === 'special')).toHaveLength(0);
});
it.each([{label:'16ms',cadence:[0.016]}, {label:'20ms',cadence:[0.020]}, {label:'24ms',cadence:[0.024]}, {label:'32ms',cadence:[0.032]}, {label:'mixed',cadence:[0.016,0.032,0.024]}])('reaches all 39 gems together through ordinary inputs and optional spring flight at $label', ({cadence}) => {
  const route=frostRewards(cadence);
  expect(route.scene.screenState).toBe('finish');
  expect(route.runState.collectedGems.size).toBe(39);
  expect(route.events.filter(e=>e.type==='damage'||e.type==='recover')).toEqual([]);
  expect(route.events.filter(e=>e.type==='spring').length).toBeGreaterThanOrEqual(1);
});
it('keeps the spring rewards optional and permits a clear snow bypass', () => {
  const route=frostPilot(); route.run(FROST_MAIN);
  expect([...route.runState.collectedGems].some(id=>id.includes('bonus'))).toBe(false);
  expect(route.events.filter(e=>e.type==='spring')).toEqual([]);
  expect(route.runState.health).toBe(3);
});
it('retains actually earned gems and completion through snow checkpoint fall and health recovery', () => {
  const route=frostRewards(), earned=new Set(route.runState.collectedGems);
  // Explicit recovery API seam after a real all-gem finish; no position assignment.

  expect(route.runState.checkpointId).toBe('frost-checkpoint-3');
  for(const cause of ['fall','health']) {
    if(cause==='fall') recoverFromFall(route.runState,route.player,[],FROST_RIDGE);
    else { route.runState.health=1; route.runState.invulnerableSeconds=0; damagePlayer(route.runState,route.player,1,[],FROST_RIDGE); }
    expect(route.runState.collectedGems).toEqual(earned);
    expect(route.scene.session.results.has('frost')).toBe(true);
    expect(route.player.x).toBe(4040);
    expect(route.player.y+34).toBe(surfaceY(FROST_RIDGE,4040));
    expect(surfaceAt(FROST_RIDGE,4040).material).toBeUndefined();
  }
});
it('finishes with the straightforward route and no bonus hop required', () => {
  const route=frostPilot(); route.run(FROST_MAIN);
  expect(route.scene.screenState).toBe('finish');
  expect(route.scene.education.letterCount).toBe(0);
});
