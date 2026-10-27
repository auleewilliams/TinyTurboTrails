import { withSlimePatrols, slimeGroundBounds, SLIME_SPEED, type SlimeAccessory } from './slimes';
import { DEFAULT_MOVEMENT, MAX_SURFACE_FRICTION, MIN_SURFACE_FRICTION, surfaceY, type Surface } from '../game/movement';
import { PLATFORM_MAX_SPEED, platformSpeed, type MovingPlatform } from '../game/platforms';
import type { WorldAsset } from './assets';

/** Legacy 'hazard' tags identify static artwork props, now harmless pass-through scenery (#191). */
export type WorldEntityKind = 'gem' | 'special' | 'slime' | 'spring' | 'checkpoint' | 'hazard' | 'decoration' | 'crumbling-ledge';
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
  /** One gentle rise and fall per period, sampled from the run clock. */
  bounce?: { amplitude: number; seconds: number };
  width?: number;
}
/** A low sun drawn behind the parallax; it drifts at a fraction of the camera so it feels far away. */
export interface LevelSun { x: number; y: number; radius: number; color: string; glow: string }
/** Decorative air only; speeds are pixels per run second, with distant parallax. */
export interface LevelWeather {
  kind: 'snow' | 'leaves' | 'dust' | 'spray';
  count: number;
  color: string;
  drift: number;
  fall: number;
  sway: number;
}
export interface LevelTheme {
  weather?: LevelWeather;
  slimeAccessory?: SlimeAccessory;
  material?: 'soil' | 'stone' | 'wood' | 'gravel' | 'frost' | 'sand';
  materialSections?: readonly { from: number; to: number; material: NonNullable<LevelTheme['material']> }[];
  scenery?: boolean;
  /** A row in the shared two-row panorama and its world-support tint. */
  backdrop?: { row: number; support: string };
  sky: string;
  ground: string;
  edge: string;
  sun?: LevelSun;
  parallax: readonly { asset: WorldAsset; x: number; y: number; scale: number }[];
}
export interface LevelData {
  /** Gold terrain markings for safe landings; also kept clear of slime patrols. */
  landingBands?: readonly { x: number; width: number }[];
  id: string;
  name: string;
  atlas: string;
  theme: LevelTheme;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  start: { x: number; y: number };
  finish: { x: number; y: number; asset: string; supportOnly?: boolean; boundedWidth?: number; rearmBelowY?: number; rearmLeftX?: number };
  /** Vertical trails measure progress by feet height; horizontal trails keep their defaults. */
  progressAxis?: 'y';
  checkpointActivation?: 'grounded';
  /** Safe fixed support used by the existing Find more letters action. */
  retrace?: { x: number; y: number };
  surfaces: readonly Surface[];
  checkpoints: readonly { id: string; x: number; y: number }[];
  entities: readonly WorldEntity[];
  /** Slabs that move on a fixed path. Omitted by levels built from terrain alone. */
  platforms?: readonly MovingPlatform[];
}

// Approved compact first pilot (#218): five continuous sections, no added mechanics.
const plainsContour: readonly (readonly [number, number])[] = [
  [0, 206], [180, 206], [220, 194], [260, 180], [300, 174],
  [340, 180], [380, 200], [420, 206], [460, 198], [500, 180],
  [540, 170], [580, 174], [620, 188], [660, 204], [700, 206],
  [760, 206], [820, 206], [880, 190], [940, 162], [980, 148],
  [1020, 142], [1060, 144], [1100, 154], [1140, 178], [1180, 202],
  [1220, 218], [1440, 218], [1500, 210], [1560, 202], [1620, 186],
  [1660, 180], [1700, 184], [1760, 206], [1800, 220], [1900, 224],
  [1960, 224], [2010, 212], [2070, 182], [2120, 176], [2170, 186],
  [2230, 208], [2290, 220], [2400, 220], [2480, 212], [2540, 196],
  [2600, 192], [2660, 200], [2720, 220], [2780, 220], [2840, 218],
  [2910, 200], [2980, 188], [3040, 192], [3100, 204], [3300, 204],
  [3390, 198], [3470, 180], [3530, 176], [3590, 176], [3680, 152],
  [3730, 148], [3810, 148], [3910, 132], [3970, 128], [4140, 128],
  [4300, 128],
];
const plainsTerrain = {
  minX: 0,
  maxX: 4300,
  surfaces: plainsContour.slice(1).map(([x2, y2], index): Surface => {
    const [x1, y1] = plainsContour[index];
    return { x1, x2, y1, y2 };
  }),
};

