# Plains world system — issue #4

The world preview is available at `/?scene=world`. It loads the generated local
environment atlas and draws the full level data with a bounded camera. Arrows or
A/D move the preview camera through the five grassy sections. Terrain is rendered from the same segment data consumed by collision;
entity positions use stable IDs for run interactions and checkpoints.

`src/world/level.ts` owns the Plains route, while `src/world/levels.ts` registers
it with the other playable levels. The approved #218 first pilot is 4300 × 240 with continuous normal-soil
rollers and resting shelves. Its five sections are Meadow rollers (0–820),
Big downhill (820–1500), Orchard bumps (1500–2400), Spring hill (2400–3300)
and Final climb (3300–4300). Start feet are (60,206); finish feet are
(4230,128). The canonical issue contour is transcribed without geometry changes.

There are 33 gems (`gem-001`…`gem-033`), three existing star identities at
(1150,78), (1930,150), (2800,135), and HILL letters at x650/2180/3150/3750.
Four flags and matching recovery entities stand at (740,206), (1430,218),
(2370,220), (3260,204). The sole spring is (2760,220). Old cave/canyon flags,
repeated springs, stone section and out-of-bounds objects are retired. No pits,
platforms, new controls or movement changes are introduced.

One straw-hat orchard slime starts at x1750 and patrols x1720–1780 at the
shared 36px/s. Its entire 32px body stays within x1704–1796 across the cycle,
clear of the orchard star return (1840–2030), downhill runout (1210–1430),
spring retry/landing (2680–3100), letters, flags and summit. Static props retain
the shared harmless/pass-through rule.

Existing oaks group at x1550,1670,2100: the first pair uses young oak art and
the third round oak, from the existing x/1000 selection. Back-layer trees draw
before rewards and Henry; the hollow around the star stays open. Sparse bushes,
flowers and rocks are regrounded. No new art or implied cave interior is added.
The old foreground >=180px-flat heuristic would leave a tuft at x3136 beside
L1 and little elsewhere. Plains now uses four low authored tufts at
x800/3340/3950/4140, on flats or slopes <=0.1, with explicit 60px letter and
interaction clearance. This bounded composition change avoids dense flowers.
The existing flattened panorama still pans once by a bounded aspect-correct
crop over the shorter route; it is never tiled or treated as separate layers.
The downhill landing band is regrounded and widened to 180px at x1320 for the
new broad runout. These scenery/encounter/band choices do not alter the approved
contour or reward/checkpoint coordinates.

The compact draft's human exploratory duration, enjoyment and clarity remain
unverified. Use [the current worksheet](PLAINS-PLAYTEST.md); historical #171
captures and dated release/waiver worksheets certify only their original source.

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
