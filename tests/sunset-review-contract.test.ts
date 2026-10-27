import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('retains a nonvacuous ribbon-band renderer witness after retiring the old valley', () => {
  const source = readFileSync(new URL('./browser.spec.ts', import.meta.url), 'utf8');
  expect(source).toContain("expect(bandHenry.bottom).toBeGreaterThan(TRAIL_RIBBON.y)");
  expect(source).toContain("expect(bandHenry.top).toBeLessThan(TRAIL_RIBBON.y + TRAIL_RIBBON.height)");
  expect(source).toContain("expect(bandHenry.right).toBeLessThanOrEqual(TRAIL_RIBBON.x)");
});
