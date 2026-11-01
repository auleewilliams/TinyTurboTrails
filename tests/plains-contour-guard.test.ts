import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { PLAINS_LEVEL } from '../src/world/level';

const pins: Record<string, string> = JSON.parse(readFileSync(new URL('../assets/source/plains/contour-prototype-v1/preservation-pins.json', import.meta.url), 'utf8'));
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const levelSource = readFileSync(new URL('../src/world/level.ts', import.meta.url), 'utf8');
function exactApprovedLevelDelta(source: string): boolean {
  const moves = [["[772, 'bush']", "[470, 'bush']"], ["[150, 'flowers']", "[240, 'flowers']"], ["[2342, 'flowers']", "[2530, 'flowers']"]];
  for (const [current, original] of moves) {
    if (source.split(current).length !== 2) return false;
    source = source.replace(current, original);
  }
  return hash(source) === pins['src/world/level.ts'];
}
it('permits exactly the bush and two authorized flower X moves and no other source/level delta', () => {
  expect(exactApprovedLevelDelta(levelSource)).toBe(true);
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-002')).toMatchObject({ x: 772, y: 206, kind: 'decoration', asset: 'bush', layer: 'back' });
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-001')).toMatchObject({ x: 150, y: 206, asset: 'flowers', kind: 'decoration', layer: 'back' });
  expect(PLAINS_LEVEL.entities.find(e => e.id === 'deco-008')).toMatchObject({ x: 2342, y: 220, asset: 'flowers', kind: 'decoration', layer: 'back' });
  expect(exactApprovedLevelDelta(levelSource.replace('x: 740, y: 206', 'x: 741, y: 206'))).toBe(false);
  expect(exactApprovedLevelDelta(levelSource.replace("[150, 'flowers']", "[151, 'flowers']"))).toBe(false);
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
