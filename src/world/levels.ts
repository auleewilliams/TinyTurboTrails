import { withSlimePatrols } from './slimes';
import { surfaceY, type Surface, type Terrain } from '../game/movement';
import { PLAINS_LEVEL, type LevelData, type WorldEntity } from './level';
import { FROST_RIDGE } from './frost-ridge';
import { SANDY_COVE } from './sandy-cove';
export { FROST_RIDGE, SANDY_COVE };
import { SUNSET_SITE } from './sunset-site';

export { QUARRY_RUN } from './quarry-run';
import { QUARRY_RUN } from './quarry-run';

// Treetop Timbers keeps one continuous, forgiving contour. Shallow valleys read
// as rope bridges; a later flat-bottomed deck gives the final spring approach
// a quieter beat without introducing gaps or stacked collision geometry.
const timberContour: readonly (readonly [number, number])[] = [
  [0, 198], [350, 198], [520, 170], [1050, 170],
  [1230, 208], [1410, 170], [1700, 170],
  [1900, 195], [2300, 195], [2480, 225], [2660, 195], [3200, 195],
  [3400, 150], [3900, 150], [4080, 190], [4260, 150], [5000, 150],
  [5200, 200], [5700, 200], [5880, 232], [6060, 200], [6800, 200],
  [7000, 160], [7500, 160], [7620, 184], [7740, 184], [7860, 160], [8500, 160],
  [8700, 198], [9150, 198], [9330, 230], [9510, 198], [10200, 198],
];

const timberTerrain: Terrain = {
  minX: 0,
  maxX: 10200,
  surfaces: timberContour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = timberContour[index];
    return { x1, x2, y1, y2 };
  }),
};

function timberGrounded(entity: Omit<WorldEntity, 'y'>): WorldEntity {
  return { ...entity, y: surfaceY(timberTerrain, entity.x) };
}

function timberThing(kind: 'slime' | 'spring' | 'hazard' | 'decoration', id: string, x: number,
  asset: WorldEntity['asset'], layer: WorldEntity['layer'] = 'world'): WorldEntity {
  return timberGrounded({ id, kind, x, asset, layer });
}

const timberCheckpoints = [
  { id: 'timber-checkpoint-yard', x: 500 },
  { id: 'timber-checkpoint-bridge', x: 2200 },
  { id: 'timber-checkpoint-canopy', x: 3800 },
  { id: 'timber-checkpoint-crane', x: 5500 },
  { id: 'timber-checkpoint-lookout', x: 7300 },
  { id: 'timber-checkpoint-sunset', x: 9000 },
].map(({ id, x }) => ({ id, x, y: surfaceY(timberTerrain, x) }));

// Keep 33 gems, but group existing rewards into readable spring approaches,
// rising flights and safe returns instead of a uniform trail-wide dotted line.
const timberGemPlacements: readonly (readonly [x: number, lift?: number])[] = [
  [250], [550], [850], [1080, 40], [1350],
  [1800], [2200], [2650], [3050], [3450], [3850], [4250],
  [4760], [4800, 62], [4850, 88], [4910, 62], [5010],
  [5500], [5950], [6350], [6800], [7200], [7550], [7800],
  [8310], [8350, 62], [8400, 88], [8460, 62], [8570],
  [9000], [9400], [9700], [9950],
];
const timberGems: readonly WorldEntity[] = timberGemPlacements.map(([x, lift = 18], index) => ({
  id: `timber-gem-${String(index + 1).padStart(3, '0')}`, kind: 'gem', x,
  y: surfaceY(timberTerrain, x) - lift, asset: 'gem', layer: 'world',
}));

export const TREETOP_TIMBERS: LevelData = withSlimePatrols({
  id: 'timbers',
  name: 'TREETOP TIMBERS',
  atlas: 'timbers',
  theme: {
    slimeAccessory: 'leaf',
    material: 'wood',
    weather: { kind: 'leaves', count: 14, color: '#b5a05b80', drift: 6, fall: 8, sway: 10 },
    backdrop: { row: 1, support: '#60443260' },
    sky: '#d97667',
    ground: '#704126',
    edge: '#e6a04b',
    parallax: [
      { asset: 'hills', x: 150, y: 90, scale: 3 },
      { asset: 'cave', x: 720, y: 118, scale: 2 },
      { asset: 'hills', x: 1250, y: 82, scale: 3 },
      { asset: 'cave', x: 1840, y: 112, scale: 2 },
      { asset: 'hills', x: 2400, y: 88, scale: 3 },
      { asset: 'cave', x: 2980, y: 116, scale: 2 },
    ],
  },
  width: 10200,
  height: 240,
  minX: timberTerrain.minX,
  maxX: timberTerrain.maxX,
  start: { x: 60, y: surfaceY(timberTerrain, 60) },
  finish: { x: 10100, y: surfaceY(timberTerrain, 10100), asset: 'finish-arch' },
  surfaces: timberTerrain.surfaces,
  checkpoints: timberCheckpoints,
  landingBands: [{ x: 1100, width: 140 }, { x: 4960, width: 180 }, { x: 8510, width: 180 }],
  entities: [
    // Keep the first running spring arc as an introduction. The higher middle
    // and late stars reward slowing over a spring; the main route passes below.
    ...[
      { x: 1030, launchX: 950, lift: 100 },
      { x: 4850, launchX: 4850, lift: 120 },
      { x: 8400, launchX: 8400, lift: 120 },
    ].map(({ x, launchX, lift }, index): WorldEntity => ({
      id: `timbers-special-${index + 1}`, kind: 'special', x,
      y: surfaceY(timberTerrain, launchX) - lift, asset: 'special', layer: 'world',
    })),
    ...timberGems,
    ...[950, 1650, 3100, 4850, 6700, 8400, 9800].map((x, index) =>
      timberThing('spring', `timber-spring-${index + 1}`, x, 'spring')),
    ...[750, 2150, 3000, 4700, 6600, 8250, 8900].map((x, index) =>
      timberThing('hazard', `timber-sawhorse-${index + 1}`, x, 'stone')),
    ...[1500, 2800, 4450, 6250, 8050, 9650].map((x, index) =>
      timberThing('slime', `timber-slime-${index + 1}`, x, 'slime')),
    ...[
      [1100, 'tree'], [1780, 'flowers'], [2700, 'cave'], [3550, 'tree'],
      [4350, 'bush'], [5300, 'cave'], [6150, 'flowers'], [7100, 'tree'],
      [7950, 'bush'], [8800, 'cave'], [9600, 'tree'],
    ].map(([x, asset], index) => timberThing('decoration', `timber-deco-${index + 1}`,
      x as number, asset as string, 'back')),
    ...timberCheckpoints.map(({ id, x }) =>
      timberGrounded({ id, kind: 'checkpoint', x, asset: 'checkpoint', layer: 'world' })),
  ],
});

export { SUNSET_SITE };
export const LEVELS: readonly LevelData[] = [PLAINS_LEVEL, QUARRY_RUN, TREETOP_TIMBERS, SUNSET_SITE, FROST_RIDGE, SANDY_COVE];
export const DEFAULT_LEVEL: LevelData = PLAINS_LEVEL;

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}
