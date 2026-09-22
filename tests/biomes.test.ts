import { expect, it } from 'vitest';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { surfaceAt, surfaceY } from '../src/game/movement';
import { validateLevel } from '../src/world/level';

it.each([FROST_RIDGE, SANDY_COVE])('authors a valid forgiving route for $name', (level) => {
  expect(() => validateLevel(level)).not.toThrow();
  expect(level.checkpoints).toHaveLength(6);
  expect(level.entities.filter((e) => e.kind === 'gem').length).toBeGreaterThanOrEqual(30);
  expect(level.entities.filter((e) => e.kind === 'spring').length).toBeGreaterThanOrEqual(6);
  expect(level.surfaces.every((s) => Math.max(s.y1, s.y2) <= 240)).toBe(true);
  expect(level.surfaces.every((s) => Math.abs(s.y2 - s.y1) / (s.x2 - s.x1) <= 0.5)).toBe(true);
  const dangers = level.entities.filter((e) => e.kind === 'slime' || e.kind === 'hazard');
  for (const checkpoint of level.checkpoints) {
    expect(checkpoint.y).toBe(surfaceY(level, checkpoint.x));
    expect(surfaceAt(level, checkpoint.x).material).toBeUndefined();
    expect(dangers.every((e) => Math.abs(e.x - checkpoint.x) >= 120)).toBe(true);
    expect(level.entities.filter((e) => e.kind === 'spring').every((e) => Math.abs(e.x - checkpoint.x) >= 120)).toBe(true);
  }
});

it('keeps ice on safe flats with ordinary runouts before hazards', () => {
  const ice = FROST_RIDGE.surfaces.filter((s) => s.material === 'ice');
  expect(ice.length).toBeGreaterThanOrEqual(6);
  for (const patch of ice) {
    expect(patch.y1).toBe(patch.y2);
    const runout = FROST_RIDGE.surfaces[FROST_RIDGE.surfaces.indexOf(patch) + 1];
    expect(runout.material).toBeUndefined();
    expect(runout.y1).toBe(runout.y2);
    expect(runout.x2 - runout.x1).toBeGreaterThanOrEqual(240);
    expect(FROST_RIDGE.entities.filter((e) => e.kind === 'slime' || e.kind === 'hazard')
      .every((e) => e.x < patch.x1 - 120 || e.x > patch.x2 + 240)).toBe(true);
  }
});

it('keeps Cove shallow water harmless and slimes on firm ground', () => {
  const patches = SANDY_COVE.surfaces.filter((s) => s.material);
  expect(patches.some((s) => s.material === 'sand')).toBe(true);
  expect(patches.some((s) => s.material === 'water')).toBe(true);
  expect(patches.every((s) => s.y1 === s.y2)).toBe(true);
  const slimes = SANDY_COVE.entities.filter((e) => e.kind === 'slime');
  expect(slimes.length).toBeGreaterThanOrEqual(3);
  for (const slime of slimes) {
    expect(slime.bounce).toBeUndefined();
    expect(slime.patrol).toBeDefined();
    expect(surfaceAt(SANDY_COVE, slime.x).material).toBeUndefined();
    expect(patches.every((s) => slime.x < s.x1 - 120 || slime.x > s.x2 + 120)).toBe(true);
  }
  expect(SANDY_COVE.entities.filter((e) => e.kind === 'hazard')).toHaveLength(0);
});

it.each(['frost', 'cove'])('ships a complete %s atlas with grounded anchors', async (biome) => {
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync(`public/assets/${biome}/manifest.json`, 'utf8'));
  expect(manifest.cellSize).toBe(48);
  expect(Object.values(manifest.assets).sort((a, b) => Number(a) - Number(b))).toEqual(Array.from({ length: 16 }, (_, i) => i));
  const png = readFileSync(`public/assets/${biome}/${manifest.image}`);
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([192, 192]);
  expect(png[25]).toBe(6);
  for (const kind of ['stone', 'slime', 'spring', 'tree', 'checkpoint']) {
    expect(manifest.anchors[kind].y).toBe(44);
  }
});
