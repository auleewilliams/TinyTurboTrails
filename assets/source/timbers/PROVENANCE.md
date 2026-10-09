# Treetop Timbers environment provenance

Generated on 2026-09-19 with the built-in `image_gen` tool. The tool did not
report an underlying model version; none is claimed. The original request is in
`environment-prompt.txt`. The generated sheet is source/reference art; the
runtime 192 × 192 RGBA atlas is derived locally by
`scripts/process_sprite_atlas.py` with nearest-neighbor resampling and remains
paired with `public/assets/timbers/manifest.json`.

The 16-cell order preserves the shared world-asset contract: timber terrain
variants; sawhorse, scaffolding, pine and rope; gem, crane-hook spring, slime and
checkpoint; then finish arch, sawdust, sunset treetops and cut logs.

Spring grounding (issue #155): the spring's visible base ends on row 43.
Its manifest anchor is `{ x: 24, y: 44 }`, so the four transparent bottom rows
do not leave air between the mechanism and its timber support. Bitmap artwork
is unchanged.
