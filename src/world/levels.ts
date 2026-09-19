import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { MovingPlatform } from '../game/platforms';
import { PLAINS_LEVEL, type LevelData, type WorldEntity } from './level';

// Quarry Run is authored as one contour of [x, y] points, split into six named
// sections. Consecutive points become contiguous surfaces.
const quarryContour: readonly (readonly [number, number])[] = [
  // Quarry entrance (0–1700): calm terraces, a first slime and a spring step.
  [0, 198], [320, 198], [440, 170], [720, 170], [800, 198], [1040, 198],
  [1056, 138], [1320, 138], [1420, 198], [1700, 198],
  // Stone terraces (1700–3500): spring steps up, a hazard run on top, steps down.
  [1960, 198], [1976, 150], [2160, 150], [2176, 120], [2600, 120],
  [2700, 150], [2900, 150], [3000, 198], [3500, 198],
  // Deep pit (3500–5200): back-to-back spring pits, then a gem-rich plateau.
  [3740, 198], [3752, 380], [3820, 380], [3832, 210], [3980, 210],
  [3992, 380], [4060, 380], [4072, 222], [4400, 222], [4500, 198], [4600, 160], [5200, 160],
  // Mine tunnels (5200–6900): a long downhill run through slime burrows.
  [5300, 160], [5400, 130], [5600, 130], [6300, 206], [6500, 206],
  [6512, 380], [6580, 380], [6592, 218], [6900, 218],
  // Crusher yard (6900–8600): grouped stone hazards around a spring pit.
  [7300, 218], [7400, 196], [7800, 196], [7812, 380], [7880, 380],
  [7892, 208], [8300, 208], [8400, 198], [8600, 198],
  // Summit exit (8600–10200): switchback climb, a final double pit and the arch.
  [8900, 198], [9000, 160], [9080, 176], [9180, 136], [9260, 150],
  [9340, 126], [9500, 126], [9512, 380], [9580, 380], [9592, 138],
  [9700, 138], [9712, 380], [9780, 380], [9792, 150], [10200, 150],
];

const quarryTerrain: Terrain = {
  minX: 0,
  maxX: 10200,
  surfaces: quarryContour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = quarryContour[index];
    return { x1, x2, y1, y2 };
  }),
};

function quarryGrounded(entity: Omit<WorldEntity, 'y'>): WorldEntity {
  return { ...entity, y: surfaceY(quarryTerrain, entity.x) };
}

// Main-route gems float inside the walking activation window; bonus gems need a jump.
// Secret gems above a pit measure their lift from the spring ledge at `baseX`.
function quarryGem(id: string, x: number, lift = 18, baseX = x): WorldEntity {
  return { id, kind: 'gem', x, y: surfaceY(quarryTerrain, baseX) - lift, asset: 'gem', layer: 'world' };
}

function quarryThing(kind: 'slime' | 'spring' | 'hazard', id: string, x: number): WorldEntity {
  const asset = kind === 'hazard' ? 'stone' : kind;
  return quarryGrounded({ id, kind, x, asset, layer: 'world' });
}

// Quarry scenery avoids the stone sprite so it never reads as a hazard.
function quarryDecoration(id: string, x: number, asset: 'cave' | 'bush'): WorldEntity {
  return quarryGrounded({ id, kind: 'decoration', x, asset, layer: 'back' });
}

const quarryCheckpoints = [
  { id: 'quarry-checkpoint-entrance', x: 560 },
  { id: 'quarry-checkpoint-terraces', x: 1800 },
  { id: 'quarry-checkpoint-pit', x: 3600 },
  { id: 'quarry-checkpoint-tunnels', x: 5250 },
  { id: 'quarry-checkpoint-burrows', x: 6360 },
  { id: 'quarry-checkpoint-crusher', x: 7000 },
  { id: 'quarry-checkpoint-summit', x: 8700 },
].map(({ id, x }) => ({ id, x, y: surfaceY(quarryTerrain, x) }));

/**
 * Quarry Run's two rides. Both are slow, park at each end, and are drawn with their whole
 * path so the next move is visible before Henry commits to it. Both are optional and both
 * dock on a section's walkable flat, so a missed boarding costs a landing, never a life:
 * the spring pits keep their springs, because a ride Henry has to time is no way to cross one.
 */
