import { expect, it } from 'vitest';
import { DEFAULT_MOVEMENT, createPlayer, surfaceY } from '../src/game/movement';
import { activateCheckpoint, createRun, recoverFromFall, type RunEvent } from '../src/game/interactions';
import type { GameAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { validateLevel } from '../src/world/level';
import { LEVELS, QUARRY_RUN, levelById } from '../src/world/levels';

it('registers a playable Quarry Run', () => {
  expect(levelById('quarry')).toBe(QUARRY_RUN);
  expect(LEVELS).toContain(QUARRY_RUN);
  expect(() => validateLevel(QUARRY_RUN)).not.toThrow();
  expect(QUARRY_RUN.name).toBe('QUARRY RUN');
  expect(QUARRY_RUN.theme.parallax.every(({ asset }) => asset === 'cave')).toBe(true);
  expect(QUARRY_RUN.entities.filter(({ kind }) => kind === 'spring')).toHaveLength(2);
  expect(QUARRY_RUN.entities.filter(({ kind }) => kind === 'checkpoint')).toHaveLength(2);
  expect(QUARRY_RUN.entities.filter(({ kind, asset }) => kind === 'hazard' && asset === 'stone')).toHaveLength(1);
});

it('places Quarry interactions within the walkable activation window', () => {
  for (const entity of QUARRY_RUN.entities) {
    if (!['gem', 'spring', 'checkpoint', 'hazard'].includes(entity.kind)) continue;
    expect(Math.abs(entity.y - surfaceY(QUARRY_RUN, entity.x))).toBeLessThanOrEqual(28);
  }
});

it('includes a deep recovery pit and a finish after the second checkpoint', () => {
  expect(QUARRY_RUN.surfaces.some((surface) => Math.max(surface.y1, surface.y2)
    > QUARRY_RUN.height + DEFAULT_MOVEMENT.height + 80)).toBe(true);
  expect(QUARRY_RUN.finish.x).toBeGreaterThan(QUARRY_RUN.checkpoints[1].x);
});

it.each(QUARRY_RUN.checkpoints)('recovers at Quarry checkpoint $id', (checkpoint) => {
  const run = createRun(QUARRY_RUN);
  const events: RunEvent[] = [];
  const player = createPlayer(QUARRY_RUN.start.x, QUARRY_RUN);
  activateCheckpoint(run, checkpoint.id, events);
  player.x = 1400;
  player.y = QUARRY_RUN.height + 100;
  recoverFromFall(run, player, events, QUARRY_RUN);
  expect(player.x).toBe(checkpoint.x);
  expect(player.y + 34).toBe(surfaceY(QUARRY_RUN, player.x));
  expect(events.at(-1)).toEqual({ type: 'recover' });
});

it('can complete Quarry Run while holding right', () => {
  const effects: string[] = [];
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: (effect) => effects.push(effect), stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, {} as never, audio, QUARRY_RUN);
  const input = { horizontal: 1, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  scene.update(1 / 60, { ...input, horizontal: 0, jumpPressed: true });
  for (let frame = 0; frame < 60 * 30 && scene.screenState !== 'finish'; frame++) scene.update(1 / 60, input);
  expect(scene.screenState).toBe('finish');
  expect(effects.filter((effect) => effect === 'spring')).toHaveLength(2);
  expect(effects.filter((effect) => effect === 'checkpoint')).toHaveLength(2);
  expect(effects.filter((effect) => effect === 'gem')).toHaveLength(3);
  expect(scene.gemTotal).toBe(3);
});
