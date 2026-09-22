import { expect, it, vi } from 'vitest';
import { LEVELS } from '../src/world/levels';
import { validateLevel, type LevelData } from '../src/world/level';
import { SLIME_SPEED, SLIME_EDGE_CLEARANCE, slimeGroundBounds, withSlimePatrols } from '../src/world/slimes';
import { advancePatrols, createRun, entityState, startNewRun, stepEntities } from '../src/game/interactions';
import { createPlayer, surfaceY } from '../src/game/movement';
import { drawSlime } from '../src/world/renderer';

it.each(LEVELS)('$name gives every slime the common speed, a short safe route and no bounce', (level) => {
  const slimes = level.entities.filter((entity) => entity.kind === 'slime');
  expect(slimes.length).toBeGreaterThan(0);
  expect(() => validateLevel(level)).not.toThrow();
  for (const slime of slimes) {
    const patrol = slime.patrol!;
    expect(patrol.speed).toBe(SLIME_SPEED);
    expect(patrol.maxX - patrol.minX).toBeGreaterThan(0);
    expect(patrol.maxX - patrol.minX).toBeLessThanOrEqual(120);
    expect(slime.bounce).toBeUndefined();
    const bounds = slimeGroundBounds(level, slime.x);
    expect(patrol.minX).toBeGreaterThanOrEqual(bounds.minX);
    expect(patrol.maxX).toBeLessThanOrEqual(bounds.maxX);
    for (const checkpoint of level.checkpoints) {
      expect(patrol.maxX <= checkpoint.x - 60 || patrol.minX >= checkpoint.x + 60).toBe(true);
    }
    for (const spring of level.entities.filter((entity) => entity.kind === 'spring')) {
      expect(patrol.maxX <= spring.x - 40 || patrol.minX >= spring.x + 40).toBe(true);
    }
  }
});

it.each(LEVELS)('$name patrols reverse at both bounds, stay grounded, damage on contact and reset', (level) => {
  const run = createRun(level);
  for (const slime of level.entities.filter((entity) => entity.kind === 'slime')) {
    const state = entityState(run, slime.id)!;
    const patrol = slime.patrol!;
    state.x = patrol.maxX - 0.01;
    state.direction = 1;
    advancePatrols(run, level, 0.1);
    expect(state.x).toBe(patrol.maxX);
    expect(state.direction).toBe(-1);
    state.x = patrol.minX + 0.01;
    advancePatrols(run, level, 0.1);
    expect(state.x).toBe(patrol.minX);
    expect(state.direction).toBe(1);
    expect(state.y).toBe(surfaceY(level, state.x));
    const contactRun = createRun(level);
    const henry = createPlayer(slime.x, level);
    stepEntities(contactRun, level, henry, 0, []);
    expect(contactRun.health).toBe(2);
    expect(entityState(contactRun, slime.id)!.active).toBe(true);
  }
  for (let frame = 0; frame < 600; frame++) {
    advancePatrols(run, level, 1 / 60);
    for (const slime of level.entities.filter((entity) => entity.kind === 'slime')) {
      const state = entityState(run, slime.id)!;
      expect(state.x).toBeGreaterThanOrEqual(slime.patrol!.minX);
      expect(state.x).toBeLessThanOrEqual(slime.patrol!.maxX);
      expect(state.y).toBe(surfaceY(level, state.x));
    }
  }
  startNewRun(run, level);
  expect(run.entities).toEqual(createRun(level).entities);
});

it('stops a whole body before cliffs, gaps, discontinuities and level edges', () => {
  const terrain = { minX: 0, maxX: 600, surfaces: [
    { x1: 0, x2: 100, y1: 180, y2: 180 },
    { x1: 100, x2: 110, y1: 180, y2: 380 },
    { x1: 110, x2: 200, y1: 380, y2: 380 },
    { x1: 220, x2: 300, y1: 180, y2: 180 },
    { x1: 300, x2: 400, y1: 200, y2: 200 },
    { x1: 400, x2: 600, y1: 200, y2: 180 },
  ] };
  expect(slimeGroundBounds(terrain, 80)).toEqual({ minX: SLIME_EDGE_CLEARANCE, maxX: 100 - SLIME_EDGE_CLEARANCE });
  expect(slimeGroundBounds(terrain, 250)).toEqual({ minX: 220 + SLIME_EDGE_CLEARANCE, maxX: 300 - SLIME_EDGE_CLEARANCE });
  expect(slimeGroundBounds(terrain, 350)).toEqual({ minX: 300 + SLIME_EDGE_CLEARANCE, maxX: 600 - SLIME_EDGE_CLEARANCE });
  expect(() => slimeGroundBounds(terrain, 210)).toThrow(/no walkable ground/);
  const level: LevelData = { ...LEVELS[0], ...terrain, checkpoints: [], challengeCues: [], entities: [
    { id: 'edge-slime', kind: 'slime', asset: 'slime', layer: 'world', x: 75, y: 180 },
  ] };
  expect(withSlimePatrols(level).entities[0].patrol).toEqual({ minX: 20, maxX: 80, speed: SLIME_SPEED });
  const bad: LevelData = { ...LEVELS[0], entities: [{ ...LEVELS[0].entities.find((entity) => entity.kind === 'slime')!,
    patrol: { minX: 0, maxX: 320, speed: SLIME_SPEED } }] };
  expect(() => validateLevel(bad)).toThrow(/edge clearance/);
});

it('uses each approved costume with one shared draw size and ground anchor', () => {
  const accessories = ['straw', 'miner', 'leaf', 'hard-hat', 'bobble', 'snorkel'];
  expect(LEVELS.map((level) => level.theme.slimeAccessory)).toEqual(accessories);
  const atlas = {} as HTMLImageElement;
  LEVELS.forEach((level, index) => {
    const drawImage = vi.fn();
    drawSlime({ drawImage } as unknown as CanvasRenderingContext2D, atlas, level.theme.slimeAccessory!, 250, 180);
    expect(drawImage).toHaveBeenCalledWith(atlas, index * 48, 0, 48, 48, 226, 136, 48, 48);
  });
});
