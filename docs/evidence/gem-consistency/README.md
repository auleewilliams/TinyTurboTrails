# Gem consistency review

Reviewed all six current levels on 22 September 2026. No gameplay or asset changes made.

## Findings

1. **Visible size and shape vary substantially.** Plains, Quarry and Sunset use 31 x 40 px silhouettes; Timbers is 18 x 26, Frost 25 x 25, and Cove 23 x 27. Timbers has a thin pale outline, Frost is a squat gold diamond, and Cove is cyan. Color variation can be intentional; silhouette and scale are not standardized.
2. **Visible height is inconsistent with the shared pickup anchor.** All five atlases use the default gem anchor (24, 48), but the last visible pixel is at row 43 for Plains/Sunset, 29 for Timbers, 34 for Frost, and 31 for Cove. At the same authored position, Timbers therefore ends 14 px higher than Plains. Most main-route positions are ground minus 18; Plains uses 16/20/24. The pickup rule remains a point window of +/-18 px horizontally and +/-28 px vertically around Henry's feet, regardless of sprite bounds.
3. **Reward density and optional routes vary.** Totals range from 33 in Timbers to 62 in Sunset despite similar level lengths. Timbers has no elevated ordinary gems; its optional rewards are separate stars. Frost has three bonus gems, while Quarry, Sunset and Cove have six. Plains also has six elevated gems, identified by height rather than a bonus ID. These are design differences, not established defects.

| Level | Gems | Level width | Visible sprite |
| --- | ---: | ---: | --- |
| Plains | 45 | 9980 | 31 x 40 |
| Quarry Run | 37 | 10200 | 31 x 40 |
| Treetop Timbers | 33 | 10200 | 18 x 26 |
| Sunset Site | 62 | 10000 | 31 x 40 |
| Frost Ridge | 39 | 11200 | 25 x 25 |
| Sandy Cove | 42 | 10600 | 23 x 27 |

Recommendation: establish one ordinary-gem silhouette, visible size and anchor across the atlases, retaining biome colors if desired. Then decide whether reward density and bonus-route cadence should be comparable; identical totals are not inherently necessary.

## Evidence and scope

- `comparison.png`: fresh Chromium capture of the real world renderer, centered near each level's first ordinary gem at identical 1x scale. These are diagnostic world renders without Henry or HUD, not screenshots of six traversed runs.
- `measurements.json`: level counts and sprite alpha bounds (alpha > 20). Ground-relative heights over pits do not measure jump requirements; some bonus positions use the spring ledge as their reference.
- Focused existing Vitest suites: biome-gameplay, quarry-run, sunset-site, treetop-timbers, interactions, world. **247 tests passed across six files.**
- Shared code confirms one-count-per-ID, disappearance after pickup, retention on recovery, and reset on a new run. No new cross-browser gameplay sweep was performed.

## Initial fix for issue #145 (historical)

The initial fix used a shared 24 x 32 px code-native diamond, bottom-centered on
the entity position. Frost keeps a gold interior and Cove keeps cyan; other
trails use amber. A dark rim and elongated diamond distinguish gems from stars.
The original atlas cells and all level data remain preserved.

`after.png` records the first elongated replacement. After visual review, the
user selected the richer cut-diamond direction C from the ImageGen exploration
board in `assets/source/gems/cut-diamond-concepts.png`.

`after-cut-diamond.png` repeats the diagnostic six-level composition with the
selected 32 x 28 px brilliant-cut design. Browser pixel coverage confirms identical visible bounds and alpha
masks for every trail, different biome interior colors, and a silhouette distinct
from special stars. Existing renderer tests cover disappearance after pickup and
layer ordering.

Validation so far: 538 unit tests pass; typecheck and production build pass.
Full browser-suite results are recorded in the PR. Firefox currently fails at
process launch (`spawn UNKNOWN`), including outside the sandbox, before any
page or game code executes.

### Initial validation and limitations

- `npm test`: 538 passed across 31 files.
- `npm run typecheck` and `npm run build`: passed.
- `npm run test:ci`: 8 passed.
- `git diff --cached --check`: passed before commit.
- The new six-trail pixel test passed in Chromium and WebKit, both in the initial
  suite and in a focused single-worker rerun. Browser screenshots were inspected.
- Full three-engine validation is **incomplete**. Firefox fails at process launch
  with `spawn UNKNOWN`, including an escalated retry and after reinstalling its
  Playwright runtime. A later Chromium/WebKit suite encountered five WebKit
  `page.goto` load timeouts on audio/foundation pages and was stopped. The focused
  two-engine rerun passed both tests but also stalled during runner teardown.
  These failures are reported as validation limitations, not passing checks or
  proven pre-existing defects. The PR remains draft pending a clean browser run.

## Sprite correction for PR #149 — 2026-10-06

The selected concept was previously approximated by polygons with a near-black
rim. The current renderer displays transparent sprite pixels derived from the
selected column C artwork. All three palettes share a 32 x 24 visible footprint,
alpha mask and bottom-center pickup anchor. The broad proportions, bright edges
and internal facets come from the generated cutout, without an added outline.

- `after-sprites.png`: six controlled `AdventureScene` renders with Henry and the
  HUD at native 426 x 240 resolution, plus enlarged views of the shipped sprites.
  These are renderer fixtures, not six completed runs.
- `sprite-play.png`: normal Plains gameplay at a 1280 x 800 browser viewport,
  entered through Skip story and Play PLAINS.
- `sprite-collected.png`: the same session after holding ArrowRight until the
  HUD displays GEMS 1, then pressing Escape. The first gem has disappeared and
  its +1 feedback is visible. No page errors were observed.

Reproduce with `npm run dev -- --port 4175 --strictPort`, followed by
`node scripts/capture-gems.mjs`. Source, exact generation prompt and atlas
preparation are documented in `assets/source/gems/PROVENANCE.md`.

Current verification:

- `npm test`: 564 passed across 33 files.
- `npm run typecheck`, `npm run build`, `npm run test:ci` (8 tests), and
  `git diff --check`: passed.
- Focused Chromium/WebKit browser checks: all eight test bodies passed, covering
  six-trail sprite bounds/masks/palettes, gem/slime asset retry, and material
  rendering with the new required sprite loaded. The runner then timed out
  during plugin teardown after 90 seconds and exited with code 1.
- Broader Chromium/WebKit suite: 85 passed, one skipped and 70 did not run before
  the configured ten-minute suite limit. Completed checks include collection and
  disappearance, layer rendering, traversal, camera recovery and replay. Suite
  and teardown timeout errors mean this is not a complete passing browser run.
- Firefox's two focused gem checks fail before game code runs with
  `browserType.launch: spawn UNKNOWN`, including an attempt outside the sandbox.
  The PR remains draft with three-engine verification incomplete.
