import { expect, it } from 'vitest';
import { DEFAULT_MOVEMENT } from '../src/game/movement';
import { TRAIL_WORDS } from '../src/game/education';
import { HudPresentation, trailPosition } from '../src/game/hud';
import { Camera } from '../src/world/camera';
import { hasFixedSupport, validateLevel } from '../src/world/level';
import { TREETOP_TIMBERS } from '../src/world/levels';

it('authors one permanent tree ascent, both forks, and a walk-off return', () => {
  const level = TREETOP_TIMBERS;
  expect(level.progressAxis).toBe('y');
  expect(level.start.y - level.finish.y).toBeGreaterThanOrEqual(800);
  expect(level.checkpoints).toHaveLength(3);
  expect(level.platforms?.length).toBeGreaterThan(25);
  expect(level.entities.filter(entity => entity.kind === 'spring')).toHaveLength(1);
  expect(level.entities.filter(entity => entity.kind === 'gem')).toHaveLength(33);
  expect(level.entities.filter(entity => entity.kind === 'special')).toHaveLength(3);
  for (const point of [level.start, level.finish, level.retrace!, ...level.checkpoints]) {
    expect(hasFixedSupport(level, point)).toBe(true);
  }
  expect(() => validateLevel(level)).not.toThrow();
  expect(level.platforms?.some(platform => platform.id === 'timber-fork-left-1')).toBe(true);
  expect(level.platforms?.some(platform => platform.id === 'timber-fork-right-1')).toBe(true);
  expect(level.platforms?.some(platform => platform.id === 'timber-return-840')).toBe(true);
  const spring = level.entities.find(entity => entity.kind === 'spring')!;
  expect(() => validateLevel({ ...level, entities: level.entities.map(entity => entity.id === spring.id
    ? { ...entity, y: spring.y - 12 } : entity) })).toThrow(/spring lacks fixed support/);
});

it('leaves a forgiving full-body gap between the distinct y960 low and return boughs', () => {
  const low = TREETOP_TIMBERS.platforms!.find(platform => platform.id === 'timber-low-2')!;
  const outer = TREETOP_TIMBERS.platforms!.find(platform => platform.id === 'timber-return-960')!;
  expect(low.from.y).toBe(outer.from.y);
  expect(outer.from.x - (low.from.x + low.width)).toBeGreaterThanOrEqual(DEFAULT_MOVEMENT.width + 20);
});

it('keeps separate TREE identities at four branch heights', () => {
  const pickups = TRAIL_WORDS.find(word => word.id === 'timbers')!.pickups;
  expect(pickups.map(pickup => pickup.id)).toEqual([
    'timbers-letter-t', 'timbers-letter-r', 'timbers-letter-e1', 'timbers-letter-e2',
  ]);
  expect(pickups.map(pickup => pickup.supportY)).toEqual([1080, 900, 420, 180]);
});

it('frames the first and next actual bough before upward or downward commitment', () => {
  const camera = new Camera({ width: 426, height: 240, worldWidth: 820, worldHeight: 1180, vertical: true });
  camera.update(100, 1046);
  expect(camera.position.y).toBe(940);
  expect(1020 - camera.position.y).toBe(80);
  camera.update(400, 626);
  expect(600 - camera.position.y).toBeGreaterThanOrEqual(55);
  expect(600 - camera.position.y).toBeLessThan(200);
  camera.update(440, 146);
  expect(180 - camera.position.y).toBeGreaterThanOrEqual(55);
  camera.update(650, 206);
  expect(240 - camera.position.y).toBeGreaterThanOrEqual(55);
  expect(240 - camera.position.y).toBeLessThan(200);
});

it('announces the current bough on descent while retaining visited posts', () => {
  const hud = new HudPresentation();
  const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
  const level = TREETOP_TIMBERS;
  hud.consume(level.checkpoints.map(point => ({ type: 'checkpoint' as const, entityId: point.id })));
  for (const [supportY, name] of [[900, 'First fork'], [660, 'Middle bough'],
    [420, 'Canopy'], [180, 'Lookout'], [660, 'Middle bough']] as const) {
    hud.update(1 / 60, neutral, level, 400, false, supportY);
    expect(hud.location).toBe(name);
  }
  expect(hud.progress(level, 400, 660).checkpoints.every(point => point.activated)).toBe(true);
  expect(trailPosition(level, 400, 660)).toBeLessThan(trailPosition(level, 400, 180));
});
