# Six-trail spelling expansion

Continues PR #190 from the accepted Timbers bag/assembly baseline
`268c920d930f8b22668c4cbd8abe595688fa3983`. Current artwork is accepted for V1;
new generated artwork is deferred to #194 and maths to #193.

| Trail | Word | Sticker | Pickup positions |
| --- | --- | --- | --- |
| Plains | HILL | Hill | 360, 1300, 3600, 7100 |
| Quarry Run | ROCK | Rock | 360, 1300, 3600, 7100 |
| Treetop Timbers | TREE | Accepted tree | 360, 1300, 3600, 7100 |
| Sunset Site | BEAM | Beams | 360, 1300, 3600, 7100 |
| Frost Ridge | SNOW | Snowflake | 360, 1300, 3600, 7100 |
| Sandy Cove | SAND | Sandcastle | 360, 1300, 3600, 7100 |

`TRAIL_WORDS` drives one shared bag, pickup animation, mixed pile and manual
assembly. Each trail owns a separate collected-ID set and four placement slots.
The two HILL Ls and TREE Es remain independent and interchangeable in matching
spaces; identities cannot be reused or accepted on another trail. No collection
awards a sticker before manual assembly. All six statuses appear in a compact
three-column/two-row collection, with one Return to map target and accessible
text for every trail. Stickers are code-native shapes with no new assets.

Find more letters returns 28px before the same finish in the identical completed
run, preserving partial placement, gems, stars, checkpoint and squashed slimes.
The accepted finish latch, release gates and simulation-clock boundary remain.
Session progress survives recovery, replay and trail switching; reload starts
fresh. There is no storage. Diagnostic/custom level fixtures without a configured
word retain their ordinary finish behavior.

## Test-first and static evidence

External complete logs, traces and original diagnostic failures are retained at
`/home/leew/.hermes/cache/scratch/issue189-all-trails/`.

- `slice1-red.log`: the six-trail state test fails the old pilot API.
  `slice1-green.log`: minimal shared configuration and separate state pass.
  `slice1-sabotage.log` restores the original implementation and fails the new
  regression; `slice1-restored.log` passes after restoring the change.
  `scene-sabotage.log` restores the Timbers-only finish guard: five of six
  selected scene cases fail (15 other cases are filtered out), then
  `scene-restored.log` passes all 21 cases after restoration.
- `slice2-red.log` and `slice2-ui-red.log`: scene selection/finish and independent
  mixed controls fail before generalization; the respective green logs pass.
- `slice3-red.log` fails the old one-sticker collection; green passes six statuses.
- `reverse-metrics.log` exercises all six actual terrain profiles from an initial
  finish fixture, collects every missed letter and re-enters finish. Every later
  position change comes from normal simulation input. No recovery occurs on any
  route. Springs seen across reverse/return: 6/9/7/5/6/6; damage: 0/1/0/0/0/0.
  The Quarry slime hit does not cause recovery or prevent completion.
  `crumbled-reverse-initial.log` also passes with all three Quarry ledges
  already crumbled before the initial finish fixture; the expanded focused
  suite has 22 cases. No geometry/state reset is used to make the return easier.
- Early diagnostic drivers missed pit-edge jumps or passed airborne over a
  pickup. The final driver uses actual slime positions, reverse pit jumps and
  ordinary braking to settle at missing letters. No terrain blocker was found.
- `static-audit.log` records an empty diff for all world data, movement,
  interactions, platforms, renderer and asset directories against the baseline.
  Thus terrain, pits, entities, static prop/slime rules, totals and finish artwork
  retain the accepted implementation. No issue #162 captures are included.

## Browser evidence and verification

The complete local unit suite passes **863 tests across 50 files**, with zero
failures/skips (`unit-final-crumbled.log`). Typecheck (`handoff-typecheck.log`), build
(`handoff-build.log`) and all **8 script tests**, zero failures/skips
(`handoff-scripts.log`), pass. The production bundle is unchanged throughout the
browser verification; tests run against the same preview build.

The new browser route for each trail deliberately misses a real letter, places
one correct partial slot, returns beside finish, retraces to every missing tile,
returns to finish and manually earns its sticker. It also verifies all other
stickers stay unearned, bag retention on replay, fresh reload, no browser errors
and no observed recovery jumps. Pointer drag/drop, Tab/Enter and standard
Gamepad API assembly are distributed across the six routes. It uses real input
and rendered sprite/debug observations only; it cannot mutate a scene/player/run.
Nearby slimes and reverse pit banks use one simulation step per observed
physical frame; quiet sections use six. Auxiliary RAF waits cannot advance the
pilot twice in one frame. A short rise hop exits a used 36px Quarry ledge recess
before a separate pit jump. These are test-player inputs; simulation remains
the unchanged production fixed-step loop.

Diagnostic browser runs are retained honestly. `browser-first.log` was 3 passed /
3 failed, including one Frost 120-second whole-test timeout after a rapid Tab/
focus race. Control-boundary waits fixed that race. Subsequent no-recovery
assertions caught overly coarse pilot inputs; the driver now observes actual
sprite positions and uses precise pit/rise input. In particular, the retained
crumbled Quarry recess needs a short hop before its adjacent pit. The old long
hop fell into that pit; the actual geometry is traversable and was not changed.
`browser-quarry-hops.log` passes the complete corrected route without recovery.

