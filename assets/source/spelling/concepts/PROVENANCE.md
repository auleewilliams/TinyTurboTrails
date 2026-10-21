# Henry's builder kit: first artwork concept

Created on 2026-10-19 for issue #194 using OpenAI's built-in image generation
tool. The owner approved this concept's visual direction on 2026-10-19
("They look great"). It is a design reference, not a production sprite atlas.
PR #190 had merged before this concept was generated.

## Source and generation

- `builder-kit-v1.png`: untouched generated concept sheet, 1774 × 887 RGB PNG.
- `builder-kit-v1-prompt.txt`: exact generation prompt.
- Reference 1: [`public/assets/henry/reference.png`](../../../../public/assets/henry/reference.png),
  used for Henry's pixel illustration, outlining and palette.
- Reference 2: [`assets/source/site/environment-sheet.png`](../../site/environment-sheet.png),
  used for Sunset Site's construction materials and sprite language.
- Both references were style inputs, not edit targets. The tool received their
  local file paths and `transparent_background: false` for the cream sheet.
- The original generated image was copied byte-for-byte into this folder.
  SHA-256: `05af883eca446ed91305d2bda70ecb5db7d9d3202789c390f7f8f725490c96a0`.

The agreed direction is a canvas tool pouch with orange trim, four chunky timber
letter blocks and a Sunset Site sticker combining a construction beam and yellow
hard hat within a cream cut-out border. No other trail sticker is included.

## Visual review

The sheet contains one pouch, four blocks reading B, E, A, M in that order,
and one hard-hat/steel-beam sticker. The pouch patch reads B. The separated
silhouettes, blue-green outlines, warm timber, orange trim and yellow hard hat
follow the supplied references.

`builder-kit-v1-size-check.png` records a local Chromium canvas inspection of
the generated blocks within 42 × 32 logical-pixel bounds, followed by the same
pixels enlarged 3×. Source crop rectangles `(x, y, width, height)` were:

```text
B: 484, 403, 207, 220
E: 698, 403, 201, 220
A: 908, 403, 207, 220
M: 1123, 403, 207, 220
```

Each crop was fitted proportionally inside 42 × 32, centered horizontally and
bottom-aligned, using nearest-neighbour sampling (`imageSmoothingEnabled = false`).
The proof uses the generated lettering without a replacement text overlay.
All four letters remain distinguishable; grain stays subordinate to the dark
letter faces. The generated blocks are nearly square, so a future production
variant should use a wider face to fill the existing rectangular controls.

This check evaluates the concept's small-size potential, not final in-game
rendering, pointer/controller states or cross-browser acceptance. Shipped
lettering will remain separately rendered. The sheet's cream background is
opaque; the sticker's illustrated cut-out border does not imply an alpha mask.

## Delivery boundary

The concept's visual direction is approved. The concept-generation step changed
no runtime assets, game code, public interfaces, animation or gameplay. No game
tests or builds were run for that initial concept-only step. The subsequently
approved transparent sprites, sizing/anchor records and integration are recorded
in [`../sprites/PROVENANCE.md`](../sprites/PROVENANCE.md).
