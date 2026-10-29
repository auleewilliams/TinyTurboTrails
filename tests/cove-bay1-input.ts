import type { TimberPilotStage } from './timbers-browser-pilot';

/** Existing staged keyboard protocol; passes real RAF timestamps through unchanged. */
export function bay1KeyboardPilotInit(stages: TimberPilotStage[]): void {

    const pilot = { active: false, paused: false, pauseAt: -1, stage: 0, frames: 0,
      stable: 0, previousY: NaN, startY: NaN, phase: 0, error: '', done: false, seenPlaying: false,
      stages, history: [] as object[], recoveries: [] as string[], observedX: NaN, observedY: NaN };
    Object.assign(window, { timberKeyboardPilot: pilot });
    const send = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })); };
    const release = (): void => { send('ArrowLeft', false); send('ArrowRight', false); send('Space', false); };
    const next = (status: string): void => {
      pilot.history.push({ stage: pilot.stage, status }); pilot.stage++; pilot.frames = 0;
      pilot.stable = 0; pilot.previousY = NaN; pilot.phase = 0; release();
      if (pilot.stage >= pilot.stages.length) pilot.done = true;
      if (pilot.stage === pilot.pauseAt) pilot.paused = true;
    };
    const original = requestAnimationFrame.bind(window);
    let previousTime = 0;
    window.requestAnimationFrame = callback => original(now => {
      const status = document.querySelector('#status')?.textContent ?? '';
      const x = Number(status.match(/X (-?\d+)/)?.[1] ?? NaN);
      const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? NaN);
      const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
      if (now !== previousTime && pilot.active && status.includes('Playing')) pilot.seenPlaying = true;
      if (now !== previousTime && pilot.active && !pilot.paused && !pilot.done && !pilot.error && status.includes('Playing')) {
        if (Number.isFinite(pilot.observedX) && (Math.abs(x - pilot.observedX) > 80 || Math.abs(y - pilot.observedY) > 120)) pilot.recoveries.push(status);
        pilot.observedX = x; pilot.observedY = y;
        const stage = pilot.stages[pilot.stage];
        if (!stage) { pilot.error = `stage overflow ${pilot.stage}`; release(); }
        else if (stage.kind === 'finish') {
          send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
          pilot.frames++;
          if (pilot.frames > 130) pilot.error = `finish stalled ${status}`;
        } else if (stage.kind === 'run') {
          send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
          pilot.frames++;
          // Read the grounded run-up position, not a callback count: 17 RAFs can
          // advance very different game distances at 16 and 32 ms intervals.
          if (stage.x !== undefined) {
            if (y !== stage.y! - 34 || x > stage.x + 20) pilot.error = `run-up left safe takeoff ${status}`;
            else if (x >= stage.x && vx >= 180) next(status);
            else if (pilot.frames > stage.frames!) pilot.error = `run-up stalled ${status}`;
          } else if (pilot.frames >= stage.frames!) next(status);
        } else if (stage.kind === 'travel') {
          const direction=stage.direction!;
          send('ArrowRight',direction>0); send('ArrowLeft',direction<0); send('Space',false);
          pilot.frames++;
          if((x-stage.x!)*direction>=0) next(status);
          else if(pilot.frames>200) pilot.error=`travel ${pilot.stage} stalled ${status}`;
        } else if (stage.kind === 'walk') {
          const projected = x + Math.sign(vx) * vx ** 2 / 2400;
          const direction = projected < stage.x! - 3 ? 1 : projected > stage.x! + 3 ? -1 : 0;
          send('ArrowRight', direction > 0); send('ArrowLeft', direction < 0); send('Space', false);
          pilot.frames++;
          if (Math.abs(x - stage.x!) < 4 && Math.abs(vx) < 20) next(status);
          else if (pilot.frames > 200) pilot.error = `walk ${pilot.stage} stalled ${status}`;
        } else if (stage.kind === 'fall') {
          send('ArrowRight', stage.direction === 1); send('ArrowLeft', stage.direction === -1); send('Space', false);
          pilot.frames++;
          pilot.stable = y === stage.y! - 34 && y === pilot.previousY ? pilot.stable + 1 : 0;
          pilot.previousY = y;
          if (pilot.stable >= 2) next(status);
          else if (pilot.frames > 130) pilot.error = `fall ${pilot.stage} stalled ${status}`;
        } else if (stage.kind === 'drop') {
          const projected = x + Math.sign(vx) * vx ** 2 / 2400;
          let direction = 0;
          if (pilot.phase === 0) {
            const target = stage.edge! - stage.direction! * 24;
            direction = projected < target - 3 ? 1 : projected > target + 3 ? -1 : 0;
            if (Math.abs(x - target) < 4 && Math.abs(vx) < 20) {
              pilot.phase = 1; pilot.startY = y; pilot.frames = 0;
            }
          } else if (pilot.phase === 1) {
            const clear = stage.direction === 1 ? x - 9 > stage.edge! : x + 9 < stage.edge!;
            // Brake as soon as the full 18px body clears the top. Waiting for
            // rounded Y to change can carry a fast walk-off past the next bough.
            direction = clear ? 0 : stage.direction!;
            if (clear && y > pilot.startY + 1) pilot.phase = 2;
          } else {
            direction = projected < stage.x! - 4 ? 1 : projected > stage.x! + 4 ? -1 : 0;
          }
          send('ArrowRight', direction > 0); send('ArrowLeft', direction < 0); send('Space', false);
          pilot.frames++;
          pilot.stable = pilot.phase === 2 && y === stage.y! - 34 && y === pilot.previousY ? pilot.stable + 1 : 0;
          pilot.previousY = y;
          // A brief y match can occur while Henry is already leaving a narrow
          // bough. Require a settled, centered landing before the next walk-off.
          if (pilot.stable >= 2 && Math.abs(x - stage.x!) < 16 && Math.abs(vx) < 30) next(status);
          else if (pilot.frames > 200) pilot.error = `drop ${pilot.stage} phase ${pilot.phase} stalled ${status}`;
        } else {
          const projected = x + Math.sign(vx) * vx ** 2 / 2400;
          const direction = projected < stage.x! - 4 ? 1 : projected > stage.x! + 4 ? -1 : 0;
          const preparing = pilot.frames === 0;
          send('ArrowRight', !preparing && direction > 0);
          send('ArrowLeft', !preparing && direction < 0);
          send('Space', !preparing && pilot.frames <= 30);
          pilot.frames++;
          pilot.stable = y === stage.y! - 34 && y === pilot.previousY ? pilot.stable + 1 : 0;
          pilot.previousY = y;
          if (pilot.frames > 10 && pilot.stable >= 2) next(status);
          else if (pilot.frames > 110) pilot.error = `jump ${pilot.stage} stalled ${status}`;
        }
      } else if (now !== previousTime && pilot.active && pilot.seenPlaying
        && pilot.stages[pilot.stage]?.kind === 'finish' && status.includes('Finish')) {
        pilot.done = true; release();
      } else if (pilot.paused || pilot.error) release();
      previousTime = now;
      callback(now);
    });
}
