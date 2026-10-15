# Sandy Cove: two beach finds and a shorter middle paddle

Related to #171. This is the Cove-only change, based on `a958aeb48c1d9469b7da22bcb227c42c5caf7f84`.

Cove keeps its relaxed, continuous route. Two of the six identical spring bonus gems now sit over firm beach just beyond a pool, reachable with an ordinary short hop. The other four spring arcs remain. Six nearby ground gems now point toward the approach and return. The third shallow pool ends earlier, giving that section a longer dry return.

| Feature | Before | After |
| --- | --- | --- |
| `cove-bonus-2` | x3255, y65; 115px above beach | x3080, y130; 50px above beach |
| `cove-bonus-4` | x6705, y59; 115px above beach | x6560, y129; 45px above beach |
| Main gems 10/11/12 | x2840 / 3080 / 3460 | x2900 / 3030 / 3340 |
| Main gems 22/23/24 | x6350 / 6570 / 7010 | x6410 / 6515 / 6860 |
| Third pool | x4350–4700, 350px | x4350–4570, 220px |

All collectible IDs and totals remain: 36 ground gems plus six bonus gems, zero stars. Springs, slime patrols, checkpoint positions, start, finish, sand stretches, material speed multipliers and the other five pools are unchanged. The terrain height is unchanged everywhere; x4570 simply separates water from dry beach. No new mechanics, hazards, controls or signs are added.

## Review evidence

- [Before/after layout](layout.svg): a static source diagram, with close-ups of the two low finds and the shorter pool.
- [Before layout data](before-layout.json) and [after layout data](after-layout.json): authored coordinates, extracted from the original Cove data and the bounded changes; not observations of a rendered game.
- `tests/cove-exploration.test.ts`: deterministic movement and interaction tests using the production simulation. Whole-route tests use normal `AdventureScene.update` controls. Local pickup tests call `simulatePlayer` and `stepEntities` with a fresh player/run; they establish individual reachability, not a single perfect 42-gem run.

## Executed local validation

- `npm test -- --maxWorkers=2`: **714 passed, 39 files**, 39.99 seconds measured by Vitest on the final run after the additional six-bonus test.
- Focused final Cove/biome rerun: **16 passed**, including the added complete six-bonus route.
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**; production bundle `index-C_rXry2l.js`.

The nine new tests verify unchanged IDs/totals and safe route features; all six harmless water and sand material bands; a full no-jump route with six spring contacts, six checkpoints, no damage or recovery and no bonus pickups; both new low finds on a complete route with ordinary running hops; all six bonus IDs accumulated together on one complete route combining held spring arcs and the two hops; six takeoff/hold combinations for each low find with dry landings before the spring and no damage; all 42 gems individually reachable; and retention of gems actually earned on the route through both fall and depleted-health recovery.

The existing held-spring traversal still verifies the exact four unchanged Cove spring bonuses (`1`, `3`, `5`, `6`). The two moved bonuses receive separate full-route and local ordinary-hop tests. A further scene test retains the original all-six-in-one-run coverage by combining the four held spring arcs with the two ordinary hops. Existing Frost expectations remain unchanged.

## Browser handoff and play prompts

Browser validation and rendered screenshots are owned by the coordinating task and are pending at this handoff. No browser, native play, enjoyment or owner-play claim is made here. Windows Firefox has a previously recorded launcher limitation; final cross-browser validation belongs in the coordinated run/CI.

For the all-six combined route, hold Right, press Jump at the same x3025/x6505 approach points, and hold Jump during ascent (`vy < 0`) as well as for the 12-frame ordinary-hop windows. This earns all six bonus IDs together with no damage or recovery in the deterministic scene.

Model-tested controls for both low finds: run right, press Jump around x3025 and x6505, hold about 200ms, continue right. The route can also be completed by simply holding Right without pressing Jump. To explore slowly, stop near x3080 or x6560 and make an ordinary short hop.

