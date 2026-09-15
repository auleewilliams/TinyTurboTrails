# Plains world system — issue #4

The world preview is available at `/?scene=world`. It loads the generated local
environment atlas and draws the full level data with a bounded camera. Arrows or
A/D move the preview camera through the meadow, wooded hillside and cave-themed
sections. Terrain is rendered from the same segment data consumed by collision;
entity positions use stable IDs for later interaction and checkpoint systems.

`src/world/level.ts` owns the 2,400 × 240 first-release route: eleven explicit
flat/ramp surfaces, eight gems, three slimes, two springs, one hazard, three
checkpoints and back-layer decoration. `validateLevel` rejects duplicate IDs,
missing checkpoint entities and out-of-bounds placements. Progress and entity
state are intentionally not stored here; issue #5 owns run state.

`src/world/camera.ts` keeps a player inside a dead zone and clamps the view to
the world bounds. `src/world/renderer.ts` draws parallax hills, terrain, entities
and the construction finish arch using atlas cells. The asset manifest maps all
16 source cells to named assets, and the browser checks confirm local loading.

The generated source sheet and prompt are under `assets/source/plains/`; the
processed RGBA atlas is under `public/assets/plains/`. The source remains
available for review and can be regenerated with the atlas-processing script.
Full route traversal, collision interaction, enemy behavior and final visual
contrast tuning continue in issues #5, #6 and #8.

Checkpoint coordinates are terrain foot positions: meadow `(570, 158)`, hillside
`(1220, 163)` and cave `(1780, 198)`. The hillside Y follows the slope between
`(1120, 198)` and `(1280, 142)`. Entity placement and recovery use these same
coordinates. Atlas metadata supplies a checkpoint anchor `(20, 44)` to account
for the post position and transparent bottom padding; other assets retain the
bottom-center default. Regression tests cover ground activation in the adventure,
recovery at every checkpoint with gems retained, and scaled sprite anchoring.
