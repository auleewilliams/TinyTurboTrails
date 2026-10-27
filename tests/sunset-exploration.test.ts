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
  route.run([walk(3110), walk(2930), ...DOWN_FINAL.slice(0, 1), walk(2840), ...DOWN_FINAL.slice(1),
    ...UP_DESCENT.slice(0, 2), walk(2060), ...UP_DESCENT.slice(2), walk(680),
    ...BACK_FIRST, walk(400), drop(430, 1, 470, 500), jump(400, 440), walk(350),
    walk(275), jump(275, 380), jump(300, 320), walk(350), CROSS_DESCENT[0], walk(1880),
    drop(1900, 1, 1940, 440), walk(1840), drop(1820, -1, 1770, 500), walk(1740), drop(1700, -1, 1640, 560), walk(1780), jump(1840, 500), walk(2030), ...CROSS_DESCENT.slice(5),
    ...FINAL_CLIMB.slice(0, 7), walk(2870), walk(2690), jump(2690, 380), walk(2600),
    drop(2560, -1, 2520, 440), walk(2540), jump(2590, 380), walk(2690), jump(2720, 320),
    walk(2810), jump(2810, 260), walk(2890), jump(2820, 200), walk(2840), jump(2850, 140), { kind: 'finish' }]);
  const missing = SUNSET_SITE.entities.filter(entity => entity.kind === 'gem' && !route.runState.collectedGems.has(entity.id));
  expect(missing.map(entity => [entity.id, entity.x, entity.y + 18])).toEqual([]);
});
