import type { QuarryWaypoint } from './quarry-route';

export type QuarrySupportDraw = { x: number; y: number; width: number; source?: string };

export type QuarryLandingTarget = { x: number; y: number; width: number; source?: string };
export type QuarryPilotFrame = { status: string; x: number; feet: number; camera: { x: number; y: number };
  henry: { x: number; y: number; width: number; height: number }; supports: QuarrySupportDraw[] };
export type QuarryLandingSample = QuarryPilotFrame & { id: string; next: QuarryLandingTarget;
  edge: QuarrySupportDraw; drawn: boolean; visibleWidth: number; capPixels: number };

/** Self-contained browser input pilot. Observes shipped status and actual canvas draws only. */
export function installQuarryPilotScript(): void {
  const pilot = { active: false, frozen: false, route: [] as QuarryWaypoint[], index: 0, stageFrames: 0,
    jumped: false, jumping: false, pauseIndex: -1, time: 0, observations: [] as object[],
    decks: [] as { id: string; y: number; stationary: boolean }[], error: '',
    frame: null as null | { status: string; x: number; feet: number; camera: { x: number; y: number };
      henry: { x: number; y: number; width: number; height: number }; supports: QuarrySupportDraw[] } };
  Object.assign(window, { quarryPilot: pilot });
  let slabs: { x: number; y: number }[] = [];
  let supports: QuarrySupportDraw[] = [];
  let previousDecks = pilot.decks;
  const references = new Map<QuarrySupportDraw, { image: HTMLImageElement; x: number; y: number; transform: DOMMatrix }>();
  // Exact shipped native contracts, kept inside the serialized init function.
  const sources: Record<string, [number, number]> = {
    '/assets/quarry/floor-v1/floor-820.png': [820, 107],
    '/assets/quarry/representative-v1/dock-60.png': [60, 12],
    '/assets/quarry/representative-v1/catch-108.png': [108, 24],
    '/assets/quarry/representative-v1/catch-112.png': [112, 24],
    '/assets/quarry/representative-v1/carriage-96.png': [96, 17],
    '/assets/quarry/whole-ledges-v1/shelf-400.png': [400, 45],
    '/assets/quarry/whole-ledges-v1/shelf-160.png': [160, 32],
    '/assets/quarry/whole-ledges-v1/shelf-240.png': [240, 37],
    '/assets/quarry/rollout-v1/shelf-360.png': [360, 41],
    '/assets/quarry/rollout-v1/rock-140.png': [140, 30],
    '/assets/quarry/rollout-v1/shelf-240.png': [240, 27],
    '/assets/quarry/rollout-v1/star-160.png': [160, 35],
    '/assets/quarry/rollout-v1/shelf-180.png': [180, 28],
    '/assets/quarry/rollout-v1/shelf-220.png': [220, 25],
    '/assets/quarry/rollout-v1/shelf-260.png': [260, 30],
    '/assets/quarry/rollout-v1/shelf-200.png': [200, 23],
    '/assets/quarry/rollout-v1/rock-112.png': [112, 24],
    '/assets/quarry/rollout-v1/carriage-96.png': [96, 17],
  };
  const landingPixels = (ctx: CanvasRenderingContext2D, edge: QuarrySupportDraw, left: number, right: number): number => {
    if (edge.y < 0 || edge.y + 4 >= 240 || right <= left) return 0;
    const actual = ctx.getImageData(left, Math.floor(edge.y), right - left, 4).data;
    const reference = references.get(edge);
    let expected: Uint8ClampedArray | undefined;
    if (reference) {
      const canvas = document.createElement('canvas'); canvas.width = 426; canvas.height = 240;
      const native = canvas.getContext('2d')!;
      native.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      native.setTransform(reference.transform);
      native.drawImage(reference.image, reference.x, reference.y);
      expected = native.getImageData(left, Math.floor(edge.y), right - left, 4).data;
    }
    let count = 0;
    for (let pixel = 0; pixel < actual.length; pixel += 4) {
      if (expected ? expected[pixel + 3] === 255 && actual[pixel] === expected[pixel]
        && actual[pixel + 1] === expected[pixel + 1] && actual[pixel + 2] === expected[pixel + 2]
        : !edge.source && ((actual[pixel] === 177 && actual[pixel + 1] === 199 && actual[pixel + 2] === 125)
          || (actual[pixel] === 154 && actual[pixel + 1] === 171 && actual[pixel + 2] === 150))) count++;
    }
    return count;
  };
  // Frame, source references and raster reads must be consumed in the same evaluate.
  Object.assign(window, { quarryLandingPixels: landingPixels, quarryLandingSample: (ctx: CanvasRenderingContext2D,
    next: QuarryLandingTarget, id: string): QuarryLandingSample => {
    const frame = pilot.frame!;
    const drawn = frame.supports.find(support => Math.abs(support.x + frame.camera.x - next.x) < 1.1
      && Math.abs(support.y + frame.camera.y - next.y) < 1.1 && support.width === next.width
      && Boolean(next.source && support.source === next.source));
    const edge = drawn ?? { x: next.x - frame.camera.x, y: next.y - frame.camera.y, width: next.width, source: next.source };
    const left = Math.max(0, Math.ceil(edge.x + 2)), right = Math.min(426, Math.floor(edge.x + edge.width - 2));
    const capPixels = drawn ? landingPixels(ctx, edge, left, right) : 0;
    return { ...frame, id, next, edge, drawn: Boolean(drawn), visibleWidth: right - left, capPixels };
  } });

  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
    if (this.canvas.id === 'game') {
      if (x === 0 && y === 0 && width === 426 && height === 240) {
        previousDecks = pilot.decks; pilot.decks = []; pilot.frame = null;
        slabs = []; supports = []; references.clear();
      }
      const t = this.getTransform();
      if (t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1) {
        if (width === 96 && height === 10 && this.fillStyle === '#59616a') slabs.push({ x: x + t.e, y: y + t.f });
        if (height === 10 && this.fillStyle === '#59616a') supports.push({ x: x + t.e, y: y + t.f, width });
      }
    }
    fill.call(this, x, y, width, height);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(this: CanvasRenderingContext2D, ...args: unknown[]) {
    if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args.length === 3) {
      const image = args[0], url = new URL(image.src, window.location.origin), size = sources[url.pathname], t = this.getTransform();
      if (url.origin === window.location.origin && !url.search && !url.hash && size && image.complete
        && image.naturalWidth === size[0] && image.naturalHeight === size[1]
        && t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1
        && typeof args[1] === 'number' && Number.isFinite(args[1]) && typeof args[2] === 'number' && Number.isFinite(args[2])) {
        const support = { x: args[1] + t.e, y: args[2] + t.f, width: size[0], source: url.pathname };
        supports.push(support); references.set(support, { image, x: args[1], y: args[2], transform: t });
        if (url.pathname.endsWith('/carriage-96.png')) slabs.push(support);
      }
    }
    if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/henry/henry-celebration.png') && args.length === 9 && args[8] === 48) {
      const status = document.querySelector('#status')?.textContent ?? '';
      const match = status.match(/X (-?\d+) Y (-?\d+)/);
      if (match && status.includes('Playing')) {
        const feet = this.getTransform().transformPoint(new DOMPoint(Number(args[5]) + 24, Number(args[6]) + 44));
        const camera = { x: Number(match[1]) - feet.x, y: Number(match[2]) + 34 - feet.y };
        pilot.frame = { status, x: Number(match[1]), feet: Number(match[2]) + 34, camera,
          henry: { x: feet.x - 24, y: feet.y - 44, width: 48, height: 48 }, supports: [...supports] };
        const previous = previousDecks;
        pilot.decks = slabs.map(slab => {
          const x = slab.x + camera.x, y = slab.y + camera.y;
          const id = x > 500 ? 'quarry-lift-b' : y < 560 ? 'quarry-lift-a' : 'quarry-lift-c';
          return { id, y, stationary: previous.some(p => p.id === id && Math.abs(p.y - y) < 0.15) };
        });
      }
    }
    Reflect.apply(draw, this, args);
  } as typeof draw;
  const key = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const raf = requestAnimationFrame.bind(window);
  let lastNow = -1;
  window.requestAnimationFrame = callback => raf(now => {
    if (now === lastNow) { callback(pilot.time); return; }
    lastNow = now;
    if (pilot.frozen) { callback(pilot.time); return; }
    const status = document.querySelector('#status')?.textContent ?? '';
    const match = status.match(/X (-?\d+) Y (-?\d+) V (-?\d+)/);
    let horizontal = 0, jump = false, speed = 1;
    if (pilot.active && status.includes('Playing') && match) {
      const [x, feet, vx] = [Number(match[1]), Number(match[2]) + 34, Number(match[3])];
      const target = pilot.route[pilot.index];
      if (!target) pilot.active = false;
      else {
        const stop = x + Math.sign(vx) * vx ** 2 / 2400;
        horizontal = stop < target.x - 3 ? 1 : stop > target.x + 3 ? -1 : 0;
        if (target.jump && !pilot.jumped) { pilot.jumped = true; jump = true; }
        else jump = Boolean(target.jump && pilot.stageFrames < 24);
        const dock = target.waitFor;
        const ready = !dock || pilot.decks.some(deck => deck.id === dock.id && Math.abs(deck.y - dock.y) < 1 && deck.stationary);
        if (Math.abs(x - target.x) < 7 && Math.abs(feet - target.y) < 1.1 && (!target.jump || pilot.stageFrames > 24) && ready) {
          pilot.observations.push({ index: pilot.index, tag: target.tag, x, feet, decks: pilot.decks, status });
          pilot.index++; pilot.stageFrames = 0; pilot.jumped = false;
          if (pilot.index === pilot.pauseIndex) pilot.frozen = true;
          if (pilot.index === pilot.route.length) pilot.active = false;
          horizontal = 0; jump = false;
        } else {
          // Keep normal sampling near docks, moving lifts, jumps and landing edges.
          speed = !dock && !target.jump && Math.abs(x - target.x) > 120 && Math.abs(feet - target.y) < 2 ? 4 : 1;
          pilot.stageFrames += speed;
          if (pilot.stageFrames > 900) { pilot.error = `${target.tag}: ${status}`; pilot.active = false; }
        }
      }
    }
    if (status.includes('Finish')) pilot.active = false;
    key('ArrowRight', horizontal > 0); key('ArrowLeft', horizontal < 0);
    if (jump !== pilot.jumping) key('Space', jump);
    pilot.jumping = jump;
    pilot.time += 1000 / 60 * speed;
    callback(pilot.time);
  });
}
