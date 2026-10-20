# Issue 200: phase-sensitive retrace driver

This is test-driver reliability work, not a gameplay change or a new v0.1.0
certification. The release tag remains at
`bee0f7d402395af8d9ed7a4693e6739d9f905607`.

## Original failure, retained separately

[Failed CI run 39239035912](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/39239035912)
at `b56974e621c718c8094de917fc37feed06e9afcc` recorded 334 browser passes,
one skip and one Firefox Plains recovery failure. The original bounded
[recovery-history.json](original-recovery-history.json) is copied unchanged in
meaning from that run's `browser-test-results` artifact 12180724685,
`browser-all-trail-spelling-1898b-ssembly-and-session-sticker-firefox/recovery-history.json`.
It shows the second rightward return descending through (3497,146), (3501,154),
(3505,162), a fresh jump only at the last observation, then recovery to (2422,164).
The original trace shows one remaining heart. Precise velocity, actual grounded
state and slime position at contact were not recorded; these are NOT reconstructed
historical values.

Ground here is y198. The pilot's feet-within-4px heuristic can request a jump
while still descending. Production movement checks jump eligibility before
landing; a buffered jump cannot prevent that same step's side contact. Braking
an unheld airborne approach makes room to land and then jump. The held-time
guard preserves forward input during deliberate jumps. No terrain, damage,
player movement, assertion, timeout, retry or traversal budget is changed.

Untouched main `4d3e9debdf0935cf8632b5284f88277750f8b48e` passed
[CI 39234987518](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/39234987518).
Unchanged local Firefox repeats passed 6/6 on main and 10/10 on the original
PR head. Those controls show nondeterminism, not an infrastructure explanation.
The pre-fix main and PR driver bodies are identical.

## Portable deterministic regression

```sh
npm ci
npm test -- tests/retrace-pilot.test.ts
```

`tests/retrace-pilot.ts` is the actual self-contained init script installed by
Playwright, extracted without behavioral changes from the already-present fix
`d97d20348a2f817fb47505532a145645b3f9f66c`. The Vitest test executes that same
function in an isolated realm, delivers its keyboard events through an explicit
adapter, and calls unchanged production `simulatePlayer`, `tickRun`,
`stepEntities` and `advancePatrols` with real Plains data. Canvas draws, debug
status and RAF are adapters, not a native renderer or real browser event replay.
The separate all-trail Playwright cases remain the end-to-end evidence.

Fixture: x3374, grounded y164, vx220, checkpoint-hillside, no previous spring
contact, direction +1, 1 or 3 hearts. Advance production patrols 0..599 steps at
1/60 second before approaching spring-002/slime-006. Each approach has a
400-physical-frame bound and must cross x3610 with no damage or recovery.
This explicit starting phase demonstrates the mechanism; it is not an exact
replay of the missing historical CI state. Ninety bounded test batches cover
600 phases at each health value plus 600 initially held-jump phases, without
raising any existing test deadlines.

### RED / GREEN and guard sensitivity

[phase-results.json](phase-results.json) retains the prior same-code phase sweep
and new portable-test mutation totals. Measurements used Linux, Node v22.22.1,
locked Vitest 5.0.4 / Playwright 1.64.0 (npm 9.2.0).

| Driver / fixture | Phases | Damage | Recoveries | Crossings |
| --- | ---: | ---: | ---: | ---: |
| Original, 1 heart, unheld | 600 | 106 | 106 | 494 |
| Fixed, 1 heart, unheld | 600 | 0 | 0 | 600 |
| Original, 3 hearts, unheld | 600 | 106 | 0 | 600 |
| Fixed, 3 hearts, unheld | 600 | 0 | 0 | 600 |
| Original or fixed, initially held | 600 each | 0 | 0 | 600 each |

To repeat the sabotage checks, temporarily edit only the braking statement in
`tests/retrace-pilot.ts`, run the command above, then restore it:

1. Remove `if (nearSlime && !onGround && time >= pilot.jumpUntil) horizontal = 0;`.
   The real original pilot gives 37 failed / 53 passed batches (exit 1), including
   phase30 damage/recovery; it is not a compile or timeout failure.
2. Replace that statement with `if (nearSlime && !onGround) horizontal = 0;`.
   Run `npm test -- tests/retrace-pilot.test.ts -t 'preserves held'`.
   All 30 held-input batches fail (exit 1; 60 other batches filtered).
3. Restore the guarded statement: all 90 batches pass (exit 0).

Historical-like mechanism sample, phase30 (rounded seam measurements, NOT
historical trace coordinates):

| Driver / step | x | y | vx | vy | Grounded | Slime x |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Original, last unheld descent | 3506.000 | 161.551 | 220 | 476 | false | 3540.600 |
| Original, first pressed step lands | 3509.667 | 164.000 | 220 | 0 | true | 3540.000 |
| Original, later pre-contact damage | 3520.667 | 140.618 | 220 | -435 | false | 3538.800 |
| Fixed, first braking step | 3483.667 | 120.826 | 200 | 326 | false | 3544.200 |
| Fixed, first pressed step lands | 3498.172 | 164.000 | 90.333 | 0 | true | 3540.000 |

The damage row's slime x is captured before `stepEntities` advances patrols;
ordinary frame rows record it after stepping. Original damage recovers to
x2422/y164; fixed crosses without damage. These values come from the earlier
same-code probe at d97d203 and are not additional native-browser telemetry.

Crossing alone did NOT distinguish the unconditional-braking mutant: it also
crossed all 600 initially held fixtures. The new held-input assertion observes
actual emitted forward input during deliberate airborne near-slime approaches
and kills that mutant. This proves the input-preservation contract at this seam,
not that unconditional braking inevitably causes a recovery in native browsers.
Initial monolithic sweeps exceeded Vitest's default 5s deadline; splitting into
20-phase cases solved that without changing deadlines or reducing phase coverage.

## Browser and final-head verification

The existing fix passed [full CI 39320485148](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/39320485148)
at exactly `d97d20348a2f817fb47505532a145645b3f9f66c`: 863 unit tests,
335 browser passes / one named pre-existing skip. Its artifact 12221782555 has
all 18 trail/engine route-result records, all with empty recoveries and errors.
This is prior-head evidence, not a claim about a later regression commit.

Final regression-commit checks and exact-head full CI are recorded in PR197's
validation comment after pushing. Require its head SHA to match the linked run;
do not treat this prior green run as final-head verification. The six unchanged
route cases retain missing-letter / partial assembly / 4-of-4 retrace / manual
assembly / earned-session-sticker / reload-reset and no-recovery assertions in
Chromium, Firefox and WebKit. PR196's unrelated artwork/replay helper is not a
dependency and needs combined-head checks if integrated later.

## Scope coordination

Issue200 initially requested a separate fix. A writer had already placed the
four-line driver fix on PR197 before this follow-through. The owner explicitly
authorized completing issue200 on that existing PR instead of creating a
competing fix. PR197 therefore includes release documentation AND test-driver
reliability/regression evidence; calling it docs-only is incorrect. No release
tag, application, artwork, workflow or deployment changes are part of this work.
