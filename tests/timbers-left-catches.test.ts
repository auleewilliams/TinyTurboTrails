import { expect, it } from 'vitest';
import { AdventureScene } from '../src/game/adventure-scene';
import type { Player } from '../src/game/movement';
import { TREETOP_TIMBERS } from '../src/world/levels';

const audio = { unlock: async () => {}, setMuted() {}, setSuspended() {}, startMusic() {}, play() {}, stop() {}, dispose() {} };
const neutral = { horizontal: 0, jumpPressed: false, jumpHeld: false, pausePressed: false, mutePressed: false };

// These are supported-position mechanism fixtures. The native Star 3 journey
// starts at roots and drives the same left edge with keyboard input.
const leftApproaches = [
  ['star-1', 115, 960], ['spring-reward', 110, 510], ['spring', 150, 600],
  ['star-3', 110, 300], ['star-3-catch', 110, 360], ['middle', 100, 660],
  ['fork-left-1', 300, 840], ['fork-left-2', 330, 780], ['fork-right-2', 500, 780],
  ['return-780', 600, 780], ['middle-left-catch', 100, 720],
  ['middle-left-catch-2', 100, 780], ['middle-left-catch-3', 100, 840],
] as const;

it.each([16, 32])('keeps held and braking left-end misses on local supports at %ims', milliseconds => {
  for (const [id, x, supportY] of leftApproaches) for (const mode of ['held', 'brake'] as const) {
    const scene = new AdventureScene({} as HTMLImageElement, {} as never,
      { timbers: {} as never, plains: {} as never, quarry: {} as never,
        site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
    scene.startSelected();
    const player = (scene as unknown as { player: Player }).player;
    Object.assign(player, { x, y: supportY - 34, vx: 0, vy: 0, onGround: true, platformId: null });
    for (let frame = 0; frame < 10; frame++) scene.update(milliseconds / 1000, neutral);
    expect(player.y + 34, id).toBe(supportY);
    let deepest: number = supportY;
    for (let frame = 0; frame < 190; frame++) {
      const horizontal = mode === 'held' || player.x > 45 ? -1 : 0;
      scene.update(milliseconds / 1000, { ...neutral, horizontal });
      deepest = Math.max(deepest, player.y + 34);
    }
    expect(deepest - supportY, `${id} ${mode} ${milliseconds}ms at x=${player.x}`).toBeLessThanOrEqual(120);
    expect(player.onGround, `${id} ${mode} ${milliseconds}ms`).toBe(true);
    expect(player.x, `${id} ${mode} ${milliseconds}ms`).toBeGreaterThanOrEqual(40);
  }
});

it.each([16, 32])('drops a Star 3 left-end miss onto its visible y360 catch at %ims', milliseconds => {
  const scene = new AdventureScene({} as HTMLImageElement, {} as never,
    { timbers: {} as never, plains: {} as never, quarry: {} as never,
      site: {} as never, frost: {} as never, cove: {} as never }, audio, TREETOP_TIMBERS);
  scene.startSelected();
  const player = (scene as unknown as { player: Player }).player;
  Object.assign(player, { x: 110, y: 266, vx: 0, vy: 0, onGround: true, platformId: null });
  for (let frame = 0; frame < 80; frame++) scene.update(milliseconds / 1000, { ...neutral, horizontal: -1 });
  expect(player.y + 34).toBe(360);
  expect(player.platformId).toBe('timber-star-3-catch');
});
