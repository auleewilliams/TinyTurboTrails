import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { drawWorld } from '../src/world/renderer';
import { PLAINS_LEVEL } from '../src/world/level';
import type { WorldAssets } from '../src/world/assets';

it('uses the prepared Plains image through the actual world renderer, with a bounded cached ribbon', () => {
  const image = { naturalWidth: 80, naturalHeight: 16 };
  const kit: { image: typeof image; ribbon?: { canvas: unknown } } = { image };
  const calls: unknown[][] = [];
  const ctx = new Proxy({ imageSmoothingEnabled: false, drawImage: (...args: unknown[]) => calls.push(args) }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
    set: (target, key, value) => { Reflect.set(target, key, value); return true; },
  });
  const offscreen = { width: 0, height: 0, getContext: () => ctx };
  vi.stubGlobal('document', { createElement: () => offscreen });
  try {
    const manifest = JSON.parse(readFileSync(new URL('../public/assets/plains/manifest.json', import.meta.url), 'utf8'));
    const assets = { atlas: {}, gems: {}, manifest, plainsContour: kit } as unknown as WorldAssets;
    drawWorld(ctx as unknown as CanvasRenderingContext2D, assets, PLAINS_LEVEL, { position: { x: 600.25, y: 0 } } as never, () => false);
    expect(kit.ribbon).toBeDefined();
    expect(calls.some(call => call[0] === offscreen)).toBe(true);
    expect(offscreen.width).toBe(480);
    expect(calls.filter(call => call[0] === image)).toHaveLength(480);
  } finally { vi.unstubAllGlobals(); }
});

// Software nearest-image contract test, not a claim of a browser raster run.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { drawPlainsContourGround, plainsContourColumns, plainsContourRange } from '../src/world/plains-contour';
import { drawTerrainEdge } from '../src/world/trail-presentation';
import { surfaceY } from '../src/game/movement';
import { QUARRY_RUN } from '../src/world/levels';
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
  decodePng(bytes: Uint8Array): { width: number; height: number; data: Uint8Array };
};
const bytes = readFileSync(new URL('../public/assets/plains/contour-prototype-v1/grass.png', import.meta.url));
const decoded = decodePng(bytes);

class SoftwareCanvas {
  width = 0;
  height = 0;
  pixels = new Map<string, number[]>();
  draws: unknown[][] = [];
  imageSmoothingEnabled = true;
  globalAlpha = 0.7;
  stack: { smoothing: boolean; alpha: number }[] = [];
  getContext() { return this; }
  save() { this.stack.push({ smoothing: this.imageSmoothingEnabled, alpha: this.globalAlpha }); }
  restore() { const v = this.stack.pop()!; this.imageSmoothingEnabled = v.smoothing; this.globalAlpha = v.alpha; }
  drawImage(image: unknown, ...args: number[]) {
    this.draws.push([image, ...args]);
    if (args.length === 8) {
      const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      expect([sw, sh, dw, dh]).toEqual([1, 16, 1, 16]);
      for (let y = 0; y < 16; y++) {
        const pos = ((sy + y) * decoded.width + sx) * 4;
        this.pixels.set(`${dx},${dy + y}`, Array.from(decoded.data.slice(pos, pos + 4)));
      }
    } else {
      const [dx, dy] = args;
      const ribbon = image as SoftwareCanvas;
      for (let x = 0; x < this.width; x++) for (let y = 0; y < this.height; y++) {
        const sx = Math.floor(x + 0.5 - dx), sy = Math.floor(y + 0.5 - dy);
        const rgba = ribbon.pixels.get(`${sx},${sy}`);
        if (rgba) this.pixels.set(`${x},${y}`, rgba);
      }
    }
  }
}

