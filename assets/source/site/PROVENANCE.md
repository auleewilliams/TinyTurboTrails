# Sunset Site environment provenance

Generated on 2026-09-19 with the built-in `image_gen` tool. The tool did not
report an underlying model version; none is claimed. The initial request is in
`environment-prompt.txt`; the Plains environment sheet was supplied as a style
reference. Native-scale gameplay review found that the skyline cell retained a
rectangular sky and duplicated the level-rendered sun, so the built-in tool made
one targeted edit recorded in `skyline-edit-prompt.txt`. The committed
`environment-sheet.png` is that unmodified RGBA edit result.

The runtime `public/assets/site/environment.png` was derived with nearest-
neighbour resampling. Generated alpha below 128 is discarded and remaining
pixels become fully opaque, preventing invisible antialiasing fringe from
changing sprite bounds or anchors:

```sh
python3 scripts/process_sprite_atlas.py \
  assets/source/site/environment-sheet.png public/assets/site/environment.png
```

The cells retain the shared 16-name world contract. Their Site meanings, in
manifest order, are girder terrain variants; warning-cone/cement-mixer hazard,
scaffold, culvert pipes and weeds; amber gem, pneumatic jack, cement slime and
checkpoint; finish arch, dust, construction skyline and scrubby bush.

Every bottom-planted Site sprite ends on row 43 of its 48 px cell and uses a
manifest anchor of `{ x: 24, y: 44 }`. This aligns its visible base with the
level's `surfaceY` without changing collision positions.
