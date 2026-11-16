import { afterEach, expect, it, vi } from 'vitest';
import { bay1KeyboardPilotInit } from './cove-bay1-input';
import { createContext, runInContext } from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'rolldown/utils';
import type { Page } from '@playwright/test';
import { BrowserInput } from '../src/core/input';
import { SimulationClock } from '../src/core/clock';
import { SilentAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import { LEVELS } from '../src/world/levels';
import { SANDY_COVE } from '../src/world/sandy-cove';
import type { Player } from '../src/game/movement';
import { COVE_ROLLOUT_REGIONS } from './cove-rollout-route';
import { driveCove } from './cove-browser-pilot';

type PilotState = { stage: number; frames: number };
type State = Player & { time: number; phase: string; tick: number; stage?: number; frames?: number; pendingJump: boolean };
type Observation = { kind: string; callbacks?: number; before?: State; [key: string]: unknown };
type Outcome = { rest: string; result: object; state: State; supported: boolean; error?: string };

afterEach(() => vi.unstubAllGlobals());
it('forwards every actual RAF timestamp unchanged, including long native intervals', () => {
  let scheduled: FrameRequestCallback = () => {};
  const schedule = (callback: FrameRequestCallback) => { scheduled = callback; return 1; };
  const scope = { requestAnimationFrame: schedule, dispatchEvent() {} };
  vi.stubGlobal('window', scope); vi.stubGlobal('requestAnimationFrame', schedule);
  vi.stubGlobal('document', { querySelector: () => ({ textContent: '' }) });
  bay1KeyboardPilotInit([]);
  const observed: number[] = [];
  for (const now of [1000, 1016, 3000]) {
    scope.requestAnimationFrame(time => observed.push(time)); scheduled(now);
  }
  expect(observed).toEqual([1000, 1016, 3000]);
});

// Designed mechanism stimuli, not recovered CI cadence or native rendering/resize.
it.each([
  { name: 'fixed-60hz', ms: [1000 / 60] }, { name: 'mixed', ms: [16, 32, 24] },
  { name: 'long-gap', ms: [16, 16, 100] }, { name: 'substep', ms: [8, 8, 17] },
])('$name retains both Bays supports without walking off bay1', async schedule => {
  const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const rows: Observation[] = [];
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), SANDY_COVE);
  scene.startSelected();
  const live = scene as unknown as { player: Player };
  let now = 0, tick = 0, phase = 'startup', queue: FrameRequestCallback[] = [], callbacks = 0;
  let pending: () => boolean = () => false;
  const target = new EventTarget();
  const globals: Record<string, unknown> = {
    navigator: { getGamepads: () => [] },
    addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target),
    requestAnimationFrame: (fn: FrameRequestCallback) => { queue.push(fn); return callbacks++; },
    KeyboardEvent: class extends Event {
      repeat = false;
      constructor(type: string, public init: { code: string }) { super(type, { cancelable: true }); }
      get code() { return this.init.code; }
    },
  };
  const pilot = () => globals.timberKeyboardPilot as PilotState;
  const snapshot = () => ({ time: now, phase, tick, stage: pilot()?.stage,
    frames: pilot()?.frames, pendingJump: pending(), ...live.player });
  globals.dispatchEvent = (event: Event & { code: string }) => {
    rows.push({ kind: 'dispatch', type: event.type, code: event.code, ...snapshot() });
    return target.dispatchEvent(event);
  };
  globals.window = globals;
  const input = new BrowserInput(globals as unknown as Window, () => {}), clock = new SimulationClock();
  const poll = input.poll.bind(input);
  input.poll = () => { const controls = poll(); rows.push({ kind: 'poll', controls, ...snapshot() }); return controls; };
  const status = { textContent: '' };
  globals.document = { querySelector: (selector: string) => {
    if (selector !== '#status') throw Error('Unmodeled document selector: ' + selector);
    return status;
  } };
  const context = createContext(globals);
  // The actual observer schedules before pilot installation. Its paint work is
  // omitted; its recurring RAF order/duplicate timestamp semantics are retained.
  runInContext('requestAnimationFrame(function observe() { requestAnimationFrame(observe); });', context);
  runInContext(`(${bay1KeyboardPilotInit.toString()})([])`, context);
  const slice = (start: string, end: string) => {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
    return source.slice(from, to);
  };
  globals.scene = scene; globals.input = input; globals.clock = clock;
  globals.AdventureScene = AdventureScene; globals.status = status;
  globals.scenes = {
    activeScene: scene,
    update: (seconds: number, controls: Parameters<AdventureScene['update']>[1]) => {
      const before = snapshot(); scene.update(seconds, controls);
      rows.push({ kind: 'accepted-step', seconds, controls, before, after: snapshot() });
      if (before.platformId === 'cove-bay-ledge-1' && live.player.platformId !== before.platformId) {
        rows.push({ kind: 'bay1-exit', before, after: snapshot(), controls });
      }
    },
    render: () => {}, // Presentation only; the actual scene/physics updates run above.
  };
  const harness = `
    let focused = true, userPaused = false, inputSource = 'keyboard', pendingJump = false;
    let educationRevision = 0, request = 0;
    const assetState = 'ready', adventure = true, touchMode = false, debugAdventure = true;
    const artPreview = false, movementPreview = false, worldPreview = false, gameplayPreview = false, muted = false;
    const educationScene = () => scene;
    const canvas = { setAttribute() {} }, pauseButton = { style: {} }, context = {}, menu = { update() {} };
    const touch = { update(enabled) { if (enabled) throw Error('Unexpected touch gameplay in desktop fixture'); } };
    const refreshRumble = () => {};
    const refreshPause = () => { throw Error('Unmodeled pause/source/focus transition'); };
    ${slice('  const adventureStatus =', '  const refreshPause =')}
    ${slice('  const clearGameplayInput =', '  const resume =')}
    ${slice('  const frame = (now:', "\n  window.addEventListener('resize'")}
    requestAnimationFrame(frame);
    globalThis.readPending = () => pendingJump;
  `;
  runInContext(transformSync('cove-main-mechanism.ts', harness, {}).code, context);
  pending = globals.readPending as () => boolean;
  const pump = () => {
    now += schedule.ms[tick++ % schedule.ms.length];
    const due = queue; queue = [];
    const beforeFrames = pilot().frames;
    let decisionCallbacks = 0;
    for (const callback of due) {
      const before = `${pilot().stage}:${pilot().frames}`; callback(now);
      // Error cleanup may send keyups from both callbacks. Only stage/frame
      // advancement represents another driver decision at the same timestamp.
      if (`${pilot().stage}:${pilot().frames}` !== before) decisionCallbacks++;
    }
    expect(decisionCallbacks).toBeLessThanOrEqual(1);
    rows.push({ kind: 'raf-batch', callbacks: due.length, beforeFrames, ...snapshot() });
  };
  const evaluate = (fn: Function, argument?: unknown) => {
    globals.probeArgument = argument;
    try { return runInContext(`(${fn.toString()})(probeArgument)`, context); }
    finally { delete globals.probeArgument; }
  };
  const page = {
    locator: (selector: string) => {
      expect(selector).toBe('#status'); return { innerText: async () => status.textContent };
    },
    evaluate: async (fn: Function, argument?: unknown) => evaluate(fn, argument),
    waitForFunction: async (fn: Function, _argument: unknown, options: { timeout: number }) => {
      expect(options.timeout).toBe(45_000);
      const start = now;
      while (!evaluate(fn)) {
        if (now - start >= options.timeout) throw Error('Actual helper wait bound exceeded in mechanism model');
        pump();
      }
    },
  } as unknown as Page;
  const outcomes: Outcome[] = [];
  try {
    pump(); pump(); // Normal initial frame/status and clock initialization, no pose injection.
    expect(live.player.x).toBe(60); expect(live.player.y).toBe(326);
    for (const rest of COVE_ROLLOUT_REGIONS.find(region => region.name === 'Bays')!.rests.slice(0, 2)) {
      phase = rest.name;
      try {
        const result = await driveCove(page, rest.stages);
        outcomes.push({ rest: rest.name, result: structuredClone(result), state: snapshot(),
          supported: live.player.onGround && live.player.platformId === rest.id
            && Math.abs(live.player.x - rest.x) < 4 && Math.round(live.player.y) + 34 === rest.feet });
        // Model passive capture/idle callbacks without freezing the physics or writing keys.
        phase = rest.name + '-idle'; for (let frame = 0; frame < 6; frame++) pump();
      } catch (error) {
        outcomes.push({ rest: rest.name, error: String(error), result: structuredClone(pilot()), state: snapshot(), supported: false });
        break; // Do not manufacture a successful rest or inject the next takeoff pose.
      }
    }
    const walkOffs = rows.filter(row => row.kind === 'bay1-exit'
      && row.before?.phase === 'frozen-bay2-on' && row.before?.stage === 0);
    expect(rows.some(row => row.kind === 'raf-batch' && (row.callbacks ?? 0) > 1)).toBe(true);
    expect(rows.some(row => row.kind === 'dispatch')).toBe(true);
    expect(rows.some(row => row.kind === 'accepted-step')).toBe(true);
    expect(outcomes, JSON.stringify(outcomes)).toHaveLength(2);
    expect(outcomes.every(outcome => outcome.supported), JSON.stringify(outcomes)).toBe(true);
    expect(walkOffs, JSON.stringify(walkOffs)).toEqual([]);
  } finally {
    input.dispose();
    // Optional task diagnostics; normal CI performs no file writes.
    const evidence = process.env.COVE_PILOT_EVIDENCE_DIR;
    if (evidence) {
      writeFileSync(join(evidence, `mechanism-${schedule.name}.jsonl`), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
      writeFileSync(join(evidence, `result-${schedule.name}.json`), JSON.stringify({ schedule, outcomes,
        bay1Exits: rows.filter(row => row.kind === 'bay1-exit'),
        duplicateRafObserved: rows.some(row => row.kind === 'raf-batch' && (row.callbacks ?? 0) > 1),
      }, null, 2) + '\n');
    }
  }
});
