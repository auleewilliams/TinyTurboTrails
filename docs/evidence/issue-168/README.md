# Bottom trail progress ribbon — issue #168

The 136 × 14 logical-pixel ribbon is placed at `(285, 221)` on the
426 × 240 gameplay canvas, leaving five-pixel bottom and right insets. The rail,
Henry marker, checkpoint posts and finish flag move together; their sizes,
colors and progress mapping are unchanged. This keeps the top HUD, movement
and jump hints, and location/checkpoint notices clear. Henry normally stays
between x=110 and x=250 while the camera scrolls.
The right corner keeps his sprite clear even in the low Quarry, Timbers and
Sunset valleys, where his feet can reach the ribbon’s vertical band.

Before captures use the production build of `4ab686b`. After captures use
the updated production build. Both drive real pointer selection and keyboard
input through the existing six-trail milestone tests, capturing the start
and the first activated checkpoint. Checkpoint captures freeze the simulation
just beyond the flag. No game assets or simulation rules were changed.

The native viewport is 426 × 288, reserving 48 pixels for the external
controls so the gameplay canvas is actually 426 × 240. The small window is
320 × 240, with a proportionally scaled 320 × 180.28 canvas and the same
footer. Browser assertions check both rendered canvas sizes. The earlier
426 × 240 viewport captures scaled down the gameplay canvas because of
the footer; the updated captures correct that.

## Start comparisons

| Trail | Native before | Native after | Small before | Small after |
| --- | --- | --- | --- | --- |
| Plains | [426](before/plains-ribbon-start-426.png) | [426](after/plains-ribbon-start-426.png) | [320](before/plains-ribbon-start-320.png) | [320](after/plains-ribbon-start-320.png) |
| Quarry Run | [426](before/quarry-ribbon-start-426.png) | [426](after/quarry-ribbon-start-426.png) | [320](before/quarry-ribbon-start-320.png) | [320](after/quarry-ribbon-start-320.png) |
| Treetop Timbers | [426](before/timbers-ribbon-start-426.png) | [426](after/timbers-ribbon-start-426.png) | [320](before/timbers-ribbon-start-320.png) | [320](after/timbers-ribbon-start-320.png) |
| Sunset Site | [426](before/sunset-ribbon-start-426.png) | [426](after/sunset-ribbon-start-426.png) | [320](before/sunset-ribbon-start-320.png) | [320](after/sunset-ribbon-start-320.png) |
| Frost Ridge | [426](before/frost-ribbon-start-426.png) | [426](after/frost-ribbon-start-426.png) | [320](before/frost-ribbon-start-320.png) | [320](after/frost-ribbon-start-320.png) |
| Sandy Cove | [426](before/cove-ribbon-start-426.png) | [426](after/cove-ribbon-start-426.png) | [320](before/cove-ribbon-start-320.png) | [320](after/cove-ribbon-start-320.png) |

## Checkpoint comparisons

| Trail | Native before | Native after | Small before | Small after |
| --- | --- | --- | --- | --- |
| Plains | [426](before/plains-ribbon-checkpoint-426.png) | [426](after/plains-ribbon-checkpoint-426.png) | [320](before/plains-ribbon-checkpoint-320.png) | [320](after/plains-ribbon-checkpoint-320.png) |
| Quarry Run | [426](before/quarry-ribbon-checkpoint-426.png) | [426](after/quarry-ribbon-checkpoint-426.png) | [320](before/quarry-ribbon-checkpoint-320.png) | [320](after/quarry-ribbon-checkpoint-320.png) |
| Treetop Timbers | [426](before/timbers-ribbon-checkpoint-426.png) | [426](after/timbers-ribbon-checkpoint-426.png) | [320](before/timbers-ribbon-checkpoint-320.png) | [320](after/timbers-ribbon-checkpoint-320.png) |
| Sunset Site | [426](before/sunset-ribbon-checkpoint-426.png) | [426](after/sunset-ribbon-checkpoint-426.png) | [320](before/sunset-ribbon-checkpoint-320.png) | [320](after/sunset-ribbon-checkpoint-320.png) |
| Frost Ridge | [426](before/frost-ribbon-checkpoint-426.png) | [426](after/frost-ribbon-checkpoint-426.png) | [320](before/frost-ribbon-checkpoint-320.png) | [320](after/frost-ribbon-checkpoint-320.png) |
| Sandy Cove | [426](before/cove-ribbon-checkpoint-426.png) | [426](after/cove-ribbon-checkpoint-426.png) | [320](before/cove-ribbon-checkpoint-320.png) | [320](after/cove-ribbon-checkpoint-320.png) |

