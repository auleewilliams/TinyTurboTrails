import { AdventureScene } from '../src/game/adventure-scene';
import { SUNSET_SITE } from '../src/world/levels';
import type { LevelData } from '../src/world/level';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';
import type { TimberPilotStage } from './timbers-browser-pilot';

export const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };
export type SunsetStage = TimberPilotStage;
export const walk = (x: number): SunsetStage => ({ kind: 'walk', x });
export const jump = (x: number, y: number): SunsetStage => ({ kind: 'jump', x, y });
export const drop = (edge: number, direction: -1 | 1, x: number, y: number): SunsetStage => ({ kind: 'drop', edge, direction, x, y });

export const FIRST_CLIMB: readonly SunsetStage[] = [walk(210), jump(210, 500), walk(275), jump(275, 440), jump(275, 380), jump(300, 320), walk(350)];
const finalStage = (stage: SunsetStage): SunsetStage => ({ ...stage,
  ...(stage.x !== undefined && stage.x >= 800 ? { x: stage.x + 720 } : {}),
  ...(stage.edge !== undefined && stage.edge >= 800 ? { edge: stage.edge + 720 } : {}),
});
const frameStage = (stage: SunsetStage): SunsetStage => ({ ...stage,
  ...(stage.x !== undefined && stage.x >= 800 ? { x: stage.x + 720 } : {}),
  ...(stage.edge !== undefined && stage.edge >= 800 ? { edge: stage.edge + 720 } : {}),
});
export const CROSS_DESCENT: readonly SunsetStage[] = [drop(260, -1, 220, 380), walk(1160), drop(1180, 1, 1220, 440), drop(1300, 1, 1350, 500), walk(1310), drop(1400, 1, 1430, 560), drop(1500, 1, 1530, 620)].map(frameStage);
export const FINAL_CLIMB: readonly SunsetStage[] = [walk(1760), jump(1800, 560), walk(1870), jump(1870, 500), walk(1970), jump(2000, 440), walk(2080), walk(1970), jump(1970, 380), jump(2000, 320), walk(2090), jump(2090, 260), jump(2100, 200), jump(2130, 140)].map(finalStage);
export const MAIN_ROUTE: readonly SunsetStage[] = [...FIRST_CLIMB, ...CROSS_DESCENT, ...FINAL_CLIMB, { kind: 'finish' }];
export const DOWN_FINAL: readonly SunsetStage[] = [drop(2080, -1, 2030, 200), walk(2000), drop(1940, -1, 1910, 260), drop(1820, -1, 1780, 320), drop(1880, 1, 1930, 380), drop(2020, 1, 2080, 440), drop(1940, -1, 1900, 500), drop(1840, -1, 1790, 560), drop(1660, -1, 1610, 620), walk(1530)].map(finalStage);
export const UP_DESCENT: readonly SunsetStage[] = [walk(1450), jump(1430, 560), walk(1370), jump(1350, 500), walk(1120), walk(1130), jump(1140, 440), walk(1140), jump(1140, 380), walk(740), jump(740, 320), walk(740)].map(frameStage);
export const BACK_FIRST: readonly SunsetStage[] = [drop(800, 1, 850, 380), walk(440), jump(440, 320), walk(350), drop(260, -1, 220, 380), drop(160, -1, 120, 440), walk(350)];
export const ALL_RETURN: readonly SunsetStage[] = [...DOWN_FINAL, ...UP_DESCENT, ...BACK_FIRST];
export const REASCENT: readonly SunsetStage[] = [walk(275), jump(275, 380), jump(300, 320), walk(350), ...CROSS_DESCENT, ...FINAL_CLIMB, { kind: 'finish' }];

/** Initial spelling cohort intentionally misses B, retaining strict missed-ID checks. */
export const SUNSET_MISS_B: readonly SunsetStage[] = [
  ...FIRST_CLIMB, CROSS_DESCENT[0], walk(740), jump(740, 320), walk(740), drop(800, 1, 850, 380),
  ...CROSS_DESCENT.slice(1, 4), walk(1840), ...CROSS_DESCENT.slice(4),
  ...FINAL_CLIMB.slice(0, -1), walk(2720), walk(2820), FINAL_CLIMB.at(-1)!, { kind: 'finish' },
];

