# Spring contact and replay verification — issue #61

Release-tracking reference: #8. Tested on 2026-09-16 against base `9dc89b6`
on Ubuntu 26.04.1 LTS, Node 22.22.1.

The pre-fix regressions produced 11 spring events during one sustained contact
and retained camera X=9554 after replay instead of returning to X=0.

The fix tracks each spring's current contact separately from entity availability.
Both gameplay scenes report contact and separation every step. Recovery and new
runs clear contact state. Replay resets the camera before displaying the title.
The level-parameter refactor in #27 remains separate; its future shared level-load
path should preserve this immediate camera reset.

Validation:

- `npm test`: 116 passed, including sustained contact, re-contact, independent
  springs, recovery/new-run rearming, both gameplay scenes at input strengths
  0, 0.25 and 1, and keyboard/simulated-controller replay state.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:browser`: 68 passed, 1 skipped, 0 failed. Chromium 153.0.8010.12,
  Firefox 155.0 and WebKit 26.6 each completed the route and matched the replay
  title canvas pixel-for-pixel to the initial title canvas.
- Firefox's existing native-audio test skipped because its AudioContext could not
  start on this host. Physical controller and audible-output checks were not run.
- Independent code review found no blocking issues.

The initial sandboxed unit command could not spawn Python for the existing
sprite-processing test. The successful full suite ran with that permission.

Replay evidence: [Chromium starting view after replay](evidence/issue-61/replay-starting-view.png).
These checks retest #61; they do not certify the full manual release matrix in #8.
