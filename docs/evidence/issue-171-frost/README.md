# Frost Ridge: optional snow-climb discovery (#171)

The middle bonus now asks for one ordinary hop on the snow climb after the frozen lake's entire braking runout. The first and late bonus remain spring rides. Two existing ground gems frame the snow-side approach and return; the main route still finishes without this hop.

| Existing reward | Before | After |
| --- | --- | --- |
| `frost-bonus-2` | x4865, y71 (115px above the spring flat) | x5160, y107.52 (60px above the snow climb) |
| `frost-gem-17` | x5150, ground lift18 | x5100, ground lift18 |
| `frost-gem-18` | x5390, ground lift18 | x5250, ground lift18 |

The 39 gem IDs (36 ordinary gems and three bonuses), zero-star total, finish/start, all terrain coordinates, six ice patches and their friction, six snow runouts, checkpoints, springs, hazards, slimes/patrols, decorations and controls are unchanged. In particular, lake ice ends at 4450, and its 600px flat snow runout ends at 5050. The choice begins beyond that runout; no extra braking or jump is required on ice.

[Before layout data](before.json), [after layout data](after.json) and [layout diagram](layout.svg) are static authored-data evidence exported from the actual level module at base `a958aeb48c1d9469b7da22bcb227c42c5caf7f84` and this working tree. The diagram is not a rendered gameplay observation.

## Input and safety verification

`tests/frost-exploration.test.ts` uses actual movement/contact code with no engine changes. Bounded local fixtures begin on snow at x5055 and use horizontal-right input, press jump at x5060, 5080, 5095, 5110 or 5120, hold it for 36 frames (0.6s at 60Hz), and brake to stop near 5245. All five collect the bonus without a spring, damage or recovery, land between 5160 and 5300, and stop between 5220 and 5290 on snow. The nearest slime's unchanged patrol starts at 5340; contact reach begins at 5322, beyond these stopping positions. These are deterministic movement results, not browser or human-play observations.

The same movement without a jump does not earn the bonus. The two framing gems remain reachable while grounded. A route from the real start finishes without the optional hop; the existing no-damage slime-avoidance route still passes. The full-route spring-input regression now adds an explicit snow-climb jump at 5090 and retains its assertion that all three bonuses are earned. Actual collected rewards also survive both fall and depleted-health recovery at the existing snow checkpoint; the checkpoint is activated through ordinary movement rather than assigning its ID.

## Local validation

- `npm ci`: passed, no audit vulnerabilities reported.
- `npx vitest run tests/frost-exploration.test.ts tests/biomes.test.ts tests/biome-gameplay.test.ts --maxWorkers=2`: 22 passed. Final focused rerun after the additional unchanged-entity assertion: 16 passed across the two affected gameplay files.
- `npm test -- --maxWorkers=2`: 714 passed across 39 files (40.12s measured first full run).
- `npm run typecheck` and `npm run build`: passed; production bundle `index-C5tMfAJU.js`.
- Browser screenshots and native input review: coordinator-owned and pending at this handoff; this document makes no browser-play claim yet.

## Browser review handoff

Use FROST RIDGE. Suggested capture poses: lake runout x4970 (unchanged flat), approach x5070, airborne pickup x5150-5175, snow return x5250, then existing checkpoint 5600 and finish 11100. A full-speed route can press jump around 5090 and hold through ascent to collect the middle bonus; a cautious player can stop beyond 5050 and use the same ordinary hop. First/late spring bonuses use the existing held-jump spring controls. Verify HUD count changes, visible gem/readable landing, replay reset and native recovery through the normal game input path. Keep snow-runout screenshots visibly distinct from the optional climb.

Owner playtesting and enjoyment assessment remain pending; the owner plans to play the combined trails in the morning.

## Executed native browser validation (2026-10-15)

[Observed records](native-browser.json) retain baseline/candidate identity, engines, counters, replay and recovery events. Chromium 153.0.8010.12 completed the easy and optional routes at 36 and 37 gems respectively. WebKit 26.6 completed the optional route at 37 gems. Every candidate journey replayed at X60 with zero gems, and reported no page errors. These are route outcomes, not claims to collect every reward.

At snow-return, easy/optional Chromium gem counters were 19/20; WebKit optional was 20. The targets still drew on the walking route and had ceased drawing while still in the viewport after both optional routes.

The optional gem is visible above snow, clear of the HUD and tree. Henry returns grounded before the unchanged patrol. Ice patches, friction and snow runouts are exactly unchanged; model tests establish the broader launch tolerance and safe landing bounds.

Inspected desktop/native and 320px evidence: [before-snow-approach.png](before-snow-approach.png), [after-snow-approach.png](after-snow-approach.png), [after-snow-approach-320.png](after-snow-approach-320.png), [before-snow-return.png](before-snow-return.png), [after-snow-return.png](after-snow-return.png), [after-snow-return-320.png](after-snow-return-320.png). [Chromium finish](finish-chromium.png) and [WebKit finish](finish-webkit.png) are retained. WebKit also captured426px views.

Observed recovery counts: baseline partial journey 0; Chromium optional 0; Chromium easy 1; WebKit optional 0. Exact events remain in JSON. A recovery elsewhere on a scripted route is retained as observed; no damage-free route claim is inferred from missing page errors. Model/unit checks separately establish safe local pickup/landing and earned-reward recovery contracts.

Independent source/test review found no blocking issues. The required normal Linux CI check must pass all three engines on the exact final PR head before merge. Windows Firefox was not relaunched after its previously recorded host activation failure. Owner playtesting and enjoyment acceptance remain pending; keep #171 open.

## Updated-main verification (2026-10-15)

The combined candidate passed 739 unit tests across 41 files (40.94 seconds), typecheck and build. Rebasing onto merged main `3befe61b8c4a60f3840fd9ebde56e09b22343e8f` produced exactly the same Git tree as that tested candidate before this evidence note; runtime and test content are unchanged. The production bundle remains `index-BM3LqJ0h.js`. Independent review continuity passed; normal exact-head Chromium/Firefox/WebKit CI is required before merge.
