export const DEFAULT_MOVEMENT = {
  width: 18,
  height: 34,
  acceleration: 920,
  airAcceleration: 620,
  braking: 1200,
  downhillAcceleration: 340,
  maxSpeed: 220,
  gravity: 1500,
  jumpVelocity: 510,
  jumpCutMultiplier: 0.48,
  coyoteSeconds: 0.10,
  jumpBufferSeconds: 0.12,
  springVelocity: 620,
} as const;

export interface Surface { x1: number; x2: number; y1: number; y2: number }
export interface Terrain { minX: number; maxX: number; surfaces: readonly Surface[] }
export interface CollisionPlatform { id: string; x1: number; x2: number; y: number }
export interface MovementInput { horizontal: number; jumpPressed: boolean; jumpHeld: boolean }
export type Facing = 1 | -1;
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyoteSeconds: number;
  jumpBufferSeconds: number;
  facing: Facing;
}

export type MovementAnimation = 'idle' | 'run' | 'jump' | 'fall';

export function surfaceY(terrain: Terrain, x: number): number {
  const clamped = Math.max(terrain.minX, Math.min(terrain.maxX, x));
  const surface = terrain.surfaces.find((candidate) => clamped >= candidate.x1 && clamped <= candidate.x2)
    ?? terrain.surfaces[terrain.surfaces.length - 1];
  const span = surface.x2 - surface.x1;
  const progress = span === 0 ? 0 : (clamped - surface.x1) / span;
  return surface.y1 + (surface.y2 - surface.y1) * progress;
}

function surfaceSlope(terrain: Terrain, x: number): number {
  const surface = terrain.surfaces.find((candidate) => x >= candidate.x1 && x <= candidate.x2)
    ?? terrain.surfaces[terrain.surfaces.length - 1];
  return surface.x2 === surface.x1 ? 0 : (surface.y2 - surface.y1) / (surface.x2 - surface.x1);
}

export function createPlayer(x: number, terrain: Terrain): Player {
  return { x, y: surfaceY(terrain, x) - DEFAULT_MOVEMENT.height, vx: 0, vy: 0,
    onGround: true, coyoteSeconds: DEFAULT_MOVEMENT.coyoteSeconds, jumpBufferSeconds: 0, facing: 1 };
}

function approach(value: number, target: number, amount: number): number {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}

/** Fixed-step friendly movement. Collision is resolved in <=4px substeps. */
export function simulatePlayer(player: Player, input: MovementInput, terrain: Terrain, seconds: number,
  platforms: readonly CollisionPlatform[] = []): void {
  const dt = Math.max(0, Math.min(seconds, 0.1));
  if (input.jumpPressed) player.jumpBufferSeconds = DEFAULT_MOVEMENT.jumpBufferSeconds;
  else player.jumpBufferSeconds = Math.max(0, player.jumpBufferSeconds - dt);
  player.coyoteSeconds = player.onGround
    ? DEFAULT_MOVEMENT.coyoteSeconds
    : Math.max(0, player.coyoteSeconds - dt);

  const acceleration = player.onGround ? DEFAULT_MOVEMENT.acceleration : DEFAULT_MOVEMENT.airAcceleration;
  const target = Math.max(-1, Math.min(1, input.horizontal)) * DEFAULT_MOVEMENT.maxSpeed;
  const rate = input.horizontal === 0 ? DEFAULT_MOVEMENT.braking : acceleration;
  player.vx = approach(player.vx, target, rate * dt);
  if (player.onGround) {
    player.vx += surfaceSlope(terrain, player.x) * DEFAULT_MOVEMENT.downhillAcceleration * dt;
    player.vx = Math.max(-DEFAULT_MOVEMENT.maxSpeed, Math.min(DEFAULT_MOVEMENT.maxSpeed, player.vx));
  }
  if (player.vx > 1) player.facing = 1;
  else if (player.vx < -1) player.facing = -1;

  if (player.jumpBufferSeconds > 0 && (player.onGround || player.coyoteSeconds > 0)) {
    player.vy = -DEFAULT_MOVEMENT.jumpVelocity;
    player.onGround = false;
    player.coyoteSeconds = 0;
    player.jumpBufferSeconds = 0;
  }

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(player.vx * dt), Math.abs(player.vy * dt)) / 4));
  const step = dt / steps;
  for (let index = 0; index < steps; index++) {
    player.x += player.vx * step;
    if (player.x < terrain.minX) { player.x = terrain.minX; player.vx = Math.max(0, player.vx); }
    if (player.x > terrain.maxX) { player.x = terrain.maxX; player.vx = Math.min(0, player.vx); }

    if (!input.jumpHeld && player.vy < 0) player.vy += DEFAULT_MOVEMENT.gravity * (1 - DEFAULT_MOVEMENT.jumpCutMultiplier) * step;
    player.vy += DEFAULT_MOVEMENT.gravity * step;
    const previousFeet = player.y + DEFAULT_MOVEMENT.height;
    player.y += player.vy * step;
    const ground = surfaceY(terrain, player.x);
    const feet = player.y + DEFAULT_MOVEMENT.height;
    let landingY = feet >= ground ? ground : Number.POSITIVE_INFINITY;
    if (player.vy >= 0) {
      for (const platform of platforms) {
        const inside = player.x >= platform.x1 && player.x <= platform.x2;
        if (inside && previousFeet <= platform.y && feet >= platform.y) landingY = Math.min(landingY, platform.y);
      }
    }
    if (player.vy >= 0 && Number.isFinite(landingY)) {
      player.y = landingY - DEFAULT_MOVEMENT.height;
      player.vy = 0;
      player.onGround = true;
      player.coyoteSeconds = DEFAULT_MOVEMENT.coyoteSeconds;
    } else {
      player.onGround = false;
    }
  }
}

export function launchSpring(player: Player, velocity = DEFAULT_MOVEMENT.springVelocity): void {
  player.vy = -Math.abs(velocity);
  player.onGround = false;
  player.coyoteSeconds = 0;
  player.jumpBufferSeconds = 0;
}

export function animationFor(player: Player): MovementAnimation {
  if (player.vy < -1) return 'jump';
  if (player.vy > 1) return 'fall';
  if (Math.abs(player.vx) > 8) return 'run';
  return 'idle';
}
