import { expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { transformSync } from 'rolldown/utils';
import { installQuarryPilotScript, type QuarryLandingSample, type QuarryLandingTarget } from './quarry-pilot';
import { drawPlatforms } from '../src/world/renderer';
import { drawFacingSprite } from '../src/art/sprite';
import { QUARRY_RUN } from '../src/world/quarry-run';
import { platformBodyAt } from '../src/game/platforms';
import { drawQuarryPreviewPiece, quarryPreviewPieces } from '../src/world/quarry-preview-pieces';
import { drawQuarryShelf, quarryShelfPieces } from '../src/world/quarry-shelves';
import { quarryRolloutPieces } from '../src/world/quarry-rollout';

function harness(status = 'Playing X 100 Y 106 V 0') {
  const pixels = { actual: new Uint8ClampedArray(80), reference: new Uint8ClampedArray(80) };
  const referenceDraws: unknown[][] = [];
  class Image {
    complete = true;
    constructor(public src: string, public naturalWidth: number, public naturalHeight: number) {}
  }
  class Point { constructor(public x: number, public y: number) {} }
  class Context {
    canvas = { id: 'game' }; fillStyle = ''; globalAlpha = 1;
    matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; stack: typeof this.matrix[] = [];
    fillRect(..._args: number[]) {}
    drawImage(...args: unknown[]) { if (this.canvas.id === 'reference') referenceDraws.push(args); }
    getImageData() { return { data: this.canvas.id === 'reference' ? pixels.reference : pixels.actual }; }
    setTransform(matrix: typeof this.matrix) { this.matrix = { ...matrix }; }
    beginPath() {} moveTo() {} lineTo() {} stroke() {} setLineDash() {}
    save() { this.stack.push({ ...this.matrix }); }
    restore() { this.matrix = this.stack.pop()!; }
    translate(x: number, y: number) { this.matrix.e += this.matrix.a * x; this.matrix.f += this.matrix.d * y; }
    scale(x: number, y: number) { this.matrix.a *= x; this.matrix.d *= y; }
    getTransform() { const m = this.matrix; return { ...m, transformPoint: (p: Point) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }) }; }
  }
  const win = { requestAnimationFrame: () => 1, dispatchEvent() {}, location: { origin: 'http://localhost' } };
  runInNewContext(`(${installQuarryPilotScript.toString()})()`, { window: win, CanvasRenderingContext2D: Context,
    HTMLImageElement: Image, DOMPoint: Point, URL, document: { querySelector: () => ({ textContent: status }), createElement: () => { const ctx = new Context(); ctx.canvas.id = 'reference'; return { getContext: () => ctx }; } }, requestAnimationFrame: win.requestAnimationFrame });
  const pilot = (win as unknown as { quarryPilot: { decks: { id: string; y: number; stationary: boolean }[];
    frame: { camera: { x: number; y: number }; supports: { x: number; y: number; width: number; source?: string }[] } | null } }).quarryPilot;
  const ctx = new Context();
  const henry = new Image('http://localhost/assets/henry/henry-celebration.png', 480, 480);
  const finish = (facing: -1 | 1 = 1) => drawFacingSprite(ctx as never, henry as never, { x: 0, y: 0, width: 48, height: 48 }, 76, 96, 48, 48, facing);
  const reset = () => ctx.fillRect(0, 0, 426, 240);
  const draw = (family: string, ids: string[], offset = { x: .25, y: .5 }) => {
    const manifest = JSON.parse(readFileSync(`public/assets/quarry/${family}/manifest.json`, 'utf8'));
    const images = Object.fromEntries(Object.entries(manifest.platforms).map(([id, p]) => {
      const piece = p as { image: string; width: number; height: number };
      return [id, new Image(`http://localhost/assets/quarry/${family}/${piece.image}`, piece.width, piece.height)];
    }));
    const platforms = QUARRY_RUN.platforms!.filter(p => ids.includes(p.id));
    const assets = family === 'representative-v1' ? { quarryPreview: { manifest, images }, quarryRollout: { manifest: { platforms: {} }, images: {} } }
      : family === 'whole-ledges-v1' ? { quarryShelves: { manifest, images }, quarryRollout: { manifest: { platforms: {} }, images: {} } }
      : { quarryRollout: { manifest, images } };
    return { platforms, images, manifest, assets, offset };
  };
  const sample = (edge: object) => (win as unknown as { quarryLandingPixels: (ctx: Context, edge: object, left: number, right: number) => number }).quarryLandingPixels(ctx, edge, 2, 22);
  const landing = (next: QuarryLandingTarget, id: string) => (win as unknown as { quarryLandingSample: (ctx: Context, next: QuarryLandingTarget, id: string) => QuarryLandingSample }).quarryLandingSample(ctx, next, id);
  return { ctx, pilot, reset, finish, draw, Image, Context, pixels, referenceDraws, sample, landing };
}

