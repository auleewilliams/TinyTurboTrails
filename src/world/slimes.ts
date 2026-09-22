import type { Terrain, Surface } from '../game/movement';
import type { LevelData } from './level';

export type SlimeAccessory = 'straw' | 'miner' | 'leaf' | 'hard-hat' | 'bobble' | 'snorkel';
export const SLIME_SPEED = 36;
export const SLIME_BODY_WIDTH = 32;
export const SLIME_EDGE_CLEARANCE = SLIME_BODY_WIDTH / 2 + 4;
export const SLIME_PATROL_RADIUS = 60;

const walkable = (surface: Surface): boolean => surface.x2 > surface.x1
  && Math.abs(surface.y2 - surface.y1) <= surface.x2 - surface.x1;

/** Connected walkable ground, inset far enough to keep the entire body off an edge. */
export function slimeGroundBounds(terrain: Terrain, x: number): { minX: number; maxX: number } {
  const surfaces = terrain.surfaces;
  let first = surfaces.findIndex((surface) => x >= surface.x1 && x <= surface.x2 && walkable(surface));
  if (first < 0) throw new Error(`slime has no walkable ground at ${x}`);
  let last = first;
  while (first > 0 && walkable(surfaces[first - 1])
    && surfaces[first - 1].x2 === surfaces[first].x1 && surfaces[first - 1].y2 === surfaces[first].y1) first--;
  while (last + 1 < surfaces.length && walkable(surfaces[last + 1])
    && surfaces[last].x2 === surfaces[last + 1].x1 && surfaces[last].y2 === surfaces[last + 1].y1) last++;
  return { minX: surfaces[first].x1 + SLIME_EDGE_CLEARANCE, maxX: surfaces[last].x2 - SLIME_EDGE_CLEARANCE };
}

/** Author short patrols once, keeping run state and presentation independent. */
export function withSlimePatrols(level: LevelData): LevelData {
  return { ...level, entities: level.entities.map((entity) => {
    if (entity.kind !== 'slime') return entity;
    const ground = slimeGroundBounds(level, entity.x);
    let minX = Math.max(ground.minX, entity.x - SLIME_PATROL_RADIUS, entity.patrol?.minX ?? -Infinity);
    let maxX = Math.min(ground.maxX, entity.x + SLIME_PATROL_RADIUS, entity.patrol?.maxX ?? Infinity);
    const keepClear = (left: number, right: number): void => {
      if (entity.x < left) maxX = Math.min(maxX, left);
      else if (entity.x > right) minX = Math.max(minX, right);
      else throw new Error(`slime overlaps a protected area: ${entity.id}`);
    };
    for (const checkpoint of level.checkpoints) keepClear(checkpoint.x - 60, checkpoint.x + 60);
    for (const spring of level.entities.filter((candidate) => candidate.kind === 'spring')) {
      keepClear(spring.x - 40, spring.x + 40);
    }
    for (const cue of level.challengeCues ?? []) {
      if (cue.landingWidth) keepClear(cue.x - cue.landingWidth / 2 - 20, cue.x + cue.landingWidth / 2 + 20);
    }
    if (minX >= maxX || entity.x < minX || entity.x > maxX) throw new Error(`slime has no safe patrol: ${entity.id}`);
    return { ...entity, patrol: { minX, maxX, speed: SLIME_SPEED } };
  }) };
}
