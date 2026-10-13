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
