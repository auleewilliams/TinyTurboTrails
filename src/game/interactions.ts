import { DEFAULT_MOVEMENT, launchSpring, type Player } from './movement';
import type { LevelData, WorldEntity } from '../world/level';

export type RunEvent =
  | { type: 'gem'; entityId: string }
  | { type: 'checkpoint'; entityId: string }
  | { type: 'damage'; entityId?: string }
  | { type: 'spring'; entityId: string }
  | { type: 'recover' };

export interface RunState {
  collectedGems: Set<string>;
  checkpointId: string | null;
  invulnerableSeconds: number;
  entities: { id: string; active: boolean }[];
}

export function createRun(level: LevelData): RunState {
  return { collectedGems: new Set(), checkpointId: null, invulnerableSeconds: 0,
    entities: level.entities.map((entity) => ({ id: entity.id, active: true })) };
}

export function startNewRun(run: RunState, level: LevelData): void {
  run.collectedGems.clear();
  run.checkpointId = null;
  run.invulnerableSeconds = 0;
  run.entities = level.entities.map((entity) => ({ id: entity.id, active: true }));
}

export function tickRun(run: RunState, seconds: number): void {
  run.invulnerableSeconds = Math.max(0, run.invulnerableSeconds - Math.max(0, seconds));
}

export function collectGem(run: RunState, entityId: string, events: RunEvent[]): boolean {
  const entity = run.entities.find((candidate) => candidate.id === entityId);
  if (!entity || !entity.active || run.collectedGems.has(entityId)) return false;
  run.collectedGems.add(entityId);
  entity.active = false;
  events.push({ type: 'gem', entityId });
  return true;
}

export function activateCheckpoint(run: RunState, entityId: string, events: RunEvent[]): boolean {
  const entity = run.entities.find((candidate) => candidate.id === entityId);
  if (!entity || !entity.active || run.checkpointId === entityId) return false;
  run.checkpointId = entityId;
  events.push({ type: 'checkpoint', entityId });
  return true;
}

export function damagePlayer(run: RunState, player: Player, direction: number, events: RunEvent[], entityId?: string): boolean {
  if (run.invulnerableSeconds > 0) return false;
  const away = Math.sign(direction) || (player.vx >= 0 ? -1 : 1);
  player.vx = away * -220;
  player.vy = -220;
  player.onGround = false;
  run.invulnerableSeconds = 1;
  events.push({ type: 'damage', entityId });
  return true;
}

export function applySpring(run: RunState, player: Player, entityId: string, events: RunEvent[]): void {
  if (!run.entities.some((entity) => entity.id === entityId && entity.active)) return;
  launchSpring(player, DEFAULT_MOVEMENT.springVelocity);
  events.push({ type: 'spring', entityId });
}

export function recoverFromFall(run: RunState, player: Player, events: RunEvent[], level: LevelData = defaultLevel): void {
  const checkpoint = run.checkpointId ? level.checkpoints.find((candidate) => candidate.id === run.checkpointId) : undefined;
  const spawn = checkpoint ?? level.start;
  player.x = spawn.x;
  player.y = spawn.y - DEFAULT_MOVEMENT.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.coyoteSeconds = DEFAULT_MOVEMENT.coyoteSeconds;
  player.jumpBufferSeconds = 0;
  run.invulnerableSeconds = 1;
  events.push({ type: 'recover' });
}

// Kept as a lazy import-free default so tests and the runtime share one level.
import { PLAINS_LEVEL as defaultLevel } from '../world/level';

export function entityAt(level: LevelData, id: string): WorldEntity | undefined {
  return level.entities.find((entity) => entity.id === id);
}
