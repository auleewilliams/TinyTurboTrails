import { afterEach, expect, it, vi } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import { DEFAULT_MOVEMENT, type Player } from '../src/game/movement';
import { TREETOP_TIMBERS } from '../src/world/levels';
import { timberKeyboardPilotInit, TIMBER_ASCENT_RIGHT, TIMBER_LEFT_STARS_ASCENT,
  TIMBER_SPRING_RETRY, TIMBER_TO_MIDDLE, type TimberPilotStage } from './timbers-browser-pilot';

const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };

afterEach(() => vi.unstubAllGlobals());

function attemptRoute(milliseconds: readonly number[], stages: readonly TimberPilotStage[], stopAfterFirstLanding = false) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never,
      site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
  scene.startSelected();
  const player = (scene as unknown as { player: Player }).player;
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
  for (let frame = 0; frame < 2500; frame++) {
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
    if (stopAfterFirstLanding && pilot.stage >= 2 && player.onGround && player.y + DEFAULT_MOVEMENT.height === 1020) break;
    if (pilot.done || pilot.error) break;
  }
  const takeoff = pilot.history.find(entry => entry.stage === 0)?.status;
  return { takeoff, letterCount: scene.education.letterCount, x: player.x, feet: player.y + DEFAULT_MOVEMENT.height,
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
