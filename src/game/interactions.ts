import { DEFAULT_MOVEMENT, launchSpring, surfaceY, type CollisionPlatform, type Player } from './movement';
import type { LevelData, WorldEntity } from '../world/level';

export type RunEvent =
  | { type: 'gem'; entityId: string }
  | { type: 'checkpoint'; entityId: string }
  | { type: 'damage'; entityId?: string }
  | { type: 'spring'; entityId: string }
  | { type: 'recover' };

export const CRUMBLE_WARNING_SECONDS = 0.75;
export type CrumblingLedgePhase = 'stable' | 'warning' | 'crumbled';

/** Live position and transient behavior of a level entity. */
export interface EntityState {
  id: string;
  active: boolean;
  x: number;
  y: number;
  direction: 1 | -1;
  ledgePhase?: CrumblingLedgePhase;
  ledgeSeconds?: number;
}

export interface RunState {
  collectedGems: Set<string>;
  springContacts: Set<string>;
  checkpointId: string | null;
  invulnerableSeconds: number;
  entities: EntityState[];
}

/** Henry's sprite stands 34px below his origin; entity anchors sit on the terrain. */
const CONTACT = { x: 18, y: 28, feet: 34 } as const;

function placeEntities(level: LevelData): EntityState[] {
  return level.entities.map((entity) => ({
    id: entity.id, active: true, x: entity.x, y: entity.y, direction: 1,
    ...(entity.kind === 'crumbling-ledge' ? { ledgePhase: 'stable' as const, ledgeSeconds: 0 } : {}),
  }));
}

export function createRun(level: LevelData): RunState {
  return { collectedGems: new Set(), springContacts: new Set(), checkpointId: null, invulnerableSeconds: 0,
    entities: placeEntities(level) };
}

export function startNewRun(run: RunState, level: LevelData): void {
  run.collectedGems.clear();
  run.springContacts.clear();
  run.checkpointId = null;
  run.invulnerableSeconds = 0;
  run.entities = placeEntities(level);
}

export function entityState(run: RunState, entityId: string): EntityState | undefined {
  return run.entities.find((candidate) => candidate.id === entityId);
}

export function activeLedgePlatforms(run: RunState, level: LevelData): CollisionPlatform[] {
  return level.entities.flatMap((entity) => {
    if (entity.kind !== 'crumbling-ledge' || entity.width === undefined) return [];
    const state = entityState(run, entity.id);
    if (!state?.active || state.ledgePhase === 'crumbled') return [];
    return [{ id: entity.id, x1: entity.x - entity.width / 2, x2: entity.x + entity.width / 2, y: entity.y }];
  });
}

export function ledgeWarningProgress(run: RunState, entityId: string): number {
  const state = entityState(run, entityId);
  if (state?.ledgePhase !== 'warning') return state?.ledgePhase === 'crumbled' ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - (state.ledgeSeconds ?? 0) / CRUMBLE_WARNING_SECONDS));
}

/** Where the entity is right now, for contact tests and drawing. */
export function entityPosition(run: RunState, entity: WorldEntity): { x: number; y: number } {
  const state = entityState(run, entity.id);
  return state ? { x: state.x, y: state.y } : { x: entity.x, y: entity.y };
}

export function touchesPlayer(player: Player, x: number, y: number): boolean {
  return Math.abs(x - player.x) <= CONTACT.x && Math.abs(y - (player.y + CONTACT.feet)) <= CONTACT.y;
}

/** Walk patrolling entities between their bounds, hugging the terrain they stand on. */
export function advancePatrols(run: RunState, level: LevelData, seconds: number): void {
  const dt = Math.max(0, Math.min(seconds, 0.1));
  for (const entity of level.entities) {
    const patrol = entity.patrol;
    const state = entityState(run, entity.id);
    if (!patrol || !state) continue;
    state.x += patrol.speed * state.direction * dt;
    if (state.x <= patrol.minX) { state.x = patrol.minX; state.direction = 1; }
    else if (state.x >= patrol.maxX) { state.x = patrol.maxX; state.direction = -1; }
    state.y = surfaceY(level, state.x);
  }
}

/** One gameplay step of the world against Henry: patrols move, then contacts resolve. */
export function stepEntities(run: RunState, level: LevelData, player: Player, seconds: number, events: RunEvent[]): void {
  advancePatrols(run, level, seconds);
  for (const entity of level.entities) {
    const state = entityState(run, entity.id);
    const { x, y } = state ?? entity;
    const touching = touchesPlayer(player, x, y);
    if (entity.kind === 'crumbling-ledge') {
      const halfWidth = (entity.width ?? 0) / 2;
      const standing = player.onGround && Math.abs(player.y + DEFAULT_MOVEMENT.height - y) < 0.01
        && player.x >= x - halfWidth && player.x <= x + halfWidth;
      if (state?.active && state.ledgePhase === 'stable' && standing) {
        state.ledgePhase = 'warning';
        state.ledgeSeconds = CRUMBLE_WARNING_SECONDS;
      }
      continue;
    }
    if (entity.kind === 'spring') {
      applySpring(run, player, entity.id, events, touching);
      continue;
    }
    if (!state?.active || !touching) continue;
    if (entity.kind === 'gem') collectGem(run, entity.id, events);
    else if (entity.kind === 'checkpoint') activateCheckpoint(run, entity.id, events);
    else if (entity.kind === 'slime' || entity.kind === 'hazard') damagePlayer(run, player, x - player.x, events, entity.id);
  }
}

export function tickRun(run: RunState, seconds: number): void {
  const dt = Math.max(0, seconds);
  run.invulnerableSeconds = Math.max(0, run.invulnerableSeconds - dt);
  for (const state of run.entities) {
    if (state.ledgePhase !== 'warning') continue;
    state.ledgeSeconds = Math.max(0, (state.ledgeSeconds ?? 0) - dt);
    if (state.ledgeSeconds === 0) {
      state.ledgePhase = 'crumbled';
      state.active = false;
    }
  }
}

export function collectGem(run: RunState, entityId: string, events: RunEvent[]): boolean {
  const entity = entityState(run, entityId);
  if (!entity || !entity.active || run.collectedGems.has(entityId)) return false;
  run.collectedGems.add(entityId);
  entity.active = false;
  events.push({ type: 'gem', entityId });
  return true;
}

/** Entities the run has consumed stop being drawn; unknown IDs stay visible. */
export function isEntityActive(run: RunState, entityId: string): boolean {
  return entityState(run, entityId)?.active ?? true;
}

export function activateCheckpoint(run: RunState, entityId: string, events: RunEvent[]): boolean {
  const entity = entityState(run, entityId);
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

/** Call every step, including separation, so each contact launches exactly once. */
export function applySpring(run: RunState, player: Player, entityId: string, events: RunEvent[], touching = true): void {
  if (!touching) {
    run.springContacts.delete(entityId);
    return;
  }
  if (run.springContacts.has(entityId)) return;
  if (!run.entities.some((entity) => entity.id === entityId && entity.active)) return;
  run.springContacts.add(entityId);
  launchSpring(player, DEFAULT_MOVEMENT.springVelocity);
  events.push({ type: 'spring', entityId });
}

export function recoverFromFall(run: RunState, player: Player, events: RunEvent[], level: LevelData): void {
  run.springContacts.clear();
  for (const state of run.entities) {
    if (state.ledgePhase === undefined) continue;
    state.active = true;
    state.ledgePhase = 'stable';
    state.ledgeSeconds = 0;
  }
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

export function entityAt(level: LevelData, id: string): WorldEntity | undefined {
  return level.entities.find((entity) => entity.id === id);
}
