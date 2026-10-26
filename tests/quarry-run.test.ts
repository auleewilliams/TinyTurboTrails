import { expect, it } from 'vitest';
import { createPlayer, DEFAULT_MOVEMENT, simulatePlayer } from '../src/game/movement';
import { platformBodiesAt, platformBodyAt, platformCycleSeconds, platformSpeed } from '../src/game/platforms';
import { QUARRY_RUN } from '../src/world/levels';
import { createRun, recoverFromFall, stepEntities, tickRun } from '../src/game/interactions';
import { hasFixedSupport } from '../src/world/level';

const lifts = QUARRY_RUN.platforms!.filter(platform => platformSpeed(platform) > 0);
const still = { horizontal: 0, jumpPressed: false, jumpHeld: false };
const fixtures = lifts.flatMap(lift => [1 / 60, 1 / 30, 0.1].flatMap(dt =>
  [0, 0.5, 1.4, 2.5, 5.5, 6.2, 6.9, 8.5].map(phase => ({ lift, dt, phase }))));

it.each(fixtures)('$lift.id boards from fixed waiting support and rides both endpoints (dt=$dt, phase=$phase)', ({ lift, dt, phase }) => {
  // Local docking/phase fixture, not an input-only route from the trail's start.
  const right = lift.from.x > QUARRY_RUN.width / 2;
  const waitX = right ? lift.from.x - 25 : lift.from.x + lift.width + 20;
  const player = createPlayer(waitX, QUARRY_RUN, lift.from.y);
  expect(hasFixedSupport(QUARRY_RUN, { x: waitX, y: lift.from.y })).toBe(true);
  let time = phase, boarded = false, top = Infinity, bottom = -Infinity;
  for (let frame = 0; frame < Math.ceil(platformCycleSeconds(lift) * 3 / dt); frame++) {
    const deck = platformBodyAt(lift, time);
    const available = Math.abs(deck.y - lift.from.y) < 0.1 && deck.vy === 0;
    const target = lift.from.x + lift.width / 2;
    const stop = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
    const horizontal = boarded || available ? stop < target - 3 ? 1 : stop > target + 3 ? -1 : 0 : 0;
    time += dt;
    simulatePlayer(player, { ...still, horizontal }, QUARRY_RUN, dt, platformBodiesAt(QUARRY_RUN.platforms, time, dt));
    boarded ||= player.platformId === lift.id;
    if (boarded) { top = Math.min(top, player.y + 34); bottom = Math.max(bottom, player.y + 34); }
    expect(player.x).toBeGreaterThanOrEqual(QUARRY_RUN.minX);
    expect(player.x).toBeLessThanOrEqual(QUARRY_RUN.maxX);
    expect(player.y + 34).toBeLessThanOrEqual(980.01);
  }
  expect(boarded).toBe(true);
  expect(top).toBeCloseTo(lift.from.y, 4);
  expect(bottom).toBeCloseTo(lift.to.y, 4);
});

it.each(lifts.flatMap(lift => [1, -1].flatMap(direction => [2, 3.5, 4.8, 7.7, 9.2].map(phase => ({ lift, direction, phase })))))
('$lift.id catches a slip locally on side $direction at phase $phase', ({ lift, direction, phase }) => {
  const deck = platformBodyAt(lift, phase);
  // Explicit already-riding failure fixture. The separate end-to-end route proves boarding.
  const player = createPlayer(deck.x + deck.width / 2, QUARRY_RUN, deck.y);
  player.platformId = lift.id;
  let time = phase, detached = false, caught = false;
  for (let frame = 0; frame < 180; frame++) {
    time += 1 / 60;
    simulatePlayer(player, { ...still, horizontal: detached ? 0 : direction }, QUARRY_RUN, 1 / 60,
      platformBodiesAt(QUARRY_RUN.platforms, time, 1 / 60));
    detached ||= player.x < deck.x - DEFAULT_MOVEMENT.width / 2 || player.x > deck.x + deck.width + DEFAULT_MOVEMENT.width / 2;
    if (detached && player.onGround && player.platformId !== lift.id) { caught = true; break; }
  }
  expect(detached).toBe(true);
  expect(caught).toBe(true);
  expect(player.y + 34 - deck.y).toBeLessThanOrEqual(160);
  expect(player.y + 34).toBeLessThanOrEqual(980);
  expect(player.x).toBeGreaterThanOrEqual(0);
  expect(player.x).toBeLessThanOrEqual(820);
});

