import { expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { BrowserInput } from '../src/core/input';
import { SimulationClock } from '../src/core/clock';
import { SilentAudio } from '../src/core/audio';
import { AdventureScene } from '../src/game/adventure-scene';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';
import { LEVELS } from '../src/world/levels';
import { FROST_RIDGE } from '../src/world/frost-ridge';
import { drawSlime } from '../src/world/renderer';
import { drawFacingSprite } from '../src/art/sprite';
import { FROST_MAIN, FROST_RETURN, FROST_REASCENT, FROST_MISS_S } from './frost-pilot';
import { timberKeyboardPilotInit, type TimberPilotStage } from './timbers-browser-pilot';

// Mechanism fixtures, not historical native replay: the actual serialized init,
// BrowserInput latch, fixed clock and scene run together without a browser.
function harness(cadence: readonly number[], controller = false) {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), FROST_RIDGE);
  scene.startSelected();
  const live = scene as unknown as { player: Player; run: RunState; events: { type: string; entityId?: string }[] };
  let callback: ((now: number) => void) | undefined, status = '', time = 0, ticks = 0, pendingJump = false;
  const listeners = new Map<string, ((event: Event) => void)[]>();
  const pad = { connected: true, mapping: 'standard', index: 0, axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
  const win = {
    navigator: { getGamepads: () => controller ? [pad] : [] },
    addEventListener: (type: string, fn: (event: Event) => void) => listeners.set(type, [...listeners.get(type) ?? [], fn]),
    removeEventListener: () => {},
    dispatchEvent: (event: Event & { code: string }) => {
      const down = event.type === 'keydown';
      if (controller) {
        if (event.code === 'Space') pad.buttons[0].pressed = down;
        else if (down) pad.axes[0] = event.code === 'ArrowRight' ? 1 : -1;
        else if (pad.axes[0] === (event.code === 'ArrowRight' ? 1 : -1)) pad.axes[0] = 0;
      } else for (const fn of listeners.get(event.type) ?? []) fn(event);
      return true;
    },
    requestAnimationFrame: (cb: (now: number) => void) => { callback = cb; return 1; },
  };
  const input = new BrowserInput(win as unknown as Window, () => {}), clock = new SimulationClock();
  class Image { constructor(public src: string) {} }
  class Context {
    canvas = { id: 'game' };
    drawImage(..._args: unknown[]) {}
    fillRect(..._args: number[]) {}
    getTransform() { return { transformPoint: (p: { x: number; y: number }) => p }; }
  }
  const ctx = new Context(), slimeAtlas = new Image('/assets/slimes/slimes.png'), henryAtlas = new Image('/assets/henry/henry.png');
  const originalFill = Context.prototype.fillRect, originalDraw = Context.prototype.drawImage;
  runInNewContext(`(${timberKeyboardPilotInit.toString()})([])`, {
    window: win, requestAnimationFrame: win.requestAnimationFrame,
    CanvasRenderingContext2D: Context, HTMLImageElement: Image,
    DOMPoint: class { constructor(public x: number, public y: number) {} },
    document: { querySelector: () => ({ textContent: status }) },
    KeyboardEvent: class { repeat = false; constructor(public type: string, public init: { code: string }) {} get code() { return this.init.code; } preventDefault() {} },
  });
  expect(Context.prototype.fillRect).not.toBe(originalFill);
  expect(Context.prototype.drawImage).not.toBe(originalDraw);
  const pilot = (win as unknown as { timberKeyboardPilot: {
    stages: TimberPilotStage[]; active: boolean; done: boolean; error: string; stage: number; frames: number;
    stable: number; previousY: number; phase: number; seenPlaying: boolean; observedX: number; observedY: number;
    history: object[]; recoveries: string[]; frostAvoidance?: boolean;
  } }).timberKeyboardPilot;
  const events: { type: string; entityId?: string }[] = [];
  function step() {
    const p = live.player;
    status = `${scene.screenState === 'finish' ? 'Finish' : 'Playing'} X ${Math.round(p.x)} Y ${Math.round(p.y)} V ${Math.round(p.vx)}`;
    ctx.fillRect(0, 0, 426, 240);
    for (const entity of FROST_RIDGE.entities.filter(e => e.kind === 'slime')) {
      const state = live.run.entities.find(e => e.id === entity.id)!;
      drawSlime(ctx as never, slimeAtlas as never, 'bobble', state.x, state.y, state.squashed ? 1 : undefined);
    }
    drawFacingSprite(ctx as never, henryAtlas as never, { x: 0, y: 0, width: 48, height: 48 }, p.x - 24, p.y - 10, 48, 48, 1);
    win.requestAnimationFrame(now => {
      const controls = input.poll(); pendingJump ||= controls.jumpPressed;
      clock.advance(now, dt => { scene.update(dt, { ...controls, jumpPressed: pendingJump }); pendingJump = false; events.push(...live.events); });
    });
    callback!(time += cadence[ticks++ % cadence.length]);
  }
  function run(stages: readonly TimberPilotStage[], expectedError = '') {
    let x = live.player.x;
    const bounded: TimberPilotStage[] = [];
    for (const stage of stages) {
      if (stage.kind === 'walk' || stage.kind === 'travel') while (Math.abs(stage.x! - x) > 320) {
        const direction = Math.sign(stage.x! - x) as -1 | 1;
        x += direction * 300;
        bounded.push(stage.kind === 'walk' ? { kind: 'travel', x, direction } : { ...stage, x });
      }
      bounded.push(stage); if (stage.x !== undefined) x = stage.x;
    }
    Object.assign(pilot, { stages: bounded, frostAvoidance: stages.some(s => s.frostAvoidance),
      active: true, done: false, error: '', stage: 0, frames: 0, stable: 0, previousY: NaN, phase: 0,
      seenPlaying: false, observedX: NaN, observedY: NaN, history: [] });
    for (let f = 0; f < 6000 && !pilot.done && !pilot.error; f++) step();
    pilot.active = false;
    if (expectedError) expect(pilot.error).toContain(expectedError);
    else expect({ done: pilot.done, error: pilot.error }, JSON.stringify({ history: pilot.history, events, recoveries: pilot.recoveries })).toEqual({ done: true, error: '' });
  }
  return { scene, live, pilot, events, step, run };
}

