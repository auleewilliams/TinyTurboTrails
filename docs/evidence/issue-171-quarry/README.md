# Quarry exploration refinement — issue #171

Quarry keeps its existing optional star shelf, slow lift, ferry, spring pits and
crumbling ledges. This change improves two existing rewards rather than adding
another obstacle sequence. It is based on main commit
`a958aeb48c1d9469b7da22bcb227c42c5caf7f84`.

| Existing entity | Before | After | Player-facing purpose |
| --- | --- | --- | --- |
| `quarry-gem-018` | x5480, 18px above ground | x5400, 18px above ground | Ground approach to the mine cache |
| `quarry-bonus-004` | x5500, y75 | Unchanged | Optional tapped-jump cache on the quiet tunnel terrace |
| `quarry-gem-019` | x5950, 18px above ground | x5640, 18px above ground | Ground return before the next slime patrol |
| `quarry-bonus-005` | x7860, y76, over the crusher spring pit | x7200, y158 | Reward the existing optional ferry; a normal jump can also reach it |

[Static layout diagram](layout.svg). This diagram shows authored placements,
not observed browser gameplay. X scales differ between panels.

The 37 gem IDs and three star IDs are preserved. Terrain, starts/finish,
checkpoints, landing bands, hazards, slime patrols, springs, lift/ferry geometry,
crumbling ledges and every other level are unchanged in the source diff. Each of
Quarry's six sections still has one bonus gem; all 31 ordinary gems remain in the
walking pickup window. The star shelf and lift approach are untouched. No reward
is required to finish.

## Executed verification

- `npm ci` — succeeded; 42 packages installed, audit reported zero vulnerabilities.
- `npx vitest run tests/quarry-run.test.ts tests/specials.test.ts --maxWorkers=2`
  — **111 passed** with the final fixtures (measured duration 4.36s).
- `npm test -- --maxWorkers=2` — **709 passed in 38 files**, including the final
  Quarry cases; measured Vitest duration 40.23s on this shared Windows host.
- `npm run typecheck` — passed, including the final fixture changes.
- `npm run build` — passed; production JavaScript `index-A0z396V7.js`.
- `git diff --check` — passed.

These are deterministic simulation/scene tests, not browser or human play
observations. Existing full-route tests still finish with simple hazard jumps,
collect every ordinary gem, use all nine springs and all seven checkpoints, take
fewer than three damage events, and trigger all three crumbling ledges. All six
bonus pickup cases still finish; the former held-jump crusher-pit approach is
retained as a separate traversal regression after its bonus moved.

The local tunnel fixture starts on real ground at x5400, walks right, taps jump
after eight 60Hz updates, and returns to ground near x5640. It earns the approach
gem, cache and return gem without damage. The ferry fixture starts on real ground
at its left dock center x7154 and taps jump whenever grounded until boarded.
It earns the bonus with Henry's feet on the real y176 deck, crosses both crushers,
then walks off the right dock and lands between x7330 and x7460 without damage.
Separate fixtures actually earn each changed approach's bonus before invoking
fall and depleted-health recovery; earned gem sets persist and Henry respawns on
the existing ground checkpoints x5250 and x7000. Those local fixtures explicitly
establish the preceding checkpoint; they do not claim uninterrupted browser runs.

## Browser review handoff

No browser verification or screenshot observation has been performed by this
implementation worker. The parent owns browser sessions and will record named
browser/version, input method, viewport, screenshots and results before review.
The existing Windows Firefox launcher limitation also remains outside this change.

Useful review positions and controls:

- Tunnel approach x5400; optional jump toward x5500; return x5640. The terrace is
  flat from x5400 to x5600, followed by a gentle downhill. The next slime patrol
  starts at x5740; the fixture stops before it.
- Ferry boarding: brake near x7154 (center of the left dock) and tap jump on the
  spot until the deck returns. Release jump once aboard, wait for the bonus at
  x7200, and walk right from the right dock center x7286. Ordinary ground beneath
  the entire ferry is y218; the deck is y176. Safe tested dismount ends before
  x7460, ahead of the next slime's x7500 patrol bound.