it('serialized shared observer sees actual illustrated B and whole shelf renderer draws', () => {
  const h = harness(); h.reset();
  const b = h.draw('representative-v1', ['quarry-lift-b']);
  drawQuarryPreviewPiece(h.ctx as never, b.assets.quarryPreview as never, platformBodyAt(b.platforms[0], 0), b.offset);
  const s = h.draw('whole-ledges-v1', ['quarry-upper']);
  drawQuarryShelf(h.ctx as never, s.assets.quarryShelves as never, platformBodyAt(s.platforms[0], 0), s.offset);
  h.finish();
  expect(h.pilot.decks).toEqual([expect.objectContaining({ id: 'quarry-lift-b', y: 419.5 })]);
  expect(h.pilot.frame!.supports).toContainEqual(expect.objectContaining({ x: 159.75, y: 419.5, width: 400 }));
});
it('serialized observer sees rollout A/C at actual native coordinates and real sprite facing transforms', () => {
  const h = harness(); h.reset(); const kit = h.draw('rollout-v1', ['quarry-lift-a', 'quarry-lift-c']);
  drawPlatforms(h.ctx as never, { ...QUARRY_RUN, platforms: kit.platforms }, kit.offset, kit.platforms.map(p => platformBodyAt(p, 0)), kit.assets as never);
  h.finish(-1);
  expect(h.pilot.frame!.camera).toEqual({ x: 0, y: 0 });
  expect(h.pilot.decks.map(d => d.id)).toEqual(['quarry-lift-a', 'quarry-lift-c']);
});
it('legacy renderer calibration, offscreen receiver and frame reset stay coherent', () => {
  const h = harness(); h.reset(); const p = QUARRY_RUN.platforms!.find(p => p.id === 'quarry-lift-b')!;
  drawPlatforms(h.ctx as never, { ...QUARRY_RUN, platforms: [p] }, { x: 0, y: 0 }, [platformBodyAt(p, 0)]);
  h.finish(); expect(h.pilot.decks[0].id).toBe('quarry-lift-b');
  h.reset(); const other = new h.Context(); other.canvas.id = 'reference'; other.fillRect(660, 420, 96, 10);
  h.finish(); expect(h.pilot.decks).toEqual([]);
});

