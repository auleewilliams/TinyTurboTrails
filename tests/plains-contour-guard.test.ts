import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { PLAINS_LEVEL } from '../src/world/level';

const pins: Record<string, string> = JSON.parse(readFileSync(new URL('../assets/source/plains/contour-prototype-v1/preservation-pins.json', import.meta.url), 'utf8'));
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const levelSource = readFileSync(new URL('../src/world/level.ts', import.meta.url), 'utf8');
function exactApprovedLevelDelta(source: string): boolean {
  const needle = "[772, 'bush']";
  return source.split(needle).length === 2 && hash(source.replace(needle, "[470, 'bush']")) === pins['src/world/level.ts'];
}
it('permits exactly the single decorative bush X move and no other source/level delta', () => {
  expect(exactApprovedLevelDelta(levelSource)).toBe(true);
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-002')).toMatchObject({ x: 772, y: 206, kind: 'decoration', asset: 'bush', layer: 'back' });
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-001')?.x).toBe(240);
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-008')?.x).toBe(2530);
  expect(exactApprovedLevelDelta(levelSource.replace('x: 740, y: 206', 'x: 741, y: 206'))).toBe(false);
  expect(exactApprovedLevelDelta(levelSource.replace("[240, 'flowers']", "[150, 'flowers']"))).toBe(false);
  expect(exactApprovedLevelDelta(levelSource.replace("[772, 'bush']", "[773, 'bush']"))).toBe(false);
});
it('keeps physics, camera, pickups, shared sprites and accepted Cove source pins exact', () => {
  for (const [name, expected] of Object.entries(pins)) {
    if (name === 'src/world/level.ts') continue;
    expect(hash(readFileSync(new URL(`../${name}`, import.meta.url))), name).toBe(expected);
  }
});
it('keeps public A and prepared canonical bytes identical to the approved one-pixel source', () => {
  const canonical = readFileSync(new URL('../assets/source/plains/contour-prototype-v1/prepared-master.png', import.meta.url));
  const deployed = readFileSync(new URL('../public/assets/plains/contour-prototype-v1/grass.png', import.meta.url));
  expect(deployed.equals(canonical)).toBe(true);
  expect(hash(deployed)).toBe('618ea1e53cb017b5dfdb649fb48fd47eea7cea02b4abef165681e50da1e4a654');
});