// Visible-base art and respawn feet share the authored terrain height.
function groundedEntity(entity: Omit<WorldEntity, 'y'>): WorldEntity {
  return { ...entity, y: surfaceY(plainsTerrain, entity.x) };
}
const plainsCheckpoints = [
  { id: 'checkpoint-meadow', x: 740, y: 206 },
  { id: 'checkpoint-hillside', x: 1430, y: 218 },
  { id: 'checkpoint-orchard', x: 2370, y: 220 },
  { id: 'checkpoint-summit', x: 3260, y: 204 },
];
const plainsGemPositions: readonly (readonly [number, number])[] = [
  [95, 188], [140, 188], [180, 188], [330, 120], [370, 96],
  [410, 118], [550, 153], [610, 167], [900, 163], [980, 130],
  [1120, 85], [1190, 90], [1300, 200], [1345, 200], [1390, 200],
  [1535, 187], [1620, 168], [1730, 177], [1830, 203], [1990, 199],
  [2080, 158], [2250, 194], [2470, 195], [2560, 177], [2770, 160],
  [2840, 151], [2945, 176], [3060, 178], [3410, 176], [3500, 160],
  [3650, 142], [3860, 122], [4050, 110],
];

export const PLAINS_LEVEL: LevelData = withSlimePatrols({
  id: 'plains',
  name: 'PLAINS',
  atlas: 'plains',
  theme: {
    slimeAccessory: 'straw',
    material: 'soil',
    scenery: true,
    sky: '#8bd0ca',
    ground: '#86502f',
    edge: '#8bd348',
    parallax: [
      { asset: 'hills', x: 180, y: 70, scale: 3 },
      { asset: 'hills', x: 700, y: 70, scale: 3 },
    ],
  },
  width: 4300,
  height: 240,
  minX: plainsTerrain.minX,
  maxX: plainsTerrain.maxX,
  start: { x: 60, y: 206 },
  finish: { x: 4230, y: 128, asset: 'finish-arch' },
  surfaces: plainsTerrain.surfaces,
  landingBands: [{ x: 1320, width: 180 }],
  checkpoints: plainsCheckpoints,
  entities: [
    ...[[1150, 78], [1930, 150], [2800, 135]].map(([x, y], index): WorldEntity => ({
      id: `plains-special-${index + 1}`, kind: 'special', x, y, asset: 'special', layer: 'world',
    })),
    ...plainsGemPositions.map(([x, y], index): WorldEntity => ({
      id: `gem-${String(index + 1).padStart(3, '0')}`, kind: 'gem', x, y, asset: 'gem', layer: 'world',
    })),
    // One short orchard encounter. Whole bodies stay within x1704–1796,
    // outside the star's x1840–2030 approach/return and every letter/checkpoint.
    groundedEntity({ id: 'slime-003', kind: 'slime', x: 1750, asset: 'slime', layer: 'world',
      patrol: { minX: 1720, maxX: 1780, speed: SLIME_SPEED } }),
    groundedEntity({ id: 'spring-001', kind: 'spring', x: 2760, asset: 'spring', layer: 'world' }),
    ...[
      [240, 'flowers'], [470, 'bush'], [800, 'stone'],
      [1550, 'tree'], [1670, 'tree'], [2100, 'tree'], [2310, 'bush'],
      [2530, 'flowers'], [3350, 'stone'], [3550, 'bush'], [3980, 'flowers'],
    ].map(([x, asset], index) => groundedEntity({ id: `deco-${String(index + 1).padStart(3, '0')}`,
      kind: 'decoration', x: x as number, asset: asset as string, layer: 'back' })),
    ...plainsCheckpoints.map(({ id, x }) => groundedEntity({ id, kind: 'checkpoint', x, asset: 'checkpoint', layer: 'world' })),
  ],
});

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
  if (![patrol.minX, patrol.maxX, patrol.speed].every(Number.isFinite)) throw new Error(`invalid patrol numbers: ${entity.id}`);
  if (entity.kind === 'slime') {
    const ground = slimeGroundBounds(level, entity.x);
    if (patrol.minX < ground.minX || patrol.maxX > ground.maxX) throw new Error(`patrol crosses unwalkable ground or lacks edge clearance: ${entity.id}`);
  }
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

