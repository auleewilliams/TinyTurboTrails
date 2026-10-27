import { expect, it } from 'vitest';
import { createPlayer, simulatePlayer, type Player } from '../src/game/movement';
import { platformBodiesAt } from '../src/game/platforms';
import { SUNSET_SITE } from '../src/world/levels';

// Prepositioned absent-carriage mechanism fixtures. These enumerate actual
// combined top edges; full entrance and return journeys use sunset-pilot.
const fixed = SUNSET_SITE.platforms!.filter(p => p.from.x === p.to.x && p.from.y === p.to.y);
const tops: { left: number; right: number; y: number }[] = [];
for (const y of [...new Set(fixed.map(p => p.from.y))]) {
  const row = fixed.filter(p => p.from.y === y).sort((a, b) => a.from.x - b.from.x);
  for (const p of row) {
    const last = tops.at(-1);
    if (last?.y === y && p.from.x <= last.right) last.right = Math.max(last.right, p.from.x + p.width);
    else tops.push({ left: p.from.x, right: p.from.x + p.width, y });
  }
}
const cases = tops.flatMap(top => ([-1, 1] as const).flatMap(direction =>
  (['held', 'release', 'brake'] as const).flatMap(mode =>
    [[0.016], [0.032], [0.016, 0.032, 0.024]].map(cadence => ({ ...top, direction, mode, cadence,
      label: `${top.left}–${top.right}@${top.y} ${direction < 0 ? 'left' : 'right'} ${mode} ${cadence}` })))));

/** Find an overlapping fixed-step path, then execute every edge using input. */
function rejoin(player: Player, source: { left: number; right: number; y: number }, cadence: number[]): void {
  const graph = [...tops, { left: 0, right: 960, y: 680 }, { left: 1340, right: 3120, y: 680 }];
  const start = graph.findIndex(top => top.y === player.y + 34 && player.x >= top.left - 9 && player.x <= top.right + 9);
  const goal = graph.findIndex(top => top.left === source.left && top.right === source.right && top.y === source.y);
  const parents = new Map<number, number>([[start, -1]]), queue = [start];
  while (queue.length && !parents.has(goal)) {
    const from = queue.shift()!, a = graph[from];
    graph.forEach((b, index) => {
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const up = a.y - b.y;
      const canJump = up > 0 && up <= 60 && overlap >= 24;
      const canDrop = up < 0 && up >= -60 && (b.left <= a.left - 70 || b.right >= a.right + 70) && overlap > 0;
      if (!parents.has(index) && (canJump || canDrop)) { parents.set(index, from); queue.push(index); }
    });
  }
  expect(parents.has(goal), JSON.stringify({ player, source })).toBe(true);
  const path: number[] = [];
  for (let node = goal; node !== start; node = parents.get(node)!) path.unshift(node);
  const bodies = platformBodiesAt(fixed, 0);
  let frame = 0;
  const tick = (horizontal: number, pressed = false, held = false) => {
    const dt = cadence[frame++ % cadence.length];
    simulatePlayer(player, { horizontal, jumpPressed: pressed, jumpHeld: held }, SUNSET_SITE, dt, bodies);
    return dt;
  };
  const steer = (x: number) => {
    const projected = player.x + Math.sign(player.vx) * player.vx ** 2 / 2400;
    return projected < x - 3 ? 1 : projected > x + 3 ? -1 : 0;
  };
  const walk = (x: number) => {
    if (Math.abs(player.x - x) > 320) walk(player.x + Math.sign(x - player.x) * 280);
    for (let i = 0; i < 260; i++) {
      tick(steer(x));
      if (Math.abs(player.x - x) < 4 && Math.abs(player.vx) < 20 && player.onGround) return;
    }
    throw new Error(`rejoin walk ${x}: ${JSON.stringify(player)}`);
  };
  let previous = graph[start];
  for (const next of path) {
    const target = graph[next];
    if (target.y < previous.y) {
      const x = (Math.max(previous.left, target.left) + Math.min(previous.right, target.right)) / 2;
      walk(x);
      let elapsed = 0;
      for (let i = 0; i < 100; i++) {
        elapsed += tick(steer(x), i === 0, elapsed < 0.2);
        if (elapsed > 0.18 && player.onGround && player.y + 34 === target.y) break;
      }
    } else {
      const direction = target.left <= previous.left - 70 ? -1 : 1;
      const edge = direction < 0 ? previous.left : previous.right;
      walk(edge - direction * 24);
      let clear = false;
      for (let i = 0; i < 180; i++) {
        clear ||= direction < 0 ? player.x + 9 < edge : player.x - 9 > edge;
        tick(clear ? steer(edge + direction * 45) : direction);
        if (clear && player.onGround && player.y + 34 === target.y) break;
      }
    }
    expect(player.onGround, JSON.stringify({ player, previous, target })).toBe(true);
    expect(player.y + 34, JSON.stringify({ previous, target })).toBe(target.y);
    previous = target;
  }
  for (let i = 0; i < 40; i++) tick(0);
  expect(player.onGround).toBe(true); expect(player.y + 34).toBe(source.y);
  expect(player.vx).toBe(0); expect(player.vy).toBe(0);
}

it.each(cases)('catches the actual $label edge locally with a settled support identity', ({ left, right, y, direction, mode, cadence }) => {
  const edge = direction < 0 ? left : right;
  const player = createPlayer(edge - direction * 28, SUNSET_SITE, y);
  const bodies = platformBodiesAt(fixed, 0);
  let cleared = false, landed = false, airborne = false, brake = false;
  for (let frame = 0; frame < 180; frame++) {
    cleared ||= direction < 0 ? player.x + 9 < edge : player.x - 9 > edge;
    let horizontal: number = direction;
    if (cleared && mode === 'release') horizontal = 0;
    if (cleared && mode === 'brake') { horizontal = brake ? 0 : -direction; brake = true; }
    simulatePlayer(player, { horizontal, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, cadence[frame % cadence.length], bodies);
    airborne ||= !player.onGround;
    if ((airborne && player.onGround) || (cleared && player.onGround && Math.abs(player.x - edge) > 24) || (frame > 90 && (edge === SUNSET_SITE.minX || edge === SUNSET_SITE.maxX))) { landed = true; break; }
  }
  expect(landed, JSON.stringify(player)).toBe(true);
  expect(player.y + 34 - y).toBeLessThanOrEqual(60);
  expect(player.onGround).toBe(true);
  for (let frame = 0; frame < 40; frame++) simulatePlayer(player, { horizontal: 0, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, cadence[frame % cadence.length], bodies);
  expect(player.onGround, JSON.stringify(player)).toBe(true);
  expect(player.y + 34 - y).toBeLessThanOrEqual(60);
  const support = player.platformId, feet = player.y + 34;
  expect(support === null || fixed.some(p => p.id === support)).toBe(true);
  for (let frame = 0; frame < 20; frame++) simulatePlayer(player, { horizontal: 0, jumpPressed: false, jumpHeld: false }, SUNSET_SITE, cadence[frame % cadence.length], bodies);
  expect(player.y + 34).toBe(feet);
  expect(player.platformId).toBe(support);
  expect(player.vx).toBe(0); expect(player.vy).toBe(0);
  rejoin(player, { left, right, y }, cadence);
});
