# Frost Ridge and Sandy Cove verification

Scope: #34 and #35, including shared surface movement from #39. Sunset Site
(#33) is excluded. Tested on Linux with Node.js 22.22.1.

## Gameplay evidence

Deterministic 60Hz AdventureScene runs hold right without pressing jump:

| Route | Finish time | Regular gems | Health | Checkpoints | Springs |
| --- | ---: | ---: | --- | ---: | ---: |
| Frost Ridge | 50.32 seconds | 36 | All three pips retained | 6 | 6 |
| Sandy Cove | 53.60 seconds | 36 | All three pips retained | 6 | 6 |

Neither route needs timed jumps or moving-platform boarding. Separate runs hold
jump during spring ascent and collect optional higher bonus gems (three in
Frost, six in Cove). Those gems are missed by the no-jump traversal. Every Cove
water patch also has a direct traversal test verifying no damage or recovery.

The 3–5 minute exploratory-play target has **not** been validated with a human
or child playtest. The timings above demonstrate the shortest simple route,
not the intended exploration duration. Difficulty/readability with a six-year-old
and physical-controller playtesting remain manual follow-up work.

## Visual evidence

- [Frost ice band and glints](chromium-frost-material.png)
- [Cove shallow water and wave markings](chromium-cove-material.png)

Screenshots are from the production build in Chromium, selected through the
actual title picker. Both processed atlases were also inspected for readable
sprites, transparency, terrain tops and visible-base anchors. The screenshots
show the initial material sections, unaffected by later bonus-gem placement.

## Automated coverage

Unit coverage includes default movement compatibility, braking and reversal on
ice, gradual signed slowdown and restored speed on exit, exact joint slope and
friction, air/platform exclusion, material validation, bounce/contact agreement,
pause/replay reset, level data and safety, full-route completion, atlas contracts,
and all five PNG filter modes with RGBA alpha preservation.

Browser coverage selects both levels, verifies their own atlas is drawn, checks
ice coasting and sand/water speed, freezes creature rendering with Escape,
completes each trail, replays, and exercises retry after either atlas fails.
The existing route, keyboard/controller, rendering, asset and audio tests remain
part of the full three-browser suite.

## Results

- `npm test`: 363 passing unit tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Final-layout biome browser recheck: all 12 tests passed in Chromium, Firefox
  and WebKit.
- Full `npm run test:browser`: 110 passed, one conditional skip across Chromium,
  Firefox and WebKit. The skipped Firefox native-audio test detected no working
  audio backend on this Linux host; audio-unavailable fallback tests passed.
- `git diff --check`: passed.

The full browser run used an otherwise identical temporary configuration with
port 4186 and `reuseExistingServer: false`, after an unrelated server reused on
4173 disappeared during the first attempt. All original projects and tests were
retained. The full suite preceded the final bonus-gem tuning; the final build
and all 12 affected biome browser tests subsequently passed on the final layout.

## Review

A separate read-only reviewer found no blocking issues. Its two suggested
coverage additions (movement at exact surface joints and PNG filters 1–4) were
added, passed, and re-reviewed. Final route-reward tuning is additionally
covered by no-jump and held-jump traversal tests.

The built-in image generator produced both source sheets. Exact prompts and
provenance are in `assets/source/frost/` and `assets/source/cove/`; processed
project-local assets are in `public/assets/frost/` and `public/assets/cove/`.
