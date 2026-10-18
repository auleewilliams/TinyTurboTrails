# Finish grounding — PR #190 follow-up

The owner's report reproduced on `68e1ff5`: Henry was grounded while both Timbers
finish feet floated. This is a rendering/metadata bug, not an educational reward
or terrain-height bug. The finish fix changes no movement, collision geometry,
finish trigger, slime squash, totals or educational rules. Obstacle behaviour is
tracked separately in #191.

## Root cause and sibling audit

`drawWorld` draws the finish atlas cell at scale 2. `drawAsset` uses its manifest
anchor, falling back to the *cell* bottom (48), not the visible artwork bottom.
Timbers and Plains omitted the finish anchor; Quarry shares the Plains atlas.
Their feet end at source row 43: four padding rows become an **8 logical-pixel
gap** at scale 2. Timbers' authored finish y=198 already matches the terrain.

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

## Owner correction

All added ground brackets/footprints were removed at the owner's request, along
with their implementation-specific tests and rejected screenshots. The original
sawhorse artwork's yellow/black rail is unchanged. No solid/standable obstacle
mechanic is approved by this correction. See #191 for the separate interim
pass-through direction and deferred future design discussion.

## Genuine evidence

- [Owner's original floating arch](reported-floating-arch.png).
- After removal, actual Chromium gameplay: [original obstacle at native size](chromium-original-obstacle-426.png),
  [small size](chromium-original-obstacle-320.png),
  [retained grounded finish native](chromium-retained-grounded-finish-426.png),
  [small](chromium-retained-grounded-finish-320.png).
  The scratch input-driven capture also recorded zero rejected-marker drawing
  calls and zero page errors. No scene teleports were used.
- Retained native/small Timbers finish captures for all three engines remain
  alongside this note; the finish area contains none of the rejected markers.
- Six actual renderer fixtures (426x240), shipped assets and actual level terrain:
  [Plains](chromium-plains-finish-native.png),
  [Quarry](chromium-quarry-finish-native.png),
  [Timbers](chromium-timbers-finish-native.png),
  [Sunset](chromium-sunset-finish-native.png),
  [Frost](chromium-frost-finish-native.png),
  [Cove](chromium-cove-finish-native.png). These isolate finish composition and are
  not full gameplay captures.

## Executed grounding validation

- Strict vertical RED → GREEN for shipped-pixel grounding (five broken trails;
  Sunset already correct), then slope rendering. Restoring the exact pre-fix
  renderer/manifests made six of the seven retained grounding unit cases fail;
  Sunset's already-correct case passed. No existing assertions, retries,
  timeouts or skips were weakened.
- After marker removal: `npm test` **814 passed**, 47 files; typecheck/build passed;
  `npm run test:ci` **8 passed**.
- Retained grounding browser test **3/3 passed** across Chromium/Firefox/WebKit
  after removal. It rasterizes the actual `drawWorld` finish call, samples both
  feet and multiple source-alpha tread columns, and compares against terrain
  heights at those columns. The <=2px gap bound catches the original 8–14px gaps;
  an additional per-foot absolute bound guards over-insertion.
- A fringe-only anchor trial failed Cove's original <=2px bound; the bound was
  preserved and visible-base metadata corrected. An exact-baseline screenshot
  rerun was blocked by the old signature/new test mismatch and tool approval;
  the owner's original screenshot is the honest before evidence.
- Independent review and final-head full CI are reported live in PR #190. Older
  marker-version CI results do not establish the corrected head's state.

Logs and uncommitted diagnostics are preserved outside the repository at
`/home/leew/.hermes/cache/scratch/issue189-visual-fixes`. No physical-controller,
installed Safari/macOS or child-comprehension acceptance is claimed. No merge or
deployment is authorized or performed.
