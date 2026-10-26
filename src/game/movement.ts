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

/** Longest step the simulation integrates in one update; the run clock uses the same cap. */
export const MAX_STEP_SECONDS = 0.1;

export const MIN_SURFACE_FRICTION = 0.6;
export const MAX_SURFACE_FRICTION = 1.4;

export type SurfaceMaterial = 'ice' | 'sand' | 'water';
export interface Surface {
  x1: number; x2: number; y1: number; y2: number;
  /** Ground acceleration and braking multiplier; omitted means normal grip (1). */
  friction?: number;
  speedMultiplier?: number;
  material?: SurfaceMaterial;
}
/** A moving platform sampled at one moment: a solid top face plus the velocity it carries riders with. */
export interface PlatformBody { id: string; x: number; y: number; width: number; height: number; vx: number; vy: number }
export interface Terrain { minX: number; maxX: number; surfaces: readonly Surface[] }
export interface CollisionPlatform { id: string; x1: number; x2: number; y: number }
export interface MovementInput { horizontal: number; jumpPressed: boolean; jumpHeld: boolean }
/** Resolved movement substeps, including terrain/platform stops, for swept contacts. */
export interface MovementSegment { from: { x: number; y: number }; to: { x: number; y: number }; falling: boolean }
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
  /** Platform carrying Henry, or null when terrain or open air holds him. */
  platformId: string | null;
  /** Horizontal velocity of whatever Henry is standing on; zero on terrain. */
  groundVelocityX: number;
  /** Automatic squash launches ignore variable-jump gravity until landing. */
  squashBounce?: boolean;
}

/** Vertical slack that keeps Henry glued to the platform he is already riding. */
export const PLATFORM_RIDE_SNAP = 6;

export type MovementAnimation = 'idle' | 'run' | 'jump' | 'fall';

/** At a shared endpoint the first segment wins, matching terrain collision. */
export function surfaceAt(terrain: Terrain, x: number): Surface {
  const clamped = Math.max(terrain.minX, Math.min(terrain.maxX, x));
  return terrain.surfaces.find((candidate) => clamped >= candidate.x1 && clamped <= candidate.x2)
    ?? terrain.surfaces[terrain.surfaces.length - 1];
}

function surfaceSlope(surface: Surface): number {
  return surface.x2 === surface.x1 ? 0 : (surface.y2 - surface.y1) / (surface.x2 - surface.x1);
}

function heightOnSurface(surface: Surface, x: number): number {
  return surface.y1 + surfaceSlope(surface) * (x - surface.x1);
}

export function surfaceY(terrain: Terrain, x: number): number {
  const clamped = Math.max(terrain.minX, Math.min(terrain.maxX, x));
  return heightOnSurface(surfaceAt(terrain, clamped), clamped);
}

export function createPlayer(x: number, terrain: Terrain, supportY = surfaceY(terrain, x)): Player {
  return { x, y: supportY - DEFAULT_MOVEMENT.height, vx: 0, vy: 0,
    onGround: true, coyoteSeconds: DEFAULT_MOVEMENT.coyoteSeconds, jumpBufferSeconds: 0, facing: 1,
    platformId: null, groundVelocityX: 0 };
}

/** Leave whatever was carrying Henry; a launch, a knockback or a respawn all stop the ride. */
export function detachFromGround(player: Player): void {
  player.platformId = null;
  player.groundVelocityX = 0;
}

function ridingPlatform(player: Player, platforms: readonly PlatformBody[]): PlatformBody | undefined {
  return player.platformId === null ? undefined : platforms.find((platform) => platform.id === player.platformId);
}

/** The highest platform top Henry has just crossed, or is already riding. Landing is one-way. */
function platformSupport(player: Player, platforms: readonly PlatformBody[], previousFeet: number, ground: number): PlatformBody | undefined {
  if (player.vy < 0) return undefined;
  const feet = player.y + DEFAULT_MOVEMENT.height;
  const half = DEFAULT_MOVEMENT.width / 2;
  let support: PlatformBody | undefined;
  for (const platform of platforms) {
    // A slab below the ground here cannot be stood on: terrain already holds Henry up.
    if (platform.y > ground + 1) continue;
    if (player.x + half <= platform.x || player.x - half >= platform.x + platform.width) continue;
    const crossed = previousFeet <= platform.y + 1 && feet >= platform.y;
    const carried = player.platformId === platform.id && Math.abs(feet - platform.y) <= PLATFORM_RIDE_SNAP;
    if (!crossed && !carried) continue;
    // Retain a moving carriage across overlapping stationary one-way catches.
    // Normal falls still choose the highest crossed top; walking clear detaches.
    if (player.platformId === platform.id && (platform.vx !== 0 || platform.vy !== 0)) return platform;
    if (!support || platform.y < support.y) support = platform;
  }
  return support;
}

function approach(value: number, target: number, amount: number): number {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}

/**
 * Fixed-step friendly movement. Collision is resolved in <=4px substeps: terrain first,
 * then the moving platforms the caller sampled for this moment.
 */
