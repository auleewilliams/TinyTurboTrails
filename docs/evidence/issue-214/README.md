# Issue 214 — visible Pause and pause settings

The native Pause button replaces the separate gameplay Sound/Rumble controls in
the existing measured rail. The shared pause surface is reachable from trails,
map, results and diagnostic previews. Resume receives native focus; gameplay
restores canvas focus, and map/results restore their selected action. Only a live
run offers Return to Trails, with the existing reset confirmation. Escape/Start
still close the optional word activity before opening Pause.

Sound and controller rumble have independent On/Off labels and actual
`aria-pressed` enablement. The gold plank and `data-selected` identify navigation
selection separately. M remains global. Keyboard keycaps and a neutral four-face
position illustration use the existing bindings; no vendor button lettering or
new movement/device support is implied. Settings and menu actions retain held,
repeat and final-keyup guards. Pausing continues to suspend simulation, HUD time,
audio and rumble without accumulating catch-up time.

The existing approved kit is reused, with code-drawn keycaps/controller positions.
No generated art, new asset, dependency, audio design or persistence was added.
The kit's source/preparation record remains at
[assets/source/interface/preparation.json](../../../assets/source/interface/preparation.json).
[Source hashes](source-hashes.json) identify the final runtime files, Vite bundle
and reused image bytes from baseline `4bdc723ba2a3d303e1ee51d87070f70d3a4c020d`.
[Capture metadata](captures.json) records image dimensions, hashes and cohorts.

## Selected live browser captures

- [Gameplay and visible Pause, 426×240](gameplay-426.png), [1366×768](gameplay-1366.png).
- [Native pause/settings and Resume focus, 426×240](pause-settings-426.png),
  [320×240 with reduced motion](pause-settings-320.png), [1366×768](pause-settings-1366.png).
- [Simulated standard-controller settings and native focus](controller-settings-1366.png).
- [Return confirmation and safe native focus, 360×240](confirmation-360.png).
- [Live results after optional word return, 426×300](word-return-426.png).

These are actual app/browser renders, not renderer fixtures. The results-return
capture predates the final input-keyup guard and accessible pause description;
its visual layout is identical. Other selected captures use the final runtime.
Native button hit/focus alignment, real browser `measureText` glyph bounds and
Pause's DOM text range were checked in addition to screenshots. Focus is verified
with Playwright `toBeFocused`, not inferred from canvas selection.

## Automated validation

Raw command logs, reports, screenshots and failed traces are retained in the
assigned coordinator evidence directory `m7-214-evidence/`, outside this repo.
Local reports have null source-revision metadata; the source/bundle hash manifest
provides local provenance. CI must verify its immutable merge checkout separately.

| Cohort / command | Observed result |
| --- | --- |
| RED: `npm test -- tests/pause-menu.test.ts` before production edits | 2 new failures, 3 passes: absent independent settings and map-safe targets |
| RED: Chromium `--grep 'visible Pause exposes'` on unchanged production bundle | Fails because Pause is absent |
| RED: input resume / final-keyup probes | Missing resume boundary first; then released movement was incorrectly restored |
| GREEN: focused pause/input/frame unit checks | 15 passes; final input file 9 passes |
| Final `npm test -- --maxWorkers=2` | 57 files, 1,045 tests pass |
| `npm run test:ci` | 57 pass, zero skips |
| Final `npm run typecheck` and `npm run build` | Pass |
| Initial focused Chromium cohorts | 8/9 and 13/14 pass; focus restoration and obsolete geometry assertions diagnosed and repaired |
| Bounded three-engine candidate, 2 workers | 66 pass, 5 fail, 1 skip; all failures retained |
| Final viewport and changed boundaries, all engines, 1 worker | 15/15 pass, zero skips |
| Isolated WebKit word regressions, unchanged assertions/timeouts, 1 worker | 2/2 pass |
| Final native Pause case including 320×240 reduced motion, all engines | 3/3 pass |

The three candidate viewport failures came from reading gameplay coordinates while
paused after routing settings into Pause; the test now resumes, retains the same
coordinate assertion, then reopens Pause for its complete screenshot/geometry
checks. Two WebKit word cases reached the existing 30-second test deadline after
17–21 seconds reaching results and progressing through the intended UI. Their
isolated rerun passed in 55.6 seconds total without changing timeouts, retries,
assertions or engines. This does not erase the original failures or certify full
CI. The single skip was Firefox's native AudioContext backend probe, with its
existing explicit host-capability reason.

