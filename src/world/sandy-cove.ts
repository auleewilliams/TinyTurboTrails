import { withSlimePatrols } from './slimes';
import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { LevelData, WorldEntity } from './level';

const contour: readonly (readonly [number, number])[] = [
  // Beach arrival: dry sand, then the first shallow pool, all on one safe flat.
  [0, 198], [300, 198], [600, 198], [900, 198], [1200, 198], [1700, 198], [1900, 180],
  // Palm dunes: a raised beach with short slow stretches.
  [2200, 180], [2450, 180], [2700, 180], [3000, 180], [3400, 180], [3600, 202],
  // First shallows: a longer tide pool with plenty of firm ground afterward.
  [3900, 202], [4100, 202], [4350, 202], [4700, 202], [5100, 202], [5400, 174],
  // Driftwood bay: a broad shallow basin, then a gentle rise.
  [5700, 174], [6000, 174], [6200, 174], [6500, 174], [6900, 174], [7200, 194],
  // Tide pools: the last slime is well beyond the water.
  [7500, 194], [7850, 194], [8020, 194], [8250, 194], [8750, 194], [9050, 178],
  // Sunny exit: a final short paddle and a clear run to the arch.
  [9350, 178], [9600, 178], [9750, 178], [9970, 178], [10300, 178], [10600, 198],
];
const sandStarts = new Set([300, 2200, 3900, 5700, 7500, 9350]);
const waterStarts = new Set([900, 2700, 4350, 6200, 8020, 9750]);
const terrain: Terrain = {
  minX: 0, maxX: 10600,
  surfaces: contour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = contour[index];
    return { x1, x2, y1, y2,
      ...(sandStarts.has(x1) ? { material: 'sand' as const, speedMultiplier: 0.8 } : {}),
      ...(waterStarts.has(x1) ? { material: 'water' as const, speedMultiplier: 0.65 } : {}),
    };
  }),
};
const checkpoints = [120, 1990, 3700, 5500, 7300, 9150].map((x, index) => ({
  id: `cove-checkpoint-${index + 1}`, x, y: surfaceY(terrain, x),
}));
function grounded(kind: WorldEntity['kind'], asset: string, x: number, index: number): WorldEntity {
  return { id: `cove-${kind}-${index + 1}`, kind, asset, x, y: surfaceY(terrain, x),
    layer: kind === 'decoration' ? 'back' : 'world' };
}
const gems = [220, 410, 700, 1010, 1350, 1760, 2110, 2360, 2600, 2840, 3080, 3460,
  3810, 4020, 4250, 4510, 4760, 5200, 5610, 5810, 6110, 6350, 6570, 7010,
  7420, 7610, 7920, 8140, 8350, 8860, 9260, 9460, 9660, 9880, 10070, 10460];
const springs = [1490, 3190, 4890, 6640, 8450, 10100];

export const SANDY_COVE: LevelData = withSlimePatrols({
  id: 'cove', name: 'SANDY COVE', atlas: 'cove',
  width: 10600, height: 240, ...terrain,
  start: { x: 60, y: 198 }, finish: { x: 10500, y: surfaceY(terrain, 10500), asset: 'finish-arch' },
  theme: {
    slimeAccessory: 'snorkel',
    material: 'sand',
    sky: '#a9e8ec', ground: '#eacb85', edge: '#87603c',
    parallax: [150, 700, 1240, 1800, 2320].map((x) => ({ asset: 'hills', x, y: 110, scale: 3 })),
  },
  checkpoints,
  entities: [
    ...gems.map((x, index) => ({ ...grounded('gem', 'gem', x, index), y: surfaceY(terrain, x) - 18 })),
    ...springs.map((x, index) => grounded('spring', 'spring', x, index)),
    ...[1550, 4950, 8510].map((x, index) => grounded('slime', 'slime', x, index)),
    ...springs.map((x, index): WorldEntity => ({ id: `cove-bonus-${index + 1}`, kind: 'gem', asset: 'gem',
      x: x + 65, y: surfaceY(terrain, x) - 115, layer: 'world' })),
    ...[760, 1400, 2080, 3090, 4200, 4800, 6080, 6550, 7390, 8360, 9700, 10250]
      .map((x, index) => grounded('decoration', index % 4 === 0 ? 'cave' : 'tree', x, index)),
    ...checkpoints.map((checkpoint): WorldEntity => ({ ...checkpoint, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })),
  ],
});
