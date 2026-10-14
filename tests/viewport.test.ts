import { expect, it } from 'vitest';
import { fitGameViewport, fitViewport } from '../src/core/viewport';

const controls = { width: 114, height: 36 };

it('uses the maximum uniform fit, including fractional desktop scales', () => {
  expect(fitViewport(1366, 768)).toEqual({ width: 1363.2, height: 768 });
  expect(fitViewport(852, 700)).toEqual({ width: 852, height: 480 });
});
it('fits smaller windows while keeping the logical aspect ratio', () => {
  const size = fitViewport(300, 200);
  expect(size.width).toBe(300);
  expect(size.height).toBeCloseTo(169.0140845);
});

it('reuses vertical margins, shifting only enough to leave controls clear', () => {
  const portrait = fitGameViewport(390, 844, controls);
  expect(portrait.width).toBe(390);
  expect(portrait.top).toBeCloseTo((844 - portrait.height) / 2);
  const small = fitGameViewport(320, 240, controls);
  expect(small.width).toBe(320);
  expect(small.top + small.height).toBeCloseTo(196);
});

it('reuses horizontal margins without reserving a footer', () => {
  const wide = fitGameViewport(2560, 1080, controls);
  expect(wide).toEqual({ width: 1917, height: 1080, left: 321.5, top: 0 });
  const narrowMargin = fitGameViewport(2048, 1080, controls);
  expect(narrowMargin.height).toBe(1080);
  expect(narrowMargin.left).toBe(1);
});

it('reserves only the measured control rail when no margin can hold it', () => {
  const size = fitGameViewport(1280, 720, controls);
  expect(size.height).toBe(676);
  expect(size.width).toBeCloseTo(1199.9);
  expect(size.top).toBe(0);
  expect(fitGameViewport(1280, 720, { ...controls, height: 48 }).height).toBe(664);
});

it('chooses a side rail when it retains more game area near a wide-window threshold', () => {
  const size = fitGameViewport(2040, 1080, controls);
  expect(size.width).toBe(1910);
  expect(size.height).toBeCloseTo(1910 * 240 / 426);
  expect(size.left).toBe(0);
  expect(size.height).toBeGreaterThan(1080 - 44);
});

it.each([[2048, 1178], [1920, 1080], [1366, 768], [1280, 720], [1024, 768],
  [2560, 1080], [2040, 1080], [852, 480], [426, 240], [320, 240], [390, 844]])
('keeps the full camera and controls disjoint inside %ix%i', (width, height) => {
  const size = fitGameViewport(width, height, controls);
  expect(size.width / size.height).toBeCloseTo(426 / 240);
  expect(size.left).toBeGreaterThanOrEqual(0);
  expect(size.top).toBeGreaterThanOrEqual(0);
  expect(size.left + size.width).toBeLessThanOrEqual(width + 1e-9);
  expect(size.top + size.height).toBeLessThanOrEqual(height + 1e-9);
  const clearBelow = size.top + size.height <= height - controls.height - 8 + 1e-9;
  const clearBeside = size.left + size.width <= width - controls.width - 16 + 1e-9;
  expect(clearBelow || clearBeside).toBe(true);
  // One limiting edge is used fully: there is no integer-scale slack.
  expect(Math.min(Math.abs(width - size.width), Math.abs(height - size.height),
    Math.abs(height - 44 - size.height), Math.abs(width - 130 - size.width))).toBeLessThan(1e-9);
});
