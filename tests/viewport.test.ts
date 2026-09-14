import { expect, it } from 'vitest';
import { fitViewport } from '../src/core/viewport';

it('uses whole pixels at desktop sizes without stretching', () => {
  expect(fitViewport(1366, 768)).toEqual({ width: 1278, height: 720 });
  expect(fitViewport(852, 700)).toEqual({ width: 852, height: 480 });
});
it('fits smaller windows while keeping the logical aspect ratio', () => {
  const size = fitViewport(300, 200);
  expect(size.width).toBe(300);
  expect(size.height).toBeCloseTo(169.0140845);
});
