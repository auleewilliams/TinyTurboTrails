import { createRequire as plainsRequire } from 'node:module';
const { beforePlainsContour } = plainsRequire(import.meta.url)('../scripts/plains-contour-preservation.mjs') as { beforePlainsContour(path: string, bytes: Buffer): Buffer };
import { createRequire as wholeRequire } from 'node:module';
const {beforeWholeBay2Level}=wholeRequire(import.meta.url)('../scripts/whole-bay2-preservation.mjs') as {beforeWholeBay2Level<T>(value:T):T};
const {beforeWholeThree}=wholeRequire(import.meta.url)('../scripts/whole-three-preservation.mjs') as {beforeWholeThree(path:string,bytes:Buffer):Buffer};
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
const { decodePng } = createRequire(import.meta.url)('../scripts/spelling-stickers.mjs') as {
  decodePng(bytes: Uint8Array): { width: number; height: number; data: Uint8Array };
};
const { beforeWaterLanding } = createRequire(import.meta.url)('../scripts/water-landing-preservation.mjs') as {
  beforeWaterLanding(path: string, bytes: Buffer): Buffer;
};
const { beforeOwnerHud } = createRequire(import.meta.url)('../scripts/hud-owner-preservation.mjs') as { beforeOwnerHud(path: string, bytes: Buffer): Buffer };
import { SANDY_COVE } from '../src/world/sandy-cove';
import { surfaceAt, surfaceY } from '../src/game/movement';
import { drawAsset } from '../src/world/renderer';
import type { WorldAssets, WorldAsset } from '../src/world/assets';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read('public/assets/cove/manifest.json').toString());
const atlas = decodePng(read('public/assets/cove/environment.png'));
const baseline = JSON.parse(read('assets/source/cove/terrain-kit/geometry-pin.json').toString());

/** Broad opaque base, not the lowest stray pixel. Restrict to the bottom six rows,
 * then take the lowest row with >=12 opaque columns and >=half the widest base row. */
function base(asset: string) {
  const index = manifest.assets[asset], sx = index % 4 * 48, sy = Math.floor(index / 4) * 48;
  const rows = Array.from({ length: 48 }, (_, y) => ({ y, xs: Array.from({ length: 48 }, (_, x) => x)
    .filter(x => atlas.data[((sy + y) * atlas.width + sx + x) * 4 + 3] >= 128) }));
  const bottom = [...rows].reverse().find(r => r.xs.length)!.y, band = rows.slice(Math.max(0, bottom - 5), bottom + 1);
  const width = Math.max(...band.map(r => r.xs.length));
  return [...band].reverse().find(r => r.xs.length >= 12 && r.xs.length >= width / 2)!;
}
function renderedBase(asset: string, x: number, y: number, scale = 1) {
  const calls: number[][] = [];
  drawAsset({ drawImage(_image: unknown, ...args: number[]) { calls.push(args); } } as unknown as CanvasRenderingContext2D,
    { atlas, manifest } as unknown as WorldAssets, asset as WorldAsset, x, y, scale);
  const [, , , , dx, dy, dw, dh] = calls[0], row = base(asset);
  return { row, edge: dy + (row.y + 1) * dh / 48, xs: row.xs.map(column => dx + (column + .5) * dw / 48) };
}

it('grounds all nine flat-based decorations over their full substantive footprint on dry flat banks', () => {
  const decorations = SANDY_COVE.entities.filter(e => e.kind === 'decoration');
  expect(decorations.map(e => [e.id, e.asset])).toEqual(baseline.entities.filter((e: { kind: string }) => e.kind === 'decoration').map((e: { id: string; asset: string }) => [e.id, e.asset]));
  expect(decorations).toHaveLength(9);
  for (const e of decorations) {
    const contact = renderedBase(e.asset, e.x, e.y), surface = surfaceAt(SANDY_COVE, e.x);
    expect(contact.row.xs.length, e.id).toBeGreaterThanOrEqual(12);
    expect(surface.y1, `${e.id} flat surface`).toBe(surface.y2);
    expect(surface.material, e.id).not.toBe('water');
    expect(Math.min(...contact.xs) - surface.x1, `${e.id} left join margin`).toBeGreaterThanOrEqual(8);
    expect(surface.x2 - Math.max(...contact.xs), `${e.id} right join margin`).toBeGreaterThanOrEqual(8);
    for (const x of contact.xs) expect(contact.edge, `${e.id} opaque base at ${x}`).toBe(surfaceY(SANDY_COVE, x));
    for (const gem of SANDY_COVE.entities.filter(item => item.kind === 'gem')) expect(Math.abs(e.x - gem.x), `${e.id} clear of ${gem.id}`).toBeGreaterThanOrEqual(24);
    expect(e.x < 950 || e.x > 1140, `${e.id} outside hollow interaction/underpass`).toBe(true);
  }
});

