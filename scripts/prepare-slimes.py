"""Normalize the generated parts atlas into six identical-body 48px slime cells.

Run from the repository root with Python 3; uses the existing standard-library
PNG codec. Magenta is a deliberate chroma key, including the mask lens openings.
"""
from pathlib import Path
from process_sprite_atlas import read_png, write_png

SOURCE = Path('assets/source/slimes/parts-source.png')
OUTPUT = Path('public/assets/slimes/slimes.png')


def prepare():
    width, height, pixels = read_png(SOURCE)
    pixels = [(0, 0, 0, 0) if r > 170 and b > 170 and g < 100 else (r, g, b, a)
              for r, g, b, a in pixels]

    def part(index, target_width, target_height):
        left, top = index % 4 * width // 4, index // 4 * height // 2
        points = [(x, y) for y in range(top, top + height // 2)
                  for x in range(left, left + width // 4) if pixels[y * width + x][3]]
        x0, x1 = min(x for x, _ in points), max(x for x, _ in points)
        y0, y1 = min(y for _, y in points), max(y for _, y in points)
        return [[pixels[(y0 + round(y * (y1 - y0) / (target_height - 1))) * width
                        + x0 + round(x * (x1 - x0) / (target_width - 1))]
                 for x in range(target_width)] for y in range(target_height)]

    body = part(0, 32, 23)
    # Same body, baseline and face for every cell. Hats sit above the eyes.
    hats = [(1, 34, 16, 7, 10), (2, 30, 18, 9, 8), (3, 28, 20, 10, 6),
            (4, 30, 18, 9, 8), (5, 30, 25, 9, 1), (6, 27, 24, 13, 20)]
    output = [(0, 0, 0, 0)] * (48 * 6 * 48)

    def paste(sprite, cell, dx, dy):
        for y, row in enumerate(sprite):
            for x, pixel in enumerate(row):
                if pixel[3]:
                    output[(y + dy) * 288 + cell * 48 + x + dx] = pixel

    for cell, (index, w, h, x, y) in enumerate(hats):
        paste(body, cell, 8, 21)
        paste(part(index, w, h), cell, x, y)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    write_png(OUTPUT, 288, 48, output)


if __name__ == '__main__':
    prepare()