## Low-ground review

| Trail | Native | Small |
| --- | --- | --- |
| Quarry Run | [426](after/quarry-ribbon-low-ground-426.png) | [320](after/quarry-ribbon-low-ground-320.png) |
| Treetop Timbers | [426](after/timbers-ribbon-low-ground-426.png) | [320](after/timbers-ribbon-low-ground-320.png) |
| Sunset Site | [426](after/sunset-ribbon-low-ground-426.png) | [320](after/sunset-ribbon-low-ground-320.png) |

Reviewed all 30 after screenshots: starts and activated checkpoints across
all six trails at both sizes, plus these low-ground views. Henry’s marker,
checkpoint posts and finish flag remain distinct against every palette.
The ribbon stays within the canvas and clear of the top HUD, movement/jump
hints, location/checkpoint notices and footer controls. In the low valleys,
Henry remains fully visible beside the ribbon. Upcoming terrain, pickups
and hazards remain visible above its backing.

## Verification

- `npm test -- --maxWorkers=4 --testTimeout=15000`: 671 tests passed across 37 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Baseline Chromium milestone run: all six trails passed.
- Final Chromium milestone run, including low-ground checks: all six passed.
- `npm run test:browser -- --fully-parallel --workers=4 --reporter=line`:
  248 passed, 12 failed, one skipped. Most failures were WebKit timing failures
  with several WebKit instances running concurrently.
- `npm run test:browser -- --last-failed --workers=1 --reporter=line`:
  10 passed, two failed. All six WebKit ribbon milestones, including low-ground
  checks, passed with the final observer.
- `npm run test:browser -- --project=chromium --project=firefox --grep 'milestone .*pointer selection' --workers=2 --reporter=line`:
  12 passed with the final observer. Together with the serial WebKit run, all
  18 ribbon milestone checks pass across the three browsers.

Across the full run and serial rerun, 258 distinct browser checks passed,
two baseline failures remained, and one native-audio check was skipped.

The sandbox blocked Python subprocesses in the first unit run. A later run
hit the existing font-measurement test’s default five-second timeout. The
final command above passed with subprocess access and a longer test timeout,
without changing repository timeout settings.

The unit layout checks assert bottom and right insets from
actual drawing, alongside canvas bounds and separation from hearts, gems,
stars, keyboard hints and every trail’s location/checkpoint notices. Existing
progress tests cover exact finish mapping, repeated and skipped activations,
backtracking, real recovery and new-run resets for all six trails. Browser
milestone checks observe actual ribbon drawing, position and checkpoint fill,
absence from overworld/finish, and resets after Choose trail, Replay and Next
trail. They also collect both screenshot sizes.

Low-ground browser checks drive Henry to the deep Quarry plateau, the
Timbers rope-bridge valley and the Sunset trench, release movement and let
any spring launch settle. They observe actual sprite drawing, assert it
reaches the ribbon’s vertical band without overlapping horizontally, and
capture both window sizes. This caught the obstruction risk of centering
the ribbon and supports the final right-corner alignment.

Sprite bounds stay in an in-memory browser probe, avoiding per-frame DOM
mutations and their tracing overhead. Only the existing ribbon samples use
DOM attributes. No production test API was added, and assertions and timing
limits were retained.

## Known baseline failures

Both remaining serial failures also reproduce in an isolated temporary export
of unchanged `4ab686b`, built with the same installed dependencies and browsers:

- Chromium, `every destination accepts keyboard and standard-controller
  selection and start`: the renderer crashes during repeated reloads after
  controller starts. The changed build failed on the ninth navigation; the
  baseline also reported a page crash during navigation/loading.
- WebKit, `frost trail renders its material, completes and replays`: the
  coasting-speed check expects greater than 80 after a 120ms wait. The changed
  build reported 76; the baseline reported 67. This test does not install the
  ribbon observer. Frost's complete/replay/reset ribbon milestone passes.

Baseline comparisons ran the matching tests individually with one worker and
`PLAYWRIGHT_PORT=4185`. These failures are outside the ribbon layout change.
The single full-suite skip is Firefox's native-audio check: this host cannot
start its native AudioContext. Simulated audio and unavailable-audio checks run.
