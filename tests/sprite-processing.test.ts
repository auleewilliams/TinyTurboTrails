import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('atlas processing accepts generated RGBA source sheets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'site-atlas-'));
  const output = join(directory, 'environment.png');
  try {
    execFileSync('python3', ['-B', 'scripts/process_sprite_atlas.py',
      'assets/source/site/environment-sheet.png', output]);
    const png = readFileSync(output);
    expect(png.readUInt32BE(16)).toBe(192);
    expect(png.readUInt32BE(20)).toBe(192);
    expect(png[25]).toBe(6);
    const bottoms = JSON.parse(execFileSync('python3', ['-B', '-c', `
import json
from pathlib import Path
from scripts.process_sprite_atlas import read_png
w, _, pixels = read_png(Path(r'''${output}'''))
print(json.dumps([
    max(y - row * 48 for y in range(row * 48, (row + 1) * 48)
        for x in range(column * 48, (column + 1) * 48) if pixels[y * w + x][3] >= 128)
    for index in [4, 5, 6, 7, 9, 10, 11, 12, 15]
    for row, column in [(index // 4, index % 4)]
]))
`], { encoding: 'utf8' })) as number[];
    expect(bottoms).toEqual(Array(9).fill(43));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 15_000);
