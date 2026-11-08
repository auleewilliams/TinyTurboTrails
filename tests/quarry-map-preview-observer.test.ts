import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'rolldown/utils';
import { installQuarryMapPreviewObserver } from './quarry-map-preview';
import { Camera } from '../src/world/camera';
import { frostGroundIdentity } from '../src/world/frost-ground';
import { LEVELS, QUARRY_RUN } from '../src/world/levels';
import { platformBodiesAt } from '../src/game/platforms';
import { drawWorld, drawWorldForeground } from '../src/world/renderer';

// Pure Node raster adapter: decode shipped PNG bytes; no browser, subprocess or generated evidence.
function png(file: string) {
  const b = readFileSync(file), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  expect(b[24]).toBe(8); expect(b[25]).toBe(6);
  const chunks: Buffer[] = [];
  for (let p = 8; p < b.length;) { const n = b.readUInt32BE(p); if (b.toString('ascii', p + 4, p + 8) === 'IDAT') chunks.push(b.subarray(p + 8, p + 8 + n)); p += n + 12; }
  const raw = inflateSync(Buffer.concat(chunks)), data = new Uint8ClampedArray(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < stride; x++) {
    const filter = raw[y * (stride + 1)], a = x >= 4 ? data[y * stride + x - 4] : 0,
      c = y && x >= 4 ? data[(y - 1) * stride + x - 4] : 0, up = y ? data[(y - 1) * stride + x] : 0;
    const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
    const prediction = [0, a, up, Math.floor((a + up) / 2), pa <= pb && pa <= pc ? a : pb <= pc ? up : c][filter];
    data[y * stride + x] = (raw[y * (stride + 1) + x + 1] + prediction) & 255;
  }
  return { w, h, data };
}
function harness(mode = '') {
  class Image {
    complete = true; src: string; naturalWidth: number; naturalHeight: number; data: Uint8ClampedArray;
    constructor(file: string) { const p = png(file); this.src = `http://localhost/${file.replace(/^public\//, '')}`; this.naturalWidth = p.w; this.naturalHeight = p.h; this.data = p.data; }
  }
  class Canvas {
    id = ''; width = 426; height = 240; ctx: Context; data = new Uint8ClampedArray(426 * 240 * 4);
    constructor() { this.ctx = new Context(this); }
    getContext() { return this.ctx; } toDataURL() { return 'data:image/png;base64,adapter'; }
  }
  class Context {
    fillStyle = '#000000'; globalAlpha = 1; imageSmoothingEnabled = false;
    matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; stack: typeof this.matrix[] = [];
    constructor(public canvas: Canvas) {}
    fillText(..._args: unknown[]) {}
    getTransform() { return { ...this.matrix }; } setTransform(t: typeof this.matrix) { this.matrix = { ...t }; }
    save() { this.stack.push({ ...this.matrix }); } restore() { this.matrix = this.stack.pop()!; }
    translate(x: number, y: number) { this.matrix.e += x; this.matrix.f += y; }
    scale(x: number, y: number) { this.matrix.a *= x; this.matrix.d *= y; }
    transform() {} beginPath() {} closePath() {} moveTo() {} lineTo() {} stroke() {} fill() {} clip() {} rect() {} arc() {} setLineDash() {} strokeRect() {}
    fillRect(x: number, y: number, w: number, h: number) {
      const color = /^#[\da-f]{6}$/i.test(this.fillStyle) ? [1, 3, 5].map(i => parseInt(this.fillStyle.slice(i, i + 2), 16)) : [0, 0, 0];
      for (let yy = Math.max(0, y); yy < Math.min(240, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(426, x + w); xx++) this.canvas.data.set([...color, 255], (yy * 426 + xx) * 4);
    }
    drawImage(image: Image | Canvas, ...args: number[]) {
      if (!(image instanceof Image) || args.length !== 2) return;
      if (mode === 'missing' && image.src.endsWith('/shelf-360.png')) return;
      const [x, y] = args;
      for (let yy = 0; yy < image.naturalHeight; yy++) for (let xx = 0; xx < image.naturalWidth; xx++) {
        const dx = Math.round(x + xx + this.matrix.e), dy = Math.round(y + yy + this.matrix.f), at = (yy * image.naturalWidth + xx) * 4;
        if (dx < 0 || dx >= 426 || dy < 0 || dy >= 240 || image.data[at + 3] !== 255) continue;
        const color = mode === 'legacy' && image.src.endsWith('/shelf-360.png') && this.canvas.id !== 'reference' ? [177, 199, 125, 255]
          : mode === 'wrong-raster' && this.canvas.id !== 'reference' ? [1, 2, 3, 255] : image.data.subarray(at, at + 4);
        this.canvas.data.set(color, (dy * 426 + dx) * 4);
      }
    }
    getImageData(x: number, y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let yy = 0; yy < h; yy++) data.set(this.canvas.data.subarray(((y + yy) * 426 + x) * 4, ((y + yy) * 426 + x + w) * 4), yy * w * 4);
      return { data };
    }
  }
  let created = 0;
  const document = { createElement: () => { const canvas = new Canvas(); if (created++ > 0) canvas.id = 'reference'; return canvas; } }, window = { location: { origin: 'http://localhost' } };
  runInNewContext(`(${installQuarryMapPreviewObserver.toString()})()`, { window, document, CanvasRenderingContext2D: Context, HTMLImageElement: Image, HTMLCanvasElement: Canvas, URL });
  const kit = (family: string) => { const manifest = JSON.parse(readFileSync(`public/assets/quarry/${family}/manifest.json`, 'utf8'));
    return { manifest, images: Object.fromEntries(Object.entries(manifest.platforms).map(([id, value]) => [id, new Image(`public/assets/quarry/${family}/${(value as { image: string }).image}`)])) }; };
  const assets = { manifest: JSON.parse(readFileSync('public/assets/plains/manifest.json', 'utf8')), atlas: {}, gems: {},
    quarryFloor: { manifest: JSON.parse(readFileSync('public/assets/quarry/floor-v1/manifest.json', 'utf8')), image: new Image('public/assets/quarry/floor-v1/floor-820.png') },
    quarryRollout: kit('rollout-v1'), quarryPreview: kit('representative-v1'), quarryShelves: kit('whole-ledges-v1') };
  const rim = assets.quarryRollout.images['quarry-rim'];
  if (mode === 'wrong-source') rim.src = 'http://localhost/wrong/shelf-360.png';
  if (mode === 'wrong-size') rim.naturalWidth--;
  if (mode === 'wrong-height') rim.naturalHeight--;
  if (mode === 'incomplete') rim.complete = false;
  if (mode === 'query-source') rim.src += '?other';
  if (mode === 'foreign-source') rim.src = rim.src.replace('localhost', 'other.test');
  // Run the actual private cache construction method verbatim with the real renderer and camera.
  const scene = readFileSync('src/game/adventure-scene.ts', 'utf8');
  const method = scene.slice(scene.indexOf('  private preview():'), scene.indexOf('\n  private drawHenry'));
  const code = transformSync('preview-caller.ts', `class Caller { ${method} }`, { lang: 'ts' }).code;
  const Caller = new Function('document', 'LEVELS', 'Camera', 'platformBodiesAt', 'drawWorld', 'drawWorldForeground', 'frostGroundIdentity', `${code}; return Caller;`)(document, LEVELS, Camera, platformBodiesAt, drawWorld, drawWorldForeground, frostGroundIdentity);
  const caller = new Caller(); caller.selectedIndex = LEVELS.indexOf(QUARRY_RUN); caller.previews = new Map(); caller.worlds = { plains: assets };
  const cached = caller.preview() as Canvas;
  const game = new Canvas(); game.id = mode === 'wrong-canvas' ? 'other' : 'game';
  const present = (heading: string, image = cached) => { game.ctx.fillText(heading, 350, 63); game.ctx.drawImage(image, 287, 84, 126, 71); };
  const probe = (window as unknown as { quarryMapPreview: { quarry: null | { rimPixels: number; width: number; height: number }; plains: null | { rimPixels: number } } }).quarryMapPreview;
  return { probe, cached, caller, present, Canvas, window };
}
it('real cache construction and shared browser observer recognize the shipped rim and warm cache', () => {
  const h = harness(); h.present('PLAINS', new h.Canvas()); expect(h.probe.plains?.rimPixels).toBe(0); expect(h.probe.quarry).toBeNull();
  expect(h.caller.preview()).toBe(h.cached); h.present('QUARRY');
  expect(h.probe.quarry).toMatchObject({ width: 426, height: 240 }); expect(h.probe.quarry!.rimPixels).toBeGreaterThan(80);
  const count = h.probe.quarry!.rimPixels; h.probe.quarry = null;
  h.present('PLAINS'); expect(h.probe.quarry).toBeNull();
  h.present('QUARRY', h.caller.preview()); expect(h.probe.quarry!.rimPixels).toBe(count);
});
for (const mode of ['wrong-source', 'wrong-size', 'wrong-height', 'incomplete', 'query-source', 'foreign-source', 'missing', 'wrong-raster', 'legacy', 'wrong-canvas']) it(`rejects ${mode} through real construction and observer`, () => {
  const h = harness(mode); h.present('QUARRY'); expect(h.probe.quarry?.rimPixels ?? 0).toBe(0);
});
it('browser caller installs the shared observer and retains both images before final assertions', () => {
  const browser = readFileSync('tests/browser.spec.ts', 'utf8'); const section = browser.slice(browser.indexOf("test('selected Quarry map thumbnail"), browser.indexOf("test('Quarry native landing visibility:"));
  expect(section).toContain('page.addInitScript(installQuarryMapPreviewObserver)');
  expect(section).toContain("getByRole('button', { name: 'QUARRY RUN', exact: true }).click()");
  expect(section.indexOf("info.attach('quarry-selected-map-window'")).toBeLessThan(section.indexOf('expect(selectedPreview.heading)'));
});