it('uses actual broad opaque bases for Cove contact anchors, retaining already grounded spring and finish', () => {
  for (const asset of ['stone', 'tree', 'checkpoint', 'spring', 'finish-arch']) {
    const contact = renderedBase(asset, 100, 200, asset === 'finish-arch' ? 2 : 1);
    expect(contact.edge, `${asset} broad base contact`).toBe(200);
  }
  const hm = JSON.parse(read('public/assets/henry/manifest.json').toString()), henry = decodePng(read(`public/assets/henry/${hm.image}`));
  for (const index of [...hm.animations.idle.frames, ...hm.animations.run.frames]) {
    const frame = hm.frames[index];
    const feet = Array.from({ length: 48 }, (_, x) => x).filter(x => henry.data[((frame.y + hm.anchor.y - 1) * henry.width + frame.x + x) * 4 + 3] >= 128);
    expect(feet.length, `Henry grounded frame ${index}`).toBeGreaterThanOrEqual(4);
  }
  const kit = JSON.parse(read('public/assets/cove/terrain-kit/manifest.json').toString()), image = decodePng(read('public/assets/cove/terrain-kit/atlas.png'));
  for (const [name, p] of Object.entries(kit.platforms) as [string, { x: number; y: number; width: number }][]) {
    for (let x = 0; x < p.width; x++) expect(image.data[(p.y * image.width + p.x + x) * 4 + 3], `${name} visible collision top`).toBe(255);
  }
});

it('pins every gameplay field and all non-placement decoration data to the original projection', () => {
  const projection = (value: typeof SANDY_COVE) => ({ ...value, entities: value.entities.map(e => {
    if (e.kind !== 'decoration') return e;
    const { x: _x, y: _y, ...fixed } = e; return fixed;
  }) });
  expect(projection(beforeWholeBay2Level(SANDY_COVE))).toEqual(projection(baseline));
  const pins = JSON.parse(read('assets/source/cove/terrain-kit/preserved-files.json').toString());
  for (const pin of pins.files) if (!['src/world/sandy-cove.ts', 'public/assets/cove/manifest.json'].includes(pin.path)) {
    expect(createHash('sha256').update(beforeWaterLanding(pin.path, beforeOwnerHud(pin.path, beforeWholeThree(pin.path, beforePlainsContour(pin.path, read(pin.path)))))).digest('hex'), pin.path).toBe(pin.sha256);
  }
  const original = structuredClone(pins.coveManifestBefore); original.terrainKit = 'terrain-kit/manifest.json'; original.surfaceKit = 'materials/manifest.json';
  const visual = structuredClone(manifest);
  for (const asset of ['stone', 'tree', 'checkpoint']) visual.anchors[asset].y = original.anchors[asset].y;
  expect(visual).toEqual(original);
});


it('rejects extra source bytes and player-position mutations outside exact approved landing presentation deltas', () => {
  const pins = JSON.parse(read('assets/source/cove/terrain-kit/preserved-files.json').toString());
  for (const path of ['src/game/adventure-scene.ts', 'src/game/gameplay-preview.ts', 'src/game/feedback.ts']) {
    const bytes = read(path), pin = pins.files.find((entry: { path: string }) => entry.path === path);
    expect(createHash('sha256').update(beforeWaterLanding(path, beforeOwnerHud(path, bytes))).digest('hex'), path).toBe(pin.sha256);
    const positionEdit = Buffer.from(bytes.toString().replace('player.x', 'player.x + 1'));
    expect(positionEdit.equals(bytes), `${path} negative control changes input`).toBe(false);
    for (const bad of [Buffer.concat([bytes, Buffer.from('\n// unrelated extra source\n')]), positionEdit]) {
      expect(() => beforeWaterLanding(path, beforeOwnerHud(path, bad)), path).toThrow();
    }
  }
});
