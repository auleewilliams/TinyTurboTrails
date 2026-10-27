import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { LevelData, WorldEntity } from './level';

// Ice carries movement; the connected snow shelves hold every decision.
const contour: readonly (readonly [number, number])[] = [
  [0, 500], [160, 500], [360, 560], [700, 560], [780, 500], [880, 500],
  [960, 440], [1060, 440], [1140, 380], [1400, 380],
  [1550, 380], [1750, 450], [1970, 520], [2190, 560], [2350, 560],
  [2500, 560], [2600, 540], [2800, 540], [3000, 540], [3080, 492],
  [3220, 492], [3300, 444], [3450, 444], [3650, 480], [4200, 480],
  [4380, 480], [4460, 432], [4580, 432], [4660, 384], [4780, 384],
  [4860, 336], [4980, 336], [5060, 288], [5180, 288], [5260, 240], [5600, 240],
];
const terrain: Terrain = {
  minX: 0, maxX: 5600,
  surfaces: contour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = contour[index];
    const ice = x1 >= 160 && x2 <= 360 || x1 >= 1550 && x2 <= 2350 || x1 >= 3450 && x2 <= 3650;
    return { x1, x2, y1, y2, ...(ice ? { material: 'ice' as const, friction: 0.45 } : {}) };
  }),
};
const checkpoints = [1350, 2760, 4040].map((x, index) => ({
  id: `frost-checkpoint-${index + 1}`, x, y: surfaceY(terrain, x),
}));
function grounded(kind: WorldEntity['kind'], asset: string, x: number, index: number): WorldEntity {
  return { id: `frost-${kind}-${index + 1}`, kind, asset, x, y: surfaceY(terrain, x),
    layer: kind === 'decoration' ? 'back' : 'world' };
}
// All 36 original main identities survive; only the three bonus gems need flight.
const gems = [130, 240, 340, 410, 500, 620, 820, 1000, 1160, 1260,
  1460, 1630, 1800, 1970, 2140, 2300, 2440, 2630, 2850, 3030,
  3110, 3260, 3370, 3520, 3630, 3750, 3900, 4140, 4430, 4530,
  4730, 4830, 5030, 5130, 5300, 5490];
// Raised from the sketch to clear the full 48px sprite and 10px slab underneath.
const returns = [
  [500, 640, 500], [330, 520, 450], [140, 350, 400],
  [2280, 2460, 500], [2090, 2300, 452], [1900, 2110, 404],
  [1710, 1920, 356], [1520, 1730, 308],
  [3620, 3820, 410], [3440, 3640, 372],
] as const;

export const FROST_RIDGE: LevelData = {
  id: 'frost', name: 'FROST RIDGE', atlas: 'frost',
  width: 5600, height: 680, ...terrain,
  start: { x: 60, y: 500 },
  finish: { x: 5520, y: 240, asset: 'finish-arch', supportOnly: true, boundedWidth: 60,
    rearmBelowY: 300, rearmLeftX: 5360 },
  retrace: { x: 5410, y: 240 }, verticalCamera: true, cameraLead: 60, checkpointActivation: 'grounded',
  sections: [{ x: 0, name: 'FIRST SLIDE' }, { x: 700, name: 'FIR CLIMB' },
    { x: 1400, name: 'ICE BOWL' }, { x: 2800, name: 'HIGH LEDGES' },
    { x: 3450, name: 'UPPER GLIDE' }, { x: 4200, name: 'SNOWY SUMMIT' }],
  theme: {
    slimeAccessory: 'bobble', material: 'frost',
    weather: { kind: 'snow', count: 28, color: '#f4fbff90', drift: 4, fall: 10, sway: 5 },
    sky: '#c2e8f4', ground: '#dcebf3', edge: '#294e78',
    parallax: [180, 710, 1250, 1800, 2320].map((x) => ({ asset: 'hills', x, y: 100, scale: 3 })),
  },
  checkpoints,
  platforms: returns.map(([left, right, y], index) => ({ id: `frost-return-${index + 1}`,
    from: { x: left, y }, to: { x: left, y }, width: right - left, seconds: 1 })),
  entities: [
    ...gems.map((x, index) => ({ ...grounded('gem', 'gem', x, index), y: surfaceY(terrain, x) - 18 })),
    grounded('spring', 'spring', 3140, 0),
    ...[[3120, 370], [3140, 360], [3180, 370]].map(([x, y], index): WorldEntity => ({
      id: `frost-bonus-${index + 1}`, kind: 'gem', asset: 'gem', x, y, layer: 'world' })),
    ...[600, 805, 1010, 1180, 2690, 2890, 3340, 4100, 4500, 4720, 4940, 5280]
      .map((x, index) => grounded('decoration', 'tree', x, index)),
    ...checkpoints.map((checkpoint): WorldEntity => ({ ...checkpoint, kind: 'checkpoint', asset: 'checkpoint', layer: 'world' })),
  ],
};
