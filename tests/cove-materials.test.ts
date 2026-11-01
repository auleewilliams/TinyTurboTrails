import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import * as materials from '../src/world/surface-materials';
import { SANDY_COVE } from '../src/world/sandy-cove';

it('declares and exposes the actual generated Cove material kit', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
  expect(manifest.surfaceKit).toBe('materials/manifest.json');
  for (const name of ['validateCoveMaterials', 'loadCoveMaterials', 'coveRipplePhase', 'drawCoveMaterials']) {
    expect((materials as unknown as Record<string, unknown>)[name], name).toBeTypeOf('function');
  }
});

it('uses generated strips at native scale for all five actual Cove patches', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/manifest.json', import.meta.url), 'utf8'));
  expect(manifest.surfaceKit).toBe('materials/manifest.json');
  const kitManifest = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
  const calls: unknown[][] = [];
  const ctx = { globalAlpha: 1, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, drawImage(...args: unknown[]) { calls.push(args); } };
  materials.drawSurfaceMaterials(ctx as unknown as CanvasRenderingContext2D, SANDY_COVE, { x: 0, y: 0 },
    { image: {} as HTMLImageElement, manifest: kitManifest }, 1, false);
  expect(calls).toHaveLength(1); // only the first 30px sand patch is in the initial native viewport
  expect(calls[0].slice(3)).toEqual([30, 8, 75, 360, 30, 8]);
});

it('bounds the real ripple phase, freezes with identical presentation time and disables motion under reduced motion', () => {
  for (let t = 0; t < 12; t += .125) {
    const p = materials.coveRipplePhase(t);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
    expect(p.opacity).toBeGreaterThanOrEqual(.5); expect(p.opacity).toBeLessThanOrEqual(.8);
    expect(materials.coveRipplePhase(t + 4).x).toBeCloseTo(p.x, 12);
    expect(materials.coveRipplePhase(t)).toEqual(p);
    expect(materials.coveRipplePhase(t, true)).toEqual({ x: 0, opacity: .65 });
  }
  expect(materials.coveRipplePhase(1).x).toBe(1);
  expect(materials.coveRipplePhase(3).x).toBe(-1);
});

it('covers actual spans in single native rasters at integer, half and fractional cameras and restores caller alpha', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
  const image = {} as HTMLImageElement;
  for (const band of manifest.bands) for (const fraction of [0,.25,.5,.75]) {
    const calls: { args: unknown[]; alpha: number }[] = [], stack: number[] = [];
    const ctx = { globalAlpha: .7, save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop()!; },
      beginPath() {}, rect() {}, clip() {}, drawImage(...args: unknown[]) { calls.push({ args, alpha: this.globalAlpha }); } };
    const offset = { x: band.x1 - 10 + fraction, y: band.top - 50 + fraction };
    const draw = (time: number, reduced = false) => { calls.length = 0; materials.drawCoveMaterials(ctx as unknown as CanvasRenderingContext2D, { image, manifest }, SANDY_COVE, offset, time, reduced); return structuredClone(calls.map(c => ({ ...c, args: c.args.slice(1) }))); };
    const zero = draw(0), again = draw(0); expect(again).toEqual(zero);
    const moved = draw(1);
    expect(moved[0]).toEqual(zero[0]); // native static base and ends
    const own = moved.find(c => c.args[0] === band.base.x && c.args[1] === band.base.y)!;
    expect(own.args.slice(2)).toEqual([band.x2-band.x1,8,10-fraction,50-fraction,band.x2-band.x1,8]);
    if (band.material === 'water') expect(moved).not.toEqual(zero);
    else expect(moved).toEqual(zero);
    expect(draw(1,true)).toEqual(draw(3,true));
    expect(ctx.globalAlpha).toBe(.7); expect(stack).toEqual([]);
    expect(calls.every(c => c.args[0] === image)).toBe(true);
  }
});

it('strictly rejects malformed material dimensions, rectangles, spans and undeclared metadata', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/cove/materials/manifest.json', import.meta.url), 'utf8'));
  expect(() => materials.validateCoveMaterials(manifest)).not.toThrow();
  for (const mutate of [(m: typeof manifest) => m.width++, (m: typeof manifest) => m.bands[0].x1++,
    (m: typeof manifest) => m.pieces['water-left'].x++, (m: typeof manifest) => m.bands[2].ripple.width++,
    (m: typeof manifest) => m.bands.pop(), (m: typeof manifest) => m.extra = true]) {
    const bad = structuredClone(manifest); mutate(bad);
    expect(() => materials.validateCoveMaterials(bad)).toThrow(/Cove material/);
  }
});