The first sandboxed full unit run reported Python `spawnSync EPERM` in two files
and a missing new presentation collaborator in the frame fixture. The fixture
was updated, Python-dependent files passed with command-scoped permission, and
the final full suite passed. Early browser setup failures could not start the
local server in the sandbox; permitted runs retained the actual RED/GREEN traces.
No test coverage, retry, assertion or timeout was weakened. Inherited #162 capture
paths now write to cohort output rather than rewriting historical tracked images.

## PR227 review revision

The initial fresh Claude Code / `claude-opus-5-5` review of `b3c1fc6` completed
(session `3caec2ad-f001-4c47-84ed-19fb00286e6b`) with one blocker: this PR had
modernized rows in the historical, waived manual worksheet. The review found no
blocking runtime defect and refuted the old-key-repeat concern. This revision
restores `docs/RELEASE-MANUAL-CHECKLIST.md` byte-for-byte from base
`4bdc723ba2a3d303e1ee51d87070f70d3a4c020d`, including its existing historical
scope. It does not correct older worksheet drift or certify new manual checks.
Current control instructions remain in README and gameplay/audio requirements.

Two bounded browser characterizations now cover real Tab navigation to Pause
with Space and Enter held across native focus onto Resume, repeats and keyup,
unchanged settings, and fresh Resume with 30 subsequent frames checked for a
transient jump. Two more cases exercise an old ArrowRight held through
Pause and Escape or native Enter-on-Resume, observe normal braking after Resume,
then verify a repeat before keyup cannot restart movement. A released and fresh
press must move. The existing direct-focus/Enter witness is retained unchanged.
These characterize already-correct behavior; they are not new RED/GREEN fixes.

Revision results (raw reports, per-case native key JSONL and frame observations
are in `m7-214-revision-evidence/`, outside the checkout):

| Command / probe | Observed result |
| --- | --- |
| `npx playwright test --workers=1 --grep 'pause characterization:'` | 12/12 pass across Chromium, Firefox and WebKit; zero skips/retries |
| Focused input/pause/HUD/frame/feedback/interface unit suite, one worker | 6 files, 70/70 pass |
| `npm run typecheck` | Pass |
| Isolated actual-source repeat-guard removal, one Chromium case | Expected sensitivity failure: repeat restarted velocity at 31 instead of 0; candidate code never mutated |
| Historical checklist comparison and runtime/bundle/PNG/provenance hashes | Exact base checklist; all 106 snapshotted immutable files unchanged |

The sensitivity copy retained the actual application, assets and Vite settings;
only BrowserInput's repeat early-return was removed from its application source.
Its failed trace, mutation patch and bundle remain isolated evidence, and its
copied source was restored after the check. No original failure or previous
cohort was erased. No full local browser matrix, full unit/scripts rerun or
candidate build was needed for this tests/docs-only revision. The accepted eight
PNGs, capture origins and source/build/image provenance bytes are unchanged.
The original 66/5/1 candidate cohort above remains historical evidence.

## Rumble fixture revision at `e7739c2` (historical)

Historical full CI run `40207087818` at `b3c1fc6` completed with 469 browser
passes, one failure and one existing capability skip (471 configured cases).
The failure was the renewed-positive rumble assertion: expected more than one
actuator call, observed one after its existing 10-second assertion wait. It was
not established as a whole-test deadline or infrastructure failure. The runtime
and affected test were unchanged at `4844549`, so the earlier head does not
invalidate that failure. One unchanged local pass was nonreproduction, not a fix.

A bounded actual-app scheduling fixture demonstrated that a fresh synthetic axis
emitted immediately after Resume, before any neutral gamepad poll, can remain
blocked by the existing input-clear contract. Forcing that ordering with the old
driver reproduced the same positive assertion failure. An observed neutral poll
followed by a fresh axis restored movement and a real damage pulse. This proves
a fixture defect; it does not establish the precise historical CI ordering.
The historical logs, trace selection and diagnosis remain untouched.

