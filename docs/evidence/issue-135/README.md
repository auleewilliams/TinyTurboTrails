# Ambient trail weather — issue #135

Quarry Run has suspended dust, Treetop Timbers has turning leaves, Frost Ridge
has drifting snow, and Sandy Cove has rising spray. Plains and Sunset Site
declare no weather. `LevelTheme.weather` owns the particle style and motion;
the renderer never selects weather by trail identity.

The weather field evaluates at most 32 particles directly from run seconds,
camera position, and fixed index strides. It creates no particle objects or
arrays, uses no random generator, and retains no state between frames. The run
clock freezes on pause and resets on replay. Checkpoint recovery cannot change
the field sampled at the same clock and camera position. Movement, collision,
and run-state code are unchanged.

Weather draws after the backdrop and before terrain, platforms, entities, Henry,
foreground and HUD. Small translucent marks leave the top 40 pixels clear.
Reduced motion disables the layer; cached map thumbnails also remain clear.

## Native screenshots

Run `npm run dev -- --port 4175 --strictPort`, then
`node scripts/capture-ambient-weather.mjs` to reproduce the 426×240 images.
The capture samples the production adventure scene at run time 12.5 seconds;
diagnostic code positions Henry and the camera without changing gameplay code.

Each trail includes a start view, a collectible view (star on Quarry/Timbers,
gem on Frost/Cove), and a hazard view. Matching `-reduced` images use the actual
`prefers-reduced-motion: reduce` media preference. The reviewed screenshots keep
collectibles, hazard silhouettes, landing edges, Henry, and HUD text clear.

| Trail | Start | Collectible | Hazard |
| --- | --- | --- | --- |
| Quarry | [Normal](quarry-start.png) / [Reduced](quarry-start-reduced.png) | [Normal](quarry-collectible.png) / [Reduced](quarry-collectible-reduced.png) | [Normal](quarry-hazard.png) / [Reduced](quarry-hazard-reduced.png) |
| Timbers | [Normal](timbers-start.png) / [Reduced](timbers-start-reduced.png) | [Normal](timbers-collectible.png) / [Reduced](timbers-collectible-reduced.png) | [Normal](timbers-hazard.png) / [Reduced](timbers-hazard-reduced.png) |
| Frost | [Normal](frost-start.png) / [Reduced](frost-start-reduced.png) | [Normal](frost-collectible.png) / [Reduced](frost-collectible-reduced.png) | [Normal](frost-hazard.png) / [Reduced](frost-hazard-reduced.png) |
| Cove | [Normal](cove-start.png) / [Reduced](cove-start-reduced.png) | [Normal](cove-collectible.png) / [Reduced](cove-collectible-reduced.png) | [Normal](cove-hazard.png) / [Reduced](cove-hazard-reduced.png) |

## Rendering measurement

`render-performance-before.json` records current main (`6b010a0`) before the
change using the existing audit against its historic `e04b5e2` renderer.
`render-performance-after.json` compares the animated weather renderer directly
against pre-change main on the same host, assets, and full-route camera samples:

```sh
TRAIL_RENDER_BASELINE=6b010a0 node scripts/audit-trail-rendering.mjs docs/evidence/issue-135/render-performance-after.json
```

The existing audit's `milestone` result key denotes the current renderer.
Each trail uses 30 warmups and 600 frames with full Canvas readback. The updated
audit advances run time at 60 Hz so this measures moving weather. Browser suites
and unit tests should be stopped while measuring to limit scheduling noise.

The final audit alternates baseline/current order for each adjacent pair at the
same time and camera position, reducing drift from changing shared-host load.
The paired median difference rounds to 0.0 ms for every trail. Affected trails
add at most 0.1 ms to either the overall median or p95; this is less than 1% of
a 16.7 ms frame budget and shows no material rendering regression.

| Trail | Baseline median | Weather median | Baseline p95 | Weather p95 |
| --- | ---: | ---: | ---: | ---: |
| Quarry | 2.0 ms | 2.0 ms | 2.6 ms | 2.5 ms |
| Timbers | 2.1 ms | 2.2 ms | 2.7 ms | 2.6 ms |
| Frost | 1.9 ms | 1.9 ms | 2.2 ms | 2.2 ms |
| Cove | 1.7 ms | 1.8 ms | 2.0 ms | 2.1 ms |

Absolute numbers vary with the host: pre-change control timings also move away
from the historic milestone figures. The same-host comparison isolates the
change, and affected trails' final p95 values remain below the historic
milestone's slowest trail (2.8 ms). No other checks from this worktree ran during
the final measurement.

## Automated coverage

Focused Vitest tests cover deterministic sampling despite intervening renders,
time/camera sensitivity, no randomness, count and viewport bounds, reduced
motion, and declaration-free trails. A scene regression covers run-clock
sampling, pause freezing and replay reset. Playwright compares actual Canvas
pixels for repeated moments, theme-driven behavior after renaming a trail,
animation, reduced motion, untouched clear trails, protected HUD/terrain pixels,
and a small changed-pixel budget in Chromium, Firefox and WebKit.

An independent subagent reviewed production code, tests, and native screenshots
and approved the implementation with no remaining findings.

Validation commands and results:

- `npm test -- --maxWorkers=2 --testTimeout=15000`: 625 passed. The existing
  finish-layout tests exceeded their default time limits during concurrent
  local browser runs; the isolated run passed. GitHub CI also passed the default
  `npm test` command.
- `npm run typecheck`, `npm run build`: passed.
- `npm run test:ci`: 8 passed.
- `PLAYWRIGHT_PORT=4183 npm run test:browser -- --grep 'ambient weather' --workers=1 --output=/tmp/issue-135-weather-tests`:
  3 passed, one each in Chromium, Firefox, and WebKit.
- The local broad browser run was interrupted after 180 passing tests. It
  exposed the subsequently corrected missing injected tile helper and several
  existing timing/input/load failures on the shared host. The complete browser
  matrix and Docker deployment smoke check run in the
  [PR #161 CI check](https://github.com/auleewilliams/TinyTurboTrails/pull/161/checks)
  as the merge gate.