/** A whole standing body must fit on permanent support, never an absent lift. */
export function hasFixedSupport(level: LevelData, point: { x: number; y: number }): boolean {
  const left = point.x - DEFAULT_MOVEMENT.width / 2;
  const right = point.x + DEFAULT_MOVEMENT.width / 2;
  if (left < level.minX || right > level.maxX) return false;
  if ((level.platforms ?? []).some(platform => platform.from.x === platform.to.x
    && platform.from.y === platform.to.y && platform.from.y === point.y
    && platform.from.x <= left && platform.from.x + platform.width >= right)) return true;
  // Sample the whole footprint, including any surface boundary under the body.
  const samples = [left, point.x, right, ...level.surfaces.flatMap(surface =>
    [surface.x1, surface.x2].filter(x => x > left && x < right))];
  return samples.every(x => Math.abs(surfaceY(level, x) - point.y) < 0.01);
}

export function validateLevel(level: LevelData): void {
  if (level.theme.backdrop && (!Number.isInteger(level.theme.backdrop.row) ||
    level.theme.backdrop.row < 0 || level.theme.backdrop.row >= 2)) {
    throw new Error('backdrop row is outside the shared sheet');
  }
  const specials = level.entities.filter((entity) => entity.kind === 'special');
  if (specials.length !== 0 && specials.length !== 3) throw new Error('a special trail requires exactly three stars');
  for (const special of specials) {
    if (!Number.isFinite(special.y) || special.y < 0 || special.y > level.height) throw new Error(`invalid special position: ${special.id}`);
  }
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
    if (entity.kind === 'spring' && entity.y !== surfaceY(level, entity.x)
      && !hasFixedSupport(level, entity)) {
      throw new Error(`spring lacks fixed support: ${entity.id}`);
    }
    validatePatrol(level, entity);
    if (entity.bounce) {
      const { amplitude, seconds } = entity.bounce;
      if (entity.kind !== 'slime' || !Number.isFinite(amplitude) || amplitude <= 0 || amplitude > 12
        || !Number.isFinite(seconds) || seconds < 1 || seconds > 4) {
        throw new Error(`invalid creature bounce: ${entity.id}`);
      }
    }
    validateCrumblingLedge(level, entity);
  }
  if (level.checkpoints.length === 0) throw new Error('level requires at least one checkpoint');
  for (const checkpoint of level.checkpoints) {
    const entity = level.entities.find((candidate) => candidate.id === checkpoint.id);
    if (!entity || entity.kind !== 'checkpoint' || entity.x !== checkpoint.x || entity.y !== checkpoint.y) {
      throw new Error(`checkpoint is not planted on terrain: ${checkpoint.id}`);
    }
    if (level.checkpointActivation === 'grounded' ? !hasFixedSupport(level, checkpoint)
      : checkpoint.y !== surfaceY(level, checkpoint.x)) throw new Error(`checkpoint lacks fixed support: ${checkpoint.id}`);
  }
  if (level.progressAxis === 'y' && !hasFixedSupport(level, level.start)) throw new Error('start lacks fixed support');
  if (level.finish.supportOnly && !hasFixedSupport(level, level.finish)) throw new Error('finish lacks fixed support');
  if (level.finish.boundedWidth !== undefined && (!Number.isFinite(level.finish.boundedWidth)
    || level.finish.boundedWidth <= 0 || level.finish.x + level.finish.boundedWidth > level.maxX)) {
    throw new Error('finish bounds are invalid');
  }
  if (level.finish.rearmBelowY !== undefined && (level.progressAxis !== 'y'
    || level.finish.rearmBelowY <= level.finish.y + DEFAULT_MOVEMENT.height)) {
    throw new Error('finish rearm height is invalid');
  }
  if (level.finish.rearmLeftX !== undefined && (level.progressAxis !== 'y' || !level.retrace
    || level.finish.rearmLeftX >= level.retrace.x || level.finish.rearmLeftX < level.minX)) {
    throw new Error('finish left rearm point is invalid');
  }
  if (level.retrace && (!hasFixedSupport(level, level.retrace) || level.retrace.x >= level.finish.x - 28)) {
    throw new Error('retrace requires safe fixed support outside the finish');
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
    // Generic grip has automatic cues; stronger biome tuning needs a material.
    if (friction < MIN_SURFACE_FRICTION || friction > MAX_SURFACE_FRICTION) {
      throw new Error(`surface friction must be between ${MIN_SURFACE_FRICTION} and ${MAX_SURFACE_FRICTION}`);
    }
    if (speed !== 1) throw new Error('surface movement needs a visible material');
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