it('maps every authored join column once, with the right segment owning the join and whole native grain', () => {
  const columns = plainsContourColumns(PLAINS_LEVEL);
  expect(plainsContourRange(PLAINS_LEVEL)).toEqual({ from: 580, to: 1060 });
  expect(columns).toHaveLength(480);
  expect(new Set(columns.map(c => c.x)).size).toBe(480);
  for (const column of columns) {
    const surface = PLAINS_LEVEL.surfaces[column.surfaceIndex];
    expect(column.x).toBeGreaterThanOrEqual(surface.x1);
    expect(column.x).toBeLessThan(surface.x2);
    expect(column.contactY).toBeCloseTo(surfaceY(PLAINS_LEVEL, column.x + 0.5), 10);
    expect(Math.abs(column.pixelContactY - column.contactY)).toBeLessThanOrEqual(0.5);
    expect(column.sourceX).toBe(20 + (column.x - 580) % 40);
  }
  for (const join of [620, 660, 700, 760, 820, 880, 940, 980, 1020]) {
    const left = columns.find(c => c.x === join - 1)!;
    const right = columns.find(c => c.x === join)!;
    expect(PLAINS_LEVEL.surfaces[left.surfaceIndex].x2).toBe(join);
    expect(PLAINS_LEVEL.surfaces[right.surfaceIndex].x1).toBe(join);
  }
});

it('retains exact source pixels/depth, one bitmap across fractional offsets, cache and canvas state', () => {
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654');
  const image = { naturalWidth: 80, naturalHeight: 16 };
  const kit = { image };
  const created: SoftwareCanvas[] = [];
  vi.stubGlobal('document', { createElement: () => { const canvas = new SoftwareCanvas(); created.push(canvas); return canvas; } });
  try {
    const assets = { plainsContour: kit } as unknown as WorldAssets;
    for (const cameraX of [580, 600.25, 659.5, 760.75, 880.25, 600.25]) {
      const target = new SoftwareCanvas(); target.width = 426; target.height = 240;
      expect(drawPlainsContourGround(target as unknown as CanvasRenderingContext2D, assets, PLAINS_LEVEL, { x: cameraX, y: 0 })).toBe(true);
      expect(target.imageSmoothingEnabled).toBe(true);
      expect(target.globalAlpha).toBe(0.7);
      expect(target.stack).toHaveLength(0);
      expect(target.draws).toHaveLength(1);
      for (let screenX = 0; screenX < 426; screenX++) {
        const worldX = 580 + Math.floor(screenX + 0.5 - (580 - cameraX));
        if (worldX < 580 || worldX >= 1060) continue;
        const column = plainsContourColumns(PLAINS_LEVEL)[worldX - 580];
        for (let depth = 0; depth < 8; depth++) {
          const y = column.pixelContactY + depth;
          const expectedAt = ((depth + 2) * 80 + column.sourceX) * 4;
          expect(target.pixels.get(`${screenX},${y}`)).toEqual(Array.from(decoded.data.slice(expectedAt, expectedAt + 4)));
          expect(target.pixels.get(`${screenX},${y}`)![3]).toBe(255);
        }
      }
    }
    expect(created).toHaveLength(1);
    expect(created[0].draws).toHaveLength(480);
  } finally { vi.unstubAllGlobals(); }
});

it('isolates Plains and legacy kits and clips the old edge out of the whole replacement region', () => {
  expect(plainsContourColumns(QUARRY_RUN)).toEqual([]);
  const target = new SoftwareCanvas();
  expect(drawPlainsContourGround(target as unknown as CanvasRenderingContext2D, {} as WorldAssets, PLAINS_LEVEL, { x: 0, y: 0 })).toBe(false);
  expect(drawPlainsContourGround(target as unknown as CanvasRenderingContext2D, { plainsContour: {} } as WorldAssets, QUARRY_RUN, { x: 0, y: 0 })).toBe(false);
  expect(target.draws).toHaveLength(0);
  const rects: number[][] = []; const events: string[] = [];
  const ctx = new Proxy({ save: () => events.push('save'), restore: () => events.push('restore'),
    beginPath() {}, rect: (...args: number[]) => rects.push(args), clip: () => events.push('clip') }, {
    get: (o, k) => k in o ? Reflect.get(o, k) : () => {}, set: (o, k, v) => Reflect.set(o, k, v),
  });
  drawTerrainEdge(ctx as unknown as CanvasRenderingContext2D, PLAINS_LEVEL, { x: 600.25, y: 0 }, { from: 580, to: 1060 });
  expect(rects).toEqual([[-10000, -10000, 9979.75, 20000], [459.75, -10000, 10000, 20000]]);
  expect(events).toEqual(['save', 'clip', 'restore']);
});
