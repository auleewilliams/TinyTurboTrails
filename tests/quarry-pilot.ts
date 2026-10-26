import type { QuarryWaypoint } from './quarry-route';

/** Self-contained browser input pilot. Observes shipped status and actual canvas draws only. */
export function installQuarryPilotScript(): void {
  const pilot = { active: false, frozen: false, route: [] as QuarryWaypoint[], index: 0, stageFrames: 0,
    jumped: false, jumping: false, pauseIndex: -1, time: 0, observations: [] as object[],
    decks: [] as { id: string; y: number; stationary: boolean }[], error: '' };
  Object.assign(window, { quarryPilot: pilot });
  let slabs: { x: number; y: number }[] = [];
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
    if (this.canvas.id === 'game') {
      if (x === 0 && y === 0 && width === 426 && height === 240) slabs = [];
      if (width === 96 && height === 10) slabs.push({ x, y });
    }
    fill.call(this, x, y, width, height);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(this: CanvasRenderingContext2D, ...args: unknown[]) {
    if (this.canvas.id === 'game' && args[0] instanceof HTMLImageElement && args[0].src.endsWith('/assets/henry/henry-celebration.png') && args.length === 9 && args[8] === 48) {
      const status = document.querySelector('#status')?.textContent ?? '';
      const match = status.match(/X (-?\d+) Y (-?\d+)/);
      if (match && status.includes('Playing')) {
        const feet = this.getTransform().transformPoint(new DOMPoint(Number(args[5]) + 24, Number(args[6]) + 44));
        const camera = { x: Number(match[1]) - feet.x, y: Number(match[2]) + 34 - feet.y };
        const previous = pilot.decks;
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
