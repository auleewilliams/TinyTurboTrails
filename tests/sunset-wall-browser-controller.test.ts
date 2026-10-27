import { expect, it, vi } from 'vitest';
import { appendFileSync } from 'node:fs';
import { BrowserInput } from '../src/core/input';
import { SimulationClock } from '../src/core/clock';
import { SUNSET_SITE } from '../src/world/levels';
import { sunsetPilot } from './sunset-pilot';
import { sunsetWallControllerInit, SUNSET_WALL_MAX_PAINT_ADVANCE, sunsetWallPaintInit, type SunsetWallPaint } from './sunset-wall-browser-controller';

const witnesses = [{ pre: 2, takeoff: 970 }, { pre: 0, takeoff: 974 }, { pre: 1, takeoff: 978 }];
const patterns = [[1000 / 60], [32], [16, 32, 24], [8, 8, 32], [32, 16, 16, 32]];
const cases = witnesses.flatMap(witness => [...patterns.map(callbacks => ({ ...witness, callbacks, edgeSpike: false })), { ...witness, callbacks: [1000 / 60], edgeSpike: true }]);

// Mechanism fixture: real BrowserInput -> fixed SimulationClock -> AdventureScene,
// then a DOM paint adapter. This does not replay the historical browser timer.
it.each(cases)('acknowledges late nominal$takeoff/pre$pre under callbacks$callbacks edgeSpike$edgeSpike', ({ callbacks, edgeSpike, ...witness }) => {
  const route = sunsetPilot();
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  let observe!: (paint: SunsetWallPaint) => void;
  let now = 0, pendingJump = false;
  const dispatches: object[] = [], consumes: object[] = [];
  const proof = sunsetWallControllerInit({ ...witness, maximumAdvance: SUNSET_WALL_MAX_PAINT_ADVANCE, surfaces: SUNSET_SITE.surfaces }, {
    install: callback => { observe = callback; }, now: () => now,
    send: (code, down) => {
      if (code === 'Space' && down) dispatches.push({ time: now, x: route.player.x, feet: route.player.y + 34, coyote: route.player.coyoteSeconds });
      target.dispatchEvent(Object.assign(new Event(down ? 'keydown' : 'keyup'), { code, repeat: false }));
    },
  });
  const clock = new SimulationClock();
  for (let frame = 0; frame < 1800 && !proof.done; frame++) {
    now += edgeSpike && route.player.x > 955 ? 32 : callbacks[frame % callbacks.length];
    const controls = input.poll(); pendingJump ||= controls.jumpPressed;
    clock.advance(now, seconds => {
      const before = { x: route.player.x, feet: route.player.y + 34, coyote: route.player.coyoteSeconds, grounded: route.player.onGround };
      route.scene.update(seconds, { ...controls, jumpPressed: pendingJump });
      if (pendingJump) consumes.push({ time: now, before, after: { x: route.player.x, feet: route.player.y + 34, vy: route.player.vy } });
      pendingJump = false;
    });
    observe({ x: route.player.x, feet: route.player.y + 34, frame, time: now });
  }
  input.dispose();
  const result = { witness, callbacks, edgeSpike, dispatches, consumes, proof, health: route.runState.health };
  if (process.env.SUNSET_DRIVER_EVIDENCE) appendFileSync(process.env.SUNSET_DRIVER_EVIDENCE, JSON.stringify(result) + '\n');
  expect(proof.done, JSON.stringify(result)).toBe(true);
  expect(proof.error).toBe(''); expect(proof.jumps).toBeGreaterThan(0);
  expect(proof.ascents, JSON.stringify(result)).toBeGreaterThan(0);
  expect(proof.minimumFeet).toBeLessThan(proof.launchFeet - 20);
  expect(proof.contacts).toEqual([]); expect(proof.recoveries).toBe(1);
  expect(proof.acknowledgments.length).toBeGreaterThan(0);
  const dispatch = proof.dispatches.find(event => event.code === 'Space' && event.down)!;
  expect(dispatch.x).toBeGreaterThan(960); expect(dispatch.x).toBeLessThanOrEqual(witness.takeoff);
  expect((consumes[0] as { before: { grounded: boolean } }).before.grounded).toBe(false);
  expect(route.scene.screenState).toBe('playing');
  expect(route.runState.health).toBe(3);
  expect(consumes.some(value => (value as { after: { vy: number } }).after.vy < 0)).toBe(true);
});


it.each([1, -1])('calibrates same-paint camera and facing%s and dispatches without a second RAF', facing => {
  class ImageFixture { src = '/assets/henry/henry-celebration.png'; }
  class PointFixture { constructor(readonly x: number, readonly y: number) {} }
  class ContextFixture {
    canvas: { id: string }; scaleX = 1;
    constructor(id = 'game') { this.canvas = { id }; }
    fillRect(..._args: number[]): void {}
    drawImage(..._args: unknown[]): void {}
    getTransform() { return { transformPoint: (p: PointFixture) => ({ x: p.x * this.scaleX, y: p.y }) }; }
  }
  const observed: SunsetWallPaint[] = [];
  vi.stubGlobal('window', { sunsetWallObserve: (p: SunsetWallPaint) => observed.push(p) });
  vi.stubGlobal('CanvasRenderingContext2D', ContextFixture);
  vi.stubGlobal('HTMLImageElement', ImageFixture); vi.stubGlobal('DOMPoint', PointFixture);
  vi.stubGlobal('requestAnimationFrame', () => { throw new Error('paint must dispatch synchronously'); });
  try {
    sunsetWallPaintInit();
    const ctx = new ContextFixture(); ctx.scaleX = facing;
    const image = new ImageFixture();
    for (const [cameraX, cameraY, x, feet] of [[123, 78, 977.3388888888868, 686.25], [200, 100, 981, 678]]) {
      ctx.fillRect(260 - cameraX, 320 - cameraY, 210, 3);
      const screenX = x - cameraX;
      const dx = facing === 1 ? screenX - 24 : -(screenX + 24);
      ctx.drawImage(image, 0, 0, 48, 48, dx, feet - cameraY - 44, 48, 48);
      expect(observed.at(-1)?.x).toBeCloseTo(x, 10);
      expect(observed.at(-1)?.feet).toBeCloseTo(feet, 10);
    }
    new ContextFixture('thumbnail').drawImage(image, 0, 0, 48, 48, 0, 0, 48, 48);
    expect(observed.map(p => p.frame)).toEqual([1, 2]);
    expect(observed.every(p => Number.isFinite(p.time))).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});
