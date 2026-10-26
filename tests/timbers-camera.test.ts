import { expect, it } from 'vitest';
import { Camera } from '../src/world/camera';
import { TREETOP_TIMBERS } from '../src/world/levels';

const bounds = { width: 426, height: 240, worldWidth: TREETOP_TIMBERS.width,
  worldHeight: TREETOP_TIMBERS.height, vertical: true };

it('frames the next actual support above each broad ascent rest and below each return edge', () => {
  // Canvas HUD occupies the top 25px and the ribbon begins at 221px.
  const routes = [
    { from: [100, 1080], next: [260, 1020] },
    { from: [385, 960], next: [385, 900] },
    { from: [340, 900], next: [340, 840] },
    { from: [500, 900], next: [500, 840] },
    { from: [440, 720], next: [440, 660] },
    { from: [400, 660], next: [400, 600] },
    { from: [400, 420], next: [400, 360] },
    { from: [500, 240], next: [500, 180] },
    { from: [560, 180], next: [650, 240] },
    { from: [510, 420], next: [650, 480] },
    { from: [570, 660], next: [650, 720] },
    { from: [690, 840], next: [440, 900] },
    { from: [510, 900], next: [650, 960] },
    { from: [540, 1020], next: [300, 1080] },
  ] as const;
  const camera = new Camera(bounds);
  for (const { from, next } of routes) {
    camera.update(from[0], from[1] - 34);
    const support = TREETOP_TIMBERS.platforms?.find(platform => platform.from.y === next[1]
      && next[0] >= platform.from.x && next[0] <= platform.from.x + platform.width);
    const left = support?.from.x ?? 0;
    const right = support ? support.from.x + support.width : TREETOP_TIMBERS.width;
    const visibleWidth = Math.min(426, right - camera.position.x) - Math.max(0, left - camera.position.x);
    const y = next[1] - camera.position.y;
    expect(visibleWidth, JSON.stringify({ from, next, support, camera: camera.position })).toBeGreaterThan(18);
    expect(y, JSON.stringify({ from, next, camera: camera.position })).toBeGreaterThan(25);
    expect(y).toBeLessThan(221);
  }
});

it('starts and resets at roots, then bounds the sky above the lookout and floor below the return', () => {
  const camera = new Camera(bounds);
  camera.update(100, 1046);
  const roots = { ...camera.position };
  expect(1080 - roots.y).toBeLessThan(221);
  expect(1020 - roots.y).toBeGreaterThan(25);
  camera.update(400, 146);
  expect(camera.position.y).toBeGreaterThanOrEqual(-64);
  expect(180 - camera.position.y).toBeLessThan(221);
  camera.update(220, 1046);
  expect(camera.position.y).toBeLessThanOrEqual(TREETOP_TIMBERS.height - 240);
  camera.reset();
  camera.update(100, 1046);
  expect(camera.position).toEqual(roots);
});