it('recognition rejects wrong source, dimensions, incomplete/scaled draws and offscreen receivers', () => {
  const h = harness();
  for (const [src, w, height, complete, scaled] of [
    ['http://localhost/wrong/carriage-96.png', 96, 17, true, false],
    ['http://wrong.test/assets/quarry/representative-v1/carriage-96.png', 96, 17, true, false],
    ['http://localhost/assets/quarry/representative-v1/carriage-96.png?wrong', 96, 17, true, false],
    ['http://localhost/assets/quarry/representative-v1/carriage-96.png', 95, 17, true, false],
    ['http://localhost/assets/quarry/representative-v1/carriage-96.png', 96, 10, true, false],
    ['http://localhost/assets/quarry/representative-v1/carriage-96.png', 96, 17, false, false],
    ['http://localhost/assets/quarry/representative-v1/carriage-96.png', 96, 17, true, true],
  ] as const) {
    h.reset(); const image = new h.Image(src, w, height); image.complete = complete;
    h.ctx.save(); if (scaled) h.ctx.scale(2, 1); h.ctx.drawImage(image, 660, 420); h.ctx.restore(); h.finish();
    expect(h.pilot.decks).toEqual([]); expect(h.pilot.frame!.supports).toEqual([]);
  }
  h.reset(); const image = new h.Image('http://localhost/assets/quarry/representative-v1/carriage-96.png', 96, 17);
  h.ctx.drawImage(image, 660, 420, 96, 17); // Unsupported resized overload.
  const other = new h.Context(); other.canvas.id = 'reference'; other.drawImage(image, 660, 420);
  h.finish(); expect(h.pilot.decks).toEqual([]);
});
it('translation, stationary dock evidence and disappearance reset use consecutive rendered frames', () => {
  const h = harness();
  const image = new h.Image('http://localhost/assets/quarry/representative-v1/carriage-96.png', 96, 17);
  for (let frame = 0; frame < 2; frame++) {
    h.reset(); expect(h.pilot.frame).toBeNull();
    h.ctx.save(); h.ctx.translate(10.25, 20.5); h.ctx.drawImage(image, 649.75, 399.5); h.ctx.restore(); h.finish(-1);
    expect(h.pilot.decks).toEqual([{ id: 'quarry-lift-b', y: 420, stationary: frame === 1 }]);
  }
  h.reset(); h.finish(); expect(h.pilot.decks).toEqual([]); expect(h.pilot.frame!.supports).toEqual([]);
  h.reset(); h.ctx.drawImage(image, 660, 420); h.finish(); expect(h.pilot.decks[0].stationary).toBe(false);
});
it('pixel calibration matches the observed shipped source and rejects wrong pixels, transparency and absent draw', () => {
  const h = harness(); h.reset();
  const image = new h.Image('http://localhost/assets/quarry/whole-ledges-v1/shelf-400.png', 400, 45);
  h.ctx.drawImage(image, 0, 100); h.finish(); const edge = h.pilot.frame!.supports[0];
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([31, 47, 59, 255], i);
  h.pixels.reference.set(h.pixels.actual);
  expect(h.sample(edge)).toBe(20); expect(h.referenceDraws.at(-1)).toEqual([image, 0, 100]);
  h.pixels.actual.fill(99); expect(h.sample(edge)).toBe(0);
  h.pixels.actual.set(h.pixels.reference); h.pixels.reference.fill(0); expect(h.sample(edge)).toBe(0);
  h.reset(); expect(h.sample(edge)).toBe(0); // Stale source reference removed on reset.
  h.pixels.actual.fill(99); expect(h.sample({ x: 0, y: 100, width: 400 })).toBe(0);
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([177, 199, 125, 255], i);
  expect(h.sample({ x: 0, y: 100, width: 400 })).toBe(20); // Legacy floor calibration.
});

it('recognizes every shipped support through its actual renderer family at fractional offsets', () => {
  const h = harness();
  for (const family of ['rollout-v1', 'representative-v1', 'whole-ledges-v1']) {
    const manifest = JSON.parse(readFileSync(`public/assets/quarry/${family}/manifest.json`, 'utf8'));
    for (const id of Object.keys(manifest.platforms)) {
      h.reset(); const kit = h.draw(family, [id]), body = platformBodyAt(kit.platforms[0], 0);
      if (family === 'representative-v1') drawQuarryPreviewPiece(h.ctx as never, kit.assets.quarryPreview as never, body, kit.offset);
      else if (family === 'whole-ledges-v1') drawQuarryShelf(h.ctx as never, kit.assets.quarryShelves as never, body, kit.offset);
      else drawPlatforms(h.ctx as never, { ...QUARRY_RUN, platforms: kit.platforms }, kit.offset, [body], kit.assets as never);
      h.finish(); expect(h.pilot.frame!.supports).toEqual([{ x: body.x - .25, y: body.y - .5, width: body.width,
        source: `/assets/quarry/${family}/${manifest.platforms[id].image}` }]);
    }
  }
});

