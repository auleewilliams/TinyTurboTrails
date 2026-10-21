# Builder-kit sprite preparation

Prepared on 2026-10-19 for issue #194. The owner approved the
[`builder-kit-v1.png`](../concepts/builder-kit-v1.png) concept's visual direction
in this chat ("They look great"). The owner subsequently approved these prepared
sprites ("They look good") and explicitly requested integration, checks and a PR.
The three approved native-size sprites are now loaded by the adventure.
The five remaining trail stickers were generated later; see
[Generated trail stickers](#generated-trail-stickers).

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
| [Plains sticker](prepared/plains-sticker.png) | 56 × 56 | 28, 28 | 2, 10, 52, 35 |
| [Quarry sticker](prepared/quarry-sticker.png) | 56 × 56 | 28, 28 | 2, 5, 52, 46 |
| [Timbers sticker](prepared/timbers-sticker.png) | 56 × 56 | 28, 28 | 3, 2, 50, 52 |
| [Frost sticker](prepared/frost-sticker.png) | 56 × 56 | 28, 28 | 2, 4, 52, 48 |
| [Cove sticker](prepared/cove-sticker.png) | 56 × 56 | 28, 28 | 2, 3, 52, 50 |

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

## Deterministic preparation of the original three sprites

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

## Generated trail stickers

Generated on 2026-10-21 for the remaining #194 scope: Plains HILL, Quarry Run
ROCK, Treetop Timbers TREE, Frost Ridge SNOW and Sandy Cove SAND. Each source
came from **one** request; no refinement or retry was made, and no other output
was discarded. These five stickers await owner review; the original three
sprites above are unchanged (the Sunset runtime PNG remains byte-identical).

Each request ran in a fresh native Hermes one-shot session restricted to the
`image_gen,vision` toolsets, using the configured `openai-codex` image provider
(ChatGPT/Codex OAuth; no API key). The session was asked to call
`image_generate` exactly once with `aspect_ratio: "square"`,
`reference_image_urls: [sunset-sticker-source-v1.png]` and the exact prompt. The
retained logs show one call per session, the prompt passed verbatim and the
reference received (`input_image_count: 1`, edit modality). The 56 × 56 Sunset
runtime PNG was also attached to the chat for context only.

| Sticker | Exact prompt | Hermes request | Untouched source |
| --- | --- | --- | --- |
| Plains grassy hills | [Prompt](plains-sticker-v1-prompt.txt) | [Query](plains-sticker-v1-hermes-query.txt) | [Source](plains-sticker-source-v1.png) |
| Quarry rock | [Prompt](quarry-sticker-v1-prompt.txt) | [Query](quarry-sticker-v1-hermes-query.txt) | [Source](quarry-sticker-source-v1.png) |
| Timbers tree | [Prompt](timbers-sticker-v1-prompt.txt) | [Query](timbers-sticker-v1-hermes-query.txt) | [Source](timbers-sticker-source-v1.png) |
| Frost snow-capped mountain | [Prompt](frost-sticker-v1-prompt.txt) | [Query](frost-sticker-v1-hermes-query.txt) | [Source](frost-sticker-source-v1.png) |
| Cove sandcastle | [Prompt](cove-sticker-v1-prompt.txt) | [Query](cove-sticker-v1-hermes-query.txt) | [Source](cove-sticker-source-v1.png) |

**Reported metadata.** The Hermes provider requested tier `gpt-image-2-medium`
(`quality: medium`, `size: 1024x1024`). The backend reported `quality: low` and
`size: 1254x1254` for all five; it does not enforce the requested values. The
underlying backend model is not reported beyond that tier label. The provider
plugin always sends `background: "opaque"`, so genuine transparency was not
available. Request IDs, Hermes session IDs and original cache filenames are in
each entry's `generation` field in [`preparation.json`](preparation.json).
Complete stream logs are retained outside the repository with the PR evidence.

**Source format.** Every source is an opaque 8-bit **RGB** PNG (no alpha
channel) with the requested flat vivid magenta background (measured around
`251–252, 3–4, 249–251`). Sources were copied byte-for-byte from the Hermes
image cache; their SHA-256 hashes are recorded.

**Preparation.** [`scripts/spelling-stickers.mjs`](../../../../scripts/spelling-stickers.mjs)
derives real alpha without dependencies:

1. Starting from the image edge, a 4-connected flood fill clears pixels whose
   red and blue both exceed green by at least 24. This removes the magenta and
   its blend into the dark keyline. The threshold sits above the most
   magenta-leaning interior pixel measured in the sources (23, in the tree) and
   far above cream, white snow, blue and the dark outline, which remain
   untouched. Enclosed pixels are never cleared; no global colour deletion is
   performed. Every remaining pixel keeps its RGB and alpha 255.
2. Visible bounds use the existing alpha ≥ 128 rule. The same aspect-preserving
   fit and `floor` centering as the Sunset sticker place the content in a
   56 × 56 cell with 2 px transparent padding.
3. Nearest-neighbour samples are taken at destination pixel centres, keeping the
   source's binary alpha and pixel colours (no blending or palette changes).

The result is RGBA with alpha 0 or 255 only. The script records source bounds,
content rectangles, removed-background and visible-pixel counts, the PNG hash and
a decoded-pixel hash. Re-running preparation must reproduce the committed pixels
exactly; PNG bytes are canonical because zlib output can vary between versions.

**Review.** Visual inspection of all six stickers at 4×, 2×, native, collection
scale (~31 × 31) and dimmed unearned state, on light and dark backgrounds, found
consistent chunky outlines, dark keylines and cream borders, distinct silhouettes
and no magenta fringe. White snow and light highlights survive. The Plains hills
are wider than the others (52 × 35 content) but remain recognisable at
collection size. These remain owner-review items, not an owner approval.

## Runtime integration

Run `node scripts/prepare-spelling-art.mjs` from the repository root to copy the
eight native-size PNGs to `public/assets/spelling/`. The script validates every
file's dimensions, RGBA format and recorded hashes, and re-derives the five
generated stickers from their sources, before writing any output. It does not
resample the original three reviewed images. `--regenerate` rewrites only the
five chroma-keyed prepared files and their computed record fields. The eight
runtime files total 35,115 bytes. High-resolution sources, intermediate output
and concept sheets are not requested by the game.

Adventure startup loads and dimension-checks the pouch, blank tile and all six
trail stickers (`<trail id>-sticker.png`) through the existing required-artwork
error/Retry boundary. A missing or wrongly sized sticker fails startup visibly;
there is no code-drawn fallback. Assembly
and dragged tiles retain their existing 42 × 32 controls; pickups and flying
tiles use the existing 22 × 24 footprint with separately rendered 16px glyphs.
The blank background is scaled to that footprint, while text stays undistorted.
Assembly letters use separately rendered 17px glyphs. No glyph is baked into
the shared tile image.

Focus uses an outer frame and caret; a selected tile in hand retains an inset
frame when focus moves to a space. Native accessible buttons retain their names,
focus behavior and original bounds. Empty spaces and action buttons keep their
original presentation. Each trail reward uses its own centered 56 × 56 image in
the earned screen and the existing 0.55 collection scale. Unearned stickers are
shown at 0.3 alpha, with the existing explicit progress/earned text.

All sprites are static. Existing pickup travel, duration/fade and
reduced-motion placement remain code-driven. No collection, assembly,
missing-letter return, award, reload/session or storage rule is changed.
Owner-led in-game readability feedback remains manual.
