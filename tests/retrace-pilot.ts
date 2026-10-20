import type { PLAINS_LEVEL } from '../src/world/level';

/** Shared, self-contained browser init script; no scene or simulation hooks. */
export function installRetracePilotScript(level: typeof PLAINS_LEVEL): void {
  const pilot = { direction: 0, stopAt: 0, targets: [] as number[], triggered: [] as number[],
    collectAt: [] as number[], expectedCount: 0, jumping: false, jumpUntil: 0, lastX: 0,
    recoveries: [] as string[], stopped: false, history: [] as { x: number; y: number; jump: boolean; direction: number }[], recoveryHistory: [] as unknown[] };
  Object.assign(window, { retracePilot: pilot });
  // Observe actual sprite draws, so patrol timing and squashed slimes need no scene hooks.
  let drawnSlimes: number[] = [], henryX = 0;
  const fillRect = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
    if (this.canvas.id === 'game' && x === 0 && y === 0 && width === 426 && height === 240) drawnSlimes = [];
    fillRect.call(this, x, y, width, height);
  };
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
    if (this.canvas.id === 'game' && args.length === 9 && args[0] instanceof HTMLImageElement) {
      if (args[0].src.endsWith('/assets/slimes/slimes.png') && args[8] === 48) drawnSlimes.push(Number(args[5]) + 24);
      if (args[0].src.endsWith('/assets/henry/henry-celebration.png')) henryX = this.getTransform().transformPoint(new DOMPoint(Number(args[5]) + 24, Number(args[6]) + 24)).x;
    }
    Reflect.apply(drawImage, this, args);
  } as typeof drawImage;
  const ground = (x: number): number => {
    const part = level.surfaces.find(s => x >= s.x1 && x <= s.x2) ?? level.surfaces.at(-1)!;
    return part.y1 + (part.y2 - part.y1) * (x - part.x1) / (part.x2 - part.x1);
  };
  const key = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })); };
  const raf = requestAnimationFrame.bind(window);
  let time = 0, observedFrame = -1;
  window.requestAnimationFrame = callback => raf(now => {
    // Test waits may also request RAF: sample input/time once per physical frame.
    if (now === observedFrame) { callback(time); return; }
    observedFrame = now;
    const status = document.querySelector('#status')?.textContent ?? '';
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0);
    const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? 0);
    const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
    const count = Number(status.match(/(?:Letter bag: |Bag )(\d)\/4/)?.[1] ?? 0);
    if (status.includes('Finish')) pilot.direction = 0;
    let horizontal = 0, jump = false;
    if (pilot.direction && status.includes('Playing')) {
      if ((x - pilot.lastX) * pilot.direction < -100) { pilot.recoveries.push(status); pilot.recoveryHistory.push([...pilot.history, { x, y, jump: false, direction: pilot.direction }]); }
      pilot.lastX = x;
      const direction = pilot.direction;
      if (pilot.collectAt.length && count >= pilot.expectedCount) { pilot.collectAt.shift(); pilot.expectedCount++; }
      const target = pilot.collectAt[0];
      const stop = x + Math.sign(vx) * vx ** 2 / 2400;
      horizontal = target !== undefined && Math.abs(x - target) < 120 ? stop < target - 3 ? 1 : stop > target + 3 ? -1 : 0 : direction;
      const danger = pilot.targets.find(d => !pilot.triggered.includes(d) && (d - x) * direction <= 65 && (d - x) * direction > -20);
      if (danger !== undefined) { pilot.triggered.push(danger); pilot.jumpUntil = time + 400; }
      // Reverse pits have no spring on the far bank: jump before the drop.
      const onGround = Math.abs(y + 34 - ground(x)) < 4;
      const nearSlime = drawnSlimes.some(sx => (sx - henryX) * direction > -18 && (sx - henryX) * direction < 65);
      // An unheld spring arc can land beside a slime before a ground-only
      // jump takes effect. Brake to land clear, but keep moving through a
      // deliberate held jump so the pilot can actually cross the slime.
      if (nearSlime && !onGround && time >= pilot.jumpUntil) horizontal = 0;
      const drop = direction < 0 && ground(x - 50) > ground(x) + 60;
      const rise = direction < 0 ? ground(x) - ground(x - 50) : 0;
      if (onGround && (nearSlime || drop || rise > 28)) {
        key('Space', false); pilot.jumping = false;
        // A short hop out of an already-crumbled 36px recess leaves room for
        // the separate pit jump. A held rise jump overshoots the safe bank.
        pilot.jumpUntil = time + (!nearSlime && !drop && rise < 45 ? 100 : 400);
      }
      jump = time < pilot.jumpUntil;
      if (pilot.stopAt && (x - pilot.stopAt) * direction >= 0 && pilot.collectAt.length === 0) {
        pilot.direction = 0; horizontal = 0; jump = false; pilot.stopped = true;
      }
    }
    pilot.history.push({ x, y, jump, direction: pilot.direction });
    if (pilot.history.length > 45) pilot.history.shift();
    key('ArrowRight', horizontal > 0); key('ArrowLeft', horizontal < 0);
    if (jump !== pilot.jumping) key('Space', jump);
    pilot.jumping = jump;
    // Sample nearby actors and reverse pit banks at normal cadence, like the star pilot.
    const nearPit = level.surfaces.some(part => Math.max(part.y1, part.y2) > level.height + 50 && x > part.x1 - 120 && x < part.x2 + 120);
    const nearActor = drawnSlimes.some(sx => Math.abs(sx - henryX) < 100);
    const speed = status.includes('Playing') && !nearActor && !(pilot.direction < 0 && nearPit) ? 6 : 1;
    // Whole fixed steps make the observed-input cadence deterministic across engines.
    time += 1000 / 60 * speed;
    callback(time);
  });
}
