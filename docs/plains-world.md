# Plains world system — issue #4

The world preview is available at `/?scene=world`. It loads the generated local
environment atlas and draws the full level data with a bounded camera. Arrows or
A/D move the preview camera through the meadow, wooded hillside and cave-themed
sections. Terrain is rendered from the same segment data consumed by collision;
entity positions use stable IDs for later interaction and checkpoint systems.

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

The generated source sheet and prompt are under `assets/source/plains/`; the
processed RGBA atlas is under `public/assets/plains/`. The source remains
available for review and can be regenerated with the atlas-processing script.
Full route traversal, collision interaction, enemy behavior and final visual
contrast tuning continue in issues #5, #6 and #8.

Checkpoint coordinates are terrain foot positions: each checkpoint's Y is
`surfaceY` at its X, including the slope where a checkpoint sits on a ramp.
Entity placement and recovery use these same coordinates, so a checkpoint
cannot drift from the ground under it the way the coordinates in #26 did.
Atlas metadata supplies a checkpoint anchor `(20, 44)` to account for the post
position and transparent bottom padding; other assets retain the bottom-center
default. Regression tests cover ground activation in the adventure, recovery
at every checkpoint with gems retained, and scaled sprite anchoring.