it('rejects a different cached canvas even with an identical raster', () => {
  const h = harness(), decoy = new h.Canvas(); decoy.data.set(h.cached.data);
  h.present('QUARRY', decoy); expect(h.probe.quarry?.rimPixels).toBe(0);
});
it('executes the real browser caller through selection, shared observation and both attachments', async () => {
  const h = harness(), attachments: string[] = [];
  const browser = readFileSync('tests/browser.spec.ts', 'utf8');
  const start = browser.indexOf("test('selected Quarry map thumbnail");
  const section = browser.slice(start, browser.indexOf("\ntest('Quarry native landing visibility:", start));
  let callback: (args: object, info: object) => Promise<void> = async () => { throw new Error('caller missing'); };
  const capture = (_title: string, fn: typeof callback) => { callback = fn; };
  const button = { selected: false, async click() { this.selected = true; h.present('QUARRY'); } };
  const page = { async addInitScript(fn: unknown) { expect(fn).toBe(installQuarryMapPreviewObserver); },
    async evaluate(fn: () => unknown) { return new Function('window', `return (${fn.toString()})()`)(h.window); },
    getByRole() { return button; }, async screenshot() { return Buffer.from('window adapter'); } };
  const callerExpect = Object.assign((value: unknown) => Object.assign(expect(value), {
    async toHaveAttribute(name: string, expected: string) { expect(name).toBe('data-selected'); expect(String(button.selected)).toBe(expected); },
  }), { poll: (fn: () => Promise<unknown>) => ({ async toBe(value: unknown) { expect(await fn()).toBe(value); } }) });
  const code = transformSync('map-browser-caller.ts', section.replace(/^test\(/, 'capture('), { lang: 'ts' }).code;
  new Function('capture', 'installQuarryMapPreviewObserver', 'openAdventure', 'expect', 'Buffer', code)(capture,
    installQuarryMapPreviewObserver, async () => h.present('PLAINS', new h.Canvas()), callerExpect, Buffer);
  await callback({ page }, { async attach(name: string) { attachments.push(name); } });
  expect(attachments).toEqual(['preselection-plains-observer', 'quarry-selected-map-preview', 'quarry-selected-map-window']);
  expect(h.probe.quarry!.rimPixels).toBeGreaterThan(80);
});

it('real preview cache tracks imported ground identity and same-source image replacements', () => {
  const h = harness();
  // Quarry shares the Plains atlas; its thumbnail still uses the real shared cache key.
  const kit = { manifest: { recipe: 'identity-fixture' }, terrain: { src: 'terrain.png' }, ice: { src: 'ice.png' } };
  h.caller.worlds.plains.frostGround = kit;
  let previous = h.caller.preview();
  expect(previous === h.cached).toBe(false);
  expect(h.caller.preview()).toBe(previous);
  for (const change of [
    () => { kit.terrain = { ...kit.terrain }; },
    () => { kit.ice = { ...kit.ice }; },
    () => { kit.terrain.src += '?replacement'; },
    () => { kit.ice.src += '?replacement'; },
    () => { kit.manifest = { recipe: 'changed-fixture' }; },
  ]) {
    change();
    const current = h.caller.preview();
    expect(current === previous).toBe(false);
    expect(h.caller.preview()).toBe(current);
    h.probe.quarry = null;
    h.present('QUARRY', current);
    expect(h.probe.quarry!.rimPixels).toBeGreaterThan(80);
    previous = current;
  }
});