it('whole shelf landing evidence requires the actual illustrated draw', () => {
  const h = harness(); h.reset();
  const kit = h.draw('whole-ledges-v1', ['quarry-upper']);
  drawQuarryShelf(h.ctx as never, kit.assets.quarryShelves as never, platformBodyAt(kit.platforms[0], 0), kit.offset);
  h.finish(); expect(h.pilot.frame!.supports).toEqual([{ x: 159.75, y: 419.5, width: 400,
    source: '/assets/quarry/whole-ledges-v1/shelf-400.png' }]);
});

it('actual landing matcher-to-pixel seam rejects legacy green support at an illustrated target', () => {
  const h = harness(); h.reset(); h.ctx.fillStyle = '#59616a'; h.ctx.fillRect(160, 100, 400, 10); h.finish();
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([177, 199, 125, 255], i);
  const next = { x: 160, y: 100, width: 400, source: '/assets/quarry/whole-ledges-v1/shelf-400.png' };
  const result = h.landing(next, 'quarry-upper');
  expect({ drawn: result.drawn, capPixels: result.capPixels }).toEqual({ drawn: false, capPixels: 0 });
});

it('shared landing seam calibrates exact-source raster, wrong-source, absent-draw and floor-only legacy evidence', () => {
  const h = harness(); const source = '/assets/quarry/whole-ledges-v1/shelf-160.png';
  const image = new h.Image('http://localhost' + source, 160, 32), next = { x: 160, y: 100, width: 160, source };
  h.reset(); h.ctx.drawImage(image, 160, 100); h.finish();
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([31, 47, 59, 255], i);
  h.pixels.reference.set(h.pixels.actual);
  expect(h.landing(next, 'quarry-terrace-4')).toMatchObject({ drawn: true, capPixels: 20, edge: { source } });
  expect(h.landing({ ...next, source: '/assets/quarry/rollout-v1/star-160.png' }, 'quarry-star-upper')).toMatchObject({ drawn: false, capPixels: 0 });
  h.pixels.actual.fill(99); expect(h.landing(next, 'quarry-terrace-4').capPixels).toBe(0);
  h.reset(); h.finish(); expect(h.landing(next, 'quarry-terrace-4')).toMatchObject({ drawn: false, capPixels: 0 });
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([177, 199, 125, 255], i);
  expect(h.landing({ x: 160, y: 100, width: 160 }, 'quarry-terrace-4')).toMatchObject({ drawn: false, capPixels: 0 });
  expect(h.landing({ x: 160, y: 100, width: 160 }, 'floor').capPixels).toBe(0);
  h.reset(); h.ctx.fillStyle = '#59616a'; h.ctx.fillRect(160, 100, 160, 10); h.finish();
  expect(h.landing(next, 'quarry-terrace-4')).toMatchObject({ drawn: false, capPixels: 0 });
  expect(h.landing({ x: 160, y: 100, width: 160 }, 'floor')).toMatchObject({ drawn: false, capPixels: 0 });
});

