# Illustrated interface kit provenance

Generated on 2026-10-23 for issue #207. The owner authorized implementation and
coordinator review/merge; **the owner has not seen or approved this artwork**.

## Generated sources and exact prompts

Four requests were made, one per piece. No refinement, retry or discarded output
occurred. Each ran in a fresh native Hermes one-shot session restricted to the
`image_gen,vision` toolsets with the configured `openai-codex` provider
(ChatGPT/Codex OAuth; no API key). Each session called `image_generate` exactly
once; the retained stream logs show the prompt passed verbatim and the listed
references received. Panel and normal button ran first (concurrently). The
selected button and plaque then also received the normal button or panel source
respectively as a second reference, for consistency within the kit. The approved
[builder-kit concept](../spelling/concepts/builder-kit-v1.png) was the
art-direction reference for all four and was also attached to each chat.

| Source | Prompt / Hermes request | Aspect | References | Requested quality / size | Reported quality / size | Prepared |
| --- | --- | --- | --- | --- | --- | --- |
| [panel](panel-source-v1.png) | [Prompt](panel-v1-prompt.txt) · [Query](panel-v1-hermes-query.txt) | square | `assets/source/spelling/concepts/builder-kit-v1.png` | medium / 1024x1024 | low / 1254x1254 | 92 × 91, inset 10 |
| [button](button-source-v1.png) | [Prompt](button-v1-prompt.txt) · [Query](button-v1-hermes-query.txt) | landscape | `assets/source/spelling/concepts/builder-kit-v1.png` | medium / 1536x1024 | low / 1774x887 | 82 × 21, inset 6 |
| [button-selected](button-selected-source-v1.png) | [Prompt](button-selected-v1-prompt.txt) · [Query](button-selected-v1-hermes-query.txt) | landscape | `assets/source/spelling/concepts/builder-kit-v1.png`, `assets/source/interface/button-source-v1.png` | medium / 1536x1024 | low / 1774x887 | 82 × 21, inset 6 |
| [plaque](plaque-source-v1.png) | [Prompt](plaque-v1-prompt.txt) · [Query](plaque-v1-hermes-query.txt) | landscape | `assets/source/spelling/concepts/builder-kit-v1.png`, `assets/source/interface/panel-source-v1.png` | medium / 1536x1024 | medium / 2172x724 | 112 × 24, inset 5 |

The provider does not enforce the requested tier or size; reported values are
recorded as returned. Request IDs, Hermes sessions and cache filenames are in
each entry's `generation` field in [`preparation.json`](preparation.json).
Complete stream logs are retained outside the repository with the PR evidence.
The second references were passed from their scratch evidence paths (see each
Hermes request); the committed copies are byte-identical (same SHA-256).

**Source format.** All four are opaque 8-bit **RGB** PNGs (the plugin always
sends `background: "opaque"`) on the requested flat magenta. They were copied
byte-for-byte from the Hermes image cache; SHA-256 hashes are recorded. None
contains text, a checkerboard or a baked label.

## Deterministic preparation

[`scripts/prepare-interface-kit.mjs`](../../../scripts/prepare-interface-kit.mjs),
using [`scripts/interface-kit.mjs`](../../../scripts/interface-kit.mjs):

1. The existing edge-connected chroma-key flood fill from
   [`spelling-stickers.mjs`](../../../scripts/spelling-stickers.mjs) clears the
   magenta background; enclosed pixels are never cleared.
2. The visible bounds (alpha ≥ 128) are reduced to the logical cell by a
   majority-colour (mode) downsample: each output pixel takes the most common
   4-bit RGB bin of its source block, averaged within that bin, so no colours
   blend across outlines. Blocks at least half transparent stay transparent.
   Output alpha is binary.
3. Logical sizes approximate each source's own art-pixel pitch (about 12 source
   pixels for the panel, 19 for buttons, 15.6 for the plaque).

Re-running the script must reproduce the recorded decoded-pixel hashes before it
copies the prepared PNGs to `public/assets/interface/`; `--regenerate` rewrites
them. Tests in
[`prepare-interface-kit.test.mjs`](../../../scripts/prepare-interface-kit.test.mjs)
check reproduction, true RGBA, no chroma remnants, uniform tiled edge alpha with
dark outer outlines, quiet centres without stray pixels, and matching button
silhouettes.

## Nine-slice use

Corners draw at native size. Edges and centres repeat their middle segment and
crop the final tile; nothing is stretched. Destinations smaller than the insets
crop corners rather than squash them. All text, counts, glyphs and icons are drawn
separately by the game. The plaque inset is 5 so a single cream bevel pixel at
(4, 4) stays in the corner instead of repeating through wide centres.

Known artefact: the panel's right timber edge has small notches and a clear
outer column (corner brackets overhang it). Both are uniform along the edge, so
they tile without seams, but the right edge is slightly less regular than the left.

See [issue #207 evidence](../../../docs/evidence/issue-207/README.md) for the
asset proof and real gameplay captures.
