import type { Page } from '@playwright/test';

export interface TimberPilotStage {
  kind: 'run' | 'walk' | 'jump' | 'drop' | 'fall' | 'finish';
  x?: number;
  y?: number;
  frames?: number;
  edge?: number;
  direction?: -1 | 1;
}

/** Actual walk-off route, including the combined y840 right-fork end at x470. */
export const TIMBER_DESCENT_ALL: readonly TimberPilotStage[] = [
  { kind: 'walk', x: 350 }, { kind: 'walk', x: 560 },
  { kind: 'drop', edge: 590, direction: 1, y: 240, x: 650 },
  { kind: 'drop', edge: 570, direction: -1, y: 300, x: 540 },
  { kind: 'drop', edge: 660, direction: 1, y: 360, x: 620 },
  { kind: 'drop', edge: 580, direction: -1, y: 420, x: 540 },
  { kind: 'walk', x: 300 }, { kind: 'walk', x: 510 },
  { kind: 'drop', edge: 620, direction: 1, y: 480, x: 650 },
  { kind: 'drop', edge: 580, direction: -1, y: 540, x: 540 },
  { kind: 'drop', edge: 660, direction: 1, y: 600, x: 690 },
  { kind: 'drop', edge: 580, direction: -1, y: 660, x: 540 },
  { kind: 'walk', x: 260 }, { kind: 'walk', x: 570 },
  { kind: 'drop', edge: 620, direction: 1, y: 720, x: 650 },
  { kind: 'drop', edge: 580, direction: -1, y: 780, x: 540 },
  { kind: 'drop', edge: 660, direction: 1, y: 840, x: 690 },
  { kind: 'drop', edge: 470, direction: -1, y: 900, x: 440 },
  { kind: 'walk', x: 270 }, { kind: 'walk', x: 510 },
  { kind: 'drop', edge: 620, direction: 1, y: 960, x: 650 },
  { kind: 'drop', edge: 580, direction: -1, y: 1020, x: 540 },
  { kind: 'fall', direction: -1, y: 1080 }, { kind: 'walk', x: 220 },
];

export const TIMBER_REASCENT: readonly TimberPilotStage[] = [
  { kind: 'walk', x: 270 }, { kind: 'jump', x: 270, y: 1020 },
  { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
  { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
  { kind: 'walk', x: 260 }, { kind: 'walk', x: 400 },
  { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
  { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
  { kind: 'walk', x: 500 }, { kind: 'walk', x: 400 },
  { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
  { kind: 'jump', x: 400, y: 240 }, { kind: 'jump', x: 400, y: 180 }, { kind: 'finish' },
];

export const TIMBER_ONLY_E2_ASCENT: readonly TimberPilotStage[] = [
  { kind: 'walk', x: 220 }, { kind: 'walk', x: 270 }, { kind: 'jump', x: 270, y: 1020 },
  { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  { kind: 'walk', x: 270 }, { kind: 'walk', x: 500 },
  { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
  { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
  { kind: 'walk', x: 400 }, { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
  { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
  { kind: 'walk', x: 300 }, { kind: 'walk', x: 400 },
  { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
  { kind: 'jump', x: 400, y: 240 }, { kind: 'jump', x: 400, y: 180 }, { kind: 'finish' },
];

export async function runTimberStages(page: Page, stages: readonly TimberPilotStage[], timeout = 45_000): Promise<object> {
  await page.evaluate(stages => {
    const pilot = (window as unknown as { timberKeyboardPilot: {
      stages: TimberPilotStage[]; active: boolean; paused: boolean; pauseAt: number; stage: number;
      frames: number; stable: number; previousY: number; phase: number; error: string; done: boolean; seenPlaying: boolean; history: object[];
    } }).timberKeyboardPilot;
    Object.assign(pilot, { stages, active: true, paused: false, pauseAt: -1, stage: 0,
      frames: 0, stable: 0, previousY: NaN, phase: 0, error: '', done: false, seenPlaying: false, history: [] });
  }, stages);
  await page.waitForFunction(() => {
    const pilot = (window as unknown as { timberKeyboardPilot: { done: boolean; error: string } }).timberKeyboardPilot;
    return pilot.done || Boolean(pilot.error);
  }, undefined, { timeout });
  const result = await page.evaluate(() => {
    const pilot = (window as unknown as { timberKeyboardPilot: { active: boolean } }).timberKeyboardPilot;
    pilot.active = false;
    return pilot;
  });
  return result;
}

export const TIMBER_ASCENT_RIGHT: readonly TimberPilotStage[] = [
      { kind: 'run', frames: 17 }, { kind: 'jump', x: 260, y: 1020 },
      { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
      { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
      { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
      { kind: 'walk', x: 400 }, { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
      { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
      { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
      { kind: 'jump', x: 400, y: 240 }, { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 180 }, { kind: 'finish' },
];

/** Generates keyboard events at the shipped input boundary; it never touches scene or run state. */
export async function installTimberKeyboardPilot(page: Page): Promise<void> {
  await page.addInitScript((stages: TimberPilotStage[]) => {

    const pilot = { active: false, paused: false, frozen: false, pauseAt: -1, stage: 0, frames: 0,
      stable: 0, previousY: NaN, startY: NaN, phase: 0, error: '', done: false, seenPlaying: false, advanceMs: 0,
      stages, history: [] as object[] };
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
    let previousTime = 0, gameTime = 0;
    window.requestAnimationFrame = callback => original(now => {
      if (pilot.frozen) { previousTime = now; callback(gameTime); return; }
      const status = document.querySelector('#status')?.textContent ?? '';
      const x = Number(status.match(/X (-?\d+)/)?.[1] ?? NaN);
      const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? NaN);
      const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
      if (now !== previousTime && pilot.active && status.includes('Playing')) pilot.seenPlaying = true;
      if (now !== previousTime && pilot.active && !pilot.paused && !pilot.done && !pilot.error && status.includes('Playing')) {
        const stage = pilot.stages[pilot.stage];
        if (!stage) { pilot.error = `stage overflow ${pilot.stage}`; release(); }
        else if (stage.kind === 'finish') {
          send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
          pilot.frames++;
          if (pilot.frames > 130) pilot.error = `finish stalled ${status}`;
        } else if (stage.kind === 'run') {
          send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
          if (++pilot.frames >= stage.frames!) next(status);
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
            direction = stage.direction!;
            if (y > pilot.startY + 1) pilot.phase = 2;
          } else {
            direction = projected < stage.x! - 4 ? 1 : projected > stage.x! + 4 ? -1 : 0;
          }
          send('ArrowRight', direction > 0); send('ArrowLeft', direction < 0); send('Space', false);
          pilot.frames++;
          pilot.stable = pilot.phase === 2 && y === stage.y! - 34 && y === pilot.previousY ? pilot.stable + 1 : 0;
          pilot.previousY = y;
          if (pilot.stable >= 2) next(status);
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
      gameTime += Math.min(now - (previousTime || now), 32) + pilot.advanceMs;
      pilot.advanceMs = 0; previousTime = now;
      callback(gameTime);
    });
  }, [...TIMBER_ASCENT_RIGHT]);
}

