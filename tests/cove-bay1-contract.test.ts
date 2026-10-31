import { expect, it } from 'vitest';
import nativeConfig from '../playwright.config';
import { Camera } from '../src/world/camera';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { pilotSourceRevision } from './cove-bay1-provenance';

it('retains truthful local unset/null provenance', () => {
  expect(pilotSourceRevision(undefined, { sourceRevision: null })).toBeNull();
});

it('retains a supplied CI revision exactly, tied to native report metadata', () => {
  // Pure function fixture; never writes the actual process environment or claims a checkout.
  const fixtureSha = '0123456789abcdef0123456789abcdef01234567';
  expect(pilotSourceRevision(fixtureSha, { sourceRevision: fixtureSha })).toBe(fixtureSha);
});

it('rejects absent, conflicting or malformed source identities instead of relabeling them', () => {
  const fixtureSha = '0123456789abcdef0123456789abcdef01234567';
  for (const [supplied, metadata] of [
    [undefined, {}], [undefined, { sourceRevision: fixtureSha }],
    [fixtureSha, { sourceRevision: null }], [fixtureSha, { sourceRevision: 'f'.repeat(40) }],
    ['', { sourceRevision: '' }], ['not-a-checkout', { sourceRevision: 'not-a-checkout' }],
  ] as const) expect(() => pilotSourceRevision(supplied, metadata)).toThrow();
});

it('matches actual native config metadata without setting or replacing its source', () => {
  expect(pilotSourceRevision(process.env.BROWSER_REPORT_SOURCE_SHA, nativeConfig.metadata!))
    .toBe(nativeConfig.metadata!.sourceRevision);
});

it('projects Cove world support tops into the cached initial preview camera', () => {
  const level = SANDY_COVE;
  const camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height,
    vertical: level.verticalCamera || level.progressAxis === 'y', lead: level.cameraLead });
  camera.update(level.start.x, level.start.y - 34);
  // Independently: body top360−34=326; vertical bottom dead-zone104 gives222,
  // below world max offset480−240=240. X60 clamps the left preview offset to0.
  expect(camera.position).toEqual({ x: 0, y: Math.min(480 - 240, 360 - 34 - 104) });
  expect(level.platforms!.map(p => ({ x: p.from.x - camera.position.x, y: p.from.y - camera.position.y, width: p.width })))
    .toEqual([
      { x: 980, y: 75, width: 140 }, { x: 1700, y: 61, width: 100 },
      { x: 2230, y: 63, width: 90 }, { x: 2380, y: 62, width: 90 },
      { x: 2960, y: 50, width: 140 }, { x: 3140, y: 38, width: 160 },
      { x: 3340, y: 50, width: 180 },
    ]);
});
