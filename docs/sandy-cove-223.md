# Sandy Cove route rework (#223)

The approved coastal route replaces the former 10,600 px repeated material runs
with 4,200 px of connected dunes, a palm hollow, two pools and a dry island,
a sheltered bay, and a modest beach viewpoint. Movement, jump/spring physics,
ordinary sand (0.8), shallow water (0.65), and session-only progress are unchanged.
There are 42 gems, no stars, and the existing four SAND pickup identities.

## Route and recovery

| Beat | Geometry and choices |
| --- | --- |
| Arrival / dunes | Firm start at (60, 360); short sand at 75–105 and 520–600; S at the first crest, x280. |
| Palm hollow | Walkable floor at y368; A on the fixed x980–1120, y320 shelf. Walking beneath leaves A uncollected. |
| Pools / island | CP1 x1320; water x1660–1860 and x2200–2500; optional fixed stones; N x2000 and CP2 x2070 on the broad dry island. |
| Sheltered bay | Three optional fixed upper ledges, one spring at (3420, 272), and an independent lower shoreline with water x3040–3220. Both ends reconnect. |
| Viewpoint | CP3 x3660; D x3850; broad resting/retrace position (4030, 200), before the arch at x4140. |

Every platform is stationary and one-way. Scenery remains pass-through. There
are no new water mechanics, crumbling supports, or compulsory spring launches.
The previous Cove slimes are retired so their patrols cannot obstruct banks,
checkpoint footprints or optional landing/retry zones.

The spring uses the existing separation/contact behavior: ordinary input can
steer onto clear standing space and jump back across it. Returning hands-off to
the spring can launch again; this change adds no intent lock. The discovery
pilot counts setup, launch, landing, settling and repositioning together, then
checks for extra launches outside the three intentional attempts. Its negative
control deliberately lands on the spring and requires an actual second launch.

Finish activation requires grounding at the viewpoint inside x4140–4170. Return
places Henry at x4030 with zero motion and disarms the finish. Walking through
the whole trigger band while disarmed leaves play active. Leaving to x3960 or
below y250 re-arms it for deliberate re-entry. The existing results-first,
manual word activity and final-trail Map flow remain in place.

## Coverage purpose ledger

The configured suite has 570 native identities: 546 of the original 549 remain,
three obsolete Cove patrol identities are explicitly retired, and 24 new Cove
identities are added. The applicable live-slime cases retain their original
45-second limits, atlas, patrol, movement and Pause assertions. No viewport,
engine, retry, guard or assertion policy is weakened. Configured discovery is
separate from local execution and coordinator-owned full CI.

| Existing identity / fixture | Disposition and preserved purpose |
| --- | --- |
| `cove trail renders its material, completes and replays` | Reanchor sand probe x420→560 and water x1000→1750, retain 176/143 caps, actual completion, final Map default and same-trail Replay. Pause observes the actual frozen status after Cove retires its creature. |
| `all-trail spelling cove: input-only missing-letter retrace, manual assembly and session sticker` | Explicit Cove route dispatch using the existing bounded input protocol. Retain 426/320/1366 captures, actual finish, partial assembly, controller/native focus, generated art/glyph guards, re-entry, Map/session and reload checks. |
| `all six trail previews show cached gameplay and the map requests no story artwork` | Retained for all six destinations; added an actual cached Cove source-canvas/stone/framing witness. |
| `compact HUD renderer fixture: cove identity marks and real glyph clearance` | Retained with the complete manual-strip import graph, runtime missing-dependency guard, actual assets and glyph bounds. Authored section labels take priority over the old checkpoint-derived names. |
| `landmark labels: renderer fixture cove clears real art, paths, frames, badges and Henry in every completion state` | Retained in every engine, including complete transitive renderer dependencies and missing-dependency guard. |
| `cove uses the common slime atlas, patrols and pauses in play` | Explicitly retire the three obsolete Cove-only identities listed below: Cove has no live slimes. The existing Plains case and every other applicable trail's live atlas/patrol/Pause case retain their purpose. The shared atlas case still checks all six accessory cells, including Cove's snorkel. |
| `controller damage rumble is independent of audio and stops on pause, focus loss and disconnect` | Unchanged Plains orchard fixture: real movement/health contact, duration 100 ms, strong .55 / weak .3, mute independence, Pause/focus/disconnect and neutral polling. |
| Shared Pause/native focus/held confirmation/neutral input and all-six selection cases | Retained unchanged; focused native selection records actual executed identities separately. |
| `cove-exploration.test.ts` original six-spring/six-CP and fixed-coordinate low-find fixtures | Replaced stale layout expectations with stable 42 IDs, firm start + three CP, unchanged short materials, no-jump bypass/replay at three cadences, both low finds and all rewards in one journey, every real union-edge miss in both directions/cadences, bank exits/rejoins/retries, spring count/negative control and retained recovery. Original source/tests and raw baseline observations are retained outside the checkout. |
| `biome-gameplay.test.ts` moving-creature Pause/replay case | Reanchor to the existing Plains orchard slime after Cove retires its slimes. Keep real patrol advance, frozen clock and reset position. Other Cove checks retain actual finish/replay and now collect all 42 through its explicit discovery route. |
| `all-trails-education.test.ts`, `feedback.test.ts`, `overworld.test.ts`, `biomes.test.ts` | Reanchor Cove shelf input, authored sections, initial vertical camera y222, three checkpoints and retired patrols. Preserve the other trails' cases. |

