# Tablet touch prototype — issue #251

The branch was rebased onto main's merged Frost/HUD update on 2026-11-10.
[Current rebase verification and captures](rebase-main-20261110/README.md)
record 2,234 unit, 161 script and 19 affected browser passes, plus two expected
browser skips. The original validation and mockups below remain historical
evidence from the earlier base; physical iPad acceptance is still pending.

Initial physical target: **13-inch iPad Air**, landscape, with Safari as the
proposed browser. The generation/chip and installed iPadOS/browser versions have
not been reported. Phone-specific work and a portrait-specific redesign are deferred.

## Try the prototype

Run `npm run dev` and open the adventure. Touch controls automatically appear on
touch-capable devices. `/?touch=1` enables the same controls for mouse-based desktop
inspection; `/?touch=0` starts with them off. The Touch button changes the choice
for this session only. The prototype does not introduce storage or a backend.

Left/right and Jump support simultaneous fingers, held higher jumps, pointer
capture, cancellation and release. Pause, focus loss, screen/activity transitions,
mode changes and resizing clear touch gestures. A separate footer leaves the
entire 426×240 camera unobstructed and proportional. Keyboard/controller bindings
remain available. Touch-specific prompts cover the map, HUD, Pause and results.

## Mockups and art

Open [the two-view mockup](tablet-mockups.html), or inspect
[gameplay](tablet-gameplay.png) and [Pause](tablet-pause.png).

These are captures of the running prototype in automated WebKit at a representative
1366×1024 CSS-pixel viewport. They show actual gameplay and Pause states, without
mocked game state. The in-thread mockup scales those captures to fit the conversation.
The shared preview screenshot checker was unavailable because the host blocked its
sandbox; the HTML mockup was still rendered inline, and Playwright produced the captures.

No new artwork is required for this prototype. Normal/held button states reuse the
existing illustrated interface kit; symbols are text. See the
[provenance record](../../../assets/source/touch-controls/README.md).

## Verification

The first focused browser run exposed an intercepting transparent footer and a
misunderstood CDP touch-end payload. Both were corrected. The next focused run
passed **7 checks**, with **2 explicit skips** for multi-contact injection outside
Chromium. It covered mouse-held pointer capture, cancellation, focus loss,
rotation/resize, mode changes, tap menus and automatic touch capability detection
in Chromium, Firefox and WebKit. Chromium also injected two native touch contacts
for simultaneous movement/jumping and independent release. Its log and compact
report are retained alongside these captures. This run predates the additional
keyboard-toggle/pause-held integration assertions.

Initial unit/script runs correctly rejected changed runtime source identities in
historical artwork pins and an unstubbed touch UI collaborator in the education
frame harness. Exact reversible tablet-feature projection now preserves the old
oracles; the frame harness stubs only the new presentation collaborator.

During concurrent verification, three existing Plains soil tests exceeded
their unchanged five-second deadlines; the next full run had one soil timeout.
The isolated original five-case soil file then passed without assertion/deadline
changes. Final validation results are recorded below.

A later two-worker unit run hit the same unchanged deadlines in three image-heavy
finish-layout checks and was interrupted. The final serial unit run passed all
cases without assertion, retry or deadline changes.

The first full browser run found a real regression: hiding tablet controls also
cleared the shared buffered confirmation, so short keyboard/controller presses
could disappear between simulation steps on the map/results. That run stopped
after 114 passes and three failures, with two interrupted cases and 769 cases not
run. Those states are retained in `interrupted-browser-summary.json`; original
traces are retained at its recorded task-scratch location. The fix removes the
unrelated shared-buffer cleanup. A deterministic test of the shipped frame and
touch UI synchronization now checks that a brief map confirmation survives
frames without a simulation step. Its focused 39-case run passed. Earlier failed
and interrupted checks are not counted as final passes.

After the fix, all **2,163 unit tests** and **143 script checks** passed. Typecheck
and production build passed. A focused browser regression run passed **16 cases**
across Chromium, Firefox and WebKit, with **2 explicit skips** for non-Chromium
native multi-contact injection. It includes all three formerly failing browser
checks in all three engines, plus the tablet tests and additional keyboard-toggle
and pause-held assertions. The complete browser suite follows that focused run.

## Final results

- Typecheck and production build: passed.
- Unit suite: **2,163 passed**, with one worker and the original test deadlines.
- Script suite: **143 passed**. Untouched source paths retain strict identity
  assertions; only the exact recorded tablet feature projects through old artwork
  oracles.
- Focused tablet/input regression suite: **16 passed, 2 explicit skips**.
- Complete browser suite, four workers: **865 passed, 20 failed, 3 skipped**.
  All seven tablet cases passed; the two tablet skips are native multi-contact
  injection outside Chromium. The other skip is the existing Firefox audio-backend
  condition. This run is **not a clean full-suite pass**.
- Manual serial recheck of those 20 failures, with unchanged assertions, deadlines
  and retries: **18 passed, 2 failed**. Both remaining failures are WebKit's
  `Cove B Hollow/Pools ordinary input rests` at 426px and 320px, exceeding the
  existing 120-second test deadline.
- Negative control: both Cove cases also failed on a separate checkout of the
  original, unmodified **e18c293c308b44d211d67a851e23c510fddc7f46** base, with
  the same dependency lock and installed dependencies, the same WebKit project and
  one worker. Those persistent failures predate the tablet implementation. The
  temporary checkout was removed after preserving its evidence.
- Mockup HTML: both images loaded; Gameplay/Paused view switching passed without
  browser errors.

The original full run, serial recheck and base comparison have separate logs and
compact JSON summaries here. Original reports/traces are preserved in the
task-scratch directories named by those summaries. The 18 subsequent passes do
not relabel the full run's 20 failures as passes. `tested-source.json` records the
actual uncommitted prototype source hashes. No test deadlines, retries or route
assertions were weakened to obtain these results.

This prototype is ready for design review and a physical iPad playtest. The
parallel browser stability findings and the existing Cove test failures remain
visible follow-up work before treating the feature as release-ready.

## Physical iPad follow-up

Automated WebKit and representative viewport captures do not establish Safari on
the physical iPad, thumb comfort, audio-hardware operation or device performance.
Use the intended player's iPad for a representative trail playtest, recording the
actual iPadOS/browser versions. Check short and held jumps while moving, reversing
direction, comfortable reach, visible landing areas, tap menus/word-building,
audio, background/foreground interruptions and browser chrome/rotation changes.
The stable supported-device policy remains desktop/laptop until tablet acceptance
is deliberately established. No deployment or release was performed.
