import { afterEach, expect, it, vi } from 'vitest';
import { BrowserInput } from '../src/core/input';
import { AdventureScene } from '../src/game/adventure-scene';
import { DEFAULT_MOVEMENT, type Player } from '../src/game/movement';
import { SANDY_COVE } from '../src/world/sandy-cove';
import { timberKeyboardPilotInit, type TimberPilotStage } from './timbers-browser-pilot';
import { COVE_ART_PILOT_STAGES } from './cove-art-pilot-stages';

const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
afterEach(() => vi.unstubAllGlobals());

/** Deterministic actual-helper/input/scene mechanism fixture, NOT historical browser replay.
 * It starts the real Cove run, emits events through BrowserInput, and supplies rounded debug
 * positions at fixed callback schedules. It assumes no rendering/RAF contention or focus loss.
 */
function attempt(milliseconds: readonly number[], segments: readonly (readonly TimberPilotStage[])[]) {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never, site: {} as never, frost: {} as never, cove: {} as never }, audio, SANDY_COVE);
  scene.startSelected();
  const player = (scene as unknown as { player: Player }).player; // Read-only witness; never seed/mutate player state.
  let callback: FrameRequestCallback | undefined;
  const originalRaf = (next: FrameRequestCallback): number => { callback = next; return 1; };
  const target = Object.assign(new EventTarget(), { requestAnimationFrame: originalRaf, navigator: { getGamepads: () => [] } });
  vi.stubGlobal('window', target); vi.stubGlobal('requestAnimationFrame', originalRaf);
  vi.stubGlobal('KeyboardEvent', class extends Event {
    readonly code: string; readonly repeat = false;
    constructor(type: string, options: { code: string }) { super(type, { cancelable: true }); this.code = options.code; }
  });
  const input = new BrowserInput(target as unknown as Window, () => {});
  vi.stubGlobal('document', { querySelector: () => ({ textContent:
    `Adventure preview · Playing · X ${Math.round(player.x)} Y ${Math.round(player.y)} V ${Math.round(player.vx)} F 1`,
  }) });
  timberKeyboardPilotInit([]);
  const pilot = (target as typeof target & { timberKeyboardPilot: {
    stages: TimberPilotStage[]; active: boolean; paused: boolean; pauseAt: number; stage: number; frames: number;
    stable: number; previousY: number; phase: number; error: string; done: boolean; seenPlaying: boolean;
    observedX: number; observedY: number; history: { stage: number; status: string }[];
  } }).timberKeyboardPilot;
  const misses: { segment: number; stage: number; x: number; targetLeft: number; feet: number }[] = [];
  const accepted: { segment: number; stage: number; x: number; feet: number }[] = [];
  const landings: { segment: number; stage: number; x: number; feet: number; vx: number; onGround: boolean; platformId: string | null }[] = [];
  const rests: { segment: number; x: number; feet: number; vx: number; onGround: boolean; platformId: string | null }[] = [];
  let previousGameTime = 0, now = 1000, frame = 0;
  for (const [segment, stages] of segments.entries()) {
    let x = Math.round(player.x); const bounded: TimberPilotStage[] = [];
    for (const stage of stages) {
      if (stage.kind === 'walk' || stage.kind === 'travel') while (Math.abs(stage.x! - x) > 320) {
        const direction = Math.sign(stage.x! - x) as -1 | 1; x += direction * 300;
        bounded.push({ kind: 'travel', x, direction });
      }
      bounded.push(stage); if (stage.x !== undefined) x = stage.x;
    }
    Object.assign(pilot, { stages: bounded, active: true, paused: false, pauseAt: -1, stage: 0, frames: 0,
      stable: 0, previousY: NaN, phase: 0, error: '', done: false, seenPlaying: false, observedX: NaN, observedY: NaN, history: [] });
    for (let local = 0; local < 3000; local++) {
      const oldStage = pilot.stage;
      target.requestAnimationFrame(gameTime => {
        if (pilot.stage !== oldStage) landings.push({ segment, stage: oldStage, x: player.x,
          feet: player.y + DEFAULT_MOVEMENT.height, vx: player.vx, onGround: player.onGround, platformId: player.platformId });
        const controls = input.poll(), wasGrounded = player.onGround, feet = player.y + DEFAULT_MOVEMENT.height;
        scene.update((gameTime - previousGameTime) / 1000, controls); previousGameTime = gameTime;
        const requested = bounded[pilot.stage];
        const support = requested?.kind === 'jump' ? SANDY_COVE.platforms!.find(p => p.from.y === requested.y && requested.x! >= p.from.x && requested.x! <= p.from.x + p.width) : undefined;
        if (support && player.vy >= 0 && feet <= support.from.y && player.y + DEFAULT_MOVEMENT.height > support.from.y
          && player.x + DEFAULT_MOVEMENT.width / 2 <= support.from.x) misses.push({ segment, stage: pilot.stage, x: player.x, targetLeft: support.from.x, feet: player.y + DEFAULT_MOVEMENT.height });
        if (controls.jumpPressed && wasGrounded && !player.onGround && player.vy < 0) accepted.push({ segment, stage: pilot.stage, x: player.x, feet });
      });
      now += milliseconds[frame++ % milliseconds.length]; callback!(now);
      if (pilot.done || pilot.error) break;
    }
    rests.push({ segment, x: player.x, feet: player.y + DEFAULT_MOVEMENT.height, vx: player.vx, onGround: player.onGround, platformId: player.platformId });
    if (pilot.error || !pilot.done) break;
    // Screenshots between drive calls advance ordinary neutral frames in real browsers.
    pilot.active = false;
    for (let pause = 0; pause < 4; pause++) {
      target.requestAnimationFrame(gameTime => { scene.update((gameTime - previousGameTime) / 1000, input.poll()); previousGameTime = gameTime; });
      now += milliseconds[frame++ % milliseconds.length]; callback!(now);
    }
  }
  input.dispose();
  return { error: pilot.error, done: pilot.done, stage: pilot.stage, x: player.x, feet: player.y + DEFAULT_MOVEMENT.height, accepted, landings, rests, misses };
}

