import { DEFAULT_MOVEMENT, surfaceY, type Surface } from '../game/movement';
import { PLATFORM_MAX_SPEED, platformSpeed, type MovingPlatform } from '../game/platforms';
import type { WorldAsset } from './assets';

export type WorldEntityKind = 'gem' | 'slime' | 'spring' | 'checkpoint' | 'hazard' | 'decoration' | 'crumbling-ledge';
/** Back-and-forth walk between two X bounds. The run owns the position; level data stays immutable. */
export interface EntityPatrol { minX: number; maxX: number; speed: number }
export interface WorldEntity {
  id: string;
  kind: WorldEntityKind;
  x: number;
  y: number;
  asset: string;
  layer: 'back' | 'world' | 'front';
  patrol?: EntityPatrol;
  width?: number;
}
export interface LevelTheme {
  scenery?: boolean;
  /** Draw the shared terrain cells over the solid collision contour. */
  texturedTerrain?: boolean;
  sky: string;
  ground: string;
  edge: string;
  parallax: readonly { asset: WorldAsset; x: number; y: number; scale: number }[];
}
export interface LevelData {
  id: string;
  name: string;
  atlas: string;
  theme: LevelTheme;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  start: { x: number; y: number };
  finish: { x: number; y: number; asset: string };
  surfaces: readonly Surface[];
  checkpoints: readonly { id: string; x: number; y: number }[];
  entities: readonly WorldEntity[];
  /** Slabs that move on a fixed path. Omitted by levels built from terrain alone. */
  platforms?: readonly MovingPlatform[];
}

const plainsTerrain = {
  minX: 0,
  maxX: 9980,
  surfaces: [
    { x1: 0, x2: 220, y1: 198, y2: 198 }, { x1: 220, x2: 360, y1: 198, y2: 158 },
    { x1: 360, x2: 650, y1: 158, y2: 158 }, { x1: 650, x2: 780, y1: 158, y2: 190 },
    { x1: 780, x2: 1000, y1: 190, y2: 190 }, { x1: 1000, x2: 1120, y1: 190, y2: 150 },
    { x1: 1120, x2: 1380, y1: 150, y2: 150 }, { x1: 1380, x2: 1510, y1: 150, y2: 198 },
    { x1: 1510, x2: 1750, y1: 198, y2: 198 }, { x1: 1750, x2: 1900, y1: 198, y2: 142 },
    { x1: 1900, x2: 2100, y1: 142, y2: 142 }, { x1: 2100, x2: 2250, y1: 142, y2: 198 },
    { x1: 2250, x2: 2510, y1: 198, y2: 198 }, { x1: 2510, x2: 2640, y1: 198, y2: 108 },
    { x1: 2640, x2: 2870, y1: 108, y2: 108 }, { x1: 2870, x2: 3030, y1: 108, y2: 170 },
    { x1: 3030, x2: 3240, y1: 170, y2: 170 }, { x1: 3240, x2: 3360, y1: 170, y2: 198 },
    { x1: 3360, x2: 3580, y1: 198, y2: 198 }, { x1: 3580, x2: 3720, y1: 198, y2: 130 },
    { x1: 3720, x2: 3910, y1: 130, y2: 130 }, { x1: 3910, x2: 4050, y1: 130, y2: 200 },
    { x1: 4050, x2: 4260, y1: 200, y2: 200 }, { x1: 4260, x2: 4410, y1: 200, y2: 96 },
    { x1: 4410, x2: 4590, y1: 96, y2: 96 }, { x1: 4590, x2: 4760, y1: 96, y2: 178 },
    { x1: 4760, x2: 4980, y1: 178, y2: 178 }, { x1: 4980, x2: 5110, y1: 178, y2: 198 },
    { x1: 5110, x2: 5310, y1: 198, y2: 198 }, { x1: 5310, x2: 5440, y1: 198, y2: 164 },
    { x1: 5440, x2: 5650, y1: 164, y2: 164 }, { x1: 5650, x2: 5770, y1: 164, y2: 198 },
    { x1: 5770, x2: 6020, y1: 198, y2: 198 }, { x1: 6020, x2: 6130, y1: 198, y2: 150 },
    { x1: 6130, x2: 6350, y1: 150, y2: 150 }, { x1: 6350, x2: 6490, y1: 150, y2: 190 },
    { x1: 6490, x2: 6700, y1: 190, y2: 190 }, { x1: 6700, x2: 6820, y1: 190, y2: 170 },
    { x1: 6820, x2: 7050, y1: 170, y2: 170 }, { x1: 7050, x2: 7180, y1: 170, y2: 132 },
    { x1: 7180, x2: 7400, y1: 132, y2: 132 }, { x1: 7400, x2: 7540, y1: 132, y2: 198 },
    { x1: 7540, x2: 7800, y1: 198, y2: 198 }, { x1: 7800, x2: 7920, y1: 198, y2: 156 },
    { x1: 7920, x2: 8150, y1: 156, y2: 156 }, { x1: 8150, x2: 8280, y1: 156, y2: 198 },
    { x1: 8280, x2: 8500, y1: 198, y2: 198 }, { x1: 8500, x2: 8650, y1: 198, y2: 140 },
    { x1: 8650, x2: 8850, y1: 140, y2: 140 }, { x1: 8850, x2: 9000, y1: 140, y2: 200 },
    { x1: 9000, x2: 9220, y1: 200, y2: 200 }, { x1: 9220, x2: 9350, y1: 200, y2: 112 },
    { x1: 9350, x2: 9560, y1: 112, y2: 112 }, { x1: 9560, x2: 9720, y1: 112, y2: 166 },
    { x1: 9720, x2: 9980, y1: 166, y2: 166 },
  ],
};

