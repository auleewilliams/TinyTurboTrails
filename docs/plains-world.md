# Plains world system — issue #4

The world preview is available at `/?scene=world`. It loads the generated local
environment atlas and draws the full level data with a bounded camera. Arrows or
A/D move the preview camera through the meadow, wooded hillside and cave-themed
sections. Terrain is rendered from the same segment data consumed by collision;
entity positions use stable IDs for run interactions and checkpoints.

`src/world/level.ts` owns the Plains route, while `src/world/levels.ts` registers
it with the other playable levels. The 9,980 × 240 Plains route (issue #45) has six biomes
(meadow, hillside, canyon, cave, orchard, summit) built from 55 flat/ramp
surfaces, 45 gems, 14 slimes, 6 springs, 6 hazards, 6 checkpoints and
back-layer decoration. Main-route gems, hazards, slimes and springs sit within
28px of the ground beneath them so a walking player reaches them without
jumping; one bonus gem per biome floats above that window as an optional,
jump-only pickup. `validateLevel` rejects duplicate IDs, missing checkpoint
entities and out-of-bounds placements, and requires at least one checkpoint
(no longer a fixed count). Progress and entity state are intentionally not
stored here; issue #5 owns run state.

`src/world/camera.ts` keeps a player inside a dead zone and clamps the view to
the world bounds. `src/world/renderer.ts` draws parallax hills, terrain, entities
and the construction finish arch using atlas cells. The asset manifest maps all
16 source cells to named assets, and the browser checks confirm local loading.

Plains additionally loads `public/assets/plains/scenery/manifest.json` through
the world manifest. Its generated panorama replaces the old hill cells, using
a bounded, aspect-correct crop to avoid repeat seams. New trees, bushes, flowers
and decorative rocks sit behind interactions; low foreground plants draw after
Henry with clearance from gameplay entities. The art is enabled by the Plains
theme only. Source PNGs, exact prompts and generation notes are preserved under
`assets/source/plains/scenery/`. Missing scenery participates in the existing
loading error and retry flow.

The generated source sheet and prompt are under `assets/source/plains/`; the
processed RGBA atlas is under `public/assets/plains/`. The source remains
available for review and can be regenerated with the atlas-processing script.
Current adventure behavior is documented in [the adventure guide](plains-adventure.md).

Checkpoint coordinates are terrain foot positions: each checkpoint's Y is
`surfaceY` at its X, including the slope where a checkpoint sits on a ramp.
Entity placement and recovery use these same coordinates, so a checkpoint
cannot drift from the ground under it the way the coordinates in #26 did.
Atlas metadata supplies a checkpoint anchor `(20, 44)` to account for the post
position and transparent bottom padding; other assets retain the bottom-center
default. Regression tests cover ground activation in the adventure, recovery
at every checkpoint with gems retained, and scaled sprite anchoring.

## Registry and validation

`LEVELS`, `DEFAULT_LEVEL` and `levelById` own stable destination order and IDs.
`LevelData` supplies dimensions, start/finish, surfaces, checkpoints, entities,
optional moving platforms, atlas and cosmetic theme. The loader preloads unique
atlases, shared presentation sheets and optional scenery before adventure starts.
Missing images/metadata use the central loading error/retry UI. Every registered
atlas must be present; previews remain single-level.

Validation enforces finite dimensions, unique bounded entity/platform IDs,
contiguous single-height contours, terrain-grounded checkpoint entities, finish
after start, valid movement materials and safe optional platforms/ledges. Runtime
state stays outside immutable level data. Moving platforms and ledges supplement
terrain collision rather than creating multiple ground heights.

See [art conventions](art/README.md) for terrain fills, illustrated edges and
Quarry/Timbers panoramas. They preserve all authored collision/entity positions.
