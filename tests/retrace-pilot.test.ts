import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { createPlayer, simulatePlayer } from '../src/game/movement';
import { advancePatrols, createRun, stepEntities, tickRun, type RunEvent } from '../src/game/interactions';
import { PLAINS_LEVEL } from '../src/world/level';
import { installRetracePilotScript } from './retrace-pilot';

/** Explicit seam fixture, NOT a historical CI replay or native-browser renderer.
 * Execute the SAME self-contained init script used by Playwright. Only DOM,
 * canvas observations, RAF and keyboard delivery are adapters; all patrol,
 * movement, spring, damage and recovery decisions below are production code. */
function approach(phase: number, health: number, held = false) {
  const level = PLAINS_LEVEL, player = createPlayer(3374, level), run = createRun(level);
  player.vx = 220;
  run.health = health;
  run.checkpointId = 'checkpoint-hillside';
  for (let i = 0; i < phase; i++) advancePatrols(run, level, 1 / 60);
  const keys = new Set<string>(), events: RunEvent[] = [];
  let pressed = false, status = '', raf: FrameRequestCallback = () => {};
  class Image { constructor(public src: string) {} }
  class Canvas {
    canvas = { id: 'game' };
    fillRect(..._args: number[]) {}
    drawImage(..._args: unknown[]) {}
    getTransform() { return { transformPoint: (point: unknown) => point }; }
  }
  const context = {
    level, HTMLImageElement: Image, CanvasRenderingContext2D: Canvas,
    DOMPoint: class { constructor(public x: number, public y: number) {} },
    KeyboardEvent: class { constructor(public type: string, public props: { code: string }) {} },
    document: { querySelector: () => ({ textContent: status }) },
    requestAnimationFrame: (callback: FrameRequestCallback) => { raf = callback; },
    dispatchEvent: (event: { type: string; props: { code: string } }) => {
      const code = event.props.code;
      if (event.type === 'keydown') {
        if (code === 'Space' && !keys.has(code)) pressed = true;
        keys.add(code);
      } else keys.delete(code);
    },
  };
  // A separate realm keeps prototype wrappers isolated between phase fixtures.
  runInNewContext(`window = globalThis; (${installRetracePilotScript.toString()})(level)`, context);
  const pilot = (context as unknown as { retracePilot: { direction: number; lastX: number; jumpUntil: number } }).retracePilot;
  Object.assign(pilot, { direction: 1, lastX: player.x, jumpUntil: held ? 400 : 0 });
  const canvas = new Canvas();
  let gameTime = 0, physicalTime = 0, heldAirFrames = 0, heldAirBrakes = 0;
  const frame = (time: number): void => {
    const steps = Math.round((time - gameTime) / (1000 / 60));
    gameTime = time;
    const input = { horizontal: keys.has('ArrowRight') ? 1 : keys.has('ArrowLeft') ? -1 : 0,
      jumpHeld: keys.has('Space'), jumpPressed: pressed };
    pressed = false;
    const slime = run.entities.find(entity => entity.id === 'slime-006')!;
    // Held-jump guard contract: keep forward input through a deliberate airborne
    // approach, not merely eventual crossing (over-broad braking can still cross).
    if (!player.onGround && input.jumpHeld && slime.x - player.x > -18 && slime.x - player.x < 65) {
      heldAirFrames++;
      if (input.horizontal !== 1) heldAirBrakes++;
    }
    for (let step = 0; step < steps; step++) {
      const previous = { x: player.x, y: player.y };
      tickRun(run, 1 / 60);
      const trajectory = simulatePlayer(player, { ...input, jumpPressed: step === 0 && input.jumpPressed }, level, 1 / 60);
      stepEntities(run, level, player, 1 / 60, events, previous, trajectory);
    }
    status = `Playing X ${Math.round(player.x)} Y ${Math.round(player.y)} V ${Math.round(player.vx)} Letter bag: 4/4`;
    canvas.fillRect(0, 0, 426, 240);
    canvas.drawImage(new Image('/assets/henry/henry-celebration.png'), 0, 0, 48, 48, player.x - 24, player.y - 24, 48, 48);
    for (const entity of level.entities.filter(entity => entity.kind === 'slime')) {
      const live = run.entities.find(live => live.id === entity.id)!;
      if (live.active && !live.squashed) canvas.drawImage(new Image('/assets/slimes/slimes.png'), 0, 0, 48, 48, live.x - 24, live.y - 48, 48, 48);
    }
    context.requestAnimationFrame(frame);
  };
  frame(0);
  for (let i = 0; i < 400 && player.x < 3610 && !events.some(event => event.type === 'recover'); i++) raf(physicalTime += 1000 / 60);
  return { crossed: player.x >= 3610, damage: events.filter(event => event.type === 'damage').length,
    recoveries: events.filter(event => event.type === 'recover').length, heldAirFrames, heldAirBrakes };
}

// Bounded batches keep each case inside the existing default test deadline.
const starts = Array.from({ length: 30 }, (_, batch) => batch * 20);
it.each([1, 3].flatMap(health => starts.map(start => ({ health, start }))))(
  'clears spring-002/slime-006 at $health hearts, starting at phase $start (20 phases)', ({ health, start }) => {
    // Together these cover ten seconds of production patrol advance.
    const failures = [];
    for (let phase = start; phase < start + 20; phase++) {
      const result = approach(phase, health);
      if (!result.crossed || result.damage || result.recoveries) failures.push({ phase, ...result });
    }
    expect(failures).toEqual([]);
  },
);

it.each(starts)('preserves held airborne forward input near live slime, phases %i..+19', start => {
  let observed = 0;
  const failures = [];
  for (let phase = start; phase < start + 20; phase++) {
    const result = approach(phase, 1, true);
    observed += result.heldAirFrames;
    if (!result.crossed || result.damage || result.recoveries || result.heldAirBrakes) failures.push({ phase, ...result });
  }
  expect(observed).toBeGreaterThan(0);
  expect(failures).toEqual([]);
});
