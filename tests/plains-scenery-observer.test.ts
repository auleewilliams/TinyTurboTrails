import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { installPlainsSceneryObserver } from './plains-scenery-observer';

/** Synthetic receivers/work counters, not native raster or historical CPU replay. */
function fixture() {
  const metrics = { parses: 0, stringifies: 0, parsedRecords: 0, serializedRecords: 0, datasetReads: 0, datasetWrites: 0 };
  const forwarded: { receiver: object; args: unknown[] }[] = [];
  const stores = new WeakMap<object, Record<string, string>>();
  class Canvas {
    alpha = 255;
    dataset: Record<string, string>;
    constructor(public id = '') {
      const data: Record<string, string> = {}; stores.set(this, data);
      this.dataset = new Proxy(data, {
        get: (target, key) => { if (key === 'sceneryDraws') metrics.datasetReads++; return Reflect.get(target, key); },
        set: (target, key, value) => { if (key === 'sceneryDraws') metrics.datasetWrites++; return Reflect.set(target, key, value); },
      });
    }
  }
  class Image {
    constructor(public src: string, public alpha = 255, public fail = false) {}
  }
  class Context {
    constructor(public canvas: Canvas) {}
    drawImage(...args: unknown[]) {
      forwarded.push({ receiver: this, args });
      if (args[0] instanceof Image && args[0].fail) throw new Error('original draw failure');
      if (args[0] instanceof Image || args[0] instanceof Canvas) this.canvas.alpha = args[0].alpha;
    }
    getImageData() { return { data: Uint8ClampedArray.from([0, 0, 0, this.canvas.alpha]) }; }
  }
  let game: Canvas | null = null;
  const document = { getElementById: (id: string) => id === 'game' ? game : null, querySelector: () => game };
  // Install before the DOM game canvas exists; constructors/prototypes are fresh per realm.
  runInNewContext('(' + installPlainsSceneryObserver.toString() + ')()', {
    CanvasRenderingContext2D: Context, HTMLImageElement: Image, document,
    JSON: {
      parse: (text: string) => { metrics.parses++; const calls = JSON.parse(text); metrics.parsedRecords += calls.length; return calls; },
      stringify: (calls: unknown[]) => { metrics.stringifies++; metrics.serializedRecords += calls.length; return JSON.stringify(calls); },
    },
  });
  return { metrics, forwarded, Canvas, Image, Context, document,
    createGame: () => { game = new Canvas('game'); return new Context(game); },
    calls: (canvas: Canvas): { source: string; args: number[] }[] => JSON.parse(stores.get(canvas)?.sceneryDraws ?? '[]'),
    hasDataset: (canvas: Canvas) => Object.hasOwn(stores.get(canvas)!, 'sceneryDraws') };
}

