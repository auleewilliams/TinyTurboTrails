import { surfaceY, type Surface, type Terrain } from '../game/movement';
import type { WorldEntity } from './level';

/** A ground profile authored as [x, y] points; consecutive points become contiguous surfaces. */
export type Contour = readonly (readonly [number, number])[];
export type DecorationAsset = 'cave' | 'bush' | 'tree' | 'flowers';
export interface Checkpoint { id: string; x: number; y: number }

export function contourTerrain(contour: Contour): Terrain {
  return {
    minX: contour[0][0],
    maxX: contour[contour.length - 1][0],
    surfaces: contour.slice(1).map(([x2, y2], index): Surface => {
      const [x1, y1] = contour[index];
      return { x1, x2, y1, y2 };
    }),
  };
}

/** Entity builders that plant everything on one level's terrain, so authored data cannot float. */
export function levelKit(terrain: Terrain) {
  const grounded = (entity: Omit<WorldEntity, 'y'>): WorldEntity => ({ ...entity, y: surfaceY(terrain, entity.x) });
  return {
    grounded,
    // Main-route gems float inside the walking activation window; bonus gems need a jump.
    // Secret gems above a pit measure their lift from the spring ledge at `baseX`.
    gem: (id: string, x: number, lift = 18, baseX = x): WorldEntity =>
      ({ id, kind: 'gem', x, y: surfaceY(terrain, baseX) - lift, asset: 'gem', layer: 'world' }),
    thing: (kind: 'slime' | 'spring' | 'hazard', id: string, x: number, patrol?: WorldEntity['patrol']): WorldEntity =>
      grounded({ id, kind, x, asset: kind === 'hazard' ? 'stone' : kind, layer: 'world', ...(patrol && { patrol }) }),
    // Scenery avoids the stone sprite so it never reads as a hazard.
    decoration: (id: string, x: number, asset: DecorationAsset): WorldEntity =>
      grounded({ id, kind: 'decoration', x, asset, layer: 'back' }),
    checkpoints: (planted: readonly { id: string; x: number }[]): Checkpoint[] =>
      planted.map(({ id, x }) => ({ id, x, y: surfaceY(terrain, x) })),
    checkpointEntities: (checkpoints: readonly Checkpoint[]): WorldEntity[] =>
      checkpoints.map(({ id, x }) => grounded({ id, kind: 'checkpoint', x, asset: 'checkpoint', layer: 'world' })),
  };
}
