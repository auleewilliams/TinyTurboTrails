import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createContourObserver, type NativeMatrix } from './plains-contour-observer';
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
