import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import type { GameAudio } from '../src/core/audio';
import { SimulationClock } from '../src/core/clock';
import { FROST_RIDGE, SANDY_COVE, LEVELS, levelById } from '../src/world/levels';
import { createPlayer, simulatePlayer, type Player } from '../src/game/movement';
import { createRun, entityPosition, stepEntities, tickRun, type RunEvent, type RunState } from '../src/game/interactions';

const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
const worlds = () => Object.fromEntries(LEVELS.map((level) => [level.atlas, {} as never]));
const audio = (effects: string[]): GameAudio => ({ unlock: async () => {}, setMuted() {}, setSuspended() {},
  startMusic() {}, play(effect) { effects.push(effect); }, stop() {}, dispose() {} });

it('registers both playable biome selections after the existing trails', () => {
  expect(levelById('frost')).toBe(FROST_RIDGE);
  expect(levelById('cove')).toBe(SANDY_COVE);
  expect(LEVELS.slice(-2)).toEqual([FROST_RIDGE, SANDY_COVE]);
});

it.each([FROST_RIDGE, SANDY_COVE])('can finish $name without mandatory jumps and replay fresh', (level) => {
  const effects: string[] = [];
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds(), audio(effects), level);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  const live = scene as unknown as { run: RunState; player: Player };
  let frame = 0;
  for (; frame < 60 * 180 && scene.screenState !== 'finish'; frame++) {
    scene.update(1 / 60, { ...neutral, horizontal: 1 });
    expect(live.run.health, `damage at x=${scene.playerX}, y=${scene.playerY}, t=${live.run.seconds}`).toBe(3);
    expect(live.player.y).toBeLessThan(320);
  }
  expect(scene.screenState).toBe('finish');
  expect(scene.gemTotal).toBeGreaterThanOrEqual(25);
  expect([...live.run.collectedGems].some((id) => id.includes('-bonus-'))).toBe(false);
  expect(effects.filter((e) => e === 'checkpoint')).toHaveLength(6);
  expect(effects.filter((e) => e === 'spring')).toHaveLength(6);
  console.info(`${level.name}: held-right finish ${(frame / 60).toFixed(2)}s, ${scene.gemTotal} gems, no damage`);
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(scene.screenState).toBe('playing');
  expect(live.run.seconds).toBe(0);
  expect(live.run.collectedGems.size).toBe(0);
  expect(live.run.health).toBe(3);
  expect(scene.playerX).toBe(60);
  expect(scene.selectedLevelName).toBe(level.name);
});

it('crosses each shallow pool without damage, knockback or recovery', () => {
  for (const patch of SANDY_COVE.surfaces.filter((s) => s.material === 'water')) {
    const player = createPlayer(patch.x1 + 1, SANDY_COVE);
    const run = createRun(SANDY_COVE);
    const events: RunEvent[] = [];
    for (let frame = 0; frame < 300 && player.x <= patch.x2; frame++) {
      tickRun(run, 1 / 60);
      simulatePlayer(player, { ...neutral, horizontal: 1 }, SANDY_COVE, 1 / 60);
      stepEntities(run, SANDY_COVE, player, 1 / 60, events);
    }
    expect(player.x).toBeGreaterThan(patch.x2);
    expect(run.health).toBe(3);
    expect(events.some((e) => e.type === 'damage' || e.type === 'recover')).toBe(false);
  }
});

it('pauses jellyfish with gameplay and restores their initial positions on replay', () => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds(), audio([]), SANDY_COVE);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  for (let i = 0; i < 40; i++) scene.update(1 / 60, neutral);
  const live = scene as unknown as { run: RunState; player: Player };
  const jelly = SANDY_COVE.entities.find((e) => e.bounce)!;
  const position = entityPosition(live.run, jelly);
  expect(position.y).toBeLessThan(jelly.y);
  const clock = new SimulationClock();
  clock.setPaused(true);
  for (let i = 0; i < 100; i++) clock.advance(i * 1000 / 60, (dt) => scene.update(dt, neutral));
  expect(entityPosition(live.run, jelly)).toEqual(position);
  clock.setPaused(false);
  live.player.x = SANDY_COVE.finish.x;
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(entityPosition(live.run, jelly)).toEqual({ x: jelly.x, y: jelly.y });
});

it.each([FROST_RIDGE, SANDY_COVE])('rewards holding jump during a spring ride in $name', (level) => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds(), audio([]), level);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  const live = scene as unknown as { run: RunState; player: Player };
  for (let frame = 0; frame < 60 * 180 && scene.screenState !== 'finish'; frame++) {
    scene.update(1 / 60, { ...neutral, horizontal: 1, jumpHeld: live.player.vy < 0 });
  }
  expect(scene.screenState).toBe('finish');
  expect([...live.run.collectedGems].filter((id) => id.includes('-bonus-'))).toHaveLength(level.id === 'frost' ? 3 : 6);
});
