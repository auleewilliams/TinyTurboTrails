import { DEFAULT_MOVEMENT } from '../src/game/movement';

// Inherited native pilot caps elapsed RAF time at32ms. With the shipped60Hz
// clock (remainder < one step), one paint can contain at most two fixed steps.
export const SUNSET_WALL_MAX_PAINT_ADVANCE = DEFAULT_MOVEMENT.maxSpeed * 2 / 60;

export interface SunsetWallPaint { x: number; feet: number; frame: number; time: number }
export interface SunsetWallOptions { pre: number; takeoff: number; maximumAdvance: number; surfaces: readonly { x1: number; x2: number; y1: number; y2: number }[] }
export interface SunsetWallAdapter { send: (code: string, down: boolean) => void; install: (observe: (paint: SunsetWallPaint) => void) => void; now?: () => number }

/** Self-contained: Playwright serializes this same function; units use only a DOM/input adapter. */
export function sunsetWallControllerInit(options: SunsetWallOptions, adapter?: SunsetWallAdapter) {
  const { pre, takeoff, surfaces } = options;
  const proof = { done: false, error: '', phase: 0, pre, jumps: 0, ascents: 0, launchFeet: 0, minimumFeet: 1000,
    recoveries: 0, contacts: [] as SunsetWallPaint[], samples: [] as (SunsetWallPaint & { grounded: boolean; phase: number })[],
    dispatches: [] as (SunsetWallPaint & { code: string; down: boolean; eventTime: number; phase: number; nominal: number; lookahead: number })[],
    acknowledgments: [] as (SunsetWallPaint & { dispatch: number; rise: number })[], previousX: 60, frames: 0 };
  if (!adapter) Object.assign(window, { sunsetWallInput: proof });
  const deliver = adapter?.send ?? ((code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })));
  let current: SunsetWallPaint = { x: 60, feet: 560, frame: -1, time: 0 };
  let seen = -1, previousGround = false, previousFeet = 560, lastAdvance = 0, lookahead = 0;
  let pendingAck: number | undefined;
  const held = new Map<string, boolean>();
  const send = (code: string, down: boolean) => {
    if (held.get(code) !== down) {
      proof.dispatches.push({ ...current, code, down, eventTime: adapter?.now?.() ?? performance.now(), phase: proof.phase, nominal: takeoff, lookahead });
      if (code === 'Space' && down) pendingAck = proof.dispatches.length - 1;
    }
    held.set(code, down); deliver(code, down);
  };
  const release = () => { send('ArrowRight', false); send('Space', false); };
  const observe = (p: SunsetWallPaint) => {
    if (proof.done || p.frame === seen) return;
    current = p; seen = p.frame; proof.frames++;
    const surface = surfaces.find(s => p.x >= s.x1 && p.x <= s.x2)!;
    const ground = surface.y1 + (surface.y2 - surface.y1) / (surface.x2 - surface.x1) * (p.x - surface.x1);
    const grounded = Math.abs(p.feet - ground) < 0.01;
    if (proof.previousX - p.x > 200) { proof.recoveries++; proof.done = true; release(); return; }
    const advance = p.x - proof.previousX;
    if (advance > 0) lastAdvance = advance;
    // Dispatch before the next observed advance crosses the nominal target.
    // Every actual Henry paint calls us synchronously, after this frame's input
    // consumption; zero-step paints retain the last positive observed advance. The audited
    // two-step bound also covers a first coalesced callback at the boundary.
    // Nominal target, dispatch pose and first physical rise remain distinct.
    lookahead = Math.max(lastAdvance, options.maximumAdvance);
    if (proof.phase >= 3) {
      if (previousFeet - p.feet > 1) {
        proof.ascents++;
        if (pendingAck !== undefined) {
          proof.acknowledgments.push({ ...p, dispatch: pendingAck, rise: previousFeet - p.feet });
          pendingAck = undefined;
        }
      }
      proof.minimumFeet = Math.min(proof.minimumFeet, p.feet);
    }
    previousFeet = p.feet; proof.previousX = p.x;
    proof.samples.push({ ...p, grounded, phase: proof.phase });
    if (proof.phase === 0 && p.x >= 860) proof.phase = 1;
    if (proof.phase === 1 && proof.pre > 0) { send('ArrowRight', false); proof.pre--; }
    else {
      send('ArrowRight', true);
      if (proof.phase === 1) proof.phase = 2;
      if (proof.phase === 2 && p.x + lookahead >= takeoff) {
        // A scheduling gap may not silently substitute an early grounded jump
        // or an already-late button press for this coyote-window witness.
        if (p.x <= 960 || p.x > takeoff) {
          proof.error = 'dispatch outside the nominal late-window approach'; proof.done = true; release(); return;
        }
        send('Space', true); proof.launchFeet = p.feet; proof.jumps++; proof.phase = 3;
      } else if (proof.phase >= 3 && grounded && p.x > 1100 && !previousGround) {
        proof.contacts.push(p);
        send('Space', false); send('Space', true); proof.jumps++;
      } else if (proof.phase >= 3 && grounded && p.x >= 1340) {
        send('Space', false); send('Space', true); proof.jumps++;
      }
    }
    previousGround = grounded;
    if (p.x >= 1880 && p.feet <= 620) { proof.done = true; release(); return; }
    if (proof.frames > 1800) { proof.error = 'bounded input journey did not recover or reach later support'; proof.done = true; release(); }
  };
  send('ArrowRight', true);
  if (adapter) adapter.install(observe);
  else Object.assign(window, { sunsetWallObserve: observe });
  return proof;
}

/** Observe shipped sprite/fixed-girder draws; never read or position scene state. */
export function sunsetWallPaintInit(near: { id: string; x: number; y: number; width: number }): void {
  const sample = { cameraX: 0, cameraY: 0, x: 60, feet: 560, frame: 0, time: 0 };
  Object.assign(window, { sunsetWallPaint: sample });
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args.length === 9
      && args[0].src.endsWith(`/assets/site/steel-v1/${near.id}.png`) && Number(args[7]) === near.width) {
      const point = this.getTransform().transformPoint(new DOMPoint(Number(args[5]), Number(args[6])));
      sample.cameraX = near.x - point.x; sample.cameraY = near.y - point.y;
    }
    const henry = this.canvas.id === 'game' && args[0] instanceof HTMLImageElement
      && args[0].src.endsWith('/assets/henry/henry-celebration.png') && args.length === 9;
    if (henry) {
      const t = this.getTransform();
      const a = t.transformPoint(new DOMPoint(Number(args[5]), Number(args[6])));
      const b = t.transformPoint(new DOMPoint(Number(args[5]) + Number(args[7]), Number(args[6]) + Number(args[8])));
      sample.x = Math.min(a.x, b.x) + 24 + sample.cameraX;
      sample.feet = Math.min(a.y, b.y) + 44 + sample.cameraY; sample.frame++; sample.time = performance.now();
    }
    Reflect.apply(draw, this, args);
    if (henry) (window as unknown as { sunsetWallObserve?: (paint: SunsetWallPaint) => void }).sunsetWallObserve?.({ ...sample });
  } as typeof draw;
}