it('keeps catch shelves permanent and provides fixed recovery with zero ride velocity', () => {
  const catches = QUARRY_RUN.platforms!.filter(p => /-(inner|outer)-/.test(p.id));
  expect(catches.length).toBeGreaterThan(20);
  // The slip/ride matrix above checks the actual moving-deck handoff.
  for (const catcher of catches) {
    expect(catcher.to).toEqual(catcher.from);
    expect(catcher.from.y).toBeLessThanOrEqual(980);
    expect(catcher.from.x).toBeGreaterThanOrEqual(0);
    expect(catcher.from.x + catcher.width).toBeLessThanOrEqual(QUARRY_RUN.width);
  }
  const run = createRun(QUARRY_RUN), player = createPlayer(112, QUARRY_RUN, 700);
  Object.assign(player, { platformId: 'quarry-lift-c', vx: 70, vy: -70, groundVelocityX: 12 });
  run.collectedGems.add('earned'); run.collectedSpecials.add('star');
  recoverFromFall(run, player, [], QUARRY_RUN);
  expect(player).toMatchObject({ x: QUARRY_RUN.start.x, y: 106, vx: 0, vy: 0, platformId: null, groundVelocityX: 0 });
  expect(run.collectedGems.has('earned')).toBe(true);
  expect(run.collectedSpecials.has('star')).toBe(true);
  for (const point of QUARRY_RUN.checkpoints) {
    Object.assign(player, { x: point.x, y: point.y - 34, onGround: true });
    stepEntities(run, QUARRY_RUN, player, tickRun(run, 1 / 60), []);
    expect(run.checkpointId).toBe(point.id);
    recoverFromFall(run, player, [], QUARRY_RUN);
    expect(hasFixedSupport(QUARRY_RUN, { x: player.x, y: player.y + 34 })).toBe(true);
  }
});

it.each(lifts)('$id catches walking into an absent berth and permits a local jump back', lift => {
  for (const y of [lift.from.y, lift.to.y]) {
    // Phase and local position fixture only. No reward/route reachability claim.
    const right = lift.from.x > 500;
    const waitX = right ? lift.from.x - 25 : lift.from.x + lift.width + 20;
    const player = createPlayer(waitX, QUARRY_RUN, y);
    let time = y === lift.from.y ? 4 : 0;
    const toward = right ? 1 : -1;
    for (let i = 0; i < 20; i++) {
      time += 1 / 60;
      simulatePlayer(player, { ...still, horizontal: toward }, QUARRY_RUN, 1 / 60, platformBodiesAt(QUARRY_RUN.platforms, time, 1 / 60));
    }
    for (let i = 0; i < 45; i++) {
      time += 1 / 60;
      simulatePlayer(player, still, QUARRY_RUN, 1 / 60, platformBodiesAt(QUARRY_RUN.platforms, time, 1 / 60));
    }
    expect(player.onGround).toBe(true);
    expect(player.y + 34 - y).toBeLessThanOrEqual(24.01);
    expect(player.y + 34).toBeGreaterThanOrEqual(y - 0.01);
    let returned = false;
    for (let i = 0; i < 75; i++) {
      time += 1 / 60;
      const stop = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
      const horizontal = stop < waitX - 3 ? 1 : stop > waitX + 3 ? -1 : 0;
      const needsJump = y !== 980;
      simulatePlayer(player, { horizontal, jumpPressed: needsJump && i === 0, jumpHeld: needsJump && i < 24 }, QUARRY_RUN, 1 / 60,
        platformBodiesAt(QUARRY_RUN.platforms, time, 1 / 60));
      if (player.onGround && Math.abs(player.y + 34 - y) < 1 && Math.abs(player.x - waitX) < 8) returned = true;
    }
    expect(returned, `${lift.id} dock ${y}`).toBe(true);
  }
});
