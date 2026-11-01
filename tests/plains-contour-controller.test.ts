import { expect, it } from 'vitest';
import { BrowserInput } from '../src/core/input';
import { SimulationClock } from '../src/core/clock';
import { createPlayer, simulatePlayer, surfaceY, DEFAULT_MOVEMENT } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { createContourControllerKernel, type ControllerGoal, type ControllerSample } from './plains-contour-controller';
import { contourProvenance } from './plains-contour-provenance';
const schedules = [
  { name: '60Hz', cadence: [1000 / 60], delivery: 0, lag: 0 },
  { name: 'phased30Hz', cadence: [1000 / 30], delivery: 16, lag: 16 },
  { name: 'mixed/zero/coalesced/clamped', cadence: [0, 8, 16, 34, 16, 120, ...Array<number>(54).fill(16)], delivery: 8, lag: 16 },
];
// NEW timing mechanisms, not native trace replays: actual input.poll -> pendingJump -> fixed clock -> render.
function fixture(schedule: typeof schedules[number], x = PLAINS_LEVEL.start.x) {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {}), clock = new SimulationClock();
  const p = createPlayer(x, PLAINS_LEVEL), kernel = createContourControllerKernel(), c = kernel.controller();
  const a = kernel.actuator((type, code) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat: false })));
  let now = 0, frame = 0, pendingJump = false;
  const paints: ControllerSample[] = [], queue: { at: number; command: { horizontal: number; jump: boolean } }[] = [];
  const contacts: { x: number; previous: number; gap: number }[] = [];
  function step() {
    now += schedule.cadence[frame % schedule.cadence.length];
    const observed = [...paints].reverse().find(s => s.time <= now - schedule.lag);
    if (observed) queue.push({ at: now + schedule.delivery, command: c.tick(observed, now, a.state()).command });
    while (queue.length && queue[0].at <= now) { const due = queue.shift()!; a.expire(due.at, frame); a.apply(due.command, frame, due.at); }
    a.expire(now, frame);
    const controls = input.poll(); pendingJump ||= controls.jumpPressed;
    const previous = p.x;
    clock.advance(now, seconds => { simulatePlayer(p, { ...controls, jumpPressed: pendingJump }, PLAINS_LEVEL, seconds); pendingJump = false; });
    frame++;
    const s = { frame, time: now, coherent: true, x: p.x, feetGap: p.y + DEFAULT_MOVEMENT.height - surfaceY(PLAINS_LEVEL, p.x), facing: p.facing, velocity: Math.round(p.vx) };
    paints.push(s); contacts.push({ x: p.x, previous, gap: s.feetGap }); return s;
  }
  function run(goal: ControllerGoal) {
    const id = c.start(goal, now); let s: ControllerSample;
    do { try { s = step(); } catch (error) { throw new Error(`${String(error)}; tail=${JSON.stringify(paints.slice(-12))}`); } } while (c.result()?.id !== id && now < 119_000);
    expect(c.result()?.id).toBe(id); return s;
  }
  return { p, c, a, step, run, paints, contacts, now: () => now };
}
it.each(schedules)('parks for a full strict neutral/V0 200ms under $name', schedule => {
  const f = fixture(schedule, 700); f.run({ mode: 'park', target: 760, direction: 1 });
  const last = f.paints.at(-1)!; const rested = f.paints.filter(s => s.time >= last.time - 200);
  expect(rested.length).toBeGreaterThan(1);
  for (const s of rested) { expect(Math.abs(s.x - 760)).toBeLessThanOrEqual(4); expect(s.velocity).toBe(0); expect(s.x).toBe(last.x); expect(Math.abs(s.feetGap)).toBeLessThan(1); }
  expect(f.a.state().horizontal).toBe(0);
});
it.each(schedules)('uses one controller for all36 strict grounded windows under $name', schedule => {
  const f = fixture(schedule); for (const target of [620,660,700,950,1035]) f.run({ mode: 'capture', target, direction: 1 }); for (const target of [900,820,660,600]) f.run({ mode: 'capture', target, direction: -1 });
  for (const join of [620,660,700,760,820,880,940,980,1020]) for (const direction of [1,-1]) for (const side of [-1,1]) {
    expect(f.contacts.some(s => Math.sign(s.x - s.previous) === direction && Math.abs(s.gap) < 1 && (side < 0 ? s.x >= join - 8 && s.x < join : s.x >= join && s.x <= join + 8)), `${join}/${direction}/${side}`).toBe(true);
  }
});
it('latches an actual Space event across zero-step paints and physically acknowledges the jump', () => {
  const f = fixture(schedules[2], 790); f.run({ mode: 'jump', target: 790, direction: 1 });
  expect(f.paints.some(s => s.feetGap < -8)).toBe(true); expect(f.a.events.some(e => e.code === 'Space' && e.type === 'keydown')).toBe(true);
});
it('neutral means released/no key in the SAME actuator, and withdrawal cannot acknowledge capture', () => {
  const kernel = createContourControllerKernel(), dispatched: string[] = [];
  const a = kernel.actuator((type, code) => dispatched.push(`${type}:${code}`));
  a.apply({ horizontal: -1, jump: false }, 1); a.apply({ horizontal: 0, jump: false }, 2);
  expect(dispatched).toEqual(['keydown:ArrowLeft','keyup:ArrowLeft']); expect(a.state().horizontal).toBe(0);
  expect(kernel.captureReady({ coherent: true, frame: 3, armedFrame: 2, x: 599, target: 600, feetGap: 0, facing: -1, velocity: -20, held: a.state().horizontal, direction: -1 })).toBe(false);
});
it('missing non-debug velocity stays null and cannot certify parked V0', () => {
  const c = createContourControllerKernel().controller(); c.start({ mode: 'park', target: 760, direction: 1 }, 0);
  for (let frame = 1; frame < 40; frame++) c.tick({ frame, time: frame * 16, coherent: true, x: 760, feetGap: 0, facing: 1, velocity: null }, frame * 16, { horizontal: 0, jump: false, frame: 0 });
  expect(c.result()).toBeNull();
});
it('provenance retains dirty-localnull and derives explicitly synthetic CI metadata', () => {
  expect(contourProvenance({ sourceRevision: null })).toEqual({ sourceRevision: null, precommit: true });
  expect(contourProvenance({ sourceRevision: 'synthetic-ci-fixture-only' })).toEqual({ sourceRevision: 'synthetic-ci-fixture-only', precommit: false });
});

