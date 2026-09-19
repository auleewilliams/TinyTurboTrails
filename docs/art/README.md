# Art direction and asset provenance

Henry’s shipped master reference and source poses are under `assets/source/henry/`.
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
Quarry uses the shared trail panorama described below. The background pans within its image bounds
instead of repeating, because the generated edges are not certified seamless.

## Sunset Site construction atlas

Sunset Site loads its own 16-cell construction atlas from
`public/assets/site/`. It preserves the shared world-asset names while
re-theming them as girders, a warning-cone/cement-mixer hazard, scaffold,
culvert pipes, weeds, a pneumatic jack, cement slime, construction checkpoint,
finish arch and sunset skyline. The large arrow on the jack distinguishes its
bounce role; bright barricade beacons and cone grouping distinguish the hazard from
the low, unlit scenery.

The owner has confirmed completion of the child-readability playtest. See the
[issue #85 acceptance record](../evidence/issue-85/README.md) and linked playtest
record for the confirmation and its scope.

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
anchor guide. Escape pauses it, including animation time. The foundation
preview is available at `/?scene=foundation`; bare `/` opens the adventure. A failed image or
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
reference and atlas are still generated source material; historical review evidence retains its original scope.


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

Gameplay clarity (#89–#91) reuses each shipped atlas's `dust` cell for meaningful
landings and its existing spring sprite for event-driven compression/release.
Small code-drawn sparkles, outlined pixel hearts and a checked gold checkpoint
pennant add high-contrast cues without new raster assets. Damage brightness/fading
applies to Henry's sprite alpha rather than a rectangle. Reduced-motion settings
suppress travel, dust and spring deformation. Evidence and reproduction live in
[`../evidence/issues-89-91/`](../evidence/issues-89-91/README.md).

## Coordinated trail presentation

The [overworld source](../../assets/source/overworld/PROVENANCE.md) provides six
landmarks. The [trail sheets](../../assets/source/trails/PROVENANCE.md) provide
quiet materials and Quarry/Timbers panoramas. Exact prompts and untouched sources
are project-local; runtime copies live in `public/assets/overworld/` and
`public/assets/trails/`. The approved [title source](../../assets/source/title/PROVENANCE.md)
is unchanged and also appears in the root README.

Material identity: warm soil/turf and sparse roots in Plains, exposed rock in its
canyon/cave, cool quarry strata and chipped edges, timber grain/plank edges,
construction gravel, snowy caps over cool rock, and dry sand with distinct
authored soft-sand/water strips. Frost and Cove are already playable (#34/#35),
so their materials are integrated now rather than left as planned work. Their
actual slowdown/ice tuning remains in the movement guide.

Fill is clipped once per connected collision contour, anchored in world space
and culled to the viewport. Illustrated edges follow slopes and pit faces without
stretching source art. Dedicated timber atlas trim remains integrated. Surface
friction markers are drawn last over the material/edge, with cyan streaks for
low traction and ochre grains for high traction; normal materials do not imply
traction changes. Crumbling warnings remain distinct from static decoration.

Panoramas pan inside their source bounds without wrapping. Their restrained
contrast keeps interactive sprites forward, with trees and mine supports rooted
in their environment. Cached map thumbnails use the finished world renderer,
not a hidden game loop. See [milestone evidence](../evidence/trail-milestone/README.md).
