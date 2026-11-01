import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createContourObserver, contourCameraObservation, type NativeMatrix } from './plains-contour-observer';
import { drawFacingSprite } from '../src/art/sprite';
import { PLAINS_LEVEL } from '../src/world/level';
const manifest = JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8'));
const identity = (): NativeMatrix => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const config = { sky: PLAINS_LEVEL.theme.sky, width: 426, height: 240, anchor: manifest.anchor, logicalSize: manifest.logicalSize };
it.each([1, -1] as const)('observes real drawFacingSprite anchor in native frame for facing %s', facing => {
  const observer = createContourObserver(config); observer.fill(true, [0, 0, 426, 240], config.sky, 1, identity());
  observer.ribbon([-20, 140], identity()); let matrix = identity(); const stack: NativeMatrix[] = [];
  const ctx = { save() { stack.push({ ...matrix }); }, restore() { matrix = stack.pop()!; },
    translate(x: number, y: number) { matrix.e += matrix.a * x; matrix.f += matrix.d * y; },
    scale(x: number, y: number) { matrix.a *= x; matrix.d *= y; },
    drawImage(_image: unknown, ...args: number[]) { observer.actor(args, { ...matrix }); } };
  drawFacingSprite(ctx as unknown as CanvasRenderingContext2D, {} as CanvasImageSource, manifest.frames[0], 226, 132, 48, 48, facing);
  const pose = observer.snapshot('Adventure preview · Playing · X 850');
  expect(pose.coherent).toBe(true); expect(pose.henry?.x).toBe(250); expect(pose.henry?.feet).toBe(176);
});
it('starts frames only at verified world sky and rejects overlay/stale/mixed witnesses', () => {
  const o = createContourObserver(config); const actor = [0, 0, 48, 48, 226, 132, 48, 48];
  o.fill(false, [0, 0, 426, 240], config.sky, 1, identity()); o.actor(actor, identity()); o.ribbon([0, 140], identity());
  expect(o.snapshot('Adventure preview · Playing · X 850').coherent).toBe(false);
  o.fill(true, [0, 0, 426, 240], config.sky, 1, identity()); o.actor(actor, identity()); o.ribbon([0, 140], identity());
  expect(o.snapshot('Adventure preview · Playing · X 850').coherent).toBe(true);
  const frame = o.snapshot('').frame;
  o.fill(true, [0, 0, 426, 240], '#000000', 0.6, identity());
  expect(o.snapshot('Adventure preview · Playing · X 850').frame).toBe(frame);
  expect(o.snapshot('Adventure preview · Playing · X 850').coherent).toBe(false);
  o.fill(true, [0, 0, 426, 240], config.sky, 1, identity()); o.actor(actor, identity());
  expect(o.snapshot('Adventure preview · Playing · X 850').coherent).toBe(false);
  o.ribbon([0, 140], identity()); expect(o.snapshot('Adventure preview · Paused · X 850').coherent).toBe(false);
  expect(o.snapshot('Adventure preview · Playing · X 850').coherent).toBe(true);
});
it('registers the wider cache at the frozen controller world580 reference, retaining actual draw origin', () => {
  const o = createContourObserver({ ...config, ribbonReferenceOffsetX: 580 });
  o.fill(true, [0, 0, 426, 240], config.sky, 1, identity());
  o.actor([0, 0, 48, 48, 226, 132, 48, 48], identity());
  o.ribbon([-600.25, 126], identity());
  const w = o.snapshot('Adventure preview · Playing · X 850');
  expect(w.coherent).toBe(true);
  expect(w.ribbon).toMatchObject({ x: -20.25, y: 126, args: [-600.25, 126], origin: { x: -600.25, y: 126 }, referenceOffsetX: 580 });
  expect(w.henry!.x + 580 - w.ribbon!.x).toBe(850.25);
  expect(w.henry!.x - w.ribbon!.origin.x).toBe(850.25);
  const wrong = createContourObserver(config);
  wrong.fill(true, [0, 0, 426, 240], config.sky, 1, identity());
  wrong.actor([0, 0, 48, 48, 226, 132, 48, 48], identity());
  wrong.ribbon([-600.25, 126], identity());
  const bad = wrong.snapshot('Adventure preview · Playing · X 850');
  expect(bad.henry!.x + 580 - bad.ribbon!.x).not.toBe(850.25);
});