// Archived walkToFlat law; synthetic200ms Node decision interval plus100ms aged observation, NOT measured WebKit latency/replay.
function legacyStopSeam() {
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {}), clock = new SimulationClock();
  const player = createPlayer(700, PLAINS_LEVEL);
  const a = createContourControllerKernel().actuator((type, code) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat: false })));
  const observed: { time: number; x: number; v: number }[] = [];
  let nextDecision = 75, parkAt: number | null = null, x: number | null = null;
  for (let now = 0; now <= 20_000; now += 1000 / 60) {
    if (now >= nextDecision && parkAt === null) {
      nextDecision = now + 200;
      const delayed = [...observed].reverse().find(s => s.time <= now - 100) ?? { x: player.x, v: player.vx };
      const p = { x: Math.round(delayed.x), v: Math.round(delayed.v) }, target = 760;
      if (Math.abs(p.x - target) <= 4 && Math.abs(p.v) <= 8) { a.apply({ horizontal: 0, jump: false }, 0); parkAt = now; x = player.x; }
      else {
        const stop = p.x + Math.sign(p.v) * p.v ** 2 / 2400;
        const next = Math.abs(target - p.x) < 120 ? stop < target - 3 ? 1 : stop > target + 3 ? -1 : 0 : Math.sign(target - p.x);
        a.apply({ horizontal: next, jump: false }, 0);
      }
    }
    const controls = input.poll(); clock.advance(now, dt => simulatePlayer(player, controls, PLAINS_LEVEL, dt));
    observed.push({ time: now, x: player.x, v: player.vx });
    if (parkAt !== null && now - parkAt >= 200) return player.vx === 0 && player.x === x;
  }
  return false;
}
it('negative old aged-observation protocol cannot certify the required full200ms park', () => {
  expect(legacyStopSeam()).toBe(false);
});

