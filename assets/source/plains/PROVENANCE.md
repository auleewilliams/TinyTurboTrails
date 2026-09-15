# Plains environment provenance

Generated on 2026-09-14 with the built-in `image_gen` tool. The tool did not
report an underlying model version; none is claimed. The original request is in
`environment-prompt.txt`. The generated sheet is source/reference art; the
runtime 192 × 192 RGBA atlas is derived locally by
`scripts/process_sprite_atlas.py` with nearest-neighbor resampling and remains
paired with `public/assets/plains/manifest.json`.

The 16-cell order is the same as the manifest: terrain variants, stone/cave/tree
and flowers, gem/spring/slime/checkpoint, then finish arch/dust/hills/bush.

Checkpoint placement metadata (issue #26): the processed 48 × 48 checkpoint
cell has four transparent rows below the artwork. Its manifest anchor is
`{ x: 20, y: 44 }`, centered on the post and at the visible base. This lets
world/recovery coordinates stay on the terrain without changing the bitmap.
