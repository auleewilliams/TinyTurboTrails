# Finish grounding and scenery / danger clarity — PR #190 follow-up

The owner's report reproduced on `68e1ff5`: Henry was grounded while both Timbers
finish feet floated. This is a rendering/metadata bug, not an educational reward
or terrain-height bug. No movement, contact, damage, slime squash, authored level
geometry, totals, or educational rules change in this follow-up.

## Root cause and sibling audit

`drawWorld` draws the finish atlas cell at scale 2. `drawAsset` uses its manifest
anchor, falling back to the *cell* bottom (48), not the visible artwork bottom.
Timbers and Plains omitted the finish anchor; Quarry shares the Plains atlas.
Their feet end at source row 43: four padding rows become an **8 logical-pixel
gap** at scale 2. Timbers' authored finish y=198 already matches the terrain.

All six trails were checked against the actual shipped PNGs:

| Trail / atlas | Old anchor y | Nonzero-alpha bottom (exclusive) | Substantial-alpha foot bottoms (alpha >=128) | Corrected anchor y |
| --- | ---: | ---: | --- | ---: |
| Plains / plains | fallback 48 | 44 | 44 / 44 | 44 |
| Quarry / plains | fallback 48 | 44 | 44 / 44 | 44 |
| Timbers / timbers | fallback 48 | 44 | 44 / 44 | 44 |
| Sunset / site | 44 | 44 | 44 / 44 | 44 (unchanged) |
| Frost / frost | 44 | 38 | 37 / 37 | 37 |
| Cove / cove | 44 | 39 | 38 / 37 | 37 |

Frost's last fringe row has maximum alpha 2; Cove's last has maximum alpha 1.
Using any-nonzero alpha alone still left a visible gap in the browser regression
(Cove 2.133 logical pixels). The anchor now seats the shorter *visible* foot;
Cove's one-row-longer left foot overlaps the ground instead of floating. This is
measured sprite metadata, not an arbitrary world-y nudge. No raster art changed.

Cove's finish also sits on a 20/300 exit slope. Only finish rendering follows the
local slope using a vertical shear: pillars remain vertical, feet meet the same
terrain plane, and neither collision geometry nor the finish trigger moves.
Other five finish areas are flat. Existing sprite drawing is unchanged otherwise.

## What to jump, and what can be walked through

Timbers' seven sawhorses (`hazard`, x=750/2150/3000/4700/6600/8250/8900) still
hurt on contact: **jump over them**. Six leaf-capped slimes still hurt from the
side/underneath: jump over them or land on their tops to squash them. A flattened
slime is harmless. Eleven decorative trees, flowers, treehouse/cave props and
bushes are pass-through scenery; checkpoints, the optional maths sign and finish
arch do not hurt. Springs launch Henry; gems, stars and letters are pickups.
Nothing was hidden, deleted, converted to a hazard, or made non-damaging.

The shared renderer now gives only `hazard` and unsquashed `slime` entities a
compact **dark bracket with alternating pale ground stripes**. The shape and
luminance pattern, not hue alone, distinguish a contact danger. The cue follows
live slime patrol coordinates and disappears immediately on squashing, including
before the squash animation completes. Harmless scenery, platforms, springs,
checkpoints, pickups and finish arches never receive the danger cue. Existing
gold landing dashes remain distinct; no text, signboard or post was added.

These modest cues are provisional visual tuning. Screenshot inspection confirms
the strip remains visible at 320px, but cannot establish that a first-time child
understands it or reads it quickly enough while moving. Owner/child playtesting
should judge this before any more substantial art or teaching changes.

## Genuine screenshots

- [Owner's before screenshot: floating Timbers arch](reported-floating-arch.png).
- [Historical sawhorse before the new footprint](../../issue-171-timbers-pilot/after-middle-approach.png).
  This is existing genuine browser evidence from an earlier, different approach
  pose, **not** a matched-camera capture or an A/B difficulty comparison.
- Chromium after: [danger native](chromium-timbers-danger-approach-426.png),
  [danger small](chromium-timbers-danger-approach-320.png),
  [harmless tree native](chromium-timbers-harmless-tree-426.png),
  [harmless tree small](chromium-timbers-harmless-tree-320.png),
  [finish native](chromium-timbers-grounded-finish-426.png),
  [finish small](chromium-timbers-grounded-finish-320.png).
- The equivalent six `firefox-timbers-*` and six `webkit-timbers-*` captures are
  alongside these files. All three engines' native/small views were inspected.
- Six actual renderer-fixture captures (426x240), using shipped assets and real
  level terrain: [Plains](chromium-plains-finish-native.png),
  [Quarry](chromium-quarry-finish-native.png),
  [Timbers](chromium-timbers-finish-native.png),
  [Sunset](chromium-sunset-finish-native.png),
  [Frost](chromium-frost-finish-native.png),
  [Cove](chromium-cove-finish-native.png). These isolate the finish composition;
  they are not full gameplay screenshots. The Timbers native/small views above
  are actual running gameplay reached through input, without scene teleports.

## Executed validation before publication

- Strict vertical RED → GREEN: shipped-pixel grounding first (five broken trails,
  Sunset already correct), then slope drawing, then danger eligibility/live
  positions/instant harmless-state suppression. Initial runs are in external logs.
- Restoring the exact pre-fix renderer and four manifests made **13 of the 14 new
  unit cases fail** (Sunset's already-correct grounding still passed); restoring
  the fix returned the entire suite to green. No assertions, retries, existing
  timeouts or skips were weakened.
- `npm test`: **821 passed**, 47 files. `npm run typecheck`, `npm run build` passed;
  `npm run test:ci`: **8 passed**.
- New Chromium/Firefox/WebKit browser cases: **6 passed, zero failed/skipped**.
  One case rasterizes both feet from the actual `drawWorld` finish call and
  compares substantial-alpha pixels to the actual terrain at each foot and
  multiple load-bearing tread columns (<=2px gap bound, catching the original
  8–14px gaps). The original per-foot absolute bound remains as an additional
  check. Another drives real
  keyboard events through the normal input/clock path: jump the marked first
  sawhorse, pass the unmarked tree without lost hearts, reach the finish approach,
  then start fresh and deliberately walk into the marked sawhorse to observe
  actual damage/empty-heart feedback. Its clock is accelerated, not a native-time
  human run. Screenshots are taken with simulation time held constant on resize.
- A trial using all nonzero-alpha fringe pixels failed Cove's original <=2px
  browser bound; the bound was preserved and visible-base metadata was corrected.
- An additional exact-baseline screenshot rerun did not complete: its full build
  correctly rejected the newer seven-argument slope test against the older
  six-argument implementation; a diagnostic Vite-only attempt hit a tool process
  guard, and another restoration request required approval. The original user
  screenshot and explicitly historical sawhorse capture are the honest before
  evidence, rather than invented or re-rendered images claimed as baseline.
- Independent review and full final-head PR CI are reported live in PR #190;
  the older head's green CI is **not** proof for these new changes.

All 42 after screenshots (18 six-trail fixtures across three engines plus 24
native/small Timbers gameplay views, including deliberate damage) and full
RED/GREEN/sabotage/browser logs are outside the repository at
`/home/leew/.hermes/cache/scratch/issue189-visual-fixes`.
No physical-controller, installed Safari/macOS or child-comprehension acceptance
is claimed. No merge or deployment is authorized or performed.