// Grounded art uses its visible-base manifest anchor at the terrain contact point.
function groundedEntity(entity: Omit<WorldEntity, 'y'>): WorldEntity {
  return { ...entity, y: surfaceY(plainsTerrain, entity.x) };
}

export const PLAINS_LEVEL: LevelData = {
  id: 'plains',
  name: 'PLAINS',
  atlas: 'plains',
  theme: {
    scenery: true,
    sky: '#8bd0ca',
    ground: '#86502f',
    edge: '#8bd348',
    parallax: [
      { asset: 'hills', x: 180, y: 70, scale: 3 },
      { asset: 'hills', x: 700, y: 70, scale: 3 },
    ],
  },
  width: 9980,
  height: 240,
  minX: plainsTerrain.minX,
  maxX: plainsTerrain.maxX,
  start: { x: 60, y: 198 },
  finish: { x: 9880, y: 166, asset: 'finish-arch' },
  surfaces: plainsTerrain.surfaces,
  // Y is the terrain height at X (including ramps), shared with Henry’s recovery feet.
  checkpoints: [
    { id: 'checkpoint-meadow', x: 551, y: 158 },
    { id: 'checkpoint-hillside', x: 2422, y: 198 },
    { id: 'checkpoint-canyon', x: 4905, y: 178 },
    { id: 'checkpoint-cave', x: 5935, y: 198 },
    { id: 'checkpoint-orchard', x: 7712, y: 198 },
    { id: 'checkpoint-summit', x: 9145, y: 200 },
  ],
  entities: [
    { id: 'gem-001', kind: 'gem', x: 90, y: 178, asset: 'gem', layer: 'world' },
    { id: 'gem-002', kind: 'gem', x: 350, y: 137, asset: 'gem', layer: 'world' },
    { id: 'gem-003', kind: 'gem', x: 610, y: 142, asset: 'gem', layer: 'world' },
    { id: 'gem-008', kind: 'gem', x: 760, y: 133, asset: 'gem', layer: 'world' },
    { id: 'gem-004', kind: 'gem', x: 870, y: 170, asset: 'gem', layer: 'world' },
    { id: 'gem-005', kind: 'gem', x: 1130, y: 126, asset: 'gem', layer: 'world' },
    { id: 'gem-006', kind: 'gem', x: 1390, y: 138, asset: 'gem', layer: 'world' },
    { id: 'gem-007', kind: 'gem', x: 1650, y: 178, asset: 'gem', layer: 'world' },
    { id: 'gem-009', kind: 'gem', x: 1990, y: 126, asset: 'gem', layer: 'world' },
    { id: 'gem-010', kind: 'gem', x: 2250, y: 178, asset: 'gem', layer: 'world' },
    { id: 'gem-011', kind: 'gem', x: 2510, y: 174, asset: 'gem', layer: 'world' },
    { id: 'gem-016', kind: 'gem', x: 2628, y: 64, asset: 'gem', layer: 'world' },
    { id: 'gem-012', kind: 'gem', x: 2770, y: 92, asset: 'gem', layer: 'world' },
    { id: 'gem-013', kind: 'gem', x: 3030, y: 150, asset: 'gem', layer: 'world' },
    { id: 'gem-014', kind: 'gem', x: 3290, y: 158, asset: 'gem', layer: 'world' },
    { id: 'gem-015', kind: 'gem', x: 3550, y: 182, asset: 'gem', layer: 'world' },
    { id: 'gem-017', kind: 'gem', x: 3810, y: 106, asset: 'gem', layer: 'world' },
    { id: 'gem-018', kind: 'gem', x: 4070, y: 184, asset: 'gem', layer: 'world' },
    { id: 'gem-019', kind: 'gem', x: 4330, y: 131, asset: 'gem', layer: 'world' },
    { id: 'gem-024', kind: 'gem', x: 4408, y: 45, asset: 'gem', layer: 'world' },
    { id: 'gem-020', kind: 'gem', x: 4590, y: 72, asset: 'gem', layer: 'world' },
    { id: 'gem-021', kind: 'gem', x: 4850, y: 162, asset: 'gem', layer: 'world' },
    { id: 'gem-022', kind: 'gem', x: 5110, y: 178, asset: 'gem', layer: 'world' },
    { id: 'gem-023', kind: 'gem', x: 5370, y: 158, asset: 'gem', layer: 'world' },
    { id: 'gem-025', kind: 'gem', x: 5530, y: 144, asset: 'gem', layer: 'world' },
    { id: 'gem-026', kind: 'gem', x: 5790, y: 174, asset: 'gem', layer: 'world' },
    { id: 'gem-027', kind: 'gem', x: 6050, y: 169, asset: 'gem', layer: 'world' },
    { id: 'gem-032', kind: 'gem', x: 6136, y: 98, asset: 'gem', layer: 'world' },
    { id: 'gem-028', kind: 'gem', x: 6310, y: 130, asset: 'gem', layer: 'world' },
    { id: 'gem-029', kind: 'gem', x: 6570, y: 166, asset: 'gem', layer: 'world' },
    { id: 'gem-030', kind: 'gem', x: 6830, y: 154, asset: 'gem', layer: 'world' },
    { id: 'gem-031', kind: 'gem', x: 7090, y: 138, asset: 'gem', layer: 'world' },
    { id: 'gem-033', kind: 'gem', x: 7270, y: 116, asset: 'gem', layer: 'world' },
    { id: 'gem-034', kind: 'gem', x: 7530, y: 173, asset: 'gem', layer: 'world' },
    { id: 'gem-039', kind: 'gem', x: 7768, y: 146, asset: 'gem', layer: 'world' },
    { id: 'gem-035', kind: 'gem', x: 7790, y: 174, asset: 'gem', layer: 'world' },
    { id: 'gem-036', kind: 'gem', x: 8050, y: 140, asset: 'gem', layer: 'world' },
    { id: 'gem-037', kind: 'gem', x: 8310, y: 178, asset: 'gem', layer: 'world' },
    { id: 'gem-038', kind: 'gem', x: 8570, y: 147, asset: 'gem', layer: 'world' },
    { id: 'gem-040', kind: 'gem', x: 8740, y: 120, asset: 'gem', layer: 'world' },
    { id: 'gem-041', kind: 'gem', x: 9000, y: 176, asset: 'gem', layer: 'world' },
    { id: 'gem-045', kind: 'gem', x: 9182, y: 148, asset: 'gem', layer: 'world' },
    { id: 'gem-042', kind: 'gem', x: 9260, y: 157, asset: 'gem', layer: 'world' },
    { id: 'gem-043', kind: 'gem', x: 9520, y: 92, asset: 'gem', layer: 'world' },
    { id: 'gem-044', kind: 'gem', x: 9780, y: 142, asset: 'gem', layer: 'world' },
    groundedEntity({ id: 'slime-001', kind: 'slime', x: 260, asset: 'slime', layer: 'world', patrol: { minX: 230, maxX: 345, speed: 36 } }),
    groundedEntity({ id: 'slime-002', kind: 'slime', x: 960, asset: 'slime', layer: 'world', patrol: { minX: 810, maxX: 985, speed: 34 } }),
    groundedEntity({ id: 'slime-003', kind: 'slime', x: 1660, asset: 'slime', layer: 'world', patrol: { minX: 1570, maxX: 1740, speed: 42 } }),
    groundedEntity({ id: 'slime-004', kind: 'slime', x: 2160, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-005', kind: 'slime', x: 2860, asset: 'slime', layer: 'world', patrol: { minX: 2700, maxX: 2860, speed: 38 } }),
    groundedEntity({ id: 'slime-006', kind: 'slime', x: 3560, asset: 'slime', layer: 'world', patrol: { minX: 3400, maxX: 3570, speed: 46 } }),
    groundedEntity({ id: 'slime-007', kind: 'slime', x: 3980, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-008', kind: 'slime', x: 4680, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-009', kind: 'slime', x: 5700, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-010', kind: 'slime', x: 6400, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-011', kind: 'slime', x: 7440, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-012', kind: 'slime', x: 8140, asset: 'slime', layer: 'world', patrol: { minX: 7960, maxX: 8140, speed: 40 } }),
    groundedEntity({ id: 'slime-013', kind: 'slime', x: 8910, asset: 'slime', layer: 'world' }),
    groundedEntity({ id: 'slime-014', kind: 'slime', x: 9610, asset: 'slime', layer: 'world' }),
    { id: 'spring-001', kind: 'spring', x: 1558, y: 186, asset: 'spring', layer: 'world' },
    { id: 'spring-002', kind: 'spring', x: 3392, y: 186, asset: 'spring', layer: 'world' },
    { id: 'spring-003', kind: 'spring', x: 5130, y: 186, asset: 'spring', layer: 'world' },
    { id: 'spring-004', kind: 'spring', x: 6867, y: 158, asset: 'spring', layer: 'world' },
    { id: 'spring-005', kind: 'spring', x: 8385, y: 186, asset: 'spring', layer: 'world' },
    { id: 'spring-006', kind: 'spring', x: 9741, y: 154, asset: 'spring', layer: 'world' },
    { id: 'hazard-001', kind: 'hazard', x: 1045, y: 155, asset: 'stone', layer: 'world' },
    { id: 'hazard-002', kind: 'hazard', x: 2901, y: 100, asset: 'stone', layer: 'world' },
    { id: 'hazard-003', kind: 'hazard', x: 4666, y: 113, asset: 'stone', layer: 'world' },
    { id: 'hazard-004', kind: 'hazard', x: 6397, y: 143, asset: 'stone', layer: 'world' },
    { id: 'hazard-005', kind: 'hazard', x: 7989, y: 136, asset: 'stone', layer: 'world' },
    { id: 'hazard-006', kind: 'hazard', x: 9382, y: 92, asset: 'stone', layer: 'world' },
    groundedEntity({ id: 'deco-001', kind: 'decoration', x: 475, asset: 'tree', layer: 'back' }),
    groundedEntity({ id: 'deco-002', kind: 'decoration', x: 1330, asset: 'flowers', layer: 'back' }),
    groundedEntity({ id: 'deco-003', kind: 'decoration', x: 2355, asset: 'tree', layer: 'back' }),
    groundedEntity({ id: 'deco-004', kind: 'decoration', x: 3174, asset: 'bush', layer: 'back' }),
    groundedEntity({ id: 'deco-005', kind: 'decoration', x: 4150, asset: 'stone', layer: 'back' }),
    groundedEntity({ id: 'deco-006', kind: 'decoration', x: 4924, asset: 'bush', layer: 'back' }),
    groundedEntity({ id: 'deco-007', kind: 'decoration', x: 5875, asset: 'cave', layer: 'back' }),
    groundedEntity({ id: 'deco-008', kind: 'decoration', x: 6658, asset: 'stone', layer: 'back' }),
    groundedEntity({ id: 'deco-009', kind: 'decoration', x: 7548, asset: 'tree', layer: 'back' }),
    groundedEntity({ id: 'deco-010', kind: 'decoration', x: 8209, asset: 'flowers', layer: 'back' }),
    groundedEntity({ id: 'deco-011', kind: 'decoration', x: 8983, asset: 'tree', layer: 'back' }),
    groundedEntity({ id: 'deco-012', kind: 'decoration', x: 9581, asset: 'cave', layer: 'back' }),
    { id: 'checkpoint-meadow', kind: 'checkpoint', x: 551, y: 158, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-hillside', kind: 'checkpoint', x: 2422, y: 198, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-canyon', kind: 'checkpoint', x: 4905, y: 178, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-cave', kind: 'checkpoint', x: 5935, y: 198, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-orchard', kind: 'checkpoint', x: 7712, y: 198, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-summit', kind: 'checkpoint', x: 9145, y: 200, asset: 'checkpoint', layer: 'world' },
  ],
};

// Patrol slimes walk the ground they are given: bounds must stay inside the level, on
// walkable (<=45 degrees) terrain, and slow enough that Henry can always outrun them.
export const MAX_PATROL_SPEED = DEFAULT_MOVEMENT.maxSpeed / 2;
const MAX_PATROL_SLOPE = 1;

function validatePatrol(level: LevelData, entity: WorldEntity): void {
  const patrol = entity.patrol;
  if (!patrol) return;
  if (!(patrol.minX < patrol.maxX)) throw new Error(`patrol bounds are empty: ${entity.id}`);
  if (patrol.minX < level.minX || patrol.maxX > level.maxX) throw new Error(`patrol leaves the level: ${entity.id}`);
  if (entity.x < patrol.minX || entity.x > patrol.maxX) throw new Error(`patrol excludes its own entity: ${entity.id}`);
  if (patrol.speed <= 0 || patrol.speed > MAX_PATROL_SPEED) throw new Error(`patrol speed must stay catchable: ${entity.id}`);
  for (const surface of level.surfaces) {
    if (surface.x2 <= patrol.minX || surface.x1 >= patrol.maxX) continue;
    const span = surface.x2 - surface.x1;
    if (span <= 0 || Math.abs((surface.y2 - surface.y1) / span) > MAX_PATROL_SLOPE) {
      throw new Error(`patrol crosses unwalkable ground: ${entity.id}`);
    }
  }
}

const MIN_LEDGE_CLEARANCE = DEFAULT_MOVEMENT.height + 2;

function validateCrumblingLedge(level: LevelData, entity: WorldEntity): void {
  if (entity.kind !== 'crumbling-ledge') return;
  if (entity.width === undefined || !Number.isFinite(entity.width) || entity.width <= 0) {
    throw new Error(`ledge width must be positive: ${entity.id}`);
  }
  const left = entity.x - entity.width / 2;
  const right = entity.x + entity.width / 2;
  if (left < level.minX || right > level.maxX) throw new Error(`ledge leaves the level: ${entity.id}`);
  for (const x of [left, entity.x, right]) {
    const ground = surfaceY(level, x);
    if (ground - entity.y < MIN_LEDGE_CLEARANCE) throw new Error(`ledge clearance is too small: ${entity.id}`);
    if (ground - DEFAULT_MOVEMENT.height > level.height + 80) throw new Error(`ledge fall is unsafe: ${entity.id}`);
  }
  const blocker = level.entities.find((candidate) => candidate.id !== entity.id
    && (candidate.kind === 'checkpoint' || candidate.kind === 'spring')
    && candidate.x >= left && candidate.x <= right);
  if (blocker) throw new Error(`ledge overlaps ${blocker.kind}: ${entity.id}`);
}

export function validateLevel(level: LevelData): void {
  if (level.width <= 0 || level.height <= 0 || level.surfaces.length === 0) throw new Error('invalid level dimensions');
  if (level.surfaces[0].x1 !== level.minX || level.surfaces[level.surfaces.length - 1].x2 !== level.maxX) {
    throw new Error('surfaces must span level bounds');
  }
  for (const surface of level.surfaces) validateSurfaceMaterial(surface);
  for (let index = 1; index < level.surfaces.length; index++) {
    const previous = level.surfaces[index - 1];
    const current = level.surfaces[index];
    if (previous.x2 !== current.x1 || previous.y2 !== current.y1) throw new Error('surfaces must be contiguous');
  }
  const ids = new Set<string>();
  for (const entity of level.entities) {
    if (!entity.id || ids.has(entity.id)) throw new Error(`duplicate entity id: ${entity.id}`);
    ids.add(entity.id);
    if (entity.x < level.minX || entity.x > level.maxX) throw new Error(`entity outside level: ${entity.id}`);
    validatePatrol(level, entity);
    validateCrumblingLedge(level, entity);
  }
  if (level.checkpoints.length === 0) throw new Error('level requires at least one checkpoint');
  for (const checkpoint of level.checkpoints) {
    const entity = level.entities.find((candidate) => candidate.id === checkpoint.id);
    if (!entity || entity.kind !== 'checkpoint' || entity.x !== checkpoint.x || entity.y !== checkpoint.y) {
      throw new Error(`checkpoint is not planted on terrain: ${checkpoint.id}`);
    }
    if (checkpoint.y !== surfaceY(level, checkpoint.x)) throw new Error(`checkpoint is not planted on terrain: ${checkpoint.id}`);
  }
  if (level.finish.x <= level.start.x || level.finish.x > level.width) throw new Error('finish must follow start');
  validatePlatforms(level, ids);
}

function validateSurfaceMaterial(surface: Surface): void {
  const friction = surface.friction ?? 1;
  const speed = surface.speedMultiplier ?? 1;
  if (!Number.isFinite(friction) || friction < 0.25 || friction > 2) throw new Error('invalid surface friction');
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 1) throw new Error('invalid surface speed');
  if (surface.material === undefined) {
    if (friction !== 1 || speed !== 1) throw new Error('surface movement needs a visible material');
  } else if (surface.material === 'ice') {
    if (friction >= 1 || speed !== 1) throw new Error('ice must slide at normal top speed');
  } else if (surface.material === 'sand' || surface.material === 'water') {
    if (speed >= 1) throw new Error('sand and water must slow movement');
  } else throw new Error('unknown surface material');
}

function validatePlatforms(level: LevelData, entityIds: ReadonlySet<string>): void {
  const ids = new Set<string>();
  for (const platform of level.platforms ?? []) {
    if (!platform.id || ids.has(platform.id) || entityIds.has(platform.id)) throw new Error(`duplicate platform id: ${platform.id}`);
    ids.add(platform.id);
    const numbers = [platform.width, platform.seconds, platform.pause ?? 0, platform.offset ?? 0,
      platform.from.x, platform.from.y, platform.to.x, platform.to.y];
    if (!numbers.every(Number.isFinite)) throw new Error(`invalid platform timing: ${platform.id}`);
    if (platform.width <= 0 || platform.seconds <= 0 || (platform.pause ?? 0) < 0) throw new Error(`invalid platform timing: ${platform.id}`);
    // Slow and predictable beats clever: a platform Henry cannot read is a platform he cannot use.
    if (platformSpeed(platform) > PLATFORM_MAX_SPEED) throw new Error(`platform is too fast to read: ${platform.id}`);
    for (const end of [platform.from, platform.to]) {
      if (end.x < level.minX || end.x + platform.width > level.maxX) throw new Error(`platform outside level: ${platform.id}`);
      if (end.y < 0 || end.y > level.height) throw new Error(`platform outside level: ${platform.id}`);
      // A slab parked under the ground can never be boarded, so treat it as level data rot.
      if (end.y > surfaceY(level, end.x + platform.width / 2) + 1) throw new Error(`platform is buried in terrain: ${platform.id}`);
    }
  }
}
