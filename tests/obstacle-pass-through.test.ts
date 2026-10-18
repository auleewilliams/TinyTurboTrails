import { expect, it } from 'vitest';
import { LEVELS } from '../src/world/levels';
import { createPlayer, DEFAULT_MOVEMENT, simulatePlayer } from '../src/game/movement';
import { createRun, stepEntities, tickRun, type RunEvent } from '../src/game/interactions';

const move = { horizontal: 1, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };

it.each(LEVELS)('$name static obstacle/scenery contacts have no damage, knockback or protection effects', level => {
  const props = level.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'decoration');
  // Cove already authors only scenery props; cover real props, never an empty loop.
  expect(props.length).toBeGreaterThan(0);
  for (const prop of props) {
    const isolated = { ...level, entities: [prop] };
    const run = createRun(isolated), player = createPlayer(prop.x, isolated), events: RunEvent[] = [];
    Object.assign(player, { y: prop.y - DEFAULT_MOVEMENT.height, vx: 123, vy: -20, onGround: false });
    const beforePlayer = structuredClone(player), beforeRun = structuredClone(run);
    stepEntities(run, isolated, player, 0, events);
    expect(events, prop.id).toEqual([]);
    expect(player, prop.id).toEqual(beforePlayer);
    expect(run, prop.id).toEqual(beforeRun);
  }
});

it.each(LEVELS)('$name walks through every static obstacle without blocking or changing the terrain trajectory', level => {
  const props = level.entities.filter(entity => entity.kind === 'hazard' || entity.kind === 'decoration');
  expect(props.length).toBeGreaterThan(0);
  for (const prop of props) {
    const isolated = { ...level, entities: [prop] }, empty = { ...level, entities: [] };
    const player = createPlayer(prop.x - 35, isolated), control = structuredClone(player);
    const run = createRun(isolated), events: RunEvent[] = [];
    const exit = Math.min(prop.x + 35, level.maxX);
    for (let frame = 0; frame < 60 && player.x < exit; frame++) {
      const previous = { x: player.x, y: player.y };
      tickRun(run, 1 / 60);
      const trajectory = simulatePlayer(player, move, isolated, 1 / 60);
      simulatePlayer(control, move, empty, 1 / 60);
      stepEntities(run, isolated, player, 1 / 60, events, previous, trajectory);
      expect(player, prop.id).toEqual(control);
      expect(run.health, prop.id).toBe(3);
      expect(run.invulnerableSeconds, prop.id).toBe(0);
      expect(run.healthFlashSeconds, prop.id).toBe(0);
      expect(run.healthFlashPip, prop.id).toBeNull();
    }
    expect(player.x, prop.id).toBeGreaterThanOrEqual(exit);
    expect(player.x, prop.id).toBeGreaterThan(prop.x);
    expect(events, prop.id).toEqual([]);
  }
});

it.each(LEVELS)('$name still applies slime-side damage, knockback, flash and short protection', level => {
  const slime = level.entities.find(entity => entity.kind === 'slime')!;
  expect(slime).toBeDefined();
  const isolated = { ...level, entities: [slime] };
  const run = createRun(isolated), player = createPlayer(slime.x, isolated), events: RunEvent[] = [];
  player.y = slime.y - DEFAULT_MOVEMENT.height;
  stepEntities(run, isolated, player, 0, events);
  expect(events).toEqual([{ type: 'damage', entityId: slime.id }]);
  expect(run.health).toBe(2);
  expect(run.healthFlashSeconds).toBeGreaterThan(0);
  expect(run.healthFlashPip).toBe(2);
  expect(run.invulnerableSeconds).toBeGreaterThan(0);
  expect(player.vy).toBeLessThan(0);
  expect(Math.abs(player.vx)).toBeGreaterThan(0);
  stepEntities(run, isolated, player, 0, events);
  expect(events).toHaveLength(1);
  expect(run.health).toBe(2);
});