it('floor landing needs its exact native source and matching raster; legacy floor cannot certify it', () => {
  const h = harness(), source = '/assets/quarry/floor-v1/floor-820.png';
  const next = { x: 0, y: 100, width: 820, source };
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([31, 47, 59, 255], i);
  h.pixels.reference.set(h.pixels.actual);
  h.reset(); h.ctx.drawImage(new h.Image('http://localhost' + source, 820, 107), 0, 100); h.finish();
  expect(h.landing(next, 'floor')).toMatchObject({ drawn: true, capPixels: 20, edge: { source } });
  h.pixels.actual.fill(99); expect(h.landing(next, 'floor').capPixels).toBe(0);
  for (const [url, w, height, complete, scale, overload] of [
    ['http://localhost/wrong/floor-820.png', 820, 107, true, false, false],
    ['http://wrong.test' + source, 820, 107, true, false, false],
    ['http://localhost' + source + '?wrong', 820, 107, true, false, false],
    ['http://localhost' + source, 820, 100, true, false, false],
    ['http://localhost' + source, 820, 107, false, false, false],
    ['http://localhost' + source, 820, 107, true, true, false],
    ['http://localhost' + source, 820, 107, true, false, true],
  ] as const) {
    h.reset(); const image = new h.Image(url, w, height); image.complete = complete;
    h.ctx.save(); if (scale) h.ctx.scale(2, 1);
    if (overload) h.ctx.drawImage(image, 0, 100, 820, 107); else h.ctx.drawImage(image, 0, 100);
    h.ctx.restore(); h.finish(); expect(h.landing(next, 'floor')).toMatchObject({ drawn: false, capPixels: 0 });
  }
  h.reset(); h.ctx.fillStyle = '#59616a'; h.ctx.fillRect(0, 100, 820, 10); h.finish();
  expect(h.landing(next, 'floor')).toMatchObject({ drawn: false, capPixels: 0 });
});

it('the actual browser landing caller passes its exact floor target source through the shared matcher and pixels', () => {
  const browser = readFileSync(new URL('./browser.spec.ts', import.meta.url), 'utf8');
  const start = browser.indexOf("test('Quarry native landing visibility:");
  expect(start).toBeGreaterThanOrEqual(0);
  const section = browser.slice(start, browser.indexOf('\n});', start));
  const ids = section.match(/  const nextIds = \[[\s\S]*?\];/);
  const construction = section.match(/    const id = nextIds\[index\];[\s\S]*?(?=    for \(const viewport)/);
  expect(ids).not.toBeNull(); expect(construction).not.toBeNull();
  // Execute the spec's declarations verbatim, rather than duplicating its target.
  const code = transformSync('quarry-landing-caller.ts', `${ids![0]}
    const caller = (index: number) => { ${construction![0]} return { id, next }; };
  `, { lang: 'ts' }).code;
  const caller = new Function('QUARRY_RUN', 'quarryRolloutPieces', 'quarryPreviewPieces', 'quarryShelfPieces',
    `${code}\nreturn { count: nextIds.length, target: caller };`)(QUARRY_RUN, quarryRolloutPieces, quarryPreviewPieces, quarryShelfPieces) as {
      count: number; target: (index: number) => { id: string; next: QuarryLandingTarget };
    };
  expect(caller.count).toBe(12);
  const { id, next } = caller.target(11), source = '/assets/quarry/floor-v1/floor-820.png';
  const h = harness('Playing X 100 Y 986 V 0');
  h.reset(); h.ctx.drawImage(new h.Image('http://localhost' + source, 820, 107), 0, 100); h.finish();
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([31, 47, 59, 255], i);
  h.pixels.reference.set(h.pixels.actual);
  expect(h.landing(next, id)).toMatchObject({ drawn: true, capPixels: 20, edge: { source } });
  expect({ id, next }).toEqual({ id: 'floor', next: { x: 0, y: 980, width: 820, source } });
  for (let index = 0; index < caller.count; index++) expect(caller.target(index).next.source).toBeDefined();
  h.pixels.actual.fill(99); expect(h.landing(next, id).capPixels).toBe(0);
  h.reset(); h.ctx.fillStyle = '#59616a'; h.ctx.fillRect(0, 100, 820, 10); h.finish();
  for (let i = 0; i < 80; i += 4) h.pixels.actual.set([177, 199, 125, 255], i);
  expect(h.landing(next, id)).toMatchObject({ drawn: false, capPixels: 0 });
});
