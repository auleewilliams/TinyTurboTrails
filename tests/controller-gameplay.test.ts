import { expect, it } from 'vitest';
import { BrowserInput, type InputFrame } from '../src/core/input';
import { SimulationClock } from '../src/core/clock';
import { AdventureScene } from '../src/game/adventure-scene';
import { PLAINS_LEVEL } from '../src/world/level';

const worlds = { plains: {} as never, timbers: {} as never, frost: {} as never, cove: {} as never };
import type { GameAudio } from '../src/core/audio';

// Earlier browser-controller coverage only pressed the face button at the title screen
// (to start) and Start (to pause). Nothing exercised a jump once gameplay was already
// running, which is the actual case reported in #62. This drives the same frame loop
// main.ts uses (BrowserInput -> SimulationClock -> scene.update) end to end.
it('a controller jump mid-gameplay actually launches the player, not just at the title screen', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'xbox', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons, vibrationActuator: null };
  const target = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [pad] } });
  const input = new BrowserInput(target as unknown as Window, () => {});
  const clock = new SimulationClock();
  const audio: GameAudio = {
    unlock: async () => {}, setMuted: () => {}, setSuspended: () => {}, startMusic: () => {},
    play: () => {}, stop: () => {}, dispose: () => {},
  };
  const scene = new AdventureScene({} as never, worlds, audio, PLAINS_LEVEL);
  scene.enter();

  let pendingJump = false;
  let now = 0;
  const frameStep = (ms: number): void => {
    now += ms;
    const controls: InputFrame = input.poll();
    pendingJump ||= controls.jumpPressed;
    clock.advance(now, (seconds) => {
      scene.update(seconds, { ...controls, jumpPressed: pendingJump });
      pendingJump = false;
    });
  };

  frameStep(0); // Prime the clock, as main.ts's first frame does.

  buttons[0].pressed = true; // A starts the game from the title screen.
  frameStep(16);
  buttons[0].pressed = false;
  frameStep(16);
  expect(scene.screenState).toBe('playing');

  for (let i = 0; i < 5; i++) frameStep(16); // Let the player settle on the ground.
  const groundedY = scene.playerY;

  buttons[0].pressed = true; // Press A again, mid-gameplay, to jump.
  frameStep(16);
  buttons[0].pressed = false;
  for (let i = 0; i < 6; i++) frameStep(16);

  expect(scene.playerY).toBeLessThan(groundedY);
  input.dispose();
});