export function simulatePlayer(player: Player, input: MovementInput, terrain: Terrain, seconds: number,
  platforms: readonly (PlatformBody | CollisionPlatform)[] = []): MovementSegment[] {
  const dt = Math.max(0, Math.min(seconds, MAX_STEP_SECONDS));
  // Static ledges use the same one-way support selection as moving slabs.
  const bodies: readonly PlatformBody[] = platforms.map((platform) => 'width' in platform ? platform : {
    id: platform.id, x: platform.x1, y: platform.y, width: platform.x2 - platform.x1,
    height: 0, vx: 0, vy: 0,
  });
  if (input.jumpPressed) player.jumpBufferSeconds = DEFAULT_MOVEMENT.jumpBufferSeconds;
  else player.jumpBufferSeconds = Math.max(0, player.jumpBufferSeconds - dt);
  player.coyoteSeconds = player.onGround
    ? DEFAULT_MOVEMENT.coyoteSeconds
    : Math.max(0, player.coyoteSeconds - dt);

  const surface = surfaceAt(terrain, player.x);
  const standingOnTerrain = player.onGround && player.platformId === null
    && Math.abs(player.y + DEFAULT_MOVEMENT.height - heightOnSurface(surface, player.x)) < 0.01;
  const friction = standingOnTerrain ? surface.friction ?? 1 : 1;
  const speedMultiplier = standingOnTerrain ? surface.speedMultiplier ?? 1 : 1;
  const acceleration = player.onGround ? DEFAULT_MOVEMENT.acceleration * friction : DEFAULT_MOVEMENT.airAcceleration;
  const target = Math.max(-1, Math.min(1, input.horizontal)) * DEFAULT_MOVEMENT.maxSpeed * speedMultiplier;
  const slowingToTarget = standingOnTerrain && speedMultiplier < 1
    && player.vx * target > 0 && Math.abs(player.vx) > Math.abs(target);
  const rate = input.horizontal === 0 || slowingToTarget ? DEFAULT_MOVEMENT.braking * friction : acceleration;
  player.vx = approach(player.vx, target, rate * dt);
  if (player.onGround) {
    if (standingOnTerrain) player.vx += surfaceSlope(surface) * DEFAULT_MOVEMENT.downhillAcceleration * dt;
    player.vx = Math.max(-DEFAULT_MOVEMENT.maxSpeed, Math.min(DEFAULT_MOVEMENT.maxSpeed, player.vx));
  }
  if (player.vx > 1) player.facing = 1;
  else if (player.vx < -1) player.facing = -1;

  if (player.jumpBufferSeconds > 0 && (player.onGround || player.coyoteSeconds > 0)) {
    player.squashBounce = false;
    player.vy = -DEFAULT_MOVEMENT.jumpVelocity;
    // Jumping off a ride keeps the ride's momentum, so a platform never jumps out from under Henry.
    if (player.platformId !== null) {
      player.vx = Math.max(-DEFAULT_MOVEMENT.maxSpeed, Math.min(DEFAULT_MOVEMENT.maxSpeed, player.vx + player.groundVelocityX));
    }
    player.onGround = false;
    player.coyoteSeconds = 0;
    player.jumpBufferSeconds = 0;
    detachFromGround(player);
  }

  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(player.vx * dt), Math.abs(player.vy * dt)) / 4));
  const step = dt / steps;
  const trajectory: MovementSegment[] = [];
  for (let index = 0; index < steps; index++) {
    const from = { x: player.x, y: player.y };
    // A ride moves Henry with it on both axes; the snap below only corrects what gravity adds.
    const carrier = ridingPlatform(player, bodies);
    if (carrier) {
      player.x += carrier.vx * step;
      player.y += carrier.vy * step;
    }
    player.x += player.vx * step;
    if (player.x < terrain.minX) { player.x = terrain.minX; player.vx = Math.max(0, player.vx); }
    if (player.x > terrain.maxX) { player.x = terrain.maxX; player.vx = Math.min(0, player.vx); }

    if (!player.squashBounce && !input.jumpHeld && player.vy < 0) player.vy += DEFAULT_MOVEMENT.gravity * (1 - DEFAULT_MOVEMENT.jumpCutMultiplier) * step;
    player.vy += DEFAULT_MOVEMENT.gravity * step;
    const falling = player.vy >= 0;
    const previousFeet = player.y + DEFAULT_MOVEMENT.height;
    player.y += player.vy * step;
    const ground = surfaceY(terrain, player.x);
    const feet = player.y + DEFAULT_MOVEMENT.height;
    let grounded = false;
    if (player.vy >= 0 && feet >= ground) {
      player.y = ground - DEFAULT_MOVEMENT.height;
      player.vy = 0;
      grounded = true;
    }
    // Platforms resolve after terrain: a slab standing above the ground wins the contact.
    // Bodies are sampled at the end of the whole step. Collision needs their
    // position at this substep, especially on an upward ride at the 100ms cap.
    const remaining = dt - (index + 1) * step;
    const currentBodies = remaining <= 0 ? bodies : bodies.map(body => ({ ...body,
      x: body.x - body.vx * remaining, y: body.y - body.vy * remaining }));
    const support = platformSupport(player, currentBodies, previousFeet, ground);
    if (support) {
      player.y = support.y - DEFAULT_MOVEMENT.height;
      player.vy = 0;
      grounded = true;
    }
    player.onGround = grounded;
    if (grounded) {
      player.coyoteSeconds = DEFAULT_MOVEMENT.coyoteSeconds;
      player.squashBounce = false;
    }
    player.platformId = support?.id ?? null;
    player.groundVelocityX = support?.vx ?? 0;
    trajectory.push({ from, to: { x: player.x, y: player.y }, falling });
  }
  return trajectory;
}

export function launchSpring(player: Player, velocity: number = DEFAULT_MOVEMENT.springVelocity): void {
  player.squashBounce = false;
  player.vy = -Math.abs(velocity);
  player.onGround = false;
  player.coyoteSeconds = 0;
  player.jumpBufferSeconds = 0;
  detachFromGround(player);
}

export function animationFor(player: Player): MovementAnimation {
  if (player.vy < -1) return 'jump';
  if (player.vy > 1) return 'fall';
  if (Math.abs(player.vx) > 8) return 'run';
  return 'idle';
}