it.each([false, true])('serialized Frost main route clears restored patrols via BrowserInput (controller=%s)', controller => {
  const h = harness([1000 / 60], controller); h.run(FROST_MAIN);
  expect(h.scene.screenState).toBe('finish');
  expect(h.scene.education.letterCount).toBe(0);
  expect(h.events.filter(e => ['damage', 'recover', 'spring'].includes(e.type))).toEqual([]);
});

it.each(['all', 'CanvasRenderingContext2D', 'HTMLImageElement', 'DOMPoint'])('keeps serialized non-Frost input usable without %s paint capabilities', absent => {
  let callback: ((now: number) => void) | undefined;
  const keys = new Map<string, boolean>();
  class Context { fillRect() {} drawImage() {} }
  class Image {}
  class Point {}
  const fill = Context.prototype.fillRect, draw = Context.prototype.drawImage;
  const win = {
    requestAnimationFrame: (next: (now: number) => void) => { callback = next; return 1; },
    dispatchEvent: (event: { type: string; code: string }) => { keys.set(event.code, event.type === 'keydown'); return true; },
  };
  const globals: Record<string, unknown> = {
    CanvasRenderingContext2D: Context, HTMLImageElement: Image, DOMPoint: Point,
    window: win, requestAnimationFrame: win.requestAnimationFrame,
    document: { querySelector: () => ({ textContent: 'Playing X 60 Y 466 V 0' }) },
    KeyboardEvent: class { constructor(public type: string, public init: { code: string }) {} get code() { return this.init.code; } },
  };
  for (const name of ['CanvasRenderingContext2D', 'HTMLImageElement', 'DOMPoint']) if (absent === 'all' || absent === name) delete globals[name];
  runInNewContext(`(${timberKeyboardPilotInit.toString()})([{kind:'travel',x:360,direction:1}])`, globals);
  expect(Context.prototype.fillRect).toBe(fill); expect(Context.prototype.drawImage).toBe(draw);
  const pilot = (win as unknown as { timberKeyboardPilot: { active: boolean; frostAvoidance: boolean; done: boolean; error: string; frames: number } }).timberKeyboardPilot;
  expect(pilot.frostAvoidance).toBe(false); pilot.active = true;
  for (let frame = 1; frame <= 201; frame++) { win.requestAnimationFrame(() => {}); callback!(frame * 16); }
  expect(keys.get('ArrowRight')).toBe(true); expect(keys.get('ArrowLeft')).toBe(false); expect(keys.get('Space')).toBe(false);
  expect(pilot.done).toBe(false); expect(pilot.frames).toBe(201);
  expect(pilot.error).toBe('travel 0 stalled Playing X 60 Y 466 V 0');
});

