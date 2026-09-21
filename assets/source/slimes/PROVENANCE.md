# Shared lavender slimes — issue #143

Generated with the built-in OpenAI image-generation tool on 2026-09-22 for
Tiny Turbo Trails. The existing Sunset Site atlas was used as a style reference.
The approved design is one lavender body with dark purple shading and six
cosmetic accessories: straw hat, miner helmet, leaf cap, construction hard hat,
woolly bobble hat, and snorkel mask. No external stock artwork was used.

`parts-source.png` is the selected generated atlas, four columns by two rows.
Reading order: common body, straw, miner, leaf, hard hat, bobble, snorkel, empty.
The transparency attempts retained a background glow, so a final edit replaced
the backdrop and mask lens interiors with solid magenta for chroma-key cleanup.
The generation prompt and edit instructions are recorded in `prompt.txt`.

Run `python scripts/prepare-slimes.py` from the repository root to reproduce
`public/assets/slimes/slimes.png`. The standard-library PNG processor removes
the magenta key, downsamples the parts with nearest-neighbour sampling, and
composites the **same** 32 × 23 body under every accessory. Runtime cells are
48 × 48, laid out in trail order in a 288 × 48 PNG, with ground anchor (24, 44).
The body and uncovered face pixels are identical across costumes. Transparent
mask openings retain the original eyes. Hats and mask do not change collision.

There is no image-generation dependency or network call at runtime. Historical
slime cells in the biome atlases are retained for art previews; playable trails
and overworld previews load the shared sprite atlas once.