/** Simulation-input driver: all movement starts at the authored entrance. */
export function sunsetPilot(cadence: readonly number[] = [0.016], heldSeconds = 0.24) {
  return routePilot(SUNSET_SITE, cadence, heldSeconds);
}

/** Shared bounded simulation driver for fixed supports and connected terrain. */
export function routePilot(level: LevelData, cadence: readonly number[] = [0.016], heldSeconds = 0.24) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never, site: {} as never, frost: {} as never, cove: {} as never },
    { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} }, level);
  scene.startSelected();
  const live = scene as unknown as { player: Player; run: RunState; events: { type: string; entityId?: string }[] };
  const events: { type: string; entityId?: string }[] = [];
  const history: object[] = [];
  const supports = new Set<string>();
  const supportOrder: string[] = [];
  let ticks = 0;
  function tick(horizontal = 0, jumpPressed = false, jumpHeld = false): number {
    const dt = cadence[ticks++ % cadence.length];
    scene.update(dt, { ...neutral, horizontal, jumpPressed, jumpHeld });
    events.push(...live.events);
    if (live.player.platformId) {
      supports.add(live.player.platformId);
      if (supportOrder.at(-1) !== live.player.platformId) supportOrder.push(live.player.platformId);
    }
    return dt;
  }
  const steer = (x: number) => {
    const projected = live.player.x + Math.sign(live.player.vx) * live.player.vx ** 2 / 2400;
    return projected < x - 3 ? 1 : projected > x + 3 ? -1 : 0;
  };
  function run(stages: readonly SunsetStage[]): void {
    const bounded: SunsetStage[] = [];
    let plannedX = live.player.x;
    for (const stage of stages) {
      if (stage.kind === 'walk' || stage.kind === 'travel') while (Math.abs(stage.x! - plannedX) > 320) {
        plannedX += Math.sign(stage.x! - plannedX) * 300; bounded.push({ ...stage, x: plannedX });
      }
      bounded.push(stage); if (stage.x !== undefined) plannedX = stage.x;
    }
    for (const [index, stage] of bounded.entries()) {
      const p = live.player;
      let passed = false, elapsed = 0, phase = 0;
      for (let frame = 0; frame < 260; frame++) {
        if (stage.kind === 'finish') {
          tick(1); passed = scene.screenState === 'finish';
        } else if (stage.kind === 'travel') {
          tick(stage.direction!); passed=(p.x-stage.x!)*stage.direction!>=0;
        } else if (stage.kind === 'walk') {
          tick(steer(stage.x!));
          passed = Math.abs(p.x - stage.x!) < 4 && Math.abs(p.vx) < 20 && p.onGround;
        } else if (stage.kind === 'jump') {
          elapsed += tick(steer(stage.x!), frame === 0, elapsed < heldSeconds);
          passed = elapsed > 0.18 && p.onGround && Math.abs(p.y + 34 - stage.y!) < 0.1;
        } else if (stage.kind === 'drop') {
          if (phase === 0) {
            const x = stage.edge! - stage.direction! * 24;
            tick(steer(x));
            if (Math.abs(p.x - x) < 4 && Math.abs(p.vx) < 20) phase = 1;
          } else if (phase === 1) {
            const clear = stage.direction === 1 ? p.x - 9 > stage.edge! : p.x + 9 < stage.edge!;
            tick(clear ? 0 : stage.direction);
            if (clear && !p.onGround) phase = 2;
          } else tick(steer(stage.x!));
          passed = phase === 2 && p.onGround && Math.abs(p.y + 34 - stage.y!) < 0.1
            && Math.abs(p.x - stage.x!) < 16 && Math.abs(p.vx) < 30;
        }
        if (passed) break;
      }
      history.push({ index, stage, x: p.x, feet: p.y + 34, vx: p.vx, grounded: p.onGround, support: p.platformId });
      if (!passed) throw new Error(`stage ${index} ${JSON.stringify(stage)} stalled: ${JSON.stringify(history.at(-1))}`);
      // A deliberate neutral pause between inputs, including at 32ms cadence.
      for (let i = 0; i < 3; i++) tick();
    }
  }
  return { scene, player: live.player, runState: live.run, tick, run, events, history, supports, supportOrder };
}
