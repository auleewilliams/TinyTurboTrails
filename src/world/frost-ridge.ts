import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { LevelData, WorldEntity } from './level';

// Six connected snowy sections; every ice patch has a long, level snow runout.
const contour: readonly (readonly [number, number])[] = [
  // Snowfield: first ice is visible from the safe starting flat.
  [0, 198], [300, 198], [700, 198], [1250, 198], [1450, 166], [1800, 166],
  // Fir climb: a broad shelf, then a gentle descent.
  [2100, 166], [2600, 166], [3100, 166], [3350, 186], [3700, 186],
  // Frozen lake: gems on the ice, a spring and a snowy climb beyond it.
  [4000, 186], [4450, 186], [5050, 186], [5300, 144], [5500, 144],
  // Spring ridge: higher snowfields with optional jumping gems.
  [5850, 144], [6300, 144], [6900, 144], [7150, 174], [7400, 174],
  // Glacier flats: a shorter slide and a long safe approach to the climb.
  [7700, 174], [8150, 174], [8800, 174], [9050, 142], [9300, 142],
  // Summit: one final slide, then an ordinary snowy finish plateau.
  [9600, 142], [10000, 142], [10700, 142], [10900, 166], [11200, 166],
];
const iceStarts = new Set([300, 2100, 4000, 5850, 7700, 9600]);
const terrain: Terrain = {
  minX: 0, maxX: 11200,
  surfaces: contour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = contour[index];
    return { x1, x2, y1, y2, ...(iceStarts.has(x1) ? { material: 'ice' as const, friction: 0.45 } : {}) };
  }),
};
const checkpoints = [120, 1900, 3800, 5600, 7500, 9400].map((x, index) => ({
  id: `frost-checkpoint-${index + 1}`, x, y: surfaceY(terrain, x),
}));
function grounded(kind: WorldEntity['kind'], asset: string, x: number, index: number): WorldEntity {
  return { id: `frost-${kind}-${index + 1}`, kind, asset, x, y: surfaceY(terrain, x),
    layer: kind === 'decoration' ? 'back' : 'world' };
}
const gems = [220, 420, 650, 920, 1370, 1660, 2020, 2310, 2550, 2750, 3220, 3500,
  3910, 4150, 4400, 4670, 5150, 5390, 5750, 6050, 6260, 6490, 7020, 7310,
  7650, 7860, 8100, 8300, 8900, 9200, 9510, 9780, 9970, 10200, 10800, 11000];
const springs = [1050, 2850, 4800, 6650, 8450, 10350];

export const FROST_RIDGE: LevelData = {
  id: 'frost', name: 'FROST RIDGE', atlas: 'frost',
  width: 11200, height: 240, ...terrain,
  start: { x: 60, y: 198 }, finish: { x: 11100, y: 166, asset: 'finish-arch' },
  theme: {
    texturedTerrain: true, sky: '#c2e8f4', ground: '#dcebf3', edge: '#294e78',
    parallax: [180, 710, 1250, 1800, 2320].map((x) => ({ asset: 'hills', x, y: 100, scale: 3 })),
  },
  checkpoints,
  entities: [
    ...gems.map((x, index) => ({ ...grounded('gem', 'gem', x, index), y: surfaceY(terrain, x) - 18 })),
    ...springs.map((x, index) => grounded('spring', 'spring', x, index)),
    ...[1150, 2950, 4900, 6750, 8550, 10450].map((x, index) => grounded('hazard', 'stone', x, index)),
    ...springs.map((x, index): WorldEntity => ({ id: `frost-bonus-${index + 1}`, kind: 'gem', asset: 'gem',
      x: x + 65, y: surfaceY(terrain, x) - 92, layer: 'world' })),
    ...[850, 1550, 2740, 3450, 4610, 5200, 6450, 7200, 8310, 9000, 10150, 10950]
      .map((x, index) => grounded('decoration', index % 3 === 0 ? 'cave' : 'tree', x, index)),
    ...checkpoints.map((checkpoint): WorldEntity => ({ ...checkpoint, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })),
  ],
};
