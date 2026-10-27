import { FINAL_CLIMB, sunsetPilot, walk, jump } from './sunset-pilot';

export const WALL_CADENCES = [[0.016], [1 / 60], [0.032], [0.05], [0.1], [0.016, 0.032, 0.024], [1 / 144]] as const;
export type WallVariant = 'reviewer' | 'repeat' | 'pause' | 'reverse' | 'short-hold';

/** Real entrance/input journey. pre/k retain the reviewer's exact definitions. */
export function attemptWallRoute(cadence: readonly number[], pre: number, k: number, variant: WallVariant = 'reviewer') {
  const route = sunsetPilot(cadence);
  for (let i = 0; i < 5000 && route.player.x < 860; i++) route.tick(1);
  for (let i = 0; i < pre; i++) route.tick(0);
  const contacts: { x: number; feet: number; vx: number; support: string | null }[] = [];
  let ticks = 0, phase = 0, jumpAge = 0, contactPause = 0;
  const per = Math.max(1, Math.round(0.004 / cadence[0]));
  for (let i = 0; i < 3000; i++) {
    const p = route.player;
    if (p.x >= 930) ticks++;
    let press = false, direction = 1;
    if (phase === 0 && ticks > 0 && ticks === 1 + k * per) { press = true; phase = 1; jumpAge = 0; }
    else if ((variant === 'reviewer' ? phase === 1 : phase > 0) && p.onGround && p.x > 1100 && contacts.length < 6) {
      if (contactPause === 0) contacts.push({ x: p.x, feet: p.y + 34, vx: p.vx, support: p.platformId });
      if (variant === 'pause' && contactPause++ < 2) direction = 0;
      else if (variant === 'reverse' && contactPause++ < 2) direction = -1;
      else {
        press = true; phase++; jumpAge = 0; contactPause = 0;
      }
    }
    jumpAge += route.tick(direction, press, phase > 0 && (variant !== 'short-hold' || jumpAge < 0.128));
    if (route.events.some(e => e.type === 'recover')) break;
    if (p.x >= 1260 && p.onGround) break;
  }
  const stalls: string[] = [];
  // A pilot stall is an observation, never a negative reachability result.
  // Continue from the genuinely reached terrain/yard with ordinary jumps.
  if (!route.events.some(e => e.type === 'recover') && route.player.x >= 1200 && route.player.onGround) {
    for (let i = 0; i < 4000 && route.player.x < 1600; i++) route.tick(1);
    try { route.run([...FINAL_CLIMB, { kind: 'finish' }]); }
    catch (error) {
      stalls.push(String(error));
      if (route.player.y + 34 === 680) route.run([walk(2250), jump(2250, 620)]);
      if (route.player.y + 34 === 620) {
        try { route.run([...FINAL_CLIMB, { kind: 'finish' }]); } catch (second) { stalls.push(String(second)); }
      }
    }
  }
  return { cadence: [...cadence], pre, k, variant, contacts, stalls, finished: route.scene.screenState === 'finish',
    supportOrder: route.supportOrder, checkpoints: route.events.filter(e => e.type === 'checkpoint').map(e => e.entityId),
    recovered: route.events.some(e => e.type === 'recover'), end: { ...route.player },
    health: route.runState.health, rewards: route.runState.collectedGems.size };
}
