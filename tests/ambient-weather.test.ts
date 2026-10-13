import { expect, it, vi } from 'vitest';
import { drawAmbientWeather } from '../src/world/ambient-weather';
import { LEVELS } from '../src/world/levels';

const affected = LEVELS.filter(level => level.theme.weather);

function sample(weather: Parameters<typeof drawAmbientWeather>[1], seconds: number,
  offset = { x: 0, y: 0 }, reduced = false): number[][] {
  const rects: number[][] = [];
  const ctx = { save() {}, restore() {}, fillRect: (...rect: number[]) => rects.push(rect) };
  drawAmbientWeather(ctx as unknown as CanvasRenderingContext2D, weather, offset, seconds, reduced);
  return rects;
}

it('declares only the four ambient trails, leaving Plains and Sunset clear', () => {
  expect(affected.map(level => [level.id, level.theme.weather?.kind])).toEqual([
    ['quarry', 'dust'], ['timbers', 'leaves'], ['frost', 'snow'], ['cove', 'spray'],
  ]);
  expect(sample(undefined, 20)).toEqual([]);
});

it.each(affected)('samples $name deterministically regardless of intervening renders', level => {
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('weather must not use randomness'); });
  try {
    const first = sample(level.theme.weather, 37.5, { x: 5500.25, y: 12.75 });
    expect(first.length).toBeGreaterThan(0);
    expect(sample(level.theme.weather, 38.5, { x: 5500.25, y: 12.75 })).not.toEqual(first);
    expect(sample(level.theme.weather, 37.5, { x: 5600.25, y: 12.75 })).not.toEqual(first);
    sample(level.theme.weather, 9999, { x: 0, y: 0 });
    expect(sample(level.theme.weather, 37.5, { x: 5500.25, y: 12.75 })).toEqual(first);
    expect(random).not.toHaveBeenCalled();
  } finally { random.mockRestore(); }
});

it.each(affected)('bounds $name work and keeps particles out of the HUD band', level => {
  for (const seconds of [-1000, 0, 0.25, 60, 1000000]) {
    for (const x of [-100, 0, 0.25, 5500, 1000000]) {
      const rects = sample(level.theme.weather, seconds, { x, y: 24.5 });
      expect(rects.length).toBeLessThanOrEqual(level.theme.weather!.count * 2);
      for (const [px, py, width, height] of rects) {
        expect(Number.isInteger(px) && Number.isInteger(py)).toBe(true);
        expect(px).toBeGreaterThanOrEqual(0); expect(px + width).toBeLessThanOrEqual(426);
        expect(py).toBeGreaterThanOrEqual(40); expect(py + height).toBeLessThanOrEqual(240);
      }
    }
  }
  expect(sample({ ...level.theme.weather!, count: 1000000 }, 10).length).toBeLessThanOrEqual(64);
  expect(sample({ ...level.theme.weather!, count: 0 }, 10)).toEqual([]);
  expect(sample({ ...level.theme.weather!, count: -1 }, 10)).toEqual([]);
});

it.each(affected)('disables $name weather for reduced motion at every moment', level => {
  expect(sample(level.theme.weather, 0, { x: 0, y: 0 }, true)).toEqual([]);
  expect(sample(level.theme.weather, 200, { x: 5500, y: 0 }, true)).toEqual([]);
});
