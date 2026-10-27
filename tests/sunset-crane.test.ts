import { expect, it } from 'vitest';
import { createPlayer, simulatePlayer } from '../src/game/movement';
import { platformBodiesAt } from '../src/game/platforms';
import { SUNSET_SITE } from '../src/world/levels';

const cases = ([-1, 1] as const).flatMap(direction => [0, 1.15, 1.8, 2.7, 3.75, 4.5, 5.1].flatMap(phase =>
  [[0.016], [0.032], [0.016, 0.032, 0.024]].map(cadence => ({ direction, phase, cadence }))));

it.each(cases)('boards or catches safely from direction $direction at phase $phase / $cadence and returns to both fixed docks', ({ direction, phase, cadence }) => {
  // Prepositioned dock mechanism fixture: phase is a clock fixture, not a route.
  const player = createPlayer(direction === 1 ? 440 : 680, SUNSET_SITE, 320);
  const origin = direction === 1 ? 'site-high-deck' : 'site-far-dock';
  const destination = direction === 1 ? 'site-far-dock' : 'site-high-deck';
  let clock = phase, frame = 0;
  const tick = (horizontal: number, pressed = false, held = false) => {
    const dt = cadence[frame++ % cadence.length]; clock += dt;
    simulatePlayer(player, { horizontal, jumpPressed: pressed, jumpHeld: held }, SUNSET_SITE, dt, platformBodiesAt(SUNSET_SITE.platforms, clock, dt));
    return dt;
  };
  let arrived = false;
  for (let i = 0; i < 180; i++) {
    tick(direction);
    if (player.onGround && (player.platformId === destination || player.y + 34 === 380)) { arrived = true; break; }
  }
  expect(arrived, JSON.stringify({ player, origin })).toBe(true);
  for (let i = 0; i < 30; i++) tick(0);
  expect(player.onGround).toBe(true);
  expect(player.y + 34).toBeLessThanOrEqual(380);
  // An actual step off either fixed dock lands on the full-span lower deck.
  if (player.y + 34 === 320) {
    for (let i = 0; i < 140 && player.y + 34 !== 380; i++) tick(direction);
    for (let i = 0; i < 30; i++) tick(0);
  }
  expect(player.y + 34).toBe(380);
  const steer = (x: number) => {
    const projected = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
    return projected < x - 3 ? 1 : projected > x + 3 ? -1 : 0;
  };
  for (const [x, support] of [[440, 'site-high-deck'], [740, 'site-far-dock']] as const) {
    for (let i = 0; i < 180 && !(Math.abs(player.x - x) < 4 && Math.abs(player.vx) < 20); i++) tick(steer(x));
    expect(player.y + 34).toBe(380);
    let elapsed = 0;
    for (let i = 0; i < 80; i++) {
      elapsed += tick(steer(x), i === 0, elapsed < 0.2);
      if (elapsed > 0.18 && player.onGround && player.y + 34 === 320) break;
    }
    expect(player.platformId).toBe(support);
    expect(player.onGround).toBe(true);
    // Return to the lower deck through the fixed outside edge, away from ferry.
    const edge = x === 440 ? 260 : 800, sign = x === 440 ? -1 : 1;
    for (let i = 0; i < 180 && player.y + 34 !== 380; i++) tick(sign);
    for (let i = 0; i < 30; i++) tick(0);
    expect(player.y + 34).toBe(380);
    expect(Math.abs(player.x - edge)).toBeLessThan(140);
  }
});

it.each(([-1, 1] as const).flatMap(direction => [[0.016], [0.032], [0.016, 0.032, 0.024]].map(cadence => ({ direction, cadence }))))(
  'positively boards, rides and walks onto the opposite fixed dock / $direction / $cadence', ({ direction, cadence }) => {
    // Prepositioned dock/clock fixture, distinct from safety-catch outcomes above.
    const player = createPlayer(direction === 1 ? 440 : 680, SUNSET_SITE, 320);
    let clock = direction === 1 ? 0 : 2.6, frame = 0;
    const tick = (horizontal: number) => {
      const dt = cadence[frame++ % cadence.length]; clock += dt;
      simulatePlayer(player, { horizontal, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, dt,
        platformBodiesAt(SUNSET_SITE.platforms, clock, dt));
    };
    for (let i = 0; i < 100; i++) {
      tick(direction);
      const carriage = platformBodiesAt(SUNSET_SITE.platforms, clock).find(body => body.id === 'site-crane-ferry')!;
      if (player.platformId === carriage.id && (direction === 1 ? player.x >= carriage.x + 24 : player.x <= carriage.x + 72)) break;
    }
    expect(player.platformId).toBe('site-crane-ferry');
    for (let i = 0; i < 20; i++) tick(0);
    const boardedX = player.x;
    for (let i = 0; i < 180 && (player.x - boardedX) * direction < 60; i++) tick(0);
    expect((player.x - boardedX) * direction).toBeGreaterThanOrEqual(60);
    expect(player.platformId).toBe('site-crane-ferry');
    const destination = direction === 1 ? 'site-far-dock' : 'site-high-deck';
    for (let i = 0; i < 100 && player.platformId !== destination; i++) tick(direction);
    for (let i = 0; i < 20; i++) tick(0);
    expect(player.platformId).toBe(destination);
    expect(player.y + 34).toBe(320); expect(player.vx).toBe(0); expect(player.vy).toBe(0);
  });