The affected test now waits for an actually observed `navigator.getGamepads()`
neutral poll after each Resume before emitting fresh direction. Its off phase
requires actual rendered movement and stable health decreasing from two to one,
then verifies no actuator output. Heart-interior pixels are read from the real
canvas; every yellow or unrecognized frame is ignored, so invulnerability or
recovery highlighting cannot manufacture lost health. The on phase requires
movement, renewed damage output with the original exact pulse parameters and
changed stable health. Sound remains explicitly muted. Pause, focus-loss and
disconnect assertions remain, as do the original timeouts, retries and engines.
No production input, rumble, gameplay, UI, asset, configuration or bundle changed.

Current bounded results (raw reports, per-frame RGB/position/health observations
and actual poll/actuator JSONL are in `m7-214-rumble-fix-evidence/`):

| Command / sensitivity | Observed result |
| --- | --- |
| `npx playwright test --workers=1 --grep 'controller damage rumble is independent of audio\|pause characterization:'` | 15/15 pass: affected case and all 12 native cases across Chromium, Firefox and WebKit; zero skips/retries |
| Same-event-turn forced axis after second Resume, corrected driver | Chromium passes with real movement, stable health 3→2→1→3 and renewed damage pulse |
| Isolated actual-source ignore-opt-out mutation | Expected failure at exact off-state actuator equality after real movement and stable health 2→1 |
| Isolated actual-source broken-re-enablement mutation | Expected renewed-positive failure: >1 actuator calls required, one observed after the unchanged 10-second wait; movement and damage still observed |
| Focused input/pause/HUD/frame/feedback/interface units, one worker | 6 files, 70/70 pass |
| `npm run typecheck` | Pass |

The scheduling fixture deliberately controls one ordering; it is not a replay of
historical CI. Sensitivity copies use actual application source and assets and
retain their mutation patches, bundles and failed traces outside the checkout.
An initial sensitivity setup attempt stopped because port 4179 was occupied;
its report/log is retained, and the existing process was left alone. A checked
unused port was used for the actual opt-out probe. No blind retry loop was run.
The accepted eight PNGs and source/build/image provenance remain byte-identical.
No candidate build or full local browser suite was run for this test/docs change.

The independent fresh Claude Code / actual Opus5.5 review of `4844549` passed
without blockers, and its 70 unit/typecheck checks plus the coordinator's 12
native browser passes remain historical evidence after this revision. The
original 66/5/1 local cohort is retained above. A new head requires fresh review
and full CI/artifact verification; neither prior review nor pending CI approves it.

## Final fixture review revision

Fresh Claude Code / actual Opus5.5 review of `e7739c2` (session
`8233af43-c5bf-4d3a-aee9-d9fec843853b`) failed on two test-fixture blockers.
The following full-CI results are separate historical cohorts, not approval of
this revision:

| Head / run | Browser result |
| --- | --- |
| `b3c1fc6` / `40207087818` | 469 pass, 1 fail, 1 existing skip; 471 configured |
| `4844549` / `40209575503` | 480 pass, 2 fail, 1 existing skip; 483 configured |
| `e7739c2` / `40213217693` | 481 pass, 1 WebKit fail, 1 existing Firefox skip; 483 configured |

The retrieved e773 WebKit actuator log records initial damage at 4875 ms,
spring's first pulse at 7582 ms and its second at 7627 ms. It has no X position;
which spring fired remains unconfirmed. Treating the next call after re-enabling
rumble as damage was incorrect. The revised test classifies exact known spring
and star pulses before requiring an exact new damage pulse (100 ms, strong .55,
weak .3, start delay zero). Unknown pulses, wrong damage parameters and orphan
spring tails fail. Spring's second pulse may be absent under the existing expiry
policy; the classifier does not add a delivery-timing guarantee.

Both initial and renewed damage must now fall between adjacent stable rendered
health observations that show loss, or defeat recovery from one to three hearts.
Yellow/unknown frames remain excluded. A health transition elsewhere in time
cannot satisfy that pulse. This tightens the real damage witness while retaining
actual movement/contact in the Off phase, exact no-output equality, muted-sound
independence and pause/focus/disconnect checks. The original 10-second positive
assertion limits and 30-second rumble case limit remain unchanged.

