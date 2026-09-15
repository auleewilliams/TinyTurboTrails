import { expect, it } from 'vitest';
import { animationFrame } from '../src/art/animation';

it('loops an animation at its authored frame durations', () => {
  const clip = { frames: [2, 4, 6], frameSeconds: 0.1, loop: true };
  expect(animationFrame(clip, 0)).toBe(2);
  expect(animationFrame(clip, 0.11)).toBe(4);
  expect(animationFrame(clip, 0.21)).toBe(6);
  expect(animationFrame(clip, 0.31)).toBe(2);
});
it('holds the last pose of a non-looping airborne animation', () => {
  const clip = { frames: [8, 9, 10], frameSeconds: 0.1, loop: false };
  expect(animationFrame(clip, 0)).toBe(8);
  expect(animationFrame(clip, 3)).toBe(10);
});
it('clamps negative time to the first pose', () => {
  expect(animationFrame({ frames: [7, 8], frameSeconds: 0.1, loop: true }, -1)).toBe(7);
});
