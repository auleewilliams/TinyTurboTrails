import type { WorldEntity } from '../src/world/level';

/** Browser input adapter: reads rendered HUD/debug text, delivers keyboard events.
 * Never accesses a scene, run, reward set or player object. */
export function installPlainsRewardPilot(targets: readonly WorldEntity[]): void {
  const pilot = { active: false, frozen: false, target: 0, time: 0, downhill: false, jumpUntil: 0,
    jumping: false, frame: 0, capture: '', captures: [] as string[], history: [] as object[], assets: {} as Record<string, number[]> };
  Object.assign(window, { plainsPilot: pilot });
  const text = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth) {
    if (this.canvas.id === 'game') {
      if (x === 28 && y === 20 && /^\d+$/.test(value)) this.canvas.dataset.gems = value;
      if (x === 168 && y === 20 && /^\d\/3$/.test(value)) this.canvas.dataset.stars = value;
    }
    if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, image: CanvasImageSource, ...args: number[]) {
    if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.complete && image.naturalWidth) {
      pilot.assets[new URL(image.src).pathname] = [image.naturalWidth, image.naturalHeight];
    }
    Reflect.apply(draw, this, [image, ...args]);
  } as typeof draw;
  const key = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })); };
  const raf = requestAnimationFrame.bind(window);
  let observed = -1;
  window.requestAnimationFrame = callback => raf(now => {
    if (observed === now) { callback(pilot.time); return; }
    observed = now;
    if (pilot.frozen) { callback(pilot.time); return; }
    const status = document.querySelector('#status')?.textContent ?? '';
    const x = Number(status.match(/X (\d+)/)?.[1] ?? 0), y = Number(status.match(/Y (-?\d+)/)?.[1] ?? 0), vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
    const canvas = document.querySelector<HTMLCanvasElement>('#game');
    const gems = Number(canvas?.dataset.gems ?? 0), stars = Number(canvas?.dataset.stars?.split('/')[0] ?? 0);
    let horizontal = 0, jumping = false;
    if (pilot.active && status.includes('Playing')) {
      let target = targets[pilot.target];
      const count = (kind: string, at: number): number => targets.slice(0, at + 1).filter(t => t.kind === kind).length;
      while (target && (target.kind === 'gem' ? gems >= count('gem', pilot.target) : stars >= count('special', pilot.target))) target = targets[++pilot.target];
      horizontal = 1;
      if (target) {
        const stop = x + Math.sign(vx) * vx ** 2 / 2400;
        if (target.x >= 1120 && target.x <= 1190 && !pilot.downhill) {
          if (x >= 1065) { pilot.downhill = true; pilot.jumpUntil = pilot.time + 400; }
        } else if (pilot.downhill && x < 1300 && target.x <= 1190) {
          // Continue the real downhill jump through both gems and the star.
        } else {
          horizontal = Math.abs(x - target.x) < 120 ? stop < target.x - 3 ? 1 : stop > target.x + 3 ? -1 : 0 : Math.sign(target.x - x);
          if (Math.abs(x - target.x) < 6 && Math.abs(vx) < 15 && pilot.frame % 90 === 0) pilot.jumpUntil = pilot.time + 400;
        }
      }
      jumping = pilot.time < pilot.jumpUntil;
      const section = [[300, 'meadow-hop'], [650, 'H'], [1100, 'downhill-takeoff'], [1300, 'downhill-runout'],
        [1900, 'orchard-star'], [2180, 'I'], [2780, 'spring-arc'], [2940, 'spring-landing'], [3150, 'L1'], [3750, 'L2'], [4140, 'final-crest']]
        .find(([at, name]) => x >= Number(at) && !pilot.captures.includes(String(name)));
      if (section) { pilot.capture = String(section[1]); pilot.captures.push(pilot.capture); pilot.frozen = true; callback(pilot.time); return; }
    }
    if (status.includes('Finish')) pilot.active = false;
    key('ArrowRight', horizontal > 0); key('ArrowLeft', horizontal < 0);
    if (jumping !== pilot.jumping) key('Space', jumping);
    pilot.jumping = jumping;
    if (pilot.active) pilot.history.push({ x, y, vx, gems, stars, target: targets[pilot.target]?.id, horizontal, jumping });
    pilot.frame++;
    // Native-size software-canvas routes use bounded fixed steps, with fine
    // input sampling near targets and the two authored arcs.
    const near = targets[pilot.target] && Math.abs(x - targets[pilot.target].x) < 150 || x > 1000 && x < 1320 || x > 2680 && x < 3100;
    pilot.time += 1000 / 60 * (pilot.active && !near ? 4 : 1);
    callback(pilot.time);
  });
}
