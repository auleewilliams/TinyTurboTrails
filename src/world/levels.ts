import { surfaceY, type Terrain } from '../game/movement';
import { PLAINS_LEVEL, type LevelData, type WorldEntity } from './level';

const quarryTerrain: Terrain = {
  minX: 0,
  maxX: 2800,
  surfaces: [
    { x1: 0, x2: 300, y1: 198, y2: 198 },
    { x1: 300, x2: 500, y1: 198, y2: 120 },
    { x1: 500, x2: 850, y1: 120, y2: 120 },
    { x1: 850, x2: 1000, y1: 120, y2: 198 },
    { x1: 1000, x2: 1200, y1: 198, y2: 198 },
    { x1: 1200, x2: 1300, y1: 198, y2: 110 },
    { x1: 1300, x2: 1400, y1: 110, y2: 90 },
    { x1: 1400, x2: 1430, y1: 90, y2: 380 },
    { x1: 1430, x2: 1460, y1: 380, y2: 380 },
    { x1: 1460, x2: 1550, y1: 380, y2: 198 },
    { x1: 1550, x2: 1850, y1: 198, y2: 198 },
    { x1: 1850, x2: 2050, y1: 198, y2: 120 },
    { x1: 2050, x2: 2350, y1: 120, y2: 120 },
    { x1: 2350, x2: 2500, y1: 120, y2: 210 },
    { x1: 2500, x2: 2800, y1: 210, y2: 210 },
  ],
};

function quarryGrounded(entity: Omit<WorldEntity, 'y'>): WorldEntity {
  return { ...entity, y: surfaceY(quarryTerrain, entity.x) };
}

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
    ],
  },
  width: 2800,
  height: 240,
  minX: quarryTerrain.minX,
  maxX: quarryTerrain.maxX,
  start: { x: 60, y: 198 },
  finish: { x: 2700, y: 210, asset: 'finish-arch' },
  surfaces: quarryTerrain.surfaces,
  checkpoints: [
    { id: 'quarry-checkpoint-approach', x: 1000, y: 198 },
    { id: 'quarry-checkpoint-exit', x: 1800, y: 198 },
  ],
  entities: [
    quarryGrounded({ id: 'quarry-gem-001', kind: 'gem', x: 1020, asset: 'gem', layer: 'world' }),
    quarryGrounded({ id: 'quarry-gem-002', kind: 'gem', x: 1660, asset: 'gem', layer: 'world' }),
    quarryGrounded({ id: 'quarry-gem-003', kind: 'gem', x: 2240, asset: 'gem', layer: 'world' }),
    quarryGrounded({ id: 'quarry-spring-001', kind: 'spring', x: 650, asset: 'spring', layer: 'world' }),
    quarryGrounded({ id: 'quarry-spring-002', kind: 'spring', x: 1360, asset: 'spring', layer: 'world' }),
    quarryGrounded({ id: 'quarry-hazard-001', kind: 'hazard', x: 1120, asset: 'stone', layer: 'world' }),
    quarryGrounded({ id: 'quarry-deco-cave', kind: 'decoration', x: 560, asset: 'cave', layer: 'back' }),
    quarryGrounded({ id: 'quarry-deco-stone', kind: 'decoration', x: 1110, asset: 'stone', layer: 'back' }),
    quarryGrounded({ id: 'quarry-checkpoint-approach', kind: 'checkpoint', x: 1000, asset: 'checkpoint', layer: 'world' }),
    quarryGrounded({ id: 'quarry-checkpoint-exit', kind: 'checkpoint', x: 1800, asset: 'checkpoint', layer: 'world' }),
  ],
};

export const LEVELS: readonly LevelData[] = [PLAINS_LEVEL, QUARRY_RUN];
export const DEFAULT_LEVEL: LevelData = PLAINS_LEVEL;

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}