The local forgiving-return fixtures begin at 220px/s, 40 or 55px before each low find, hold Jump for 100/200/400ms, and release horizontal input after x3084 or x6564. Every tested combination picks up the gem and lands on dry ground before the spring contact region (x3172 or x6622), without spring contact, damage or recovery. These are deterministic model results, not measured browser timing tolerances.

Suggested screenshot poses: x2960/3080/3140 for the first approach, pickup and return; x4460/4640 for the shorter middle pool and dry exit; x6460/6560/6610 for the second find. The existing background trees near x3090/6550 warrant a rendered readability check.

Owner feedback remains pending: do the lower finds read clearly after the pools, do the spring and ordinary-hop rewards feel distinct, and does the earlier middle-pool exit preserve Cove's calm pace?

## Executed native browser validation (2026-10-15)

[Observed records](native-browser.json) retain baseline/candidate identity, engines, counters, replay and recovery events. Chromium 153.0.8010.12 completed the easy and optional routes at 36 and 38 gems respectively. WebKit 26.6 completed the optional route at 38 gems. Every candidate journey replayed at X60 with zero gems, and reported no page errors. These are route outcomes, not claims to collect every reward.

At first-hop-return, easy/optional Chromium gem counters were 11/12; WebKit optional was 12. The targets still drew on the walking route and had ceased drawing while still in the viewport after both optional routes.

At second-hop-return, easy/optional Chromium gem counters were 23/25; WebKit optional was 25. The targets still drew on the walking route and had ceased drawing while still in the viewport after both optional routes.

Both low finds are visible above dry ground, separate from the background trees and clear of the HUD. The shortened middle pool ends at the same height, followed by dry ground. Model tests separately establish dry landings before spring contact and preserve all other material behavior.

Inspected desktop/native and 320px evidence: [before-first-pool-exit.png](before-first-pool-exit.png), [after-first-pool-exit.png](after-first-pool-exit.png), [after-first-pool-exit-320.png](after-first-pool-exit-320.png), [before-short-pool-return.png](before-short-pool-return.png), [after-short-pool-return.png](after-short-pool-return.png), [after-short-pool-return-320.png](after-short-pool-return-320.png), [before-second-hop-approach.png](before-second-hop-approach.png), [after-second-hop-approach.png](after-second-hop-approach.png), [after-second-hop-approach-320.png](after-second-hop-approach-320.png). [Chromium finish](finish-chromium.png) and [WebKit finish](finish-webkit.png) are retained. WebKit also captured426px views.

Observed recovery counts: baseline partial journey 0; Chromium optional 0; Chromium easy 0; WebKit optional 0. Exact events remain in JSON. A recovery elsewhere on a scripted route is retained as observed; no damage-free route claim is inferred from missing page errors. Model/unit checks separately establish safe local pickup/landing and earned-reward recovery contracts.

Independent source/test review found no blocking issues. The required normal Linux CI check must pass all three engines on the exact final PR head before merge. Windows Firefox was not relaunched after its previously recorded host activation failure. Owner playtesting and enjoyment acceptance remain pending; keep #171 open.


## Updated-main verification (2026-10-15)

The combined candidate passed 748 unit tests across 42 files (43.58 seconds), typecheck and build. Rebasing onto merged Frost/main `bd79b0da965527a6c25ffcde604b4115ae5029ac` preserved the entire previously prepared Git tree. Compared with the tested candidate, only Frost's verification README differed before this Cove note; all application, test, asset and build inputs are unchanged. The production bundle remains `index-yRH0y32P.js`, exactly matching the private combined runtime. All six trails passed native Chromium/WebKit atlas, movement, pause and map-return smoke checks on preview port 4195 (12 checks, no page errors). Independent source/test review continuity and the canonical shared-test resolution passed. Normal exact-head Chromium/Firefox/WebKit CI is required before merge. Owner playtesting remains pending; keep #171 open.
