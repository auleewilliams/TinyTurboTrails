import { expect, it } from 'vitest';
import { drawSurfaceMaterials } from '../src/world/surface-materials';
import { PLAINS_LEVEL } from '../src/world/level';
import type { SurfaceMaterial } from '../src/game/movement';

it.each([0, 0.5])('aligns and clips distinct material bands at camera offset %s', (offset) => {
  const colors = new Set<string>();
  for (const material of ['ice', 'sand', 'water'] as SurfaceMaterial[]) {
    const vertices: number[][] = [];
    const marks: number[][] = [];
    let clipped = false;
    const context = { fillStyle: '', save() {}, restore() {}, beginPath() {}, closePath() {},
      moveTo(x: number, y: number) { vertices.push([x, y]); },
      lineTo(x: number, y: number) { vertices.push([x, y]); },
      fill() { colors.add(this.fillStyle); }, clip() { clipped = true; },
      fillRect(x: number, y: number, w: number, h: number) { expect(clipped).toBe(true); marks.push([x, y, w, h]); },
    };
    drawSurfaceMaterials(context as unknown as CanvasRenderingContext2D, {
      ...PLAINS_LEVEL, surfaces: [{ x1: 100, x2: 200, y1: 180, y2: 180, material }],
    }, { x: offset, y: 0 });
    expect(vertices).toContainEqual([100 - offset, 180]);
    expect(vertices).toContainEqual([200 - offset, 180]);
    expect(marks.length).toBeGreaterThan(0);
  }
  expect(colors.size).toBe(3);
});
it('does not draw a band on ordinary ground or offscreen patches', () => {
  drawSurfaceMaterials({} as CanvasRenderingContext2D, PLAINS_LEVEL, { x: 0, y: 0 });
  drawSurfaceMaterials({} as CanvasRenderingContext2D, {
    ...PLAINS_LEVEL, surfaces: [{ x1: 1000, x2: 1100, y1: 180, y2: 180, material: 'ice' }],
  }, { x: 0, y: 0 });
});
