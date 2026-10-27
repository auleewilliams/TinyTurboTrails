import { PLAINS_LEVEL } from '../src/world/level';
import { coveRewards } from './cove-pilot';
import { frostRewards } from './frost-pilot';
import { frostPilot, FROST_MAIN } from './frost-pilot';
import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import type { GameAudio } from '../src/core/audio';
import { SimulationClock } from '../src/core/clock';
import { FROST_RIDGE, SANDY_COVE, LEVELS, levelById } from '../src/world/levels';
import { createPlayer, simulatePlayer, surfaceY, type Player } from '../src/game/movement';
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

it.each([FROST_RIDGE, SANDY_COVE])('can finish $name with simple slime-avoidance jumps and replay fresh', (level) => {
  if (level.id === 'frost') {
    const route = frostPilot(); route.run(FROST_MAIN);
    expect(route.scene.screenState).toBe('finish');
    expect(route.runState.health).toBe(3);
    expect(route.runState.collectedGems.size).toBeGreaterThanOrEqual(25);
    expect([...route.runState.collectedGems].some(id => id.includes('-bonus-'))).toBe(false);
    expect(route.events.filter(e => e.type === 'checkpoint')).toHaveLength(3);
    expect(route.events.filter(e => e.type === 'spring')).toHaveLength(0);
    route.scene.activateFinish('Replay');
    expect(route.scene.screenState).toBe('playing');
    expect((route.scene as unknown as { run: RunState }).run.collectedGems.size).toBe(0);
    expect(route.scene.playerX).toBe(60);
    const replay = (route.scene as unknown as { run: RunState }).run;
    expect(replay.seconds).toBe(0); expect(replay.health).toBe(3);
    expect(route.scene.selectedLevelName).toBe(level.name);
    return;
  }
  const effects: string[] = [];
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds(), audio(effects), level);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  const live = scene as unknown as { run: RunState; player: Player };
  let frame = 0;
  for (; frame < 60 * 180 && scene.screenState !== 'finish'; frame++) {
    const nearSlime = level.id === 'frost' && level.entities.filter((entity) => entity.kind === 'slime')
      .some((entity) => {
        const x = entityPosition(live.run, entity).x;
        return x >= live.player.x - 18 && x <= live.player.x + 60;
      });
    scene.update(1 / 60, { ...neutral, horizontal: 1,
      jumpPressed: nearSlime && live.player.onGround, jumpHeld: nearSlime });
    expect(live.run.health, `damage at x=${scene.playerX}, y=${scene.playerY}, t=${live.run.seconds}`).toBe(3);
    expect(live.player.y).toBeLessThan(level.height);
  }
  expect(scene.screenState).toBe('finish');
  expect(scene.gemTotal).toBeGreaterThanOrEqual(25);
  expect([...live.run.collectedGems].some((id) => id.includes('-bonus-'))).toBe(false);
  expect(effects.filter((e) => e === 'checkpoint')).toHaveLength(3);
  expect(effects.filter((e) => e === 'spring')).toHaveLength(0);
  expect(scene.educationOverlay.open).toBe(false);
  console.info(`${level.name}: hazard-avoidance finish ${(frame / 60).toFixed(2)}s, ${scene.gemTotal} gems, no damage`);
  scene.update(1 / 60, neutral);
  // Replay sits left of the default action (Next trail, or Map on the final trail).
  scene.update(1 / 60, { ...neutral, horizontal: -1 }); scene.update(1 / 60, neutral);
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

it('pauses slimes with gameplay and restores their initial positions on replay', () => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never, worlds(), audio([]), PLAINS_LEVEL);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  for (let i = 0; i < 40; i++) scene.update(1 / 60, neutral);
  const live = scene as unknown as { run: RunState; player: Player };
  const slime = PLAINS_LEVEL.entities.find((e) => e.kind === 'slime')!;
  const position = entityPosition(live.run, slime);
  expect(position.x).not.toBe(slime.x);
  expect(position.y).toBe(surfaceY(PLAINS_LEVEL, position.x));
  const clock = new SimulationClock();
  clock.setPaused(true);
  for (let i = 0; i < 100; i++) clock.advance(i * 1000 / 60, (dt) => scene.update(dt, neutral));
  expect(entityPosition(live.run, slime)).toEqual(position);
  clock.setPaused(false);
  live.player.x = PLAINS_LEVEL.finish.x; live.player.y = PLAINS_LEVEL.finish.y - 34;
  scene.update(1 / 60, neutral);
  expect(scene.educationOverlay.open).toBe(false);
  scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, horizontal: -1 }); scene.update(1 / 60, neutral);
  scene.update(1 / 60, { ...neutral, jumpPressed: true });
  expect(entityPosition(live.run, slime)).toEqual({ x: slime.x, y: slime.y });
});

it.each([FROST_RIDGE, SANDY_COVE])('collects the intended rewards along the full $name route', (level) => {
  if (level.id === 'frost') {
    const route = frostRewards();
    expect(route.runState.collectedGems.size).toBe(39);
    expect(route.scene.screenState).toBe('finish');
    return;
  }
  const route = coveRewards();
  expect(route.scene.screenState).toBe('finish');
  expect(route.runState.collectedGems.size).toBe(42);
  expect([...route.runState.collectedGems].filter(id=>id.includes('-bonus-'))).toHaveLength(6);
});
