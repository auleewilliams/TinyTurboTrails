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

## Sunset Site construction atlas

Sunset Site loads its own 16-cell construction atlas from
`public/assets/site/`. It preserves the shared world-asset names while
re-theming them as girders, a warning-cone/cement-mixer hazard, scaffold,
culvert pipes, weeds, a pneumatic jack, cement slime, construction checkpoint,
finish arch and sunset skyline. The large arrow on the jack distinguishes its
bounce role; bright barricade beacons and cone grouping distinguish the hazard from
the low, unlit scenery.

These are intended visual cues, not a completed child-readability result. See
the [issue #85 acceptance record](../evidence/issue-85/README.md) and its pending
firsthand playtest checklist.

The unmodified final generated sheet, exact generation/edit prompts and provenance
record are under `assets/source/site/`. The processed atlas is 192 × 192 RGBA,
uses nearest-neighbour resampling plus a documented alpha-128 visibility
threshold, and gives every bottom-planted sprite a visible-base anchor at row
44. Recreate it with:

```sh
python3 scripts/process_sprite_atlas.py \
  assets/source/site/environment-sheet.png public/assets/site/environment.png --hard-alpha
```

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


## Frost Ridge and Sandy Cove

The `frost` and `cove` runtime directories each contain a 192 × 192 RGBA atlas
and manifest in the shared 16-cell world-asset order. Original built-in-generated
sheets, exact prompts and provenance are preserved in `assets/source/frost/`
and `assets/source/cove/`. Their processing commands are in each `PROVENANCE.md`.
The standard-library processor accepts opaque RGB and transparent RGBA sources;
it preserves generated alpha rather than removing white snow highlights.

Frost uses gold collectibles, snowy firs, dark-blue edges and cyan ice glints.
Cove uses palms, driftwood springs, purple jellyfish and amber/blue surface
markings for soft sand/shallow water. Material marks follow the authored ground
segments exactly. Water itself never damages Henry. Atlas anchors align the
visible bases and checkpoint posts to their collision positions.
