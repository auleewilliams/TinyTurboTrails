import { afterEach, expect, it, vi } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { DEFAULT_MOVEMENT, type Player } from '../src/game/movement';
import { TREETOP_TIMBERS } from '../src/world/levels';
import { timberKeyboardPilotInit, TIMBER_ASCENT_RIGHT, TIMBER_LEFT_STARS_ASCENT,
  TIMBER_SPRING_RETRY, TIMBER_TO_MIDDLE, TIMBER_DESCENT_ALL, type TimberPilotStage } from './timbers-browser-pilot';

const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };

afterEach(() => vi.unstubAllGlobals());

function attemptRoute(milliseconds: readonly number[], stages: readonly TimberPilotStage[],
  stopAfterFirstLanding = false, setup?: (player: Player) => void,
  retraceSegments?: readonly (readonly TimberPilotStage[])[]) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never,
      site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
  scene.startSelected();
  const player = (scene as unknown as { player: Player }).player;
  setup?.(player);
  const keys = new Set<string>();
  let callback: FrameRequestCallback | undefined;
  let previousJump = false;
  let previousGameTime = 0;
  const originalRaf = (scheduled: FrameRequestCallback): number => { callback = scheduled; return 1; };
  const mockWindow = { requestAnimationFrame: originalRaf,
    dispatchEvent: (event: { type: string; code: string }) => {
      if (event.type === 'keydown') keys.add(event.code);
      else keys.delete(event.code);
      return true;
    },
  };
  vi.stubGlobal('window', mockWindow);
  vi.stubGlobal('requestAnimationFrame', originalRaf);
  vi.stubGlobal('KeyboardEvent', class {
    constructor(readonly type: string, readonly init: { code: string }) {}
    get code() { return this.init.code; }
  });
  vi.stubGlobal('document', { querySelector: () => ({ textContent:
    `Adventure preview · ${scene.screenState === 'finish' ? 'Finish' : 'Playing'} · Letter bag: ${scene.education.letterCount}/4 · X ${Math.round(player.x)} Y ${Math.round(player.y)} V ${Math.round(player.vx)} F 1`,
  }) });
  timberKeyboardPilotInit([...stages]);
  const pilot = (mockWindow as typeof mockWindow & { timberKeyboardPilot: {
    active: boolean; stage: number; done: boolean; history: { stage: number; status: string }[]; error: string;
  } }).timberKeyboardPilot;
  pilot.active = true;
  let now = 1000;
  let retraced = false;
  const pending = [...(retraceSegments ?? [])];
  let neutralFrames = 0;
  for (let frame = 0; frame < 5000; frame++) {
    mockWindow.requestAnimationFrame(gameTime => {
      const jump = keys.has('Space');
      scene.update((gameTime - previousGameTime) / 1000, {
        horizontal: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
        jumpPressed: jump && !previousJump, jumpHeld: jump, pausePressed: false, mutePressed: false,
      });
      previousGameTime = gameTime;
      previousJump = jump;
    });
    now += milliseconds[frame % milliseconds.length];
    callback!(now);
    if (neutralFrames > 0) {
      neutralFrames--;
      if (neutralFrames === 0) {
        Object.assign(pilot, { stages: pending.shift(), active: true, stage: 0, frames: 0,
          stable: 0, previousY: NaN, phase: 0, error: '', done: false, seenPlaying: false, history: [] });
      }
      continue;
    }
    if (stopAfterFirstLanding && pilot.stage >= 2 && player.onGround && player.y + DEFAULT_MOVEMENT.height === 1020) break;
    if (pilot.done && pending.length > 0) {
      if (!retraced) {
        expect(scene.screenState).toBe('finish');
        scene.activateFinish('Build your word');
        scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
        retraced = true;
      }
      pilot.active = false;
      neutralFrames = 4; // Browser screenshots between input segments keep the game clock moving.
      continue;
    }
    if (pilot.done || pilot.error) break;
  }
  const takeoff = pilot.history.find(entry => entry.stage === 0)?.status;
  return { takeoff, letterCount: scene.education.letterCount, x: player.x, feet: player.y + DEFAULT_MOVEMENT.height,
    vx: player.vx, onGround: player.onGround, platformId: player.platformId,
    landed: player.onGround && player.y + DEFAULT_MOVEMENT.height === 1020,
    specials: scene.specialTotal, screen: scene.screenState, done: pilot.done,
    history: pilot.history, error: pilot.error };
}