const quarryPlatforms: readonly MovingPlatform[] = [
  // Stone terraces: docks flush with the terrace between the two stone hazards, under the
  // section's bonus gem, so waiting on the dock is a second, forgiving way up to a gem that
  // otherwise needs a well-aimed jump.
  { id: 'quarry-lift-terraces', from: { x: 2356, y: 120 }, to: { x: 2356, y: 66 }, width: 48, seconds: 2, pause: 1, offset: 0.25 },
  // Crusher yard: 42px above the flat, clearing the paired stone hazards it carries riders over.
  // A tapped jump reaches the deck, so boarding never needs a held jump.
  { id: 'quarry-ferry-crusher', from: { x: 7130, y: 176 }, to: { x: 7262, y: 176 }, width: 48, seconds: 2.2, pause: 0.8 },
];

export const QUARRY_RUN: LevelData = {
  id: 'quarry',
  name: 'QUARRY RUN',
  atlas: 'plains',
  theme: {
    sky: '#657b8c',
    ground: '#59616a',
    edge: '#b1c77d',
    parallax: [
      { asset: 'cave', x: 180, y: 70, scale: 3 },
      { asset: 'cave', x: 760, y: 58, scale: 3 },
      { asset: 'stone', x: 1120, y: 96, scale: 2 },
      { asset: 'cave', x: 1420, y: 64, scale: 3 },
      { asset: 'stone', x: 1760, y: 90, scale: 2 },
      { asset: 'cave', x: 2080, y: 60, scale: 3 },
    ],
  },
  width: 10200,
  height: 240,
  minX: quarryTerrain.minX,
  maxX: quarryTerrain.maxX,
  start: { x: 60, y: 198 },
  finish: { x: 10100, y: 150, asset: 'finish-arch' },
  surfaces: quarryTerrain.surfaces,
  checkpoints: quarryCheckpoints,
  platforms: quarryPlatforms,
  entities: [
    // Quarry entrance
    quarryGem('quarry-gem-001', 200),
    quarryGem('quarry-gem-002', 520),
    quarryGem('quarry-gem-003', 660),
    quarryThing('slime', 'quarry-slime-001', 900),
    quarryThing('spring', 'quarry-spring-001', 1000),
    quarryGem('quarry-gem-004', 1150),
    quarryGem('quarry-bonus-001', 1240, 55),
    quarryGem('quarry-gem-005', 1500),
    quarryGem('quarry-gem-006', 1620),
    quarryDecoration('quarry-deco-001', 380, 'cave'),
    quarryDecoration('quarry-deco-002', 1200, 'bush'),
    // Stone terraces
    quarryThing('spring', 'quarry-spring-002', 1920),
    quarryGem('quarry-gem-007', 2060),
    quarryThing('spring', 'quarry-spring-003', 2120),
    quarryGem('quarry-gem-008', 2260),
    quarryThing('hazard', 'quarry-hazard-001', 2340),
    quarryGem('quarry-bonus-002', 2380, 45),
    quarryThing('hazard', 'quarry-hazard-002', 2420),
    quarryThing('slime', 'quarry-slime-002', 2520),
    quarryGem('quarry-gem-009', 2800),
    quarryThing('slime', 'quarry-slime-003', 3200),
    quarryGem('quarry-gem-010', 3300),
    quarryGem('quarry-gem-011', 3420),
    quarryDecoration('quarry-deco-003', 2240, 'bush'),
    quarryDecoration('quarry-deco-004', 3100, 'bush'),
    // Deep pit
    quarryThing('spring', 'quarry-spring-004', 3720),
    quarryThing('spring', 'quarry-spring-005', 3960),
    quarryGem('quarry-bonus-003', 4040, 120, 3960),
    quarryGem('quarry-gem-012', 4200),
    quarryGem('quarry-gem-013', 4320),
    quarryGem('quarry-gem-014', 4440),
    quarryThing('hazard', 'quarry-hazard-003', 4560),
    quarryGem('quarry-gem-015', 4800),
    quarryGem('quarry-gem-016', 4950),
    quarryGem('quarry-gem-017', 5100),
    quarryDecoration('quarry-deco-005', 4300, 'cave'),
    quarryDecoration('quarry-deco-006', 4900, 'bush'),
    // Mine tunnels
    quarryGem('quarry-gem-018', 5480),
    quarryGem('quarry-bonus-004', 5500, 55),
    quarryThing('slime', 'quarry-slime-004', 5800),
    quarryGem('quarry-gem-019', 5950),
    quarryThing('slime', 'quarry-slime-005', 6100),
    quarryGem('quarry-gem-020', 6250),
    quarryThing('spring', 'quarry-spring-006', 6480),
    quarryGem('quarry-gem-021', 6720),
    quarryGem('quarry-gem-022', 6840),
    quarryDecoration('quarry-deco-007', 5500, 'cave'),
    quarryDecoration('quarry-deco-008', 6000, 'cave'),
    quarryDecoration('quarry-deco-009', 6780, 'bush'),
    // Crusher yard
    quarryGem('quarry-gem-023', 7100),
    quarryThing('hazard', 'quarry-hazard-004', 7180),
    quarryThing('hazard', 'quarry-hazard-005', 7240),
    quarryGem('quarry-gem-024', 7460),
    quarryThing('slime', 'quarry-slime-006', 7560),
    quarryThing('hazard', 'quarry-hazard-006', 7660),
    quarryThing('spring', 'quarry-spring-007', 7780),
    quarryGem('quarry-bonus-005', 7860, 120, 7780),
    quarryGem('quarry-gem-025', 8040),
    quarryThing('hazard', 'quarry-hazard-007', 8120),
    quarryThing('hazard', 'quarry-hazard-008', 8180),
    quarryThing('slime', 'quarry-slime-007', 8260),
    quarryGem('quarry-gem-026', 8480),
    quarryDecoration('quarry-deco-010', 7340, 'cave'),
    quarryDecoration('quarry-deco-011', 8500, 'bush'),
    // Summit exit
    quarryGem('quarry-gem-027', 8800),
    quarryThing('slime', 'quarry-slime-008', 9040),
    quarryGem('quarry-gem-028', 9180),
    quarryThing('hazard', 'quarry-hazard-009', 9230),
    quarryGem('quarry-gem-029', 9400),
    quarryGem('quarry-bonus-006', 9420, 50),
    quarryThing('spring', 'quarry-spring-008', 9480),
    quarryThing('spring', 'quarry-spring-009', 9680),
    quarryGem('quarry-gem-030', 9900),
    quarryThing('slime', 'quarry-slime-009', 9960),
    quarryGem('quarry-gem-031', 10040),
    quarryDecoration('quarry-deco-012', 9420, 'cave'),
    quarryDecoration('quarry-deco-013', 10160, 'bush'),
    ...quarryCheckpoints.map(({ id, x }) => quarryGrounded({ id, kind: 'checkpoint', x, asset: 'checkpoint', layer: 'world' })),
  ],
};