const schedules = [{ milliseconds: [16] }, { milliseconds: [32] }, { milliseconds: [16, 32] }];

it.each(schedules)('reproduces the inherited too-early pool jump specifically at $milliseconds ms', ({ milliseconds }) => {
  // Retain the too-early takeoff mechanism; target the actual current authored pool2 plane.
  // Historical native walk2070/jump2260/296 failure remains immutable external evidence.
  // Prior segments use the candidate route; no player state is seeded or injected.
  const result = attempt(milliseconds, [...Object.values(COVE_ART_PILOT_STAGES).slice(0, 3),
    [{ kind: 'walk', x: 2070 }, { kind: 'jump', x: 2260, y: SANDY_COVE.platforms!.find(p=>p.id==='cove-pool-stone-2')!.from.y }]]);
  expect(result.error).toMatch(/^jump 2 stalled .*Y 310 V 0 /);
  expect(Math.abs(result.x - 2260)).toBeLessThan(5);
  expect(result.done).toBe(false); expect(result.feet).toBe(344);
  const launch = result.accepted.find(e => e.segment === 3 && e.stage === 2)!;
  expect(launch).toBeDefined(); expect(launch.feet).toBe(320);
  expect(launch.x).toBeGreaterThan(2060); expect(launch.x).toBeLessThan(2080);
  expect(result.misses.some(e => e.segment === 3 && e.stage === 2 && e.targetLeft === 2230 && e.x + 9 < e.targetLeft)).toBe(true);
});

it.each(schedules)('lands every art-view support and reverse rest through accepted input at $milliseconds ms', ({ milliseconds }) => {
  const segments = Object.values(COVE_ART_PILOT_STAGES), result = attempt(milliseconds, segments);
  expect(result.error, JSON.stringify({ error: result.error, x: result.x, feet: result.feet, rests: result.rests })).toBe('');
  expect(result.done).toBe(true); expect(result.rests).toHaveLength(6);
  expect(result.rests[2]).toMatchObject({ onGround: true, platformId: 'cove-pool-stone-1', feet: SANDY_COVE.platforms!.find(p=>p.id==='cove-pool-stone-1')!.from.y });
  expect(result.rests[3]).toMatchObject({ onGround: true, platformId: 'cove-bay-ledge-2', feet: 260 });
  expect(result.rests[4]).toMatchObject({ onGround: true, platformId: 'cove-bay-ledge-3', feet: 272 });
  expect(result.rests[5]).toMatchObject({ onGround: true, platformId: null });
  expect(Math.abs(result.rests[5].x - 2940)).toBeLessThan(4);
  for (const rest of result.rests) { expect(rest.onGround).toBe(true); expect(Math.abs(rest.vx)).toBeLessThan(20); }
  const jumps = result.landings.filter(e => result.accepted.some(a => a.segment === e.segment && a.stage === e.stage));
  expect(result.accepted).toHaveLength(8); expect(jumps).toHaveLength(8); expect(result.misses).toEqual([]);
  for (const landing of jumps) {
    const support = SANDY_COVE.platforms!.find(p => p.id === landing.platformId)!;
    expect(support).toBeDefined(); expect(landing.onGround).toBe(true); expect(landing.feet).toBe(support.from.y);
    expect(landing.x - 9).toBeGreaterThanOrEqual(support.from.x);
    expect(landing.x + 9).toBeLessThanOrEqual(support.from.x + support.width);
  }
});
