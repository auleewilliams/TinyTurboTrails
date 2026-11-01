import { expect, it } from 'vitest';
import { createPlayer, simulatePlayer, surfaceY, DEFAULT_MOVEMENT } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { captureInput, captureReady } from './plains-contour-capture';
// Mechanism fixture on the actual uphill-left x600 surface, not a historical replay.
function approach() {
  const p = createPlayer(620, PLAINS_LEVEL);
  while (p.x > 600) simulatePlayer(p, { horizontal: -1, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, 1 / 60);
  return p;
}
it('negative: withdrawing directional input on authored uphill reverses real facing', () => {
  const p = approach();
  for (let i = 0; i < 20; i++) simulatePlayer(p, { horizontal: 0, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, 1 / 60);
  expect(p.vx).toBeGreaterThan(1); expect(p.facing).toBe(1);
  expect(captureReady({ coherent: true, frame: 21, armedFrame: 0, x: p.x, target: 600,
    feetGap: p.y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, p.x), facing: p.facing, velocity: p.vx, held: 0, direction: -1 })).toBe(false);
});
it('directional capture lease preserves real contact/facing through a 200ms readback interval', () => {
  const p = approach();
  for (let frame = 1; frame <= 12; frame++) {
    const held = captureInput(-1);
    simulatePlayer(p, { horizontal: held, jumpPressed: false, jumpHeld: false }, PLAINS_LEVEL, 1 / 60);
    expect(captureReady({ coherent: true, frame, armedFrame: 0, x: p.x, target: 600,
      feetGap: p.y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, p.x), facing: p.facing, velocity: p.vx, held, direction: -1 })).toBe(true);
  }
});
it('rejects stale, ungrounded, wrong-facing, unacknowledged and withdrawn control samples', () => {
  const s = { coherent: true, frame: 2, armedFrame: 1, x: 599, target: 600, feetGap: 0, facing: -1, velocity: -30, held: -1, direction: -1 as const };
  expect(captureReady(s)).toBe(true);
  for (const delta of [{ coherent: false }, { frame: 1 }, { held: 0 }, { velocity: 2 }, { facing: 1 }, { feetGap: 1 }, { x: 601 }]) expect(captureReady({ ...s, ...delta })).toBe(false);
});