// Treetop Timbers keeps one continuous, forgiving contour. Its repeated shallow
// valleys read as sagging rope bridges without asking the 1-D terrain model to
// represent stacked walkways or suspended collision geometry.
const timberContour: readonly (readonly [number, number])[] = [
  [0, 198], [350, 198], [520, 170], [1050, 170],
  [1230, 208], [1410, 170], [1700, 170],
  [1900, 195], [2300, 195], [2480, 225], [2660, 195], [3200, 195],
  [3400, 150], [3900, 150], [4080, 190], [4260, 150], [5000, 150],
  [5200, 200], [5700, 200], [5880, 232], [6060, 200], [6800, 200],
  [7000, 160], [7500, 160], [7680, 202], [7860, 160], [8500, 160],
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

const timberGems: readonly WorldEntity[] = Array.from({ length: 33 }, (_, index) => {
  const x = 250 + index * 300;
  return { id: `timber-gem-${String(index + 1).padStart(3, '0')}`, kind: 'gem', x,
    y: surfaceY(timberTerrain, x) - 18, asset: 'gem', layer: 'world' };
});

export const TREETOP_TIMBERS: LevelData = {
  id: 'timbers',
  name: 'TREETOP TIMBERS',
  atlas: 'timbers',
  theme: {
    texturedTerrain: true,
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
  entities: [
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
};

export const LEVELS: readonly LevelData[] = [PLAINS_LEVEL, QUARRY_RUN, TREETOP_TIMBERS];
export const DEFAULT_LEVEL: LevelData = PLAINS_LEVEL;

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}