The exact retired native rows all have file `browser.spec.ts` and title
`cove uses the common slime atlas, patrols and pauses in play`:

| Project | Retired identity |
| --- | --- |
| Chromium | `fbeac1b2decfba2c3acd-f225d9625761fba70150` |
| Firefox | `fbeac1b2decfba2c3acd-75eb8ba0732653421dcd` |
| WebKit | `fbeac1b2decfba2c3acd-ad68afb4705f847c076a` |

The external identity audit requires exactly the original set minus these three,
plus the same 24 additions. It rejects any other removal, substitution, extra
identity or duplicate. Earlier 573/zero-removal claims are superseded historical
records. Their Cove-labelled Plains alias passes do not prove Cove behavior.

The full unit purpose delta is 1837 to 1855: 1824 original identities retained,
13 retired or reanchored, and 31 new or replacement identities. Nine former
`cove-exploration.test.ts` layout fixtures (two low-find approaches, paired low
finds, six-bonus spring route, old no-jump finish, individual reachability,
six-checkpoint/spring/slime totals, reward recovery and third-pool geometry) are
replaced by the current route, reachability, union-edge miss/retry, checkpoint,
material, spring-count and recovery assertions described above. The other four
conditional Cove-only retirements have these explicit purpose mappings:

| Retired conditional unit purpose | Applicable retained or replacement purpose |
| --- | --- |
| `interactions.test.ts`: airborne/swept crossings at every SANDY COVE flag | Approved grounded Cove activation replaces airborne activation; `cove-exploration.test.ts` checks actual activation, earlier reactivation and zero-motion recovery. The other applicable trails retain walking/jumping/swept checkpoint crossings. |
| `obstacle-pass-through.test.ts`: SANDY COVE slime-side damage, knockback, flash and protection | No Cove actor remains; the same conditional test keeps actual live-slime trails and all its damage/protection assertions. |
| `slime-squash-scenes.test.ts`: SANDY COVE adventure/preview soft squish | No Cove actor remains; applicable trails retain scene/preview soft-squish, no reward/damage assertions and the shared audio scoring check. |
| `slimes.test.ts`: SANDY COVE common speed, safe patrol and no bounce | No Cove patrol remains; applicable live-slime trails retain speed/safe-bound/no-bounce checks, with global reversal/contact/reset tests and the six-cell atlas/snorkel coverage retained. |

The 31 additions/replacements comprise 21 Cove exploration cases, five Cove
finish/return cases, three Cove route cases, one authored HUD-section case and
one distinct stone-top renderer case. The source-bound complete unit identity
delta is preserved externally in `m8-223-author-primary-readback/unit-identity-delta.json`.

The three manual-strip fixture groups remain: builder/word overlays (movement,
education, tile/loader, interface kit and menu/education overlays); compact HUD
(camera, platforms, movement, education, interface kit, HUD, scenery/assets,
trail presentation, weather, materials and renderer); map labels (the same world
renderer graph plus Henry/animation, rewards and overworld). Their existing
synthetic dependency guards and native glyph/asset checks remain active.

New native Cove journeys cover native/narrow lower travel, all-four/A-only/N-only
actual-finish return and manual SAND assembly, full unarmed trigger-band travel,
standard-controller completion, cached preview, and all 42 gem discoveries.
Simulation tests additionally cover misses past every actual platform edge,
standing and water-reduced takeoffs, cadence variation and recovery retention.

## Evidence and remaining acceptance

Raw baseline, RED/GREEN, failed/interrupted attempts, source/bundle/PNG bindings,
configured identity inventories and executed native JSON live in the task's
external `m8-223-evidence` directory. The worker handoff distinguishes exact
revisions, configured versus executed cases, and historical versus final runs.
The 75 native executions on 9bcde2a, six on ba3b2af, and coordinator's 81 on
ba3b2af remain historical executions on those revisions. The bounded honesty
correction records its fresh affected-scope execution separately in
`m8-223-honesty-fix-evidence`; it does not relabel old runs as current-head proof.
Existing dated certification/waiver worksheets are not rewritten.

Automated completion and visual inspection do not establish owner enjoyment,
clarity, enjoyable wade duration, child or physical-controller acceptance,
hardware/native Safari behavior, or assistive-technology acceptance. Those
owner/manual gates remain open, together with coordinator-owned independent
review, full CI artifact reconciliation, freshness and merge decisions.