The uniform viewport pilot also had a latent Resume boundary: fresh held axis
could arrive before any neutral poll after input clear. The shared pilot now
records actual `getGamepads` calls. A fresh-controller helper stops only synthetic
pilot controls, exposes a neutral pad and requires a later actual neutral poll
before fresh controls. The viewport route, fullscreen Start, fullscreen landmark
navigation and controller replay/route starts use it. Existing route, results,
geometry and finish assertions remain. No new application clock, scene, player
or private-state mutation was added; the pilot's existing time wrapper is intact.

A permanent three-engine witness forces pilot activation in Resume's click event,
observes more than 30 real polls while the required guard holds the player at
X60/Y164/V0, then acknowledges neutral and requires fresh controls to move.
A separate unchanged-driver scratch probe failed its movement predicate in that
ordering; the corrected-driver comparator passed. These demonstrate the mechanism,
not the exact historical CI poll sequence, which was not recorded.

Current bounded results are retained in `m7-214-fixture-final-evidence/` outside
the checkout. Reports identify the unchanged served runtime as `e7739c2`; test
file hashes and the handoff identify the new test revision separately.

| Check | Actual result |
| --- | --- |
| Classifier RED using an extraction of the old first-call assumption | 4 failures / 4 passes; not a production defect claim |
| Final classifier and relevant input/pause/HUD/frame/feedback/interface/rumble units | 8 files, 96/96 pass |
| Actual rumble case, all three engines | 3/3 pass |
| Uniform viewport + four native Pause characterizations, all engines | 15/15 pass |
| New permanent pilot witness, all engines | Initial 3 failures from an incorrect contiguous status substring; corrected parsing retains Playing and exact X/Y/V, then 3/3 pass |
| Unsafe / acknowledged same-event-turn pilot scratch comparator | Expected movement failure at X60 / Chromium pass, unchanged 5-second predicate |
| Isolated actual-source damage-as-known-spring sensitivity | Expected failure: real movement and health 3→2 occurred, legitimate non-damage calls did not satisfy exact damage within 10 seconds |
| Audited shared-pilot callers and final rumble recheck | 18/18 pass across Chromium, Firefox and WebKit; zero skips/retries |
| Script suite | 57/57 pass with command-scoped permission; earlier sandbox aggregate failures retained |
| Typecheck | Pass |

The new witness's three initial status-text failures, both sandbox script-file
failures and an early scratch build request with a nonexistent working directory
are preserved separately from intentional RED/sensitivity failures. The script
file passed unchanged with command-scoped permission before the full script
suite passed; its initial aggregate failure provided no narrower error, so no
specific infrastructure cause is asserted. No existing predicate, retry,
assertion timeout, case deadline or engine was weakened.

Across the completed focused reports, 36 distinct engine-qualified cases passed
(12 per engine); repeated rumble checks are not counted twice. The original
15-pass/3-failure cohort remains separate, with its three new-witness text failures
resolved only by the narrow three-engine rerun.

The configured matrix is 486 cases after the new three-engine pilot witness;
listing is not full local execution. No full local browser suite or candidate
build was run. The isolated sensitivity copy's source was restored; its patch,
bundle, actual RGB/health/poll/actuator logs and failed trace remain evidence.
All eight accepted PNGs, source/capture manifests, runtime/build bytes and the
historical base-exact worksheet remain unchanged. Fresh new-head review and full
CI/artifact/source/identity/count/skip/tested-merge verification remain pending
with the coordinator. Previous-head review and CI cannot approve the new head.

## Limits and remaining gates

Controller input and rumble actuator calls are simulated; they are not physical
controller or haptic acceptance. Native Web Audio API checks are not speaker or
headphone listening. No owner/child navigation, installed desktop browser matrix,
physical fullscreen/device acceptance or phone/touch policy was performed. #213's
unobserved owner/child gate is unchanged. No historical dated worksheet is updated.

The initial review's docs-only blocker was resolved at `4844549`; fresh review
and new-head full PR CI/artifact/source/count/skip verification remain with the
coordinator. CI runs `40207087818` (`b3c1fc6`, failed) and `40209575503`
(`4844549`) are historical for this revision. Pending CI is not green. No
merge, issue closure, deployment, release or #215 work is authorized to this worker.
