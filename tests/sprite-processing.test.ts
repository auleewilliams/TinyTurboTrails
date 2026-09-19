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

test('decodes RGBA rows using all five PNG filter modes', () => {
  const result = execFileSync('python3', ['-B', '-c', `
import json, struct, tempfile, zlib
from pathlib import Path
from scripts.process_sprite_atlas import read_png
# Each row represents the same two RGBA pixels: (10,20,30,40), (50,60,70,80).
# Literal prefiltered bytes exercise channel-distance reconstruction independently.
rows = [bytes([0,10,20,30,40,50,60,70,80]),
        bytes([1,10,20,30,40,40,40,40,40]),
        bytes([2,0,0,0,0,0,0,0,0]),
        bytes([3,5,10,15,20,20,20,20,20]),
        bytes([4,0,0,0,0,0,0,0,0])]
def chunk(kind, payload):
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind+payload) & 0xffffffff)
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / 'filters.png'
    path.write_bytes(bytes([137,80,78,71,13,10,26,10]) +
        chunk(b'IHDR', struct.pack('>IIBBBBB', 2,5,8,6,0,0,0)) +
        chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b''))
    print(json.dumps(read_png(path)[2]))
`], { encoding: 'utf8' });
  expect(JSON.parse(result)).toEqual(Array.from({ length: 5 }, () => [[10, 20, 30, 40], [50, 60, 70, 80]]).flat());
});

test('atlas processing accepts generated RGBA source sheets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'site-atlas-'));
  const output = join(directory, 'environment.png');
  try {
    execFileSync('python3', ['-B', 'scripts/process_sprite_atlas.py',
      'assets/source/site/environment-sheet.png', output, '--hard-alpha']);
    const png = readFileSync(output);
    expect(png).toEqual(readFileSync('public/assets/site/environment.png'));
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
