import { PLAINS_LEVEL, type LevelData } from './level';
import { FROST_RIDGE } from './frost-ridge';
import { SANDY_COVE } from './sandy-cove';
export { FROST_RIDGE, SANDY_COVE };
import { SUNSET_SITE } from './sunset-site';

export { QUARRY_RUN } from './quarry-run';
import { QUARRY_RUN } from './quarry-run';

export { TREETOP_TIMBERS } from './treetop-timbers';
import { TREETOP_TIMBERS } from './treetop-timbers';

export { SUNSET_SITE };
export const LEVELS: readonly LevelData[] = [PLAINS_LEVEL, QUARRY_RUN, TREETOP_TIMBERS, SUNSET_SITE, FROST_RIDGE, SANDY_COVE];
export const DEFAULT_LEVEL: LevelData = PLAINS_LEVEL;

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}
