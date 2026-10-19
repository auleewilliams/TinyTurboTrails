# Builder-kit sprite preparation

Prepared on 2026-10-19 for issue #194. The owner approved the
[`builder-kit-v1.png`](../concepts/builder-kit-v1.png) concept's visual direction
in this chat ("They look great"). The owner subsequently approved these prepared
sprites ("They look good") and explicitly requested integration, checks and a PR.
The three approved native-size sprites are now loaded by the adventure.

## Generated sources and exact prompts

All sources were generated with OpenAI's built-in image tool using
`transparent_background: true`, with the approved concept sheet supplied as
the local reference/edit target. No API key, CLI fallback or runtime image
generation is involved. Generated PNGs were copied without altering their pixels.

| Source | Exact prompt | Treatment |
| --- | --- | --- |
| [Pouch](pouch-source-v1.png) | [Pouch prompt](pouch-v1-prompt.txt) | Preserve the approved pouch, simplify texture for HUD use, retain the B patch. |
| [Blank tile](tile-source-v1.png) | [Initial prompt](tile-v1-initial-prompt.txt), then [proportion correction](tile-v1-correction-prompt.txt) | Remove baked lettering; broaden the concept's nearly square block for rectangular controls. |
| [Sunset sticker](sunset-sticker-source-v1.png) | [Sticker prompt](sunset-sticker-v1-prompt.txt) | Preserve the yellow hard hat, steel I-beam, cream border and dark keyline. |

The first tile output was too wide. It is preserved as
[`tile-wide-intermediate.png`](tile-wide-intermediate.png), solely to retain the
input lineage for the subsequent image-tool correction. The corrected
`tile-source-v1.png` supplies the prepared tile. The original concept and the
initial tile output were not overwritten.

## Prepared files

| Sprite | Logical cell | Center anchor | Visible content rectangle `(x, y, width, height)` |
| --- | --- | --- | --- |
| [Pouch](prepared/pouch.png) | 28 × 28 | 14, 14 | 2, 2, 24, 24 |
| [Blank tile](prepared/tile.png) | 42 × 32 | 21, 16 | 2, 1, 38, 30 |
| [Sunset sticker](prepared/sunset-sticker.png) | 56 × 56 | 28, 28 | 3, 2, 49, 52 |

[`preparation.json`](preparation.json) records the source sizes, alpha bounds,
source/output SHA-256 hashes, logical cells, center anchors, transparent padding
and static-animation status. This is an asset preparation record, not a runtime
manifest or a new public interface. These center anchors are UI placement
references, not world collision or grounding coordinates.

The reference draw sizes were read from merged PR #190, revision
`bee0f7d402395af8d9ed7a4693e6739d9f905607`. Assembly controls are 42 × 32;
the collection scales the sticker to approximately 31 × 31. The pouch cell
contains a 24 × 24 silhouette, compatible with the existing small HUD region.
The integrated cell is placed at `(384, 33)` in the 426 × 240 logical canvas.

## Deterministic preparation

Local headless Chromium decoded each RGBA source into a canvas. The visible
source rectangle encloses pixels whose alpha is at least 128; no background
removal, palette remapping, manual redrawing or hard-alpha rewrite was performed.
Each source rectangle was fitted proportionally inside its cell's padding,
rounding the destination width and height to the nearest integer, then centering
with `floor((cellSize - contentSize) / 2)`. Nearest-neighbour sampling preserves
the source pixel style. Sampled alpha values are retained.

The exact resampling can be reproduced using each entry in `preparation.json`:

```js
canvas.width = entry.logicalSize.width;
canvas.height = entry.logicalSize.height;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const source = entry.sourceBounds;
const target = entry.contentRect;
ctx.drawImage(image,
  source.x, source.y, source.width, source.height,
  target.x, target.y, target.width, target.height);
const png = canvas.toDataURL('image/png');
```

Use a fresh transparent canvas for every file. The PNG encoder's byte output can
vary across browser versions; the recorded hashes identify this reviewed output.

## Verification and visual review

- All three sources are RGBA PNGs with genuinely transparent corners and more
  than 10% fully transparent pixels. The handle opening is transparent; the pouch
  mouth remains dark and opaque. The sticker's cream border remains opaque.
- Prepared files are nonempty and have fully transparent outer cell edges.
  Repeating preparation in the same Chromium produced byte-identical PNGs.
  Source and output hashes were checked against the record.
- [`native-size-review.png`](native-size-review.png) shows actual-size sprites,
  2× views over dark and light backgrounds, and a 31 × 31 collection sticker.
- The same proof renders HILL, ROCK, TREE, BEAM, SNOW and SAND at native size and
  at a 320/426 display scale. Each letter is drawn independently over the blank
  tile using `bold 17px monospace`, centered horizontally, in `#17333b` with a
  baseline 21 pixels below the cell top. Repeated Ls and Es occupy separate cells.
- Visual inspection found distinct silhouettes, clear letter faces and readable
  words at both preview scales. The sticker's hat, beam and cream outline remain
  distinguishable at collection size. The source tile is blank; its central
  timber face leaves the separately rendered letter dominant.

This is an asset proof, not an in-game screenshot or proof of interaction
behavior. This section records the original preparation-stage checks. Integration
checks and real in-game screenshots are recorded in the
[issue #194 evidence](../../../../docs/evidence/issue-194/README.md).

## Runtime integration

Run `node scripts/prepare-spelling-art.mjs` from the repository root to copy the
three approved native-size PNGs to `public/assets/spelling/`. The script validates
all files' dimensions, RGBA format and recorded hashes before writing any output;
it does not resample the reviewed images. The three runtime files total 11,524
bytes. High-resolution sources, intermediate output and concept sheets are not
requested by the game.

Adventure startup loads and dimension-checks the pouch, blank tile and Sunset
sticker through the existing required-artwork error/Retry boundary. Assembly
and dragged tiles retain their existing 42 × 32 controls; pickups and flying
tiles use the existing 22 × 24 footprint with separately rendered 16px glyphs.
The blank background is scaled to that footprint, while text stays undistorted.
Assembly letters use separately rendered 17px glyphs. No glyph is baked into
the shared tile image.

Focus uses an outer frame and caret; a selected tile in hand retains an inset
frame when focus moves to a space. Native accessible buttons retain their names,
focus behavior and original bounds. Empty spaces and action buttons keep their
original presentation. The Sunset reward uses a centered 56 × 56 image in the
earned screen and the existing 0.55 collection scale. Unearned Sunset stickers
are shown at 0.3 alpha, with the existing explicit progress/earned text.

All three sprites are static. Existing pickup travel, duration/fade and
reduced-motion placement remain code-driven. No collection, assembly,
missing-letter return, award, reload/session or storage rule is changed. The
other five trail stickers retain their code-native shapes. Issue #194 remains
open for the remaining artwork discussion and owner-led in-game readability
feedback.