- Before/after screenshots should show the tunnel approach/cache/return, the
  ferry bonus and its right-dock landing. Inspect the unchanged star shelf and
  spring pit as part of the normal full-route browser regression.

Owner playtesting of the combined trail changes remains pending.

## Executed native browser validation (2026-10-15)

[Observed records](native-browser.json) retain baseline/candidate identity, engines, counters, replay and recovery events. Chromium 153.0.8010.12 completed the easy and optional routes at 33 and 33 gems respectively. WebKit 26.6 completed the optional route at 33 gems. Every candidate journey replayed at X60 with zero gems, and reported no page errors. These are route outcomes, not claims to collect every reward.

At cache-return, easy/optional Chromium gem counters were 20/21; WebKit optional was 21. The targets had ceased drawing while still in the viewport after both optional routes; per-target walking-route render ages are retained in the record.

At ferry-return, easy/optional Chromium gem counters were 25/26; WebKit optional was 26. The targets had ceased drawing while still in the viewport after both optional routes; per-target walking-route render ages are retained in the record.

The tunnel approach/cache/return group and existing ferry reward are visible in the actual game. Model fixtures establish deck-height pickup and safe right-dock exit; native ferry telemetry is recorded below. Terrain, lift/shelf, checkpoints, dangers, springs and three stars stay unchanged.

Inspected desktop/native and 320px evidence: [before-cache-approach.png](before-cache-approach.png), [after-cache-approach.png](after-cache-approach.png), [after-cache-approach-320.png](after-cache-approach-320.png), [before-cache-return.png](before-cache-return.png), [after-cache-return.png](after-cache-return.png), [after-cache-return-320.png](after-cache-return-320.png), [before-ferry-approach.png](before-ferry-approach.png), [after-ferry-approach.png](after-ferry-approach.png), [after-ferry-approach-320.png](after-ferry-approach-320.png), [before-ferry-return.png](before-ferry-return.png), [after-ferry-return.png](after-ferry-return.png), [after-ferry-return-320.png](after-ferry-return-320.png). [Chromium finish](finish-chromium.png) and [WebKit finish](finish-webkit.png) are retained. WebKit also captured426px views.

Observed recovery counts: baseline partial journey 0; Chromium optional 0; Chromium easy 1; WebKit optional 0. Exact events remain in JSON. A recovery elsewhere on a scripted route is retained as observed; no damage-free route claim is inferred from missing page errors. Model/unit checks separately establish safe local pickup/landing and earned-reward recovery contracts.

Native ferry pickup telemetry: {"x":7251,"y":142,"gems":26,"time":39366.7} (Chromium); {"x":7251,"y":142,"gems":26,"time":39659} (WebKit).

Independent source/test review found no blocking issues. The required normal Linux CI check must pass all three engines on the exact final PR head before merge. Windows Firefox was not relaunched after its previously recorded host activation failure. Owner playtesting and enjoyment acceptance remain pending; keep #171 open.

The [native WebKit ferry image](ferry-riding-webkit.png) records Henry at X7190/Y142: his feet are on the existing deck at176, with26gems after the bonus pickup. Both optional native routes stayed on that deck beyond X7250 and returned grounded nearX7408 before continuing to finish. The JSON field named `ferryPickup` is a later deck observation after the reward crossing, not the exact first-contact frame. The ordinary hazard-clearing jump can also collect this gem, so the ferry remains an optional calm alternative rather than a completion gate. The walking cache route leaves the high cache gem available; its optional hop collects the three-gem group.
## Validation after updating the main base

Updated onto main commit 1059a683e34f4bb70d874946f2766ea3d360405b after Sunset and Plains merged. This combined base plus the focused Quarry change passed 730 unit tests, typecheck and production build. Native evidence above remains the dated per-trail observation; normal exact-head CI validates all three engines on the updated base. The preserved scratch script and baseline JSON remain untracked and excluded.