function observedRibbon(args: number[], matrix = identity()) {
  const observer = createContourObserver({ ...config, ribbonReferenceOffsetX: 580 });
  observer.fill(true, [0, 0, 426, 240], config.sky, 1, identity());
  observer.ribbon(args, matrix);
  return observer.snapshot('Adventure preview · Playing').ribbon!;
}
it('accepts actual start origin +0 after raw camera negation produces -0', () => {
  const ribbon = observedRibbon([0, 126]);
  expect(Object.is(ribbon.origin.x, +0)).toBe(true);
  const before = structuredClone(ribbon), camera = contourCameraObservation(ribbon.origin.x);
  expect(Object.is(camera.cameraX, -0)).toBe(true);
  expect(Object.is(camera.cameraX, 0)).toBe(false); // The native toBe/Object.is failure is reproduced.
  expect(camera.isStartBoundary).toBe(true);
  expect(ribbon).toEqual(before);
});
it('accepts both physical zero signs without changing raw origins, arguments or camera metadata', () => {
  for (const ribbon of [observedRibbon([+0, 126]), observedRibbon([-0, 126], { ...identity(), c: -0, e: -0 })]) {
    const before = structuredClone(ribbon), origin = ribbon.origin.x, camera = contourCameraObservation(origin);
    expect(origin === 0).toBe(true);
    expect(Object.is(camera.cameraX, -origin)).toBe(true);
    expect(camera.isStartBoundary).toBe(true);
    expect(ribbon).toEqual(before);
    expect(Object.is(ribbon.origin.x, origin)).toBe(true);
    expect(Object.is(ribbon.args[0], before.args[0])).toBe(true);
  }
});
it('rejects every represented nonzero displacement exactly, including the smallest subnormal of either sign', () => {
  for (const translation of [Number.MIN_VALUE, -Number.MIN_VALUE, Number.EPSILON, -Number.EPSILON, 1e-300, -1e-300, 0.25, -0.25, 3874, -3874]) {
    const ribbon = observedRibbon([0, 126], { ...identity(), e: translation });
    expect(Object.is(ribbon.origin.x, translation)).toBe(true);
    const camera = contourCameraObservation(ribbon.origin.x);
    expect(Object.is(camera.cameraX, -translation)).toBe(true);
    expect(camera.isStartBoundary, 'translation ' + translation).toBe(false);
  }
  for (const origin of [NaN, Infinity, -Infinity]) expect(contourCameraObservation(origin).isStartBoundary).toBe(false);
});
it('uses transformed draw origins, accepts exact cancellation and preserves displacement direction', () => {
  const cases = [
    { draw: -73.25, matrix: { ...identity(), e: 73.25 }, cameraX: -0, atStart: true },
    { draw: -140, matrix: { ...identity(), e: 80 }, cameraX: 60, atStart: false },
    { draw: 140, matrix: { ...identity(), e: -80 }, cameraX: -60, atStart: false },
    { draw: 600.25, matrix: { ...identity(), a: -1 }, cameraX: 600.25, atStart: false },
  ];
  for (const sample of cases) {
    const ribbon = observedRibbon([sample.draw, 126], sample.matrix), camera = contourCameraObservation(ribbon.origin.x);
    expect(Object.is(camera.cameraX, sample.cameraX)).toBe(true);
    expect(camera.isStartBoundary).toBe(sample.atStart);
    expect(ribbon.args).toEqual([sample.draw, 126]);
  }
});
