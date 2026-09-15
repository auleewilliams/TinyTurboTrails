import { expect, it } from 'vitest';
import { validateManifest } from '../src/art/henry';

function fixture() {
  return { image: 'starter.png', logicalSize: { width: 48, height: 48 }, anchor: { x: 24, y: 44 },
    frames: [{ x: 0, y: 0, width: 48, height: 48 }],
    animations: Object.fromEntries(['idle', 'run', 'jump', 'fall'].map((name) =>
      [name, { frames: [0], frameSeconds: 0.12, loop: true }])) };
}
it('rejects a frame rectangle that extends outside the loaded image', () => {
  expect(() => validateManifest(fixture(), 32, 48)).toThrow('frame');
});
it('rejects animation references to absent frames', () => {
  const data = fixture();
  data.animations.run.frames = [8];
  expect(() => validateManifest(data, 48, 48)).toThrow('animation');
});
it('rejects empty clips and zero-duration frames', () => {
  const data = fixture();
  data.animations.idle.frames = [];
  expect(() => validateManifest(data, 48, 48)).toThrow('animation');
  data.animations.idle.frames = [0];
  data.animations.idle.frameSeconds = 0;
  expect(() => validateManifest(data, 48, 48)).toThrow('animation');
});
it('accepts a valid atlas that fits its image', () => {
  expect(() => validateManifest(fixture(), 48, 48)).not.toThrow();
});