Two diagnostic matrices were stopped for those confirmed pilot failures:
`browser-matrix.log` records 11 passed / 2 failed / 2 interrupted / 30 not run;
`browser-final.log` records 19 passed / 1 failed / 2 interrupted / 23 not run.
All original logs/traces remain. No timeout, assertion or retry was weakened.
A transient missing test-observer TypeScript `this` annotation was corrected
before the final green typecheck. These diagnostics do not establish the final
three-engine matrix.

The completed two-worker focused matrix on test head
`89e47d0f83fef5c328313ace4c990e4f3102e7b7` records **39 passed / 6 failed /
0 skipped** (`browser-final-fixed.log`). Chromium and Firefox each pass 15/15.
WebKit's failures are four existing 30-second whole-test limits and two new
35-second outward-finish waits (still moving at x=7500 / x=9198). Other WebKit
trail routes, including Timbers and Sunset, pass. The unchanged one-worker
WebKit diagnostic records 5 passed / 1 failed: all four existing pilot cases
pass, and Quarry passes; Plains still reaches only x=9596 within its 35-second
first-finish wait at the default large starting viewport. These are retained
diagnostics, not a claim of a single clean local matrix.

The new evidence cases now start at native 426px canvas width and assert that
width before movement, then capture both native and small layouts.
`browser-native-red.log` fails the old large starting width;
`browser-native-green.log` passes the complete WebKit Plains loop under the
unchanged deadlines. The large-viewport suite remains separate.

On final test head `1240c31d16a6a97664afc6b07e43c550eae406c5`, the new-route
matrix records **16 passed / 2 failed / 0 skipped** (`browser-native-matrix.log`).
The two WebKit failures were deadline limits while still moving: Plains' outward
wait at x=9548 and Quarry's reverse wait at x=3800. The exact same cases and
limits pass **2/2 with one worker** (`browser-native-serial.log`). All **18 named
trail/engine routes** therefore have passing live checks, with no observed
recovery or page errors in those passing routes. No single clean two-worker
local matrix is claimed. All **27 existing educational pilot cases** also have
passing recorded checks across the initial matrix and its unchanged WebKit
one-worker diagnostic. No retry, deadline or behavioral assertion was relaxed. The final focused
state/route suite passes 22/22 (`handoff-focused.log`). Viewport resizing across
large/native/small sizes and normal finish celebration/pause/focus navigation
pass 6/6 across all engines (`browser-finish-layout.log`).

Final independent review and exact-head GitHub CI (including the full browser
suite and container/production smoke) are delegated to the orchestrator.
The complete suite catalog contains 336 browser cases; it was not run locally
as a final CI substitute. Historical baseline CI is not expansion CI.

Automated standard Gamepad API checks do not establish physical-controller
comfort, child comprehension, reading comfort or enjoyment. Those acceptance
steps remain owner-led. No merge, deployment or issue closure is performed.

## Bounded capture set

The native game canvas is 426×240 within a 426×300 screenshot; small captures use
a 320×240 viewport. Primary trail images are Chromium. Complete per-trail,
per-engine capture sets remain in the external `browser-final-fixed/` output.
Actual small earned images for all six trails and representative native/collection
images were inspected during implementation. Orchestrator image inspection is
part of the independent final review.

| Trail | Partial assembly | Earned sticker |
| --- | --- | --- |
| Plains HILL | [native](chromium-plains-missing-assembly-426.png) / [small](chromium-plains-missing-assembly-320.png) | [native](chromium-plains-earned-426.png) / [small](chromium-plains-earned-320.png) |
| Quarry ROCK | [native](chromium-quarry-missing-assembly-426.png) / [small](chromium-quarry-missing-assembly-320.png) | [native](chromium-quarry-earned-426.png) / [small](chromium-quarry-earned-320.png) |
| Timbers TREE | [native](chromium-timbers-missing-assembly-426.png) / [small](chromium-timbers-missing-assembly-320.png) | [native](chromium-timbers-earned-426.png) / [small](chromium-timbers-earned-320.png) |
| Sunset BEAM | [native](chromium-sunset-missing-assembly-426.png) / [small](chromium-sunset-missing-assembly-320.png) | [native](chromium-sunset-earned-426.png) / [small](chromium-sunset-earned-320.png) |
| Frost SNOW | [native](chromium-frost-missing-assembly-426.png) / [small](chromium-frost-missing-assembly-320.png) | [native](chromium-frost-earned-426.png) / [small](chromium-frost-earned-320.png) |
| Cove SAND | [native](chromium-cove-missing-assembly-426.png) / [small](chromium-cove-missing-assembly-320.png) | [native](chromium-cove-earned-426.png) / [small](chromium-cove-earned-320.png) |

Collection captures: [Chromium native](chromium-collection-426.png) /
[small](chromium-collection-320.png), [Firefox native](firefox-collection-426.png) /
[small](firefox-collection-320.png), [WebKit native](webkit-collection-426.png) /
[small](webkit-collection-320.png).

The **30 captures total 924,792 bytes**. The [capture manifest](capture-manifest.json)
records their checksums and test head. The [18 actual route results](route-results.json)
record each engine/trail, input method, observed statuses and source run, including
the two isolated WebKit cases. Detailed logs, traces, extra missing-return frames
and complete native/small per-engine images remain external.
