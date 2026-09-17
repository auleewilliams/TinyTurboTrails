import { PLAINS_LEVEL, type LevelData } from './level';

export const LEVELS: readonly LevelData[] = [PLAINS_LEVEL];
export const DEFAULT_LEVEL: LevelData = PLAINS_LEVEL;

export function levelById(id: string): LevelData | undefined {
  return LEVELS.find((level) => level.id === id);
}
