import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

test('atlas processing removes tinted checkerboard while preserving enclosed details and colored edges', () => {
  const result = execFileSync('python3', ['-B', '-c', `
import json
from scripts.process_sprite_atlas import remove_background

# Measured light/dark source-background colors, surrounding a dark outline
# with pale reflective detail inside. The colored edge must remain intact.
light = (185, 189, 197, 255)
dark = (129, 133, 140, 255)
outline = (19, 45, 54, 255)
reflective = (221, 231, 211, 255)
blue = (30, 110, 180, 255)
pixels = [light, dark, light, dark, light,
          dark, outline, outline, outline, dark,
          light, outline, reflective, blue, light,
          dark, outline, outline, outline, dark,
          light, dark, light, dark, light]
remove_background(5, 5, pixels)
print(json.dumps(pixels))
`], { encoding: 'utf8' });
  const pixels = JSON.parse(result) as number[][];
  for (const index of [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]) {
    expect(pixels[index][3]).toBe(0);
  }
  expect(pixels[6]).toEqual([19, 45, 54, 255]);
  expect(pixels[12]).toEqual([221, 231, 211, 255]);
  expect(pixels[13]).toEqual([30, 110, 180, 255]);
});
