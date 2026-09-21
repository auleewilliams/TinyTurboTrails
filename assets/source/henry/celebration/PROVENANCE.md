# Henry jump-and-cheer artwork

Generated on 2026-09-21 using the built-in image generation tool for the requested trail-completion celebration. No API key or runtime generation dependency is required.

## References and exact prompt

- Identity/style reference: `public/assets/henry/starter.png` at repository commit `f9b1b25`.
- `seed.png`: unchanged first 48 x 48 frame extracted from the shipped atlas.
- `edit-canvas.png`: transparent reference canvas produced with the sprite-pipeline skill's `build_sprite_edit_canvas.py` (8 slots, 128px per slot, 1024px canvas).
- `prompt.txt`: exact generation prompt. Both the shipped atlas and edit canvas were provided as image references.
- `generated-strip.png`: unmodified tool output, including its original alpha channel.

## Review assets

- `celebrate-48.png`: eight horizontal 48 x 48 transparent cells.
- `frames/01.png` through `08.png`: individual normalized poses.
- `preview.png`: 4x nearest-neighbor contact sheet on a dark background, with pose labels.
- `prepare.py`: reproducible packaging using Pillow and the sprite-pipeline skill's `normalize_sprite_strip.py`. Run with `--normalizer <path-to-normalize_sprite_strip.py>`.

All eight frames use one shared scale and bottom-center alignment. A 40px content envelope is padded by 4px into the 48px logical cell, yielding the game's anchor (24, 44). The normalized cells remove source vertical displacement; implementation must supply jump height through rendering offsets. Do not scale each frame independently. The new frames are candidate artwork for integration, not an already shipped game animation.

## Visual review and limits

The generated sequence contains ready, crouch, takeoff, airborne cheer, descent, landing, rise and held-victory poses. Checked the source and enlarged contact sheet for readable poses, costume continuity and clipping. Packaging checks verify eight nonempty transparent cells and a safe 4px margin. The output preserves the generated alpha rather than replacing it with a background color.

In-engine comparison with Henry's existing sprite, finish-layout fit, motion timing and cross-browser tests remain implementation acceptance criteria. This asset-only delivery does not alter the shipped atlas, manifest or game code. Preserve all existing gameplay frames when integrating; adjust the new frames if an in-engine comparison reveals a visible style or proportion mismatch.


## Runtime integration (#119 / #120)

The original candidate sources above are preserved. The milestone appends the
eight 48×48 cells to a new 192×288 `public/assets/henry/henry-celebration.png`.
`starter.png` stays unchanged. The top 192×192 pixels are copied without a mask,
resampling or alpha conversion changes; the packaging script asserts decoded
RGBA equality. Frame IDs 0–15 and their gameplay clips keep their definitions;
`celebrate` uses IDs 16–23, 0.15 seconds each, non-looping.

Reproduce with `python scripts/prepare-story-celebration.py` (Pillow). The finish
renderer supplies an 8px jump offset and separate bounded pixel sparkles.
Inspect `/?scene=art&animation=celebrate`; the original four-clip preview remains
at `/?scene=art`. See the milestone evidence for native comparison, phase
captures, reduced motion and integrated recording. This integration inspection
supersedes the candidate-only limitation above; no Henry playtest is claimed.
