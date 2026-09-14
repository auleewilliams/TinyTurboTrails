import type { Surface } from '../game/movement';

export type WorldEntityKind = 'gem' | 'slime' | 'spring' | 'checkpoint' | 'hazard' | 'decoration';
export interface WorldEntity { id: string; kind: WorldEntityKind; x: number; y: number; asset: string; layer: 'back' | 'world' | 'front' }
export interface LevelData {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  start: { x: number; y: number };
  finish: { x: number; y: number; asset: string };
  surfaces: readonly Surface[];
  checkpoints: readonly { id: string; x: number; y: number }[];
  entities: readonly WorldEntity[];
}

export const PLAINS_LEVEL: LevelData = {
  width: 2400,
  height: 240,
  minX: 0,
  maxX: 2400,
  start: { x: 48, y: 150 },
  finish: { x: 2310, y: 166, asset: 'finish-arch' },
  surfaces: [
    { x1: 0, x2: 220, y1: 198, y2: 198 }, { x1: 220, x2: 360, y1: 198, y2: 158 },
    { x1: 360, x2: 650, y1: 158, y2: 158 }, { x1: 650, x2: 780, y1: 158, y2: 198 },
    { x1: 780, x2: 1120, y1: 198, y2: 198 }, { x1: 1120, x2: 1280, y1: 198, y2: 142 },
    { x1: 1280, x2: 1570, y1: 142, y2: 142 }, { x1: 1570, x2: 1700, y1: 142, y2: 198 },
    { x1: 1700, x2: 2030, y1: 198, y2: 198 }, { x1: 2030, x2: 2140, y1: 198, y2: 170 },
    { x1: 2140, x2: 2400, y1: 170, y2: 170 },
  ],
  checkpoints: [
    { id: 'checkpoint-meadow', x: 570, y: 124 },
    { id: 'checkpoint-hillside', x: 1220, y: 108 },
    { id: 'checkpoint-cave', x: 1780, y: 164 },
  ],
  entities: [
    { id: 'gem-001', kind: 'gem', x: 150, y: 150, asset: 'gem', layer: 'world' },
    { id: 'gem-002', kind: 'gem', x: 285, y: 122, asset: 'gem', layer: 'world' },
    { id: 'gem-003', kind: 'gem', x: 470, y: 112, asset: 'gem', layer: 'world' },
    { id: 'gem-004', kind: 'gem', x: 840, y: 150, asset: 'gem', layer: 'world' },
    { id: 'gem-005', kind: 'gem', x: 1160, y: 132, asset: 'gem', layer: 'world' },
    { id: 'gem-006', kind: 'gem', x: 1450, y: 96, asset: 'gem', layer: 'world' },
    { id: 'gem-007', kind: 'gem', x: 1870, y: 150, asset: 'gem', layer: 'world' },
    { id: 'gem-008', kind: 'gem', x: 2180, y: 122, asset: 'gem', layer: 'world' },
    { id: 'slime-001', kind: 'slime', x: 430, y: 124, asset: 'slime', layer: 'world' },
    { id: 'slime-002', kind: 'slime', x: 920, y: 164, asset: 'slime', layer: 'world' },
    { id: 'slime-003', kind: 'slime', x: 1880, y: 164, asset: 'slime', layer: 'world' },
    { id: 'spring-001', kind: 'spring', x: 700, y: 180, asset: 'spring', layer: 'world' },
    { id: 'spring-002', kind: 'spring', x: 1510, y: 124, asset: 'spring', layer: 'world' },
    { id: 'hazard-001', kind: 'hazard', x: 1040, y: 178, asset: 'stone', layer: 'world' },
    { id: 'tree-001', kind: 'decoration', x: 300, y: 74, asset: 'tree', layer: 'back' },
    { id: 'tree-002', kind: 'decoration', x: 980, y: 74, asset: 'tree', layer: 'back' },
    { id: 'tree-003', kind: 'decoration', x: 1640, y: 74, asset: 'tree', layer: 'back' },
    { id: 'checkpoint-meadow', kind: 'checkpoint', x: 570, y: 124, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-hillside', kind: 'checkpoint', x: 1220, y: 108, asset: 'checkpoint', layer: 'world' },
    { id: 'checkpoint-cave', kind: 'checkpoint', x: 1780, y: 164, asset: 'checkpoint', layer: 'world' },
  ],
};

export function validateLevel(level: LevelData): void {
  if (level.width <= 0 || level.height <= 0 || level.surfaces.length === 0) throw new Error('invalid level dimensions');
  const ids = new Set<string>();
  for (const entity of level.entities) {
    if (!entity.id || ids.has(entity.id)) throw new Error(`duplicate entity id: ${entity.id}`);
    ids.add(entity.id);
    if (entity.x < 0 || entity.x > level.width) throw new Error(`entity outside level: ${entity.id}`);
  }
  if (level.checkpoints.length !== 3) throw new Error('Plains requires three checkpoints');
  for (const checkpoint of level.checkpoints) if (!ids.has(checkpoint.id)) throw new Error(`checkpoint missing entity: ${checkpoint.id}`);
  if (level.finish.x <= level.start.x || level.finish.x > level.width) throw new Error('finish must follow start');
}
