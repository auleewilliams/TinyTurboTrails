import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { transformSync } from 'rolldown/utils';
import { SimulationClock } from '../src/core/clock';
import { AdventureScene } from '../src/game/adventure-scene';
import { SilentAudio } from '../src/core/audio';
import { LEVELS, TREETOP_TIMBERS } from '../src/world/levels';
import type { Player } from '../src/game/movement';
import type { RunState } from '../src/game/interactions';

it('discards activity clock debt when the finish activity opens and pointer return closes before the next rendered frame', () => {
  const scene = new AdventureScene({} as never, {} as never,
    Object.fromEntries(LEVELS.map(level => [level.atlas, {} as never])), new SilentAudio(), TREETOP_TIMBERS);
  scene.startSelected();
  const live = scene as unknown as { player: Player; run: RunState };
  live.player.x = TREETOP_TIMBERS.finish.x;
  const clock = new SimulationClock();
  const neutral = { horizontal: 0, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false };
  // Exercise the shipped frame boundary, not a copied implementation. Stub only
  // presentation and device collaborators so rendered timestamps stay deterministic.
  const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const start = source.indexOf('  const frame = (now:');
  const end = source.indexOf("\n  window.addEventListener('resize'", start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const harness = `
    let focused = true, userPaused = false, inputSource = 'keyboard';
    let pendingJump = false, educationRevision = 0, request = 0;
    const input = { poll: () => ({ ...neutral }), clear: () => {} };
    const educationScene = () => scene;
    const scenes = { activeScene: scene, update: (seconds, controls) => scene.update(seconds, controls), render: () => {} };
    const refreshPause = () => clock.setPaused(!focused || userPaused || scene.educationOverlay.open);
    const clearGameplayInput = () => { input.clear(); pendingJump = false; };
    const refreshRumble = () => {};
    const assetState = 'loading', adventure = true, context = {}, menu = { update: () => {} }, pauseMenu = {};
    const requestAnimationFrame = () => 0;
    ${source.slice(start, end)}
    return frame;
  `;
  // Only repository-owned source enters this isolated harness; no player input is evaluated.
  const frame = new Function('scene', 'clock', 'neutral', 'AdventureScene',
    transformSync('education-frame-harness.ts', harness, {}).code)(scene, clock, neutral, AdventureScene) as (now: number) => void;
  frame(0); frame(17);
  // Results come first; word building opens only through its deliberate action.
  expect(scene.screenState).toBe('finish');
  expect(scene.educationOverlay.open).toBe(false);
  const run = live.run, before = run.seconds;
  scene.menuTargets.find(target => target.label === 'Build your word')!.action();
  expect(scene.educationOverlay.open).toBe(true);
  scene.menuTargets.find(target => target.label === 'Find more letters')!.action();
  frame(60_017);
  expect(live.run).toBe(run);
  expect(run.seconds).toBe(before);
  frame(60_027);
  expect(run.seconds).toBe(before);
  frame(60_037);
  expect(run.seconds - before).toBeCloseTo(1 / 60);
});