it('skips all metadata work on offscreen cache-like HTML image draws while forwarding every call', () => {
  const f = fixture(), ctx = new f.Context(new f.Canvas()), image = new f.Image('/contour-prototype-v1/grass.png');
  for (let i = 0; i < 128; i++) ctx.drawImage(image, 20, 0, 1, 16, i, 0, 1, 16);
  expect(f.forwarded).toHaveLength(128);
  expect(f.forwarded.every(call => call.receiver === ctx && call.args[0] === image)).toBe(true);
  expect(f.metrics).toEqual({ parses: 0, stringifies: 0, parsedRecords: 0, serializedRecords: 0, datasetReads: 0, datasetWrites: 0 });
  expect(f.hasDataset(ctx.canvas)).toBe(false);
});
it('observes every main draw after pre-DOM installation with original order and duplicate identities', () => {
  const f = fixture(); expect(f.document.getElementById('game')).toBeNull();
  const ctx = f.createGame(), offscreen = new f.Context(new f.Canvas());
  const background = new f.Image('/scenery/background.webp'), tree = new f.Image('/foreground.png'), henry = new f.Image('/henry/henry.png');
  ctx.drawImage(background, 0, 0); offscreen.drawImage(tree, 4, 5);
  const args = [7.25, 0, 48, 48, 420, 150, 48, 48];
  ctx.drawImage(tree, ...args); ctx.drawImage(tree, ...args); ctx.drawImage(henry, 0, 0); ctx.drawImage(tree, 1, 2);
  expect(f.calls(ctx.canvas)).toEqual([
    { source: background.src, args: [0, 0] }, { source: tree.src, args }, { source: tree.src, args },
    { source: henry.src, args: [0, 0] }, { source: tree.src, args: [1, 2] },
  ]);
  expect(f.forwarded.map(call => call.args[0])).toEqual([background, tree, tree, tree, henry, tree]);
  expect(f.metrics.parses).toBe(5); expect(f.metrics.stringifies).toBe(5);
});
it.each([
  ['/scenery/background.webp', [0, 0]], ['/trails/backdrops.webp', [0, 0]],
  ['/environment.png', [48, 48, 48, 48, 0, 0, 96, 96]],
] as const)('preserves repeated frame resets for %s', (source, args) => {
  const f = fixture(), ctx = f.createGame(), stale = new f.Image('/old.png'), background = new f.Image(source), actor = new f.Image('/henry/henry.png');
  for (let frame = 0; frame < 2; frame++) {
    ctx.drawImage(stale, 1, 2); ctx.drawImage(background, ...args); ctx.drawImage(actor, frame, 4);
    expect(f.calls(ctx.canvas)).toEqual([{ source, args: [...args] }, { source: actor.src, args: [frame, 4] }]);
  }
  expect(f.forwarded).toHaveLength(6);
});
it.each([[47, 48, 96], [48, 47, 96], [48, 48, 48]] as const)('does not broaden environment resets for %s/%s/%s', (sx, sy, width) => {
  const f = fixture(), ctx = f.createGame(), old = new f.Image('/old.png'), image = new f.Image('/environment.png');
  ctx.drawImage(old, 1, 2); ctx.drawImage(image, sx, sy, 48, 48, 0, 0, width, 96);
  expect(f.calls(ctx.canvas)).toHaveLength(2);
  expect(f.calls(ctx.canvas)[0]).toEqual({ source: old.src, args: [1, 2] });
});
it('forwards offscreen transparent readback and non-image canvas sources on every receiver', () => {
  const f = fixture(), game = f.createGame(), readback = new f.Context(new f.Canvas('readback')), transparent = new f.Image('/scenery/foreground.png', 0), bitmap = new f.Canvas();
  readback.drawImage(transparent, 0, 0);
  expect(readback.getImageData().data[3]).toBe(0);
  game.drawImage(bitmap, 5, 6); readback.drawImage(bitmap, 1, 2, 3, 4);
  expect(f.forwarded.map(call => ({ receiver: call.receiver, args: call.args }))).toEqual([
    { receiver: readback, args: [transparent, 0, 0] }, { receiver: game, args: [bitmap, 5, 6] }, { receiver: readback, args: [bitmap, 1, 2, 3, 4] },
  ]);
  expect(f.calls(game.canvas)).toEqual([]); expect(f.hasDataset(readback.canvas)).toBe(false);
  expect(() => readback.drawImage(new f.Image('/broken.png', 0, true), 0, 0)).toThrow('original draw failure');
});
it('starts fresh across navigation realms and keeps Quarry backdrop records free of Plains scenery', () => {
  const plains = fixture(), first = plains.createGame(); first.drawImage(new plains.Image('/scenery/background.webp'), 0, 0);
  const quarry = fixture(); expect(quarry.document.getElementById('game')).toBeNull();
  const game = quarry.createGame(); game.drawImage(new quarry.Image('/trails/backdrops.webp'), 0, 0); game.drawImage(new quarry.Image('/henry/henry.png'), 0, 0);
  expect(quarry.calls(game.canvas)).toEqual([{ source: '/trails/backdrops.webp', args: [0, 0] }, { source: '/henry/henry.png', args: [0, 0] }]);
  expect(plains.calls(first.canvas)).toEqual([{ source: '/scenery/background.webp', args: [0, 0] }]);
});
