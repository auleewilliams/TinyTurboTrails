# Checkpoint route control correction

The main run after Plains PR #180 failed its WebKit checkpoint case before either changed Plains section. The test could wait until a patrol had already entered contact range, and coarse polling could leave stone jumps too late. This correction changes that test's approach coordinates and polling. Production data, movement, interactions, rendering, input and assets are unchanged.

## Failure evidence

[Main run 38734016220](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38734016220) reported 268 browser passes, one skip and one WebKit failure; automatic publication was skipped. Its [original artifact](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38734016220/artifacts/11974042594) contains the screenshot, trace and error context. The coordinator retained the artifact without rerunning CI.

The [trace summary](trace-summary.json) has 458 status readbacks, including 457 Playing samples. Maximum X was 4641, with nine backward resets to the hillside recovery area near X 2422 and only two detected checkpoint banners. The route never reached canyon's activation window, X 4877–4933. Plains changes begin at gem X 6100 and hill X 6820; earlier terrain, entities and the browser driver were unchanged. This shows failed traversal, rather than a demonstrated checkpoint-activation regression. The [failure screenshot](main-failure-webkit.png) is the actual later capture, not a recreated pose.

The old driver targeted authored slime centres. Slime 007's centre is 3980 but its patrol reaches 3920; the 18px contact radius permits contact from 3902, before the old 3920 jump trigger. Actual trace samples progress X 3864 → 3908 → 2436 without a Space press on that approach. Status observations also covered 33–50px between polls. Space at X 4641 left only 7px before stone contact began at 4648; the observed feet at 119 needed over 34px of rise, which the unchanged jump cannot provide in that travel time. The exact fatal entity within the overlapping stone/slime cluster was not instrumented.

The unchanged case subsequently passed twice on the Plains build and once on the older baseline. Those passes establish intermittence; they do not validate this correction or erase the failure.

## Correction and retained coverage

- Only this case targets each patrol's first possible X. Static hazard positions and native 350ms Space inputs remain unchanged.
- It requests 40ms polling. The shared helper still defaults to 100ms for all other callers.
- An elapsed 40-second segment window replaces the fixed observation count, so faster polling does not reduce the nominal 400 × 100ms allowance to 16 seconds. The overall 200-second timeout is unchanged.
- All six activation assertions, near-flag distance checks (<90px), terrain-foot checks (≤2px) and planted-marker screenshots remain verbatim. No test or browser was removed.
- No retry, clock override, teleport, health/reward write or production test API was added.

## Deterministic diagnostic evidence

The [model comparison](model-summary.json) uses the registered scene and unchanged data, thirteen initial idle phases from 0–6 seconds, and three synthetic command delays: 0, 33 and 67ms. It retains checkpoint order, photo-stop pacing, and the near-flag and ground requirements.

| Driver | All six checkpoints | Ground assertion failures |
| --- | --- | --- |
| Original | 32/39 | 0 |
| Corrected candidate | 39/39 | 0 |

Maximum simulated candidate route time was 88.65 seconds. Contacts and recoveries remain possible: these cases included up to four recoveries. This is neither a damage-free controller claim nor proof across every possible phase.

The faster model proxy polls every three 60Hz steps, or 50ms rather than exact 40ms. It observes scene checkpoint IDs rather than rendered banners. It cannot validate native scheduling, rendered event latency or screenshots; native browser checks and normal all-engine CI are separate requirements.

## Executed validation

- Local unit suite: 730 passed across 40 files, measured 41.06 seconds. Typecheck, production build and diff check passed. Runtime bundle remains `index-DFa8YGSX.js`, identical to Quarry's checked production build.
- Corrected current build: four native passes, twice each in Chromium and WebKit, measured 6.8 minutes for the cohort. Every run retained all six named marker attachments and the original assertions.
- Inspected actual corrected WebKit [canyon](corrected-canyon-webkit.png) and [summit](corrected-summit-webkit.png) screenshots: planted pennants remain visible and the playfield is clear. These routes can take damage; the screenshots do not imply damage-free play.
- Corrected unchanged baseline: two native passes, one each in Chromium and WebKit, measured 3.4 minutes for the cohort. All six marker attachments and original assertions passed. [Native records and trace fingerprints](native-summary.json) retain both cohorts.
- Independent source review is clear for this bounded checkpoint contract, with the model limitations above. Normal exact-head Linux Chromium/Firefox/WebKit CI must pass before merge. Windows Firefox was not relaunched after its previously recorded host activation failure; it was not removed from CI.

Keep issue #171 open for the owner's combined trail playtest. Automated checks do not establish enjoyment acceptance.
