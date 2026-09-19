#!/usr/bin/env python3
"""Remove generated backgrounds and normalize a 4x4 source atlas.

This deliberately uses only the Python standard library so the processing step
is reproducible in a clean checkout. It accepts an RGB or RGBA PNG produced by
the built-in image generator and writes a small RGBA, nearest-neighbour atlas.
"""
from __future__ import annotations

import argparse
import collections
import struct
import zlib
from pathlib import Path

VISIBLE_ALPHA = 128


def read_png(path: Path) -> tuple[int, int, list[tuple[int, int, int, int]]]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos = 8
    width = height = color_type = bit_depth = None
    packed = bytearray()
    while pos < len(data):
        size = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + size]
        pos += 12 + size
        if kind == b"IHDR":
            width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or color_type not in (2, 6) or (comp, filt, interlace) != (0, 0, 0):
                raise ValueError("expected 8-bit RGB/RGBA, non-interlaced PNG")
        elif kind == b"IDAT":
            packed.extend(chunk)
        elif kind == b"IEND":
            break
    if width is None or height is None:
        raise ValueError("missing IHDR")
    raw = zlib.decompress(packed)
    channels = 4 if color_type == 6 else 3
    stride = width * channels
    rows: list[bytearray] = []
    previous = bytearray(stride)
    offset = 0
    for _ in range(height):
        mode = raw[offset]
        source = raw[offset + 1 : offset + 1 + stride]
        offset += stride + 1
        row = bytearray(stride)
        for i, value in enumerate(source):
            left = row[i - channels] if i >= channels else 0
            up = previous[i]
            upper_left = previous[i - channels] if i >= channels else 0
            if mode == 0:
                result = value
            elif mode == 1:
                result = (value + left) & 255
            elif mode == 2:
                result = (value + up) & 255
            elif mode == 3:
                result = (value + ((left + up) // 2)) & 255
            elif mode == 4:
                estimate = left + up - upper_left
                distances = (abs(estimate - left), abs(estimate - up), abs(estimate - upper_left))
                result = (value + (left if distances[0] <= distances[1] and distances[0] <= distances[2] else up if distances[1] <= distances[2] else upper_left)) & 255
            else:
                raise ValueError(f"unsupported PNG filter {mode}")
            row[i] = result
        rows.append(row)
        previous = row
    pixels = [(row[i], row[i + 1], row[i + 2], row[i + 3] if channels == 4 else 255)
              for row in rows for i in range(0, stride, channels)]
    return width, height, pixels


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    # The source checkerboard is slightly blue-gray, not neutral: measured
    # border pixels have RGB channel spreads up to 16. Leave some tolerance
    # for its softened tile edges, while retaining the colored/dark outline.
    # Only border-connected pixels are removed, preserving enclosed highlights.
    neutral_gray = max(r, g, b) - min(r, g, b) <= 20 and min(r, g, b) >= 95
    warm_paper = max(r, g, b) - min(r, g, b) <= 45 and min(r, g, b) >= 190
    return neutral_gray or warm_paper


def remove_background(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> None:
    queue = collections.deque()
    seen: set[int] = set()
    for x in range(width):
        queue.extend((x, x + (height - 1) * width))
    for y in range(height):
        queue.extend((y * width, y * width + width - 1))
    while queue:
        index = queue.popleft()
        if index in seen or not is_background(pixels[index]):
            continue
        seen.add(index)
        r, g, b, _ = pixels[index]
        pixels[index] = (r, g, b, 0)
        x, y = index % width, index // width
        if x: queue.append(index - 1)
        if x + 1 < width: queue.append(index + 1)
        if y: queue.append(index - width)
        if y + 1 < height: queue.append(index + width)


def process(source: Path, destination: Path) -> None:
    source_width, source_height, source_pixels = read_png(source)
    if source_width < 1000 or source_height < 1000:
        raise ValueError("source atlas is unexpectedly small")
    # Generated RGBA images can contain alpha-1 fringe pixels far outside the
    # visible sprite. Pixel art uses hard alpha so bounds and anchors follow
    # meaningful artwork rather than invisible antialiasing residue.
    source_pixels = [(r, g, b, 255 if alpha >= VISIBLE_ALPHA else 0)
                     for r, g, b, alpha in source_pixels]
    remove_background(source_width, source_height, source_pixels)
    output_width = output_height = 48 * 4
    output = [(0, 0, 0, 0)] * (output_width * output_height)
    boundaries = [round(i * source_width / 4) for i in range(5)]
    for row in range(4):
        for column in range(4):
            left, right = boundaries[column], boundaries[column + 1]
            top, bottom = boundaries[row], boundaries[row + 1]
            opaque = [(x, y) for y in range(top, bottom) for x in range(left, right) if source_pixels[y * source_width + x][3]]
            if not opaque:
                raise ValueError(f"frame {row * 4 + column} is empty")
            min_x, max_x = min(x for x, _ in opaque), max(x for x, _ in opaque)
            min_y, max_y = min(y for _, y in opaque), max(y for _, y in opaque)
            frame_height = max_y - min_y + 1
            frame_width = max_x - min_x + 1
            target_height = 40
            target_width = max(1, round(frame_width * target_height / frame_height))
            if target_width > 44:
                target_width = 44
                target_height = max(1, round(frame_height * target_width / frame_width))
            x_offset = column * 48 + (48 - target_width) // 2
            y_offset = row * 48 + 44 - target_height
            for dy in range(target_height):
                sy = min_y + round(dy * (frame_height - 1) / max(1, target_height - 1))
                for dx in range(target_width):
                    sx = min_x + round(dx * (frame_width - 1) / max(1, target_width - 1))
                    output[(y_offset + dy) * output_width + x_offset + dx] = source_pixels[sy * source_width + sx]
            # Downsampling can miss a sparse pixel on the source's last row. Normalize the
            # actual sampled artwork—not only its source bounds—to the shared row-43 base.
            frame_top = row * 48
            frame_left = column * 48
            sampled_bottom = max(y for y in range(frame_top, frame_top + 48)
                                 for x in range(frame_left, frame_left + 48)
                                 if output[y * output_width + x][3])
            shift = frame_top + 43 - sampled_bottom
            if shift:
                for y in range(frame_top + 47, frame_top - 1, -1):
                    for x in range(frame_left, frame_left + 48):
                        source_y = y - shift
                        output[y * output_width + x] = (output[source_y * output_width + x]
                                                        if source_y >= frame_top else (0, 0, 0, 0))
    destination.parent.mkdir(parents=True, exist_ok=True)
    write_png(destination, output_width, output_height, output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    process(args.source, args.destination)
