import { expect, it } from 'vitest';
import { SUNSET_SITE } from '../src/world/levels';
import { hasFixedSupport } from '../src/world/level';
import { ALL_RETURN, MAIN_ROUTE, REASCENT, sunsetPilot, walk, jump, drop, DOWN_FINAL, UP_DESCENT, BACK_FIRST, CROSS_DESCENT, FINAL_CLIMB } from './sunset-pilot';

it('keeps all 62 gem identities, zero stars and shelf-supported rewards', () => {
  const gems = SUNSET_SITE.entities.filter(entity => entity.kind === 'gem');
  expect(gems.map(gem => gem.id)).toEqual([
    ...Array.from({ length: 56 }, (_, index) => `site-gem-${String(index + 1).padStart(3, '0')}`),
    ...Array.from({ length: 6 }, (_, index) => `site-bonus-${String(index + 1).padStart(3, '0')}`),
  ]);
  expect(SUNSET_SITE.entities.filter(entity => entity.kind === 'special')).toEqual([]);
  for (const gem of gems) expect(hasFixedSupport(SUNSET_SITE, { x: gem.x, y: gem.y + 18 }), gem.id).toBe(true);
});

it('earns the quiet yard gems on foot and preserves them through the real return', () => {
  const route = sunsetPilot(); route.run(MAIN_ROUTE);
  for (const id of ['site-gem-030', 'site-gem-031', 'site-gem-032', 'site-gem-033']) expect(route.runState.collectedGems.has(id), id).toBe(true);
  const earned = new Set(route.runState.collectedGems);
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  route.run(ALL_RETURN);
  route.run([walk(400), walk(350)]);
  route.run(REASCENT);
  for (const id of earned) expect(route.runState.collectedGems.has(id), id).toBe(true);
  expect(route.scene.screenState).toBe('finish');
});

it('collects every one of the 62 gems through a single input journey', () => {
  const route = sunsetPilot(); route.run(MAIN_ROUTE);
  route.scene.activateFinish('Build your word');
  route.scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  route.run([walk(2390), walk(2210), ...DOWN_FINAL.slice(0, 1), walk(2120), ...DOWN_FINAL.slice(1),
    ...UP_DESCENT.slice(0, 2), walk(1340), ...UP_DESCENT.slice(2), walk(680),
    ...BACK_FIRST, walk(400), drop(430, 1, 470, 500), jump(400, 440), walk(350),
    walk(275), jump(275, 380), jump(300, 320), walk(350), CROSS_DESCENT[0], walk(1000),
    drop(1050, 1, 1100, 440), drop(980, -1, 930, 500), walk(870), walk(990),
    drop(1020, 1, 1060, 560), jump(1100, 500), walk(1310), ...CROSS_DESCENT.slice(5),
    ...FINAL_CLIMB.slice(0, 7), walk(2150), walk(1970), jump(1970, 380), walk(1880),
    drop(1840, -1, 1800, 440), walk(1820), jump(1870, 380), walk(1970), jump(2000, 320),
    walk(2090), jump(2090, 260), walk(2170), jump(2100, 200), walk(2120), jump(2130, 140), { kind: 'finish' }]);
  const missing = SUNSET_SITE.entities.filter(entity => entity.kind === 'gem' && !route.runState.collectedGems.has(entity.id));
  expect(missing.map(entity => [entity.id, entity.x, entity.y + 18])).toEqual([]);
});
