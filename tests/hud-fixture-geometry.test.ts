import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Camera } from '../src/world/camera';
import { LEVELS } from '../src/world/levels';
import { surfaceY } from '../src/game/movement';
import { TRAIL_RIBBON } from '../src/game/hud';
import { hudFixtureRectanglesOverlap, type HudFixtureRect } from './hud-fixture-geometry';

const source = readFileSync(new URL('./browser.spec.ts', import.meta.url), 'utf8');
const fixture = source.slice(source.indexOf('for (const level of LEVELS) test(`compact HUD renderer fixture:'));
// Execute the native caller's actual assertion without importing its browser harness.
const assertion = [...fixture.matchAll(/^      expect\(.*sample\.henryRect.*\);$/gm)].at(-1)![0];
const assertClear = (henryRect: HudFixtureRect): void => {
  new Function('sample', 'TRAIL_RIBBON', 'hudFixtureRectanglesOverlap', 'expect', assertion)(
    { henryRect }, TRAIL_RIBBON, hudFixtureRectanglesOverlap, expect);
};

it.each(LEVELS)('$id normal renderer pose clears the actual ribbon in two dimensions', level => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/henry/manifest.json', import.meta.url), 'utf8'));
  // Run the actual fixture placement statements with the real camera, level and anchor.
  const placement = fixture.slice(fixture.indexOf('const camera = new Camera('), fixture.indexOf('        if (ribbonBandPose)'))
    .replace(/^        drawWorld\(.*\);\n/m, '');
  const rect = new Function('Camera', 'level', 'surfaceY', 'manifest', `${placement}\nreturn henryRect;`)(
    Camera, level, surfaceY, manifest) as HudFixtureRect;
  expect(rect.y).toBeGreaterThan(59);
  if (level.id === 'quarry') {
    expect(rect.x + rect.width).toBe(274);
    expect(rect.x).toBeLessThan(TRAIL_RIBBON.x + TRAIL_RIBBON.width);
    expect(rect.x + rect.width).toBeGreaterThan(TRAIL_RIBBON.x);
  }
  assertClear(rect);
});

it('native normal-pose oracle accepts vertical-only and horizontal-only separation on every side', () => {
  const r = TRAIL_RIBBON;
  for (const rect of [
    { x: r.x, y: r.y - 49, width: 48, height: 48 },
    { x: r.x, y: r.y + r.height + 1, width: 48, height: 48 },
    { x: r.x - 49, y: r.y, width: 48, height: 48 },
    { x: r.x + r.width + 1, y: r.y, width: 48, height: 48 },
  ]) assertClear(rect);
});

it('native normal-pose oracle rejects actual intersections including subpixel penetration', () => {
  const r = TRAIL_RIBBON;
  for (const rect of [
    { x: r.x, y: r.y, width: 48, height: 48 },
    { x: r.x - 48 + 0.001, y: r.y, width: 48, height: 48 },
    { x: r.x, y: r.y - 48 + 0.001, width: 48, height: 48 },
    { x: r.x + r.width - 0.001, y: r.y, width: 48, height: 48 },
    { x: r.x, y: r.y + r.height - 0.001, width: 48, height: 48 },
  ]) expect(() => assertClear(rect)).toThrow();
});

it('retains the nonvacuous band witness and all three native assertions', () => {
  expect(fixture).toContain('henryRect.y = TRAIL_RIBBON.railY - 24;');
  for (const line of [
    'expect(bandHenry.bottom).toBeGreaterThan(TRAIL_RIBBON.y);',
    'expect(bandHenry.top).toBeLessThan(TRAIL_RIBBON.y + TRAIL_RIBBON.height);',
    'expect(bandHenry.right).toBeLessThanOrEqual(TRAIL_RIBBON.x);',
  ]) expect(fixture).toContain(line);
});
