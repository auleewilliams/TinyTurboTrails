# macOS release verification — issue #8

## Result: certification remains blocked

After integrating checkpoint fix #41, the production build, **57 unit tests**
and **57 browser checks** pass on this Mac. The original pre-fix run below
passed 48 unit tests and 54 browser checks; both candidates' evidence is retained.
Supplemental keyboard runs finish in every bundled engine. The user reports
successful physical-controller/audio checks in the Codex in-app browser.
These results do **not** complete the required current/previous-major native
Chrome, Firefox and Safari matrix. Keep #8 open: Henry's background, route
duration and remaining manual coverage still block certification. #26 has been
fixed and retested; see the final section.

Eight new findings were filed separately. This change contains verification
evidence, not game fixes. The [earlier Linux report](RELEASE-VERIFICATION.md)
remains historical evidence.

## Original candidate and environment

- Date: **2026-09-16 Australia/Brisbane**; JSON execution timestamps use **2026-09-15 UTC**.
- Candidate: `2a5c496f2cb14ca388d9a9ce4d5183edfce750ea`, `origin/main` at worktree creation.
- Branch: `codex/issue-8-release-verification`.
- Host: macOS **26.6.2 (25G83)**, **arm64**; Node **22.23.2**, npm **10.9.8**, Playwright **1.63.0**.
- Production URL: `http://127.0.0.1:4173/?scene=adventure`; append `&debug=1` for position telemetry.
- Prerequisites #6 and #7 were closed and integrated before this run.
- Testers: agent-operated Playwright checks/visual inspection and separately identified user reports.

The new worktree used the existing npm cache. This is an isolated checkout,
not clean-machine or network-install verification. Preview served its fresh build.

## Original automated results

| Command | Result |
| --- | --- |
| `npm ci --offline` | Pass; 45 packages installed |
| `npm test` | Pass; 48 tests in 10 files |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; TypeScript and Vite |
| `npm run test:browser -- --workers=2 --reporter=json` | Pass; 54 passed, 0 skipped, 0 failed, 0 flaky |

| Bundled browser on macOS | Cases | Input |
| --- | --- | --- |
| Chromium **153.0.8010.12** | 18 passed | Automated keyboard/pointer; simulated standard gamepad |
| Firefox **155.0** | 18 passed | Automated keyboard/pointer; simulated standard gamepad |
| WebKit **26.6** | 18 passed | Automated keyboard/pointer; simulated standard gamepad |

All three native AudioContext probes passed. This establishes audio-clock and
synthesis operation; audible output is supported separately by the user report.
Fresh WebKit execution resolves the previous host's launch limitation, but does
not establish installed Safari compatibility. Many assertions check state, not
artwork: the visual defects below coexist with passing tests.

Per-case outcomes: [browser report](evidence/2026-09-16-macos-browser-results.json).
An initial sandboxed invocation could not start preview and executed zero tests.
The successful run used permitted localhost server/browser launches.

## Supplemental production audit

After building and starting preview, run the [audit script](evidence/macos-release-audit.mjs):

```sh
node docs/evidence/macos-release-audit.mjs /tmp/ttt-release-audit
```

It observes canvas text/draw calls and drives keyboard events without mutating
game state or the bundle. Gamepad polling returns no devices to isolate this
keyboard audit from concurrent physical playtesting. Wall-clock timings include
polling/screenshot overhead. Timed inputs are not frame-identical across browsers;
different gem totals alone do not establish nondeterministic simulation.

An earlier exploratory attempt allowed gamepad polling during the user playtest.
Chromium paused, stopped moving and did not finish its jumping route within the
budget. The [failed-attempt summary](evidence/2026-09-16-macos/exploratory-attempt.json)
is retained. Concurrent controller input is a plausible cause, not proven
attribution. All three engines completed the isolated-keyboard rerun.

