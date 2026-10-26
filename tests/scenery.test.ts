import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { foregroundPlacements, validateScenery, type SceneryManifest } from '../src/world/scenery';
import { TRAIL_WORDS } from '../src/game/education';
import { surfaceY } from '../src/game/movement';
import { PLAINS_LEVEL } from '../src/world/level';
import { QUARRY_RUN } from '../src/world/levels';

const manifest = (): SceneryManifest => JSON.parse(readFileSync(new URL('../public/assets/plains/scenery/manifest.json', import.meta.url), 'utf8'));

it('rejects missing sprites and out-of-sheet crops before rendering', () => {
  expect(() => validateScenery(manifest())).not.toThrow();
  const invalid = manifest();
  invalid.foreground.sprites['oak-round'].source.x = 1536;
  expect(() => validateScenery(invalid)).toThrow(/bounds/);
  const missing = manifest();
  delete (missing.foreground.sprites as Partial<typeof missing.foreground.sprites>).daisies;
  expect(() => validateScenery(missing)).toThrow(/Missing scenery sprite/);
});

it('keeps sparse foreground plants grounded on flats and gentle slopes and clear of every gameplay interaction', () => {
  const plants = foregroundPlacements(PLAINS_LEVEL);
  expect(plants.map(p => p.x)).toEqual([800, 3340, 3950, 4140]);
  for (const plant of plants) for (const letter of TRAIL_WORDS[0].pickups) {
    expect(Math.abs(plant.x - letter.x)).toBeGreaterThanOrEqual(60);
  }
  for (const plant of plants) {
    const surface = PLAINS_LEVEL.surfaces.find((s) => s.x1 <= plant.x && s.x2 >= plant.x)!;
    expect(Math.abs(surface.y2 - surface.y1) / (surface.x2 - surface.x1)).toBeLessThanOrEqual(0.1);
    expect(plant.y).toBe(surfaceY(PLAINS_LEVEL, plant.x) + 5);
    for (const entity of PLAINS_LEVEL.entities.filter((e) => e.kind !== 'decoration')) {
      expect(Math.abs(entity.x - plant.x)).toBeGreaterThanOrEqual(60);
    }
    expect(Math.abs(plant.x - PLAINS_LEVEL.start.x)).toBeGreaterThanOrEqual(60);
    expect(Math.abs(plant.x - PLAINS_LEVEL.finish.x)).toBeGreaterThanOrEqual(80);
  }
  expect(foregroundPlacements(QUARRY_RUN)).toEqual([]);
});
