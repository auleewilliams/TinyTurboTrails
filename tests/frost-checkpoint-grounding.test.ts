import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, inflateSync } from 'node:zlib';
import { drawWorld } from '../src/world/renderer';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { Camera } from '../src/world/camera';
import { surfaceY } from '../src/game/movement';
import type { WorldAssets } from '../src/world/assets';

// Audited inert PNG codec: only node:zlib imports, no preparation/CLI entry.
const codec = readFileSync(new URL('../scripts/spelling-stickers.mjs', import.meta.url), 'utf8');
const decode = new Function('crc32', 'inflateSync', codec.replace(/^import .*;\n/gm, '').replace(/\bexport /g, '') + '\nreturn decodePng;')(crc32, inflateSync) as (b: Buffer) => { width: number; height: number; data: Uint8Array };
const read = (path: string): Buffer => readFileSync(new URL('../public/assets/' + path, import.meta.url));
const metadata = (path: string) => JSON.parse(read(path).toString());
const atlas = decode(read('frost/environment.png'));
const terrain = decode(read('frost/ground-ice-v1/terrain.png'));
const manifest = metadata('frost/manifest.json');
const image = (width: number, height: number): HTMLImageElement => ({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement;
const alpha = (x: number, y: number): number => atlas.data[((96 + y) * atlas.width + 144 + x) * 4 + 3];
// Broad lower snow-foot rows, excluding faint antialiasing and isolated fringe pixels.
const baseRows = Array.from({ length: 12 }, (_, i) => 36 + i).map(y => ({ y,
  xs: Array.from({ length: 48 }, (_, x) => x).filter(x => alpha(x, y) >= 128) }));
const base = baseRows.filter(row => row.xs.length >= 16).at(-1)!;
afterEach(() => vi.unstubAllGlobals());

for (const checkpoint of FROST_RIDGE.checkpoints) for (const active of [false, true]) {
  it(`grounds the substantive shipped snow foot at ${checkpoint.id}, active=${active}`, () => {
    const columns: unknown[][] = [], draws: unknown[][] = [], rects: unknown[][] = [], strokes: unknown[][] = [], points: unknown[][] = [];
    const context = (draws: unknown[][]) => new Proxy({ drawImage: (...a: unknown[]) => draws.push(a),
      fillRect: (...a: unknown[]) => rects.push(a), strokeRect: (...a: unknown[]) => strokes.push(a),
      moveTo: (...a: unknown[]) => points.push(a), lineTo: (...a: unknown[]) => points.push(a) }, { get: (t, k) => k in t ? t[k as keyof typeof t] : () => {} });
    const ribbon = { width: 0, height: 0, getContext: () => context(columns) };
    vi.stubGlobal('document', { createElement: () => ribbon });
    const assets: WorldAssets = { atlas: image(192, 192), gems: image(96, 24), manifest,
      frostGround: { manifest: metadata('frost/ground-ice-v1/manifest.json'), terrain: image(440, 440), ice: image(8, 8) } };
    const camera = new Camera({ width: 426, height: 240, worldWidth: FROST_RIDGE.width, worldHeight: FROST_RIDGE.height, vertical: true });
    camera.update(checkpoint.x + 50, checkpoint.y - 76);
    drawWorld(context(draws) as unknown as CanvasRenderingContext2D, assets, FROST_RIDGE, camera,
      e => e.kind === 'checkpoint', e => ({ ...e, checkpointActive: e.id === checkpoint.id && active }));
    const sprite = draws.find(a => a[0] === assets.atlas && a[1] === 144 && a[2] === 96 && a[5] === 183)!;
    const ground = draws.find(a => a[0] === ribbon)!;
    const snowColumn = columns.find(a => a[0] === assets.frostGround!.terrain && a[5] === checkpoint.x)!;
    const groundTop = Number(ground[2]) + Number(snowColumn[6]);
    const footBottom = Number(sprite[6]) + base.y + 1;
    const witness = { checkpoint, active, camera: camera.position, sprite: sprite.slice(1), ground: ground.slice(1),
      snowColumn: snowColumn.slice(1), baseRows, baseEdge: base.y + 1, groundTop, footBottom,
      gap: groundTop - footBottom, activeRects: rects.filter(r => r[2] === 22 && r[3] === 13),
      sourceSnowRGBA: [...terrain.data.slice(Number(snowColumn[1]) * 4, Number(snowColumn[1]) * 4 + 4)] };
    console.info('FROST_CHECKPOINT_CPU_RASTER ' + JSON.stringify(witness));
    if (process.env.FROST_CHECKPOINT_EVIDENCE) writeFileSync(`${process.env.FROST_CHECKPOINT_EVIDENCE}/${checkpoint.id}-${active ? 'active' : 'inactive'}.json`, JSON.stringify(witness, null, 2));
    expect(checkpoint.y).toBe(surfaceY(FROST_RIDGE, checkpoint.x));
    expect(base.y).toBe(40); expect(base.xs).toHaveLength(19);
    expect(sprite.slice(1, 5)).toEqual([144, 96, 48, 48]);
    expect(sprite.slice(7)).toEqual([48, 48]);
    expect(witness.sourceSnowRGBA[3]).toBe(255);
    // All substantive bottom-row texels touch the real snow column's upper edge.
    for (const x of base.xs) {
      const worldX = Number(sprite[5]) + x + camera.position.x;
      const column = columns.find(a => a[0] === assets.frostGround!.terrain && a[5] === worldX)!;
      expect(Number(ground[2]) + Number(column[6]) - footBottom, `snow-foot gap at source x=${x}`).toBe(0);
    }
    if (active) {
      expect(witness.activeRects).toContainEqual([195, Number(sprite[6]) + 6, 22, 13]);
      expect(strokes).toContainEqual([195, Number(sprite[6]) + 6, 22, 13]);
      for (const [x, y] of [[200, 12], [204, 16], [212, 9]]) expect(points).toContainEqual([x, Number(sprite[6]) + y]);
    } else expect(witness.activeRects).toEqual([]);
  });
}
