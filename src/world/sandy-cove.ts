import type { MovingPlatform } from '../game/platforms';
import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { LevelData, WorldEntity } from './level';

// A continuous, reversible shoreline. Only the explicitly marked short patches slow walking.
const contour: readonly (readonly [number, number])[] = [
  [0, 360], [75, 360], [105, 360], [120, 360], [220, 312], [380, 312],
  [500, 352], [520, 352], [600, 352], [620, 352], [740, 304], [840, 304],
  [940, 368], [1100, 368], [1220, 320], [1400, 320],
  [1620, 320], [1660, 344], [1860, 344], [1900, 320], [2160, 320],
  [2200, 344], [2500, 344], [2560, 320], [2800, 320],
  [2920, 320], [3000, 344], [3040, 344], [3220, 344], [3480, 344],
  [3600, 296], [3740, 296], [3820, 248], [3900, 248], [3980, 200], [4200, 200],
];
const sandStarts = new Set([75, 520]);
const waterStarts = new Set([1660, 2200, 3040]);
const terrain: Terrain = {
  minX: 0, maxX: 4200,
  surfaces: contour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = contour[index];
    return { x1, x2, y1, y2,
      ...(sandStarts.has(x1) ? { material: 'sand' as const, speedMultiplier: 0.8 } : {}),
      ...(waterStarts.has(x1) ? { material: 'water' as const, speedMultiplier: 0.65 } : {}),
    };
  }),
};
const checkpoints = [1320, 2070, 3660].map((x, index) => ({
  id: `cove-checkpoint-${index + 1}`, x, y: surfaceY(terrain, x),
}));
function grounded(kind: WorldEntity['kind'], asset: string, x: number, index: number): WorldEntity {
  return { id: `cove-${kind}-${index + 1}`, kind, asset, x, y: surfaceY(terrain, x),
    layer: kind === 'decoration' ? 'back' : 'world' };
}
const gems = [100, 180, 260, 330, 450, 550, 680, 780, 900, 1140, 1260, 1360,
  1480, 1590, 1660, 1750, 1850, 1950, 2050, 2150, 2260, 2420, 2530, 2640,
  2760, 2870, 2940, 3060, 3160, 3300, 3540, 3640, 3750, 3850, 3990, 4090];

const platforms: readonly MovingPlatform[] = [
  ['cove-hollow-shelf', 980, 297, 140],
  ['cove-pool-stone-1', 1700, 283, 100],
  ['cove-pool-stone-2', 2230, 285, 90],
  ['cove-pool-stone-3', 2380, 284, 90],
  ['cove-bay-ledge-1', 2960, 272, 140],
  ['cove-bay-ledge-2', 3140, 260, 160],
  ['cove-bay-ledge-3', 3340, 272, 180],
].map(([id, x, y, width]) => ({ id: id as string, from: { x: x as number, y: y as number },
  to: { x: x as number, y: y as number }, width: width as number, seconds: 1 }));

export const SANDY_COVE: LevelData = {
  id: 'cove', name: 'SANDY COVE', atlas: 'cove',
  width: 4200, height: 480, ...terrain,
  start: { x: 60, y: 360 },
  finish: { x: 4140, y: 200, asset: 'finish-arch', supportOnly: true, boundedWidth: 30,
    rearmBelowY: 250, rearmLeftX: 3960 },
  retrace: { x: 4030, y: 200 }, verticalCamera: true, cameraLead: 45,
  checkpointActivation: 'grounded',
  sections: [
    { x: 0, name: 'Beach dunes' }, { x: 900, name: 'Palm hollow' },
    { x: 1400, name: 'Island pools' }, { x: 2800, name: 'Sheltered bay' },
    { x: 3740, name: 'Beach viewpoint' },
  ],
  theme: {
    slimeAccessory: 'snorkel', material: 'sand',
    weather: { kind: 'spray', count: 18, color: '#dbf9ff70', drift: 8, fall: -5, sway: 3 },
    sky: '#a9e8ec', ground: '#eacb85', edge: '#87603c',
    parallax: [150, 700, 1240, 1800, 2320].map((x) => ({ asset: 'hills', x, y: 110, scale: 3 })),
  },
  checkpoints, platforms,
  entities: [
    { id: 'cove-spring-1', kind: 'spring', asset: 'spring', x: 3420, y: 272, layer: 'world' },
    ...gems.map((x, index) => ({ ...grounded('gem', 'gem', x, index), y: ({ 1750: 283, 2260: 285, 2420: 284 }[x] ?? surfaceY(terrain, x)) - 18 })),
    ...[[1065, 279], [950, 318], [3380, 172], [3240, 242], [3420, 160], [3460, 172]]
      .map(([x, y], index): WorldEntity => ({ id: `cove-bonus-${index + 1}`, kind: 'gem', asset: 'gem', x, y, layer: 'world' })),
    ...[295, 820, 1295, 1510, 1990, 2685, 2830, 3700, 4050]
      .map((x, index) => grounded('decoration', index % 4 === 0 ? 'stone' : 'tree', x, index)),
    ...checkpoints.map((checkpoint): WorldEntity => ({ ...checkpoint, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })),
  ],
};
