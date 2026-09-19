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

test('processes transparent RGBA sheets without stripping white snow or partial alpha', () => {
  const result = execFileSync('python3', ['-B', '-c', `
import json, tempfile
from pathlib import Path
from scripts.process_sprite_atlas import write_png, read_png, process
with tempfile.TemporaryDirectory() as directory:
    source = Path(directory) / 'source.png'
    destination = Path(directory) / 'atlas.png'
    pixels = [(255, 255, 255, 0)] * (1024 * 1024)
    for row in range(4):
        for col in range(4):
            for y in range(row * 256 + 64, row * 256 + 192):
                for x in range(col * 256 + 64, col * 256 + 192):
                    pixels[y * 1024 + x] = (255, 255, 255, 128)
    write_png(source, 1024, 1024, pixels)
    process(source, destination)
    width, height, output = read_png(destination)
    print(json.dumps({'size': [width, height], 'alphas': sorted(set(p[3] for p in output)),
        'center': output[24 * width + 24]}))
`], { encoding: 'utf8' });
  expect(JSON.parse(result)).toEqual({ size: [192, 192], alphas: [0, 128], center: [255, 255, 255, 128] });
});
