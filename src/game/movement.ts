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

export interface Surface { x1: number; x2: number; y1: number; y2: number }
/** A moving platform sampled at one moment: a solid top face plus the velocity it carries riders with. */
export interface PlatformBody { id: string; x: number; y: number; width: number; height: number; vx: number; vy: number }
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
  /** Platform carrying Henry, or null when terrain or open air holds him. */
  platformId: string | null;
  /** Horizontal velocity of whatever Henry is standing on; zero on terrain. */
  groundVelocityX: number;
}

/** Vertical slack that keeps Henry glued to the platform he is already riding. */
export const PLATFORM_RIDE_SNAP = 6;

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
  platforms: readonly (PlatformBody | CollisionPlatform)[] = []): void {
  const dt = Math.max(0, Math.min(seconds, MAX_STEP_SECONDS));
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
    const standingOnTerrain = Math.abs(player.y + DEFAULT_MOVEMENT.height - surfaceY(terrain, player.x)) < 0.01;
    if (standingOnTerrain) player.vx += surfaceSlope(terrain, player.x) * DEFAULT_MOVEMENT.downhillAcceleration * dt;
    player.vx = Math.max(-DEFAULT_MOVEMENT.maxSpeed, Math.min(DEFAULT_MOVEMENT.maxSpeed, player.vx));
  }
  if (player.vx > 1) player.facing = 1;
  else if (player.vx < -1) player.facing = -1;

  if (player.jumpBufferSeconds > 0 && (player.onGround || player.coyoteSeconds > 0)) {
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
  for (let index = 0; index < steps; index++) {
    // A ride moves Henry with it on both axes; the snap below only corrects what gravity adds.
    const carrier = ridingPlatform(player, platforms.filter((platform): platform is PlatformBody => 'width' in platform));
    if (carrier) {
      player.x += carrier.vx * step;
      player.y += carrier.vy * step;
    }
    player.x += player.vx * step;
    if (player.x < terrain.minX) { player.x = terrain.minX; player.vx = Math.max(0, player.vx); }
    if (player.x > terrain.maxX) { player.x = terrain.maxX; player.vx = Math.min(0, player.vx); }

    if (!input.jumpHeld && player.vy < 0) player.vy += DEFAULT_MOVEMENT.gravity * (1 - DEFAULT_MOVEMENT.jumpCutMultiplier) * step;
    player.vy += DEFAULT_MOVEMENT.gravity * step;
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
    const movingPlatforms = platforms.filter((platform): platform is PlatformBody => 'width' in platform);
    const support = platformSupport(player, movingPlatforms, previousFeet, ground);
    if (support) {
      player.y = support.y - DEFAULT_MOVEMENT.height;
      player.vy = 0;
      grounded = true;
    }
    if (player.vy >= 0) {
      for (const platform of platforms) {
        const x1 = 'width' in platform ? platform.x : platform.x1;
        const x2 = 'width' in platform ? platform.x + platform.width : platform.x2;
        const halfWidth = DEFAULT_MOVEMENT.width / 2;
        if (platform.y > ground + 1 || player.x + halfWidth <= x1 || player.x - halfWidth >= x2) continue;
        // A fast runner can enter a narrow ledge after the vertical sweep crossed its top;
        // keep the one-way test bounded to two body heights so shallow dips remain catchable.
        if (previousFeet <= platform.y + DEFAULT_MOVEMENT.height * 2 && feet >= platform.y && (!support || platform.y < support.y)) {
          player.y = platform.y - DEFAULT_MOVEMENT.height;
          player.vy = 0;
          grounded = true;
          player.platformId = 'width' in platform ? platform.id : null;
          player.groundVelocityX = 'width' in platform ? platform.vx : 0;
        }
      }
    }
    player.onGround = grounded;
    if (grounded) player.coyoteSeconds = DEFAULT_MOVEMENT.coyoteSeconds;
    player.platformId = support?.id ?? null;
    player.groundVelocityX = support?.vx ?? 0;
  }
}

export function launchSpring(player: Player, velocity = DEFAULT_MOVEMENT.springVelocity): void {
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