it.each([{ name: '16', milliseconds: [16] }, { name: '16/32', milliseconds: [16, 32] },
  { name: '32', milliseconds: [32] }])('misses T using the real pilot and gameplay at $name ms callback steps', ({ milliseconds }) => {
  const result = attemptRoute(milliseconds, TIMBER_ASCENT_RIGHT.slice(0, 2), true);
  expect(result.takeoff).toMatch(/X 1[4-6][0-9] Y 1046 V /);
  expect(result.landed, JSON.stringify(result)).toBe(true);
  expect(result.letterCount).toBe(0);
  expect(result.error).toBe('');
});

it.each([{ name: '16', milliseconds: [16] }, { name: '32', milliseconds: [32] }])('drives the left fork and Star 1/3 out-and-back with the shared pilot at $name ms', ({ milliseconds }) => {
  const result = attemptRoute(milliseconds, TIMBER_LEFT_STARS_ASCENT);
  expect(result, JSON.stringify(result)).toMatchObject({ done: true, error: '', specials: 2, screen: 'finish' });
});

it.each([{ name: '16', milliseconds: [16] }, { name: '32', milliseconds: [32] }])('drives the optional spring flight and repeat approach with the shared pilot at $name ms', ({ milliseconds }) => {
  const result = attemptRoute(milliseconds, [...TIMBER_TO_MIDDLE, ...TIMBER_SPRING_RETRY]);
  expect(result, JSON.stringify(result)).toMatchObject({ done: true, error: '', specials: 1 });
  expect(result.history.find(entry => entry.stage === 11)?.status).toContain('Y 476');
  expect(result.history.find(entry => entry.stage === 13)?.status).toContain('Y 506');
  expect(result.history.find(entry => entry.stage === 14)?.status).toContain('Y 476');
});

it.each([{ name: '16', milliseconds: [16] }, { name: '32', milliseconds: [32] }])('ends the y300 return drop fully on support before commanding the next edge at $name ms', ({ milliseconds }) => {
  // Mechanism fixture from a valid y240 support, not an end-to-end route claim.
  const result = attemptRoute(milliseconds, [TIMBER_DESCENT_ALL[3]], false, player => {
    Object.assign(player, { x: 646, y: 206, vx: 0, vy: 0, onGround: true,
      platformId: 'timber-return-240', groundVelocityX: 0 });
  });
  expect(result, JSON.stringify(result)).toMatchObject({ done: true, error: '', feet: 300,
    onGround: true, platformId: 'timber-return-300' });
  expect(result.x).toBeGreaterThanOrEqual(532); // 520px left edge + full 18px body + 3px margin.
  expect(Math.abs(result.vx)).toBeLessThan(30);
});

it.each([{ name: '16', milliseconds: [16] }, { name: '32', milliseconds: [32] }])('returns from the actual finish to all four missed letters with shared input logic at $name ms', ({ milliseconds }) => {
  const segments = [TIMBER_DESCENT_ALL.slice(0, 2), TIMBER_DESCENT_ALL.slice(2, 8),
    TIMBER_DESCENT_ALL.slice(8, 14), TIMBER_DESCENT_ALL.slice(14)];
  const result = attemptRoute(milliseconds, TIMBER_ASCENT_RIGHT, false, undefined, segments);
  expect(result, JSON.stringify(result)).toMatchObject({ done: true, error: '',
    letterCount: 4, screen: 'playing', feet: 1080 });
});
