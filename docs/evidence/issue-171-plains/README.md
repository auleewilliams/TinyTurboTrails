# Plains exploration and pacing - issue 171

## Change

The cave exit now offers one optional three-gem arc at x6100/6140/6180. A normal forward jump near x6060 collects it, then returns Henry to the existing broad shelf before the next slime patrol and stone. Continuing along the ground skips these three gems and still completes the trail.

The later hillside now climbs in two shallower stages, with an 80px flat between them. Its maximum rising slope falls from 38/130 (about 0.292) to 18/100 (0.18). There are no new gaps or required jumps. The descent and nearby spring remain unchanged.

All 45 gem IDs, the three introductory stars, six checkpoints, springs, slimes/patrols, hazards, start, finish, landing marking, theme and other terrain are preserved. Only three gem positions and the later hill segments change. The existing gem at x7090 remains reachable from the ground on the intermediate flat.

## Executed model checks

`tests/plains-exploration.test.ts` exercises the actual registered AdventureScene with ordinary directional/jump inputs at a fixed 1/60-second step. No reward sets, health, player position or hazard behavior are overwritten during traversal. Local pickup fixtures separately use the movement and interaction functions directly.

- The ground route finishes in about 45.52 simulation seconds, activates all six checkpoints, skips the three cave gems and performs no recovery.
- All nine combinations of requested launch x6048/6060/6072 and jump held for 20/24/28 frames collect all three cave gems and finish. Actual launch positions are about x6050.61-6072.36; landings are x6178.90-6207.99, before the x6310 safety limit and the nearest patrol body edge at x6322.
- Both the ground route and optional variants encounter the same single damage event at hazard-001 around x1029.03, well before the changed cave section, remain below three damage events and perform no recovery. These are deterministic model runs, not native browser timing or owner play.
- The hillside stays grounded throughout a no-jump traversal.
- A run that actually earns the cave gems retains them through fall and zero-health recovery at checkpoint-cave (x5935). Each gem is also individually reachable with an ordinary stationary jump.

`model-results.json` records the measured deterministic route results. `baseline.json` is the full unchanged Plains data captured from base commit a958aeb48c1d9469b7da22bcb227c42c5caf7f84 before editing. The focused test compares IDs, all untouched entities, metadata and outside-hill terrain with that baseline.

## Validation

- Focused unit tests: 14 passed, including nine independent launch/hold combinations.
- Full unit suite: 719 passed across 39 files (44.50s wall time for the final run, with two workers).
- `npm run typecheck`: passed.
- `npm run build`: passed (production JS index-C9Qppdh3.js).

Native browser QA, screenshots, cross-browser CI and owner play are pending central validation. No native browser was launched by this worker. Issue 171 remains open pending owner acceptance.

## Native browser checks to append

1. Boot Plains normally, keep the easy route through the cave and complete without the optional hop.
2. On another run, hold forward and press/hold jump around x6060 for roughly 0.4 seconds. Confirm three gem pickup feedbacks and an unobstructed landing on the shelf.
3. Capture the cave arc and two-stage hill at representative desktop and small viewports; check the gem art and HUD independently.
4. Confirm the new hillside can be walked without a jump and that finish/replay remains available.
## Executed native browser validation (2026-10-15)

[Observed browser records](native-browser.json) use native RAF and the unchanged production clock, with keyboard inputs only. Chromium153.0.8010.12 completed an easy route with36/45gems and the optional-hop route with39/45. WebKit26.6 also completed the optional route with39/45. Every completed candidate route replayed atX60, zero gems and STARS0/3; no page errors were observed.

At the grounded cave return nearX6248/Y116 (feet150), Chromium's easy route still had23gems and all three arc sprites were still drawing. Both optional routes had26gems there, and each of the three target sprites had stopped drawing more than0.8seconds earlier while still in view. That is observed pickup/return evidence, independent of the model's precise launch/landing measurements. All introductory stars remained available and the input pilot collected3/3before the cave.

Inspected the [before cave](before-cave.png), [after cave](after-cave.png), [uncollected optional arc](after-uncollected-arc.png), [grounded return](after-cave-return.png), and [320px cave view](after-cave-320.png). The arc remains distinct from the terrain and clear of the HUD. The [before hill](before-hill.png), [after hill](after-hill.png) and [320px hill](after-hill-320.png) show the continuous two-stage rise and short flat. Native426px/small320px WebKit captures were recorded. [Chromium](finish-chromium.png) and [WebKit](finish-webkit.png) finish images are retained.

The baseline journey to the hill and all three completed candidate journeys each recorded three recoveries at existing hazards/patrols. Exact events are retained in the JSON, including later patrol contact beyond the safe cave return. These scripted journeys are not described as damage-free. The local cave-hop return and hill checks are separately bounded by the deterministic tests.

Independent source/test review found no blockers. Required normal Linux CI must still pass Chromium/Firefox/WebKit on the final PR head; Windows Firefox was not relaunched after its recorded host activation failure. No owner playtest or enjoyment claim is made. Issue171 stays open.

## Validation after updating the main base

Updated onto main commit 7e3acb6910a881bc4924bbc2ee1d56d2f2f44656 after Sunset merged. The combined base plus this focused Plains change passed 726 unit tests, typecheck and production build. The earlier native evidence remains a dated per-trail layout observation; normal exact-head CI validates all three engines on this updated base.
