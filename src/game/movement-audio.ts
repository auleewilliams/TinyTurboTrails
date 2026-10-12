import { MAX_STEP_SECONDS, type Player } from './movement';

/** Shared with the dust puff: only an airborne-to-grounded impact above 180px/s. */
export function isMeaningfulLanding(wasGrounded: boolean, previousVelocityY: number, player: Readonly<Player>): boolean {
  return !wasGrounded && player.onGround && previousVelocityY > 180;
}

/** Presentation only. No timers or changes to player/simulation state. */
export class FootstepCadence {
  private distance = 0;

  reset(): void { this.distance = 0; }

  step(seconds: number, player: Readonly<Player>, previousX: number): boolean {
    const speed = Math.abs(player.vx);
    const riding = player.platformId !== null;
    if (!player.onGround || speed < 12 || (!riding && Math.abs(player.x - previousX) < 0.001)) {
      this.reset();
      return false;
    }
    // vx is relative to a ride, including when its carry cancels Henry's walking.
    // On terrain, displacement excludes pushing into walls.
    const travel = speed * Math.max(0, Math.min(seconds, MAX_STEP_SECONDS));
    this.distance += riding ? travel : Math.min(travel, Math.abs(player.x - previousX));
    if (this.distance + 1e-7 < 48) return false;
    this.distance = Math.max(0, this.distance - 48) % 48;
    return true;
  }
}