it.each(['forward', 'mirrored', 'squashed', 'other-floor', 'stale'])('installs the live Frost observer and preserves %s paint geometry/lifetime', pose => {
  let callback: ((now: number) => void) | undefined;
  const keys = new Map<string, boolean>();
  class Image { constructor(public src: string) {} }
  class Context {
    canvas = { id: 'game' }; a = 1; e = 37; f = -21;
    saved: number[] = [];
    fillRect(..._args: number[]) {} drawImage(..._args: unknown[]) {}
    save() { this.saved = [this.a, this.e, this.f]; }
    restore() { [this.a, this.e, this.f] = this.saved; }
    translate(x: number, y: number) { this.e += this.a * x; this.f += y; }
    scale(x: number, _y: number) { this.a *= x; }
    getTransform() { return { transformPoint: (p: { x: number; y: number }) => ({ x: this.a * p.x + this.e, y: p.y + this.f }) }; }
  }
  const win = {
    requestAnimationFrame: (next: (now: number) => void) => { callback = next; return 1; },
    dispatchEvent: (event: { type: string; code: string }) => { keys.set(event.code, event.type === 'keydown'); return true; },
  };
  const fill = Context.prototype.fillRect, draw = Context.prototype.drawImage;
  runInNewContext(`(${timberKeyboardPilotInit.toString()})([{kind:'travel',x:${pose === 'mirrored' ? 0 : 800},direction:${pose === 'mirrored' ? -1 : 1}}])`, {
    window: win, requestAnimationFrame: win.requestAnimationFrame,
    CanvasRenderingContext2D: Context, HTMLImageElement: Image,
    DOMPoint: class { constructor(public x: number, public y: number) {} },
    document: { querySelector: () => ({ textContent: 'Playing X 400 Y 398 V 220' }) },
    KeyboardEvent: class { constructor(public type: string, public init: { code: string }) {} get code() { return this.init.code; } },
  });
  expect(Context.prototype.fillRect).not.toBe(fill); expect(Context.prototype.drawImage).not.toBe(draw);
  Object.assign((win as unknown as { timberKeyboardPilot: object }).timberKeyboardPilot, { active: true, frostAvoidance: true });
  const ctx = new Context(); ctx.fillRect(0, 0, 426, 240);
  drawSlime(ctx as never, new Image('/assets/slimes/slimes.png') as never, 'bobble', pose === 'mirrored' ? 90 : 210,
    pose === 'other-floor' ? 260 : 200, pose === 'squashed' ? 1 : undefined);
  drawFacingSprite(ctx as never, new Image('/assets/henry/starter.png') as never, { x: 0, y: 0, width: 48, height: 48 }, 126, 156, 48, 48, pose === 'mirrored' ? -1 : 1);
  if (pose === 'stale') ctx.fillRect(0, 0, 426, 240);
  win.requestAnimationFrame(() => {}); callback!(16);
  expect(keys.get('Space')).toBe(pose === 'forward' || pose === 'mirrored');
});

it('serialized Frost pilot completes actual return, SNOW assembly and re-ascent', () => {
  const h = harness([1000 / 60]); h.run(FROST_MAIN);
  h.scene.activateFinish('Build your word');
  h.scene.menuTargets.find(t => t.label === 'Find more letters')!.action();
  h.run(FROST_RETURN);
  expect(h.scene.education.letterCount).toBe(4);
  h.run(FROST_REASCENT);
  h.scene.activateFinish('Build your word');
  for (const [slot, letter] of [...'SNOW'].entries()) {
    h.scene.menuTargets.find(t => t.label === `Letter ${letter}`)!.action();
    h.scene.menuTargets.find(t => t.label === `Space ${slot + 1}: empty`)!.action();
  }
  expect(h.scene.education.hasWordSticker).toBe(true);
});

it.each([0, 30, 60, 90, 120, 150, 180, 200])('serialized missed-letter route retains its finish and missing letters at patrol phase %i', phase => {
  const h = harness([16, 32, 24]);
  for (let i = 0; i < phase; i++) h.step();
  h.run(FROST_MISS_S);
  expect(h.scene.screenState).toBe('finish');
  expect(h.scene.education.hasLetter('frost-letter-s')).toBe(false);
});

it('covers a whole 200-tick patrol cycle with unchanged stage caps and zero damage', () => {
  for (let phase = 0; phase <= 200; phase++) {
    const h = harness([1000 / 60]);
    for (let i = 0; i < phase; i++) h.step();
    h.run(FROST_MAIN);
    expect(h.events.filter(e => ['damage', 'recover', 'spring'].includes(e.type)), `phase ${phase}`).toEqual([]);
  }
}, 60_000);

it('keeps the untagged controller decisions and recovers genuinely before a tagged retry', () => {
  const h = harness([1000 / 60]);
  h.run(FROST_MAIN.map(({ frostAvoidance: _frost, ...stage }) => stage), 'travel 19 stalled');
  expect(h.events.filter(e => e.type === 'damage').map(e => e.entityId)).toEqual([
    'frost-slime-1', 'frost-slime-2', 'frost-slime-3', 'frost-slime-3',
  ]);
  expect(h.events.filter(e => e.type === 'recover')).toHaveLength(1);
  h.run(FROST_MAIN.slice(8));
  expect(h.scene.screenState).toBe('finish');
});