| Observation | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Hold Right, no jumps | Finish: 11.061 s, 0 gems | Finish: 11.030 s, 0 gems | Finish: 11.017 s, 0 gems |
| Route with jumps | Finish: 11.742 s, 3 gems | Finish: 12.463 s, 3 gems | Finish: 12.425 s, 4 gems |
| Grounded crossing of each checkpoint | HUD stays `CHECKPOINT START` | Same | Same |
| Replay, then start | `GEMS 0`, `CHECKPOINT START`, X=48 | Same | Same |
| Reload after 1 gem + meadow checkpoint, then start | `GEMS 0`, `CHECKPOINT START`, X=48 | Same | Same |
| Close after 1 gem + meadow checkpoint; reopen in same context, then start | `GEMS 0`, `CHECKPOINT START`, X=48 | Same | Same |
| localStorage/sessionStorage keys during reset probes | Empty | Empty | Empty |
| Art-preview source cells exercised | All 16 | All 16 | All 16 |
| Uncaught/console errors, failed requests, HTTP errors | None observed | None observed | None observed |
| Requests on adventure/art audit routes | Local document, JS/CSS, manifests and images only | Same | Same |

Full observations: [audit JSON](evidence/2026-09-16-macos/audit.json). Each engine
reaches horizontal speed 220. No progression snag was observed on these forward
traversals. This does not certify every collision boundary, reverse traversal,
hidden route or checkpoint recovery. Static inspection found only local manifest
fetches and no browser-storage, runtime-generation or API-key dependency in `src/`.

A separate reproduction starts the adventure and presses Escape twice:
`canvas.getContext('2d').textAlign` changes **left → center** in all three engines.
See [pause-state evidence](evidence/2026-09-16-macos/pause-hud.json) and the
[clipped HUD](evidence/2026-09-16-macos/chromium-pause-resume-hud.png).

## Physical controller — user report

The user tested the same preview in the **Codex in-app browser** with an **Xbox
controller over Bluetooth**, reporting “They all work really well.” This is
user-reported evidence, not an independently recorded session.

| Requested scenario | User-reported result |
| --- | --- |
| Primary-button start/jump | Pass |
| Stick and D-pad movement | Pass |
| Start pause/resume | Pass |
| Disconnect/reconnect | Pass |
| Finish/replay | Pass |
| Audible music/effects | Pass |

Exact Xbox model/firmware, embedded-browser version, display configuration and
audio output device were not supplied. Individual effects were not identified
separately. This does not count as a native-browser matrix row or establish
child-specific timing/clarity.

## Defects and triage

This table retains the initial findings. #26 was subsequently closed and
retested below; #42–#49 remain open. **Blocking** means blocking certification,
not necessarily preventing completion of the level.