it('single actuator lease releases after two fixed steps without inventing acceptance', () => {
  const k = createContourControllerKernel(), events: string[] = [], a = k.actuator((type, code) => events.push(`${type}:${code}`));
  a.apply({ horizontal: 1, jump: false }, 1, 0);
  expect(a.expire(30, 1).horizontal).toBe(1);
  expect(a.expire(34, 1).horizontal).toBe(0);
  expect(events).toEqual(['keydown:ArrowRight','keyup:ArrowRight']);
});

it('an incoherent interval breaks a parking rest and emission alone never acknowledges capture', () => {
  const k = createContourControllerKernel(), c = k.controller(), neutral = { horizontal: 0, jump: false, frame: 0 };
  c.start({ mode: 'park', target: 760, direction: 1 }, 0);
  const s = { frame: 1, time: 0, coherent: true, x: 760, feetGap: 0, facing: 1, velocity: 0 };
  c.tick(s, 0, neutral); c.tick({ ...s, frame: 2, time: 16 }, 16, neutral);
  c.tick({ ...s, coherent: false, frame: 3, time: 232 }, 232, neutral);
  expect(c.tick({ ...s, frame: 4, time: 248 }, 248, neutral).completed).toBeNull();
  c.start({ mode: 'capture', target: 600, direction: -1 }, 300);
  const w = { ...s, frame: 5, time: 300, x: 599, velocity: -30, facing: -1 };
  expect(c.tick(w, 300, neutral).completed).toBeNull();
  const emitted = { horizontal: -1, jump: false, frame: 5 };
  expect(c.tick(w, 300, emitted).completed).toBeNull();
  expect(c.tick({ ...w, frame: 6, time: 316, velocity: 0, facing: 1 }, 316, emitted).completed).toBeNull();
});

it('rejects an unacknowledged jump after the original5000ms budget', () => {
  const c = createContourControllerKernel().controller();
  c.start({ mode: 'jump', target: 790, direction: 1 }, 100);
  const s = { frame: 1, time: 5099, coherent: true, x: 790, feetGap: 0, facing: 1, velocity: 0 };
  const emitted = { horizontal: 1, jump: true, frame: 0 };
  expect(() => c.tick(s, 5099, emitted)).not.toThrow();
  expect(c.result()).toBeNull();
  expect(() => c.tick({ ...s, frame: 2, time: 5101 }, 5101, emitted)).toThrow(/Controller5000msdeadline jump/);
});

it.each(['park', 'traverse', 'capture'] as const)('preserves the20000ms budget and diagnostic for %s', mode => {
  const k = createContourControllerKernel(), c = k.controller();
  expect(k.goalBudget(mode)).toBe(20_000); expect(k.goalBudget('jump')).toBe(5_000);
  c.start({ mode, target: 1000, direction: 1 }, 100);
  const sample = { frame: 1, time: 5101, coherent: true, x: 700, feetGap: 0, facing: 1, velocity: 0 };
  const emitted = { horizontal: 0, jump: false, frame: 0 };
  expect(() => c.tick(sample, 5101, emitted)).not.toThrow();
  expect(() => c.tick({ ...sample, frame: 2, time: 20101 }, 20101, emitted)).toThrow(`Controller20000msdeadline ${mode}`);
});
it('a late physical jump sample cannot acknowledge after5000ms', () => {
  const c = createContourControllerKernel().controller(); c.start({ mode: 'jump', target: 790, direction: 1 }, 100);
  expect(() => c.tick({ frame: 2, time: 5101, coherent: true, x: 792, feetGap: -10, facing: 1, velocity: 20 }, 5101,
    { horizontal: 1, jump: true, frame: 1 })).toThrow(/Controller5000msdeadline jump/);
  expect(c.result()).toBeNull();
});
