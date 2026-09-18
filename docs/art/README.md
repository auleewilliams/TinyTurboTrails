# Henry starter art

Issue #2 is in progress on `feat/henry-starter-sprites`, based on the foundation
branch. The master reference and source poses are under `assets/source/henry/`.
See `PROVENANCE.md` there for tool and prompt records.

## Art direction

Henry is a detailed human child with brown hair, a yellow construction hard hat,
a bright orange safety vest with pale reflective strips, blue clothes and brown
work boots. Keep the face, soft human silhouette and clothing readable at small
sizes. Terrain is chunky grass/dirt; Henry is not a cuboid avatar.

Plains palette families: deep blue-green outlines, warm skin, warm yellow and
orange accents, cool blue clothes, spring/moss greens and warm earth browns.
Use the generated reference swatches for visual matching. Prefer restrained
background contrast so Henry and hazards remain legible at speed. UI text is
rendered separately from illustrated assets.

## Additional plains scenery

The generated [plains scenery pack](../../assets/source/plains/scenery/PROVENANCE.md)
contains a wide background and a transparent sheet with eight foreground props.
Project assets and measured crop/anchor metadata are in
`public/assets/plains/scenery/`; exact generation prompts and original PNGs are
in `assets/source/plains/scenery/`. Plains uses the panorama and generated
decoration in adventure and both world/gameplay previews. Low foreground plants
sit on safe flat ledges; gameplay sprites and collision remain unchanged.
Quarry keeps its original scenery. The background pans within its image bounds
instead of repeating, because the generated edges are not certified seamless.

## Runtime contract

The preview loader reads `public/assets/henry/manifest.json` and a local atlas.
The manifest records logical size, common anchor, source frame rectangles and
`idle`, `run`, `jump`, `fall` clips. Each clip declares frame indices, seconds per
frame and whether it loops. Non-looping clips hold their last frame; the preview
replays them after a short hold for inspection.

The preview is selected with `?scene=art`. It shows each clip at gameplay size
and doubled size against dark/light backgrounds, with a baseline and center
anchor guide. Escape pauses it, including animation time. The default foundation
preview remains available without the query parameter. A failed image or
manifest load produces a readable error and a visible Retry loading control.

## Processing record

The generator returned RGB source images with a visible checkerboard. The
project-local `scripts/process_sprite_atlas.py` script flood-fills that neutral
border-connected background, resamples each source cell with nearest-neighbor
sampling and writes an RGBA 192 × 192 atlas. It also normalizes every pose to a
48 × 48 cell, a shared x-center and a y=44 boot baseline. The original source
images remain untouched.

Recreate the runtime output with:

```sh
python3 scripts/process_sprite_atlas.py \
  assets/source/henry/starter-atlas.png public/assets/henry/starter.png
```

The browser asset check confirms all 16 cells contain transparent pixels, no
opaque pixels touch a cell edge, and each has a non-empty character. The
reference and atlas are still generated source material; final art review at
native gameplay size remains part of issue #2 validation.
