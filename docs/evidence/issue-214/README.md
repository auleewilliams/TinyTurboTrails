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

## Limits and remaining gates

Controller input and rumble actuator calls are simulated; they are not physical
controller or haptic acceptance. Native Web Audio API checks are not speaker or
headphone listening. No owner/child navigation, installed desktop browser matrix,
physical fullscreen/device acceptance or phone/touch policy was performed. #213's
unobserved owner/child gate is unchanged. No historical dated worksheet is updated.

The initial review's docs-only blocker is addressed here; fresh re-review and
new-head full PR CI/artifact/source/count/skip verification remain with the
coordinator. CI run `40207087818` belongs to the earlier `b3c1fc6` head and cannot
approve this revision. Pending CI is not green. No
merge, issue closure, deployment, release or #215 work is authorized to this worker.
