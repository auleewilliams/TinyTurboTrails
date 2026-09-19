import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { surfaceY } from '../src/game/movement';
import { validateLevel, type WorldEntity } from '../src/world/level';
import { LEVELS, TREETOP_TIMBERS, levelById } from '../src/world/levels';

const ofKind = (kind: WorldEntity['kind']) =>
  TREETOP_TIMBERS.entities.filter((entity) => entity.kind === kind);

it('registers Treetop Timbers with its own atlas and valid level data', () => {
  expect(levelById('timbers')).toBe(TREETOP_TIMBERS);
  expect(LEVELS).toContain(TREETOP_TIMBERS);
  expect(() => validateLevel(TREETOP_TIMBERS)).not.toThrow();
  expect(TREETOP_TIMBERS.name).toBe('TREETOP TIMBERS');
  expect(TREETOP_TIMBERS.atlas).toBe('timbers');
});

it('builds a long forgiving timber route with six checkpointed sections', () => {
  expect(TREETOP_TIMBERS.width).toBeGreaterThanOrEqual(9980);
  expect(TREETOP_TIMBERS.checkpoints).toHaveLength(6);
  expect(ofKind('checkpoint')).toHaveLength(6);
  expect(ofKind('spring').length).toBeGreaterThanOrEqual(6);
  expect(ofKind('hazard').length).toBeGreaterThanOrEqual(6);
  expect(ofKind('gem').length).toBeGreaterThanOrEqual(30);
  expect(ofKind('hazard').every(({ asset }) => asset === 'stone')).toBe(true);
});

it('uses shallow V contours that read as rope bridges while remaining walkable', () => {
  const surfaces = TREETOP_TIMBERS.surfaces;
  const valleys = surfaces.filter((down, index) => {
    const up = surfaces[index + 1];
    return up && down.y2 > down.y1 && up.y2 < up.y1 && down.x2 === up.x1 && down.y2 === up.y1;
  });
  expect(valleys.length).toBeGreaterThanOrEqual(4);
  for (const valley of valleys) {
    expect(valley.y2 - valley.y1).toBeLessThanOrEqual(48);
  }
});

it('plants grounded interactions on the timber trail', () => {
  for (const entity of TREETOP_TIMBERS.entities) {
    if (entity.kind === 'gem' || entity.kind === 'decoration') continue;
    expect(entity.y, entity.id).toBeCloseTo(surfaceY(TREETOP_TIMBERS, entity.x), 5);
  }
});

it('can finish Treetop Timbers with simple hazard-avoidance jumps', () => {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never,
    { plains: {} as never, timbers: {} as never }, audio, TREETOP_TIMBERS);
  const input = { horizontal: 1, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
  const dangers = TREETOP_TIMBERS.entities
    .filter((entity) => entity.kind === 'slime' || entity.kind === 'hazard')
    .sort((left, right) => left.x - right.x);
  let dangerIndex = 0;
  let jumpFrames = 0;
  for (let frame = 0; frame < 60 * 150 && scene.screenState !== 'finish'; frame++) {
    const danger = dangers[dangerIndex];
    const jumpPressed = danger !== undefined && scene.playerX >= danger.x - 50;
    if (jumpPressed) {
      dangerIndex++;
      jumpFrames = 24;
    }
    scene.update(1 / 60, { ...input, jumpPressed, jumpHeld: jumpFrames-- > 0 });
  }
  expect(scene.screenState).toBe('finish');
  expect(effects.filter((effect) => effect === 'spring')).toHaveLength(ofKind('spring').length);
  // A hazard-avoidance jump can carry Henry over a nearby checkpoint's trigger.
  expect(effects.filter((effect) => effect === 'checkpoint').length).toBeGreaterThan(0);
  expect(effects).not.toContain('recover');
  expect(effects.filter((effect) => effect === 'damage').length).toBeLessThan(3);
});

it('ships a complete 4 by 4 timber atlas contract', () => {
  const manifest = JSON.parse(readFileSync(
    new URL('../public/assets/timbers/manifest.json', import.meta.url), 'utf8',
  )) as { image: string; cellSize: number; assets: Record<string, number>;
    terrainTops: Record<string, { left: number; right: number }> };
  expect(manifest.image).toBe('environment.png');
  expect(manifest.cellSize).toBe(48);
  expect(Object.values(manifest.assets).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 16 }, (_, index) => index),
  );
  expect(manifest.terrainTops).toEqual({
    'terrain-flat': { left: 24, right: 24 },
    'terrain-left': { left: 9, right: 9 },
    'terrain-right': { left: 4, right: 4 },
    'terrain-ramp': { left: 30, right: 11 },
  });
});
