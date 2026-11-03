# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cove-rollout.spec.ts >> Cove B Hollow/Pools ordinary input rests at 426px
- Location: tests/cove-rollout.spec.ts:28:71

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e1]:
  - 'generic "Letter bag: 3/4" [ref=e2]': This game requires a browser with Canvas 2D support.
  - status [ref=e3]: "Adventure preview · Playing · Letter bag: 3/4 · X 2434 Y 250 V 0 F 1 · Escape to pause · M to mute"
  - button "Pause" [ref=e5] [cursor=pointer]: Ⅱ Pause
  - navigation "Trail navigation"
```

# Test source

```ts
  1   | import type { Page } from '@playwright/test';
  2   | 
  3   | export interface TimberPilotStage {
  4   |   kind: 'travel' | 'run' | 'walk' | 'jump' | 'drop' | 'fall' | 'finish';
  5   |   x?: number;
  6   |   y?: number;
  7   |   frames?: number;
  8   |   edge?: number;
  9   |   direction?: -1 | 1;
  10  | }
  11  | 
  12  | /** Actual walk-off route, including the combined y840 right-fork end at x470. */
  13  | export const TIMBER_DESCENT_ALL: readonly TimberPilotStage[] = [
  14  |   { kind: 'walk', x: 350 }, { kind: 'walk', x: 560 },
  15  |   { kind: 'drop', edge: 590, direction: 1, y: 240, x: 650 },
  16  |   { kind: 'drop', edge: 570, direction: -1, y: 300, x: 580 },
  17  |   { kind: 'drop', edge: 660, direction: 1, y: 360, x: 620 },
  18  |   { kind: 'drop', edge: 580, direction: -1, y: 420, x: 540 },
  19  |   { kind: 'walk', x: 300 }, { kind: 'walk', x: 510 },
  20  |   { kind: 'drop', edge: 620, direction: 1, y: 480, x: 650 },
  21  |   { kind: 'drop', edge: 580, direction: -1, y: 540, x: 580 },
  22  |   { kind: 'drop', edge: 660, direction: 1, y: 600, x: 690 },
  23  |   { kind: 'drop', edge: 580, direction: -1, y: 660, x: 540 },
  24  |   { kind: 'walk', x: 260 }, { kind: 'walk', x: 570 },
  25  |   { kind: 'drop', edge: 620, direction: 1, y: 720, x: 650 },
  26  |   { kind: 'drop', edge: 580, direction: -1, y: 780, x: 580 },
  27  |   { kind: 'drop', edge: 660, direction: 1, y: 840, x: 690 },
  28  |   { kind: 'drop', edge: 470, direction: -1, y: 900, x: 440 },
  29  |   { kind: 'walk', x: 270 }, { kind: 'walk', x: 510 },
  30  |   { kind: 'drop', edge: 620, direction: 1, y: 960, x: 650 },
  31  |   { kind: 'drop', edge: 620, direction: -1, y: 1020, x: 580 },
  32  |   { kind: 'fall', direction: -1, y: 1080 }, { kind: 'walk', x: 220 },
  33  | ];
  34  | 
  35  | export const TIMBER_REASCENT: readonly TimberPilotStage[] = [
  36  |   { kind: 'walk', x: 270 }, { kind: 'jump', x: 270, y: 1020 },
  37  |   { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  38  |   { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
  39  |   { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
  40  |   { kind: 'walk', x: 260 }, { kind: 'walk', x: 400 },
  41  |   { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
  42  |   { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
  43  |   { kind: 'walk', x: 500 }, { kind: 'walk', x: 400 },
  44  |   { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
  45  |   { kind: 'jump', x: 400, y: 240 }, { kind: 'jump', x: 400, y: 180 }, { kind: 'finish' },
  46  | ];
  47  | 
  48  | export const TIMBER_ONLY_E2_ASCENT: readonly TimberPilotStage[] = [
  49  |   { kind: 'walk', x: 220 }, { kind: 'walk', x: 270 }, { kind: 'jump', x: 270, y: 1020 },
  50  |   { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  51  |   { kind: 'walk', x: 270 }, { kind: 'walk', x: 500 },
  52  |   { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
  53  |   { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
  54  |   { kind: 'walk', x: 400 }, { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
  55  |   { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
  56  |   { kind: 'walk', x: 300 }, { kind: 'walk', x: 400 },
  57  |   { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
  58  |   { kind: 'jump', x: 400, y: 240 }, { kind: 'jump', x: 400, y: 180 }, { kind: 'finish' },
  59  | ];
  60  | 
  61  | /** Left fork, with both outer stars reached and rejoined by ordinary input. */
  62  | export const TIMBER_LEFT_STARS_ASCENT: readonly TimberPilotStage[] = [
  63  |   { kind: 'run', x: 150, y: 1080, frames: 60 }, { kind: 'jump', x: 260, y: 1020 },
  64  |   { kind: 'walk', x: 255 }, { kind: 'jump', x: 175, y: 960 }, { kind: 'walk', x: 115 },
  65  |   { kind: 'drop', edge: 230, direction: 1, y: 1020, x: 270 },
  66  |   { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  67  |   { kind: 'walk', x: 340 }, { kind: 'jump', x: 340, y: 840 }, { kind: 'jump', x: 340, y: 780 },
  68  |   { kind: 'walk', x: 430 }, { kind: 'jump', x: 440, y: 720 }, { kind: 'jump', x: 440, y: 660 },
  69  |   { kind: 'walk', x: 400 },
  70  |   ...[600, 540, 480, 420, 360, 300].map(y => ({ kind: 'jump' as const, x: 400, y })),
  71  |   { kind: 'walk', x: 245 }, { kind: 'jump', x: 150, y: 300 }, { kind: 'walk', x: 110 },
  72  |   { kind: 'drop', edge: 200, direction: 1, y: 360, x: 180 },
  73  |   { kind: 'jump', x: 280, y: 300 }, { kind: 'walk', x: 400 },
  74  |   { kind: 'jump', x: 400, y: 240 }, { kind: 'jump', x: 400, y: 180 }, { kind: 'finish' },
  75  | ];
  76  | 
  77  | /** Spring flight, reward landing, safe beside-spring catch, and repeat approach. */
  78  | export const TIMBER_SPRING_RETRY: readonly TimberPilotStage[] = [
  79  |   { kind: 'walk', x: 100 }, { kind: 'jump', x: 100, y: 510 }, { kind: 'walk', x: 180 },
  80  |   { kind: 'drop', edge: 200, direction: 1, y: 540, x: 230 },
  81  |   { kind: 'drop', edge: 130, direction: -1, y: 510, x: 165 },
  82  | ];
  83  | 
  84  | export async function runTimberStages(page: Page, stages: readonly TimberPilotStage[], timeout = 45_000): Promise<object> {
  85  |   await page.evaluate(stages => {
  86  |     const pilot = (window as unknown as { timberKeyboardPilot: {
  87  |       stages: TimberPilotStage[]; active: boolean; paused: boolean; pauseAt: number; stage: number;
  88  |       frames: number; stable: number; previousY: number; phase: number; error: string; done: boolean; seenPlaying: boolean; history: object[];
  89  |     } }).timberKeyboardPilot;
  90  |     Object.assign(pilot, { stages, active: true, paused: false, pauseAt: -1, stage: 0,
  91  |       frames: 0, stable: 0, previousY: NaN, phase: 0, error: '', done: false, seenPlaying: false, observedX: NaN, observedY: NaN, history: [] });
  92  |   }, stages);
> 93  |   await page.waitForFunction(() => {
      |              ^ Error: page.waitForFunction: Test timeout of 120000ms exceeded.
  94  |     const pilot = (window as unknown as { timberKeyboardPilot: { done: boolean; error: string } }).timberKeyboardPilot;
  95  |     return pilot.done || Boolean(pilot.error);
  96  |   }, undefined, { timeout });
  97  |   const result = await page.evaluate(() => {
  98  |     const pilot = (window as unknown as { timberKeyboardPilot: { active: boolean } }).timberKeyboardPilot;
  99  |     pilot.active = false;
  100 |     return pilot;
  101 |   });
  102 |   return result;
  103 | }
  104 | 
  105 | export const TIMBER_ASCENT_RIGHT: readonly TimberPilotStage[] = [
  106 |       { kind: 'run', x: 150, y: 1080, frames: 60 }, { kind: 'jump', x: 260, y: 1020 },
  107 |       { kind: 'walk', x: 385 }, { kind: 'jump', x: 385, y: 960 }, { kind: 'jump', x: 385, y: 900 },
  108 |       { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 840 }, { kind: 'jump', x: 500, y: 780 },
  109 |       { kind: 'jump', x: 500, y: 720 }, { kind: 'jump', x: 500, y: 660 },
  110 |       { kind: 'walk', x: 400 }, { kind: 'jump', x: 400, y: 600 }, { kind: 'jump', x: 400, y: 540 },
  111 |       { kind: 'jump', x: 400, y: 480 }, { kind: 'jump', x: 400, y: 420 },
  112 |       { kind: 'jump', x: 400, y: 360 }, { kind: 'jump', x: 400, y: 300 },
  113 |       { kind: 'jump', x: 400, y: 240 }, { kind: 'walk', x: 500 }, { kind: 'jump', x: 500, y: 180 }, { kind: 'finish' },
  114 | ];
  115 | 
  116 | /** The middle bough remains reachable without ever touching the optional spring. */
  117 | export const TIMBER_TO_MIDDLE: readonly TimberPilotStage[] = TIMBER_ASCENT_RIGHT.slice(0, 10);
  118 | 
  119 | /** Generates keyboard events at the shipped input boundary; it never touches scene or run state. */
  120 | export function timberKeyboardPilotInit(stages: TimberPilotStage[]): void {
  121 | 
  122 |     const pilot = { active: false, paused: false, frozen: false, pauseAt: -1, stage: 0, frames: 0,
  123 |       stable: 0, previousY: NaN, startY: NaN, phase: 0, error: '', done: false, seenPlaying: false, advanceMs: 0,
  124 |       stages, history: [] as object[], recoveries: [] as string[], observedX: NaN, observedY: NaN };
  125 |     Object.assign(window, { timberKeyboardPilot: pilot });
  126 |     const send = (code: string, down: boolean): void => { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code })); };
  127 |     const release = (): void => { send('ArrowLeft', false); send('ArrowRight', false); send('Space', false); };
  128 |     const next = (status: string): void => {
  129 |       pilot.history.push({ stage: pilot.stage, status }); pilot.stage++; pilot.frames = 0;
  130 |       pilot.stable = 0; pilot.previousY = NaN; pilot.phase = 0; release();
  131 |       if (pilot.stage >= pilot.stages.length) pilot.done = true;
  132 |       if (pilot.stage === pilot.pauseAt) pilot.paused = true;
  133 |     };
  134 |     const original = requestAnimationFrame.bind(window);
  135 |     let previousTime = 0, gameTime = 0;
  136 |     window.requestAnimationFrame = callback => original(now => {
  137 |       if (pilot.frozen) { previousTime = now; callback(gameTime); return; }
  138 |       const status = document.querySelector('#status')?.textContent ?? '';
  139 |       const x = Number(status.match(/X (-?\d+)/)?.[1] ?? NaN);
  140 |       const y = Number(status.match(/Y (-?\d+)/)?.[1] ?? NaN);
  141 |       const vx = Number(status.match(/V (-?\d+)/)?.[1] ?? 0);
  142 |       if (now !== previousTime && pilot.active && status.includes('Playing')) pilot.seenPlaying = true;
  143 |       if (now !== previousTime && pilot.active && !pilot.paused && !pilot.done && !pilot.error && status.includes('Playing')) {
  144 |         if (Number.isFinite(pilot.observedX) && (Math.abs(x - pilot.observedX) > 80 || Math.abs(y - pilot.observedY) > 120)) pilot.recoveries.push(status);
  145 |         pilot.observedX = x; pilot.observedY = y;
  146 |         const stage = pilot.stages[pilot.stage];
  147 |         if (!stage) { pilot.error = `stage overflow ${pilot.stage}`; release(); }
  148 |         else if (stage.kind === 'finish') {
  149 |           send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
  150 |           pilot.frames++;
  151 |           if (pilot.frames > 130) pilot.error = `finish stalled ${status}`;
  152 |         } else if (stage.kind === 'run') {
  153 |           send('ArrowLeft', false); send('Space', false); send('ArrowRight', true);
  154 |           pilot.frames++;
  155 |           // Read the grounded run-up position, not a callback count: 17 RAFs can
  156 |           // advance very different game distances at 16 and 32 ms intervals.
  157 |           if (stage.x !== undefined) {
  158 |             if (y !== stage.y! - 34 || x > stage.x + 20) pilot.error = `run-up left safe takeoff ${status}`;
  159 |             else if (x >= stage.x && vx >= 180) next(status);
  160 |             else if (pilot.frames > stage.frames!) pilot.error = `run-up stalled ${status}`;
  161 |           } else if (pilot.frames >= stage.frames!) next(status);
  162 |         } else if (stage.kind === 'travel') {
  163 |           const direction=stage.direction!;
  164 |           send('ArrowRight',direction>0); send('ArrowLeft',direction<0); send('Space',false);
  165 |           pilot.frames++;
  166 |           if((x-stage.x!)*direction>=0) next(status);
  167 |           else if(pilot.frames>200) pilot.error=`travel ${pilot.stage} stalled ${status}`;
  168 |         } else if (stage.kind === 'walk') {
  169 |           const projected = x + Math.sign(vx) * vx ** 2 / 2400;
  170 |           const direction = projected < stage.x! - 3 ? 1 : projected > stage.x! + 3 ? -1 : 0;
  171 |           send('ArrowRight', direction > 0); send('ArrowLeft', direction < 0); send('Space', false);
  172 |           pilot.frames++;
  173 |           if (Math.abs(x - stage.x!) < 4 && Math.abs(vx) < 20) next(status);
  174 |           else if (pilot.frames > 200) pilot.error = `walk ${pilot.stage} stalled ${status}`;
  175 |         } else if (stage.kind === 'fall') {
  176 |           send('ArrowRight', stage.direction === 1); send('ArrowLeft', stage.direction === -1); send('Space', false);
  177 |           pilot.frames++;
  178 |           pilot.stable = y === stage.y! - 34 && y === pilot.previousY ? pilot.stable + 1 : 0;
  179 |           pilot.previousY = y;
  180 |           if (pilot.stable >= 2) next(status);
  181 |           else if (pilot.frames > 130) pilot.error = `fall ${pilot.stage} stalled ${status}`;
  182 |         } else if (stage.kind === 'drop') {
  183 |           const projected = x + Math.sign(vx) * vx ** 2 / 2400;
  184 |           let direction = 0;
  185 |           if (pilot.phase === 0) {
  186 |             const target = stage.edge! - stage.direction! * 24;
  187 |             direction = projected < target - 3 ? 1 : projected > target + 3 ? -1 : 0;
  188 |             if (Math.abs(x - target) < 4 && Math.abs(vx) < 20) {
  189 |               pilot.phase = 1; pilot.startY = y; pilot.frames = 0;
  190 |             }
  191 |           } else if (pilot.phase === 1) {
  192 |             const clear = stage.direction === 1 ? x - 9 > stage.edge! : x + 9 < stage.edge!;
  193 |             // Brake as soon as the full 18px body clears the top. Waiting for
```