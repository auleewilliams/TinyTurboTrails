# Sunset Site exploration and pacing (#171)

Sunset keeps its girder-stair introduction, crane ferry, paired hazards, four spring pits and final construction run. One later approach becomes a gentler ramp with a separate optional workbench hop; a quiet yard gem group provides a pause between patrols.

## Authored changes

| Area | Before | After |
| --- | --- | --- |
| Scaffold approach | 6900,170 → 7000,146 → 7100,146 → 7200,126 | One 300px ramp, 6900,170 → 7200,126; slope 0.147 instead of local 0.24/0.20 climbs |
| Optional scaffold gem `site-bonus-005` | x7355, y81, between deck hazards | x7000, y91.333; 64px above the new ramp, away from hazards |
| Scaffold approach/return gems `039`/`040` | x6960 / x7150 | x6940 / x7070, both within the walking pickup window |
| Quiet yard gems `021`/`022`/`023` | x3600 / x3900 / x4050 | x3690 / x3750 / x3810, between the existing slime patrols |

All 62 gem IDs remain (56 main, six bonus), with zero stars. The seven checkpoints, all hazards/slimes/springs, four pits, ferry geometry, first girder stairs and other five trails remain unchanged. Existing scaffold scenery stays grounded on the revised ramp. No new controls, signs or engine systems are introduced.

[Static before/after layout](layout.svg) and [source-derived coordinate data](layout.json) compare against base `a958aeb48c1d9469b7da22bcb227c42c5caf7f84`. These diagrams are authored-source evidence, not screenshots or observed play.

## Executed deterministic validation

- `npm ci`: installed lockfile dependencies successfully.
- `npm test -- --maxWorkers=2`: **712 passed**, 39 files (40.17 seconds, measured local wall duration).
- `npm run typecheck`: passed.
- `npm run build`: passed; production script `index-D1RdCQc6.js`.
- Focused Sunset suite: **72 passed**, including the six existing bonus-and-finish routes, main-route finish, ferry crossing and each pit's recovery.
- New integration fixtures use real `simulatePlayer` / `stepEntities` input and contact behavior. Held-right jumps beginning at x6938, x6950 and x6962 all earn the moved bonus, then land between x7000 and x7150. No spring, damage or recovery occurs. Braking at x7150 stops before x7200, leaving at least 120px to the first deck hazard at x7320.
- Walking from x6880 traverses the revised ramp without jumping, damage or collecting its bonus. The existing full-route main pilot also finishes without that bonus.
- The three yard gems are reachable together on foot without damage; their anchors remain more than the 18px contact distance outside both patrol ranges.
- Actually earned workbench gems survive both fall and depleted-health recovery at the unchanged x6850 checkpoint.
- Static contract assertions preserve all gem IDs/counts, checkpoint positions/heights, hazards, springs, pit spans and ferry parameters. The source diff changes only Sunset.

These are executed model/unit checks. They do not establish browser rendering, visual readability or enjoyment. Browser validation and screenshots are owned by the parent task and must be added before final review. Owner playtesting of these changes has not occurred.

## Browser QA handoff

Use the ordinary full-route Sunset input pilot, with its existing danger jumps and automatic spring launches. To collect the relocated optional gem, press and hold jump at x6950 while continuing right (tested launch tolerance ±12px), retaining jump for about 40 frames / 0.67 simulation seconds. Release after the hop. The normal danger jump at approximately x7210 still handles the unchanged deck at x7320/x7390. Do not retain the old optional trigger x7255.

Suggested native-clock capture poses: yard approach x3660 and group x3750; scaffold checkpoint x6850; workbench approach x6920 (gem still present); optional jump near x7000; landing near x7090; deck approach x7190; finish. A separate ordinary route should skip the workbench hop and still finish. Compare before/after at the same x6920 pose to show the two-step climb becoming a ramp and the reward moving before the hazard pair. Recovery should return to checkpoint x6850 with earned gem count unchanged or increased, never reduced.

No browser session or local server was launched by the Sunset implementation agent. Local Firefox's existing Windows launch limitation remains for parent/CI reporting; no attempt to repair it was made here.

## Executed native browser validation (2026-10-15)

[Recorded observations](native-browser.json) distinguish the unchanged baseline preview from this candidate. Chromium153.0.8010.12 completed both the easy route (53/62gems) and optional-hop route (54/62gems), then replayed atX60 with zero gems. WebKit26.6 completed the optional route (52/62gems) and fresh replay. All three completed candidate journeys reported no page errors. Their differing totals are observed route outcomes, not a claim to collect every gem.

At the workbench return nearX7159, Chromium had38gems without the hop and39with it. The WebKit hop also reached39there. The render probe still observed the optional gem on every frame after the walking route (last seen7ms earlier); after WebKit's hop it had ceased drawing over1.2seconds earlier while its position was still in the viewport. Henry was grounded on the safe ramp before the unchanged hazard deck.

Inspected [baseline](before-scaffold.png), [candidate](after-scaffold.png), [320px view](after-scaffold-320.png) and [grounded return](after-workbench-return.png). The high optional gem is distinct from the ground pair, clear of the HUD and scaffold bush; the gentler ramp remains continuous. Native426px and small320px captures were taken in WebKit. Finish screenshots are retained for [Chromium](finish-chromium.png) and [WebKit](finish-webkit.png).

The baseline journey to the scaffold recorded two recoveries at unchanged hazards. Completed candidate journeys recorded two (Chromium easy), three (Chromium optional), and two (WebKit optional); exact events are retained in the JSON. These are input-pilot observations, not damage-free route claims. No recovery occurred during the optional workbench pickup/return itself; WebKit later recovered at the original deck hazards before finishing. Deterministic tests separately establish the forgiving local jump bounds.

Local Windows Firefox was not launched again after its previously recorded host activation failure. Required normal Linux CI must exercise all three browser projects on the final PR head before merge. Source/test review by another implementation worker found no blocking issues. Owner playtesting and enjoyment acceptance remain pending; #171 stays open.
