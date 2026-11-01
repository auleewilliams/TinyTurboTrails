import { expect, it } from 'vitest';
import { createPlayer, simulatePlayer, surfaceY, DEFAULT_MOVEMENT } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { traversalInput } from './plains-contour-traversal';
const joins = [620, 660, 700, 760, 820, 880, 940, 980, 1020];
// A new labelled physics fixture, NOT a replay or an executed browser journey.
// Start by the real constructor at the actual authored start; only normal movement input follows.
it.each([[1 / 60], [1 / 30], [1 / 60, 1 / 30]])('controlled ordinary-input fixture covers strict contact windows at cadence %j', (...cadence: number[]) => {
  const player = createPlayer(PLAINS_LEVEL.start.x, PLAINS_LEVEL);
  const covered = new Set<string>(); let direction: 1 | -1 = 1, held = 0, elapsed = 0, pollAt = 0, finished = false;
  for (let frame = 0; elapsed < 110; frame++) {
    const dt = cadence[frame % cadence.length];
    if (elapsed >= pollAt) { held = traversalInput(player.x, Math.round(player.vx), direction, held); pollAt = elapsed + 0.03; }
    const previous = player.x;
    simulatePlayer(player, { horizontal: held, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, dt);
    elapsed += dt;
    if (Math.abs(player.y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, player.x)) < 1 && Math.sign(player.x - previous) === direction) {
      for (const join of joins) for (const side of [-1, 1]) {
        if (side < 0 ? player.x >= join - 8 && player.x < join : player.x >= join && player.x <= join + 8) covered.add(`${join}:${direction}:${side}`);
      }
    }
    if (direction === 1 && player.x >= 1035) { direction = -1; held = 0; pollAt = elapsed; }
    if (direction === -1 && player.x <= 600) { finished = true; break; }
  }
  console.log(JSON.stringify({ kind: 'new unchanged-movement ordinary-input fixture, not browser replay', cadence, elapsed, windows: covered.size }));
  expect(finished, 'ordinary input completes outward and return fixture').toBe(true);
  const missing = joins.flatMap(join => [1, -1].flatMap(direction => [-1, 1].filter(side => !covered.has(`${join}:${direction}:${side}`)).map(side => `${join}:${direction}:${side}`)));
  expect(missing, 'every 8px side window, both directions, feet strictly <1px').toEqual([]);
});