| Issue | Triage | Evidence and required retest |
| --- | --- | --- |
| [#26 — Ground checkpoints](https://github.com/auleewilliams/TinyTurboTrails/issues/26) | Initially blocking; **fixed and retested** | Original grounded crossings left HUD at START. [PR #41](https://github.com/auleewilliams/TinyTurboTrails/pull/41) merged during this audit. See final retest below. |
| [#42 — Henry checkerboard](https://github.com/auleewilliams/TinyTurboTrails/issues/42) | **Blocking** | Opaque backdrop in idle/run/jump/fall and celebration. Inspect every frame on contrasting backgrounds. |
| [#43 — Left-facing Henry](https://github.com/auleewilliams/TinyTurboTrails/issues/43) | Non-blocking | Negative velocity still draws right-facing frames. Retest both directions, including airborne changes. |
| [#44 — Collected gems remain visible](https://github.com/auleewilliams/TinyTurboTrails/issues/44) | Non-blocking | Count updates, but static renderer still draws the gem. Retest collection, revisiting, recovery and replay. |
| [#45 — Route duration](https://github.com/auleewilliams/TinyTurboTrails/issues/45) | **Blocking** | About 11–12.5 s versus roughly 3–5-minute canonical target. Validate typical child-paced play after tuning. |
| [#46 — HUD after pause](https://github.com/auleewilliams/TinyTurboTrails/issues/46) | Non-blocking | Center alignment leaks from pause overlay and clips HUD. Retest pause/resume and focus recovery visually. |
| [#47 — Scenery/slime anchors](https://github.com/auleewilliams/TinyTurboTrails/issues/47) | Non-blocking | Trees/slimes float above ground. Retest anchors and collision relationships separately from #26. |
| [#48 — Terrain seams](https://github.com/auleewilliams/TinyTurboTrails/issues/48) | Non-blocking | Thin vertical cracks while scrolling. Inspect all joins in both directions at different scales. |
| [#49 — Finish composition](https://github.com/auleewilliams/TinyTurboTrails/issues/49) | Non-blocking | Bouncing Henry overlaps subtitle. Inspect a full cycle at several sizes/gem totals. |

Screenshots directly support Chromium visual failures; equivalent draw/state
observations elsewhere are identified in individual issues. Do not infer that
every visual defect was independently reviewed in every browser. The only
post-fix retest in this report is the integrated #26 fix described below.

## Manual coverage and remaining matrix

Statuses below describe the original candidate and follow the
[manual worksheet](RELEASE-MANUAL-CHECKLIST.md). The final retest updates scenario
8 for bundled-engine activation and simulation recovery. Partial evidence does
not substitute for a complete manual run per target.

| Scenario | Status for this run |
| --- | --- |
| 1. Install/build/launch | Partial: cached install and production launch pass; fresh-machine setup and dev launch not repeated. |
| 2. Controls | Partial: automated cases and reported controller test pass; native matrix pending. |
| 3. Mute/audio | Partial: automated cases pass; user reports audible audio; per-effect/native-browser listening pending. |
| 4. Resize/clarity | Partial: suite passes; 320×200 screenshot captured; full display/scaling review pending. |
| 5. Focus/pause/disconnect | Fail visually: #46. Automated behavior and reported reconnect pass. |
| 6. Easy route/duration/age | Route finishes; duration mismatch #45. Child-specific playtest not run. |
| 7. Speed/collisions/camera | Partial: forward full-speed route finishes; seam #48; exhaustive reverse/boundary review pending. |
| 8. Checkpoints/recovery | Fail: #26. Ground crossings reproduced in all engines; production recovery at each checkpoint not run. |
| 9. Hidden/optional routes/springs | Partial: jumping route collects elevated gems and traverses spring regions; exhaustive reachability/return and both spring responses not individually certified. |
| 10. Animation/art/hazards | Fail: #42, #43, #47, #48. All 16 cells exercised and atlas visually inspected; complete readability review pending. |
| 11. Finish/replay | Behavior passes; visual defect #49. |
| 12. Reload/close progress | Pass for bundled-engine probes after real gem/checkpoint acquisition. |
| 13. Console/network | Pass for observed supplemental adventure/art routes. |

| Required native browser | Keyboard manual matrix | Physical-controller manual matrix |
| --- | --- | --- |
| Current stable Chrome | Not run | Not run |
| Preceding-major Chrome | Not run | Not run |
| Current stable Firefox | Not run | Not run |
| Preceding-major Firefox | Not run | Not run |
| Current stable Safari on macOS | Not run | Not run |
| Preceding-major Safari on macOS | Not run | Not run |

Establish exact native target versions when those runs are performed. Bundled
engines cannot fill these rows. Close #8 only after the matrix is executed,
blocking findings are resolved and affected scenarios pass on integrated fixes.

## Selected screenshots

- [Title](evidence/2026-09-16-macos/chromium-title.png)
- Ground crossings: [meadow](evidence/2026-09-16-macos/chromium-no-jump-checkpoint-570.png), [hillside](evidence/2026-09-16-macos/chromium-no-jump-checkpoint-1220.png), [cave](evidence/2026-09-16-macos/chromium-no-jump-checkpoint-1780.png)
- [Collected gem](evidence/2026-09-16-macos/chromium-collected-gem.png), [progress before reload](evidence/2026-09-16-macos/chromium-before-reload.png)
- [Leftward](evidence/2026-09-16-macos/chromium-facing-left.png), [rightward](evidence/2026-09-16-macos/chromium-facing-right.png)
- [Art](evidence/2026-09-16-macos/chromium-art-3.png), [small window](evidence/2026-09-16-macos/chromium-small-viewport.png)
- Finish: [Chromium](evidence/2026-09-16-macos/chromium-no-jump-finish.png), [Firefox](evidence/2026-09-16-macos/firefox-no-jump-finish.png), [WebKit](evidence/2026-09-16-macos/webkit-no-jump-finish.png)

## Integrated checkpoint fix — final retest

[PR #41](https://github.com/auleewilliams/TinyTurboTrails/pull/41) merged at
**2026-09-15 20:04:25 UTC**, closing #26. This worktree was rebased onto runtime
commit `c46aaa2065ab5c649a73be06da81151ac63e6e3f`. The retest ran at documentation
commit `4ad2732d25def8c19f31c0bd8d514637d8b31249`, with no further runtime changes.
OS, Node/npm and browser versions are unchanged from the original run above.

| Check | Fresh result after integration |
| --- | --- |
| `npm test` | **57 passed in 11 files** |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; new production JS `index-DXd_UZOO.js` |
| `npm run test:browser -- --workers=2 --reporter=json` | **57 passed, 0 skipped, 0 failed, 0 flaky**; 19 per engine |
| New grounded-checkpoint browser test | Pass in Chromium, Firefox and WebKit; rendered HUD and contact height checked for all three checkpoints |
| Marker visual inspection | All three marker bases inspected in each engine's screenshots; planted at terrain, including hillside |
| All-checkpoint recovery simulation | Pass: forced out-of-level position/velocity, recovery feet at actual terrain, zero velocity, preserved gem and valid ground contact after another simulation step |
| No-jump production route | Pass in all engines; sequential HUD activation of meadow, hillside and cave |
| Jumping route / finish / replay | Pass in all engines |
| Reload and close/reopen after real gem + checkpoint acquisition | Pass in all engines: fresh run at X=48, 0 gems, START checkpoint |
| Supplemental route errors/network | No uncaught/console errors, failed requests or external requests |

Recovery evidence is explicitly a simulation test calling `recoverFromFall`,
not a natural fall or forced fall inside the production browser. The browser
cases verify grounded activation and placement. The user controller playtest
was on the original candidate and was not repeated after #41.

The supplemental rerun uses a grounded acquisition path for the now-grounded
meadow marker; the default mode retains the original floating-marker probe:

```sh
node docs/evidence/macos-release-audit.mjs /tmp/ttt-checkpoint-retest --grounded-checkpoints
```

| Bundled engine | No-jump completion | Jumping completion |
| --- | --- | --- |
| Chromium 153.0.8010.12 | 11.006 s | 11.734 s |
| Firefox 155.0 | 11.007 s | 12.429 s |
| WebKit 26.6 | 10.997 s | 11.795 s |

The duration concern remains. #42–#49 remain unresolved, and the native-browser
matrix above remains unexecuted. This retest removes #26 from the open blocker
list; it does not certify the release.

Evidence: [per-test browser report](evidence/2026-09-16-checkpoint-retest/browser-results.json)
and [compact supplemental observations](evidence/2026-09-16-checkpoint-retest/audit-summary.json).
The compact file retains all route samples, checkpoint HUD states, reset probes
and network/error observations; redundant canvas draw calls are omitted.

| Engine | Meadow | Hillside | Cave |
| --- | --- | --- | --- |
| Chromium | [Image](evidence/2026-09-16-checkpoint-retest/chromium-checkpoint-meadow.png) | [Image](evidence/2026-09-16-checkpoint-retest/chromium-checkpoint-hillside.png) | [Image](evidence/2026-09-16-checkpoint-retest/chromium-checkpoint-cave.png) |
| Firefox | [Image](evidence/2026-09-16-checkpoint-retest/firefox-checkpoint-meadow.png) | [Image](evidence/2026-09-16-checkpoint-retest/firefox-checkpoint-hillside.png) | [Image](evidence/2026-09-16-checkpoint-retest/firefox-checkpoint-cave.png) |
| WebKit | [Image](evidence/2026-09-16-checkpoint-retest/webkit-checkpoint-meadow.png) | [Image](evidence/2026-09-16-checkpoint-retest/webkit-checkpoint-hillside.png) | [Image](evidence/2026-09-16-checkpoint-retest/webkit-checkpoint-cave.png) |
