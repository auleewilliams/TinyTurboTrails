# Manual release worksheet

Copy this worksheet for each browser/version and input combination in the
[release matrix](RELEASE-VERIFICATION.md#target-matrix-and-remaining-manual-work).
This blank worksheet is not verification evidence. Use **Pass**, **Fail**, or
**Not run** per scenario and attach evidence; do not infer a pass from unit tests.

## Run identity

- Date/time and tester:
- Game commit:
- Browser name and full version (current stable or preceding major):
- OS and version:
- Input: keyboard layout or physical controller model, connection and mapping:
- Display resolution/scaling and audio output device:
- Launch command and URL (`/?scene=adventure`):
- Evidence location (screenshots/video/logs):

## Scenarios

| ID | Action and expected result | Result / evidence / defect link |
| --- | --- | --- |
| 1 | From a fresh checkout follow the README installation, dev launch, build and preview commands. Adventure title loads with no missing assets or uncaught errors. | Not run |
| 2 | Start with Space / primary face button. Move both ways with arrows and A/D / D-pad and stick. Jump, release early for a shorter jump, and pause/resume with Escape / Start. | Not run |
| 3 | Mute with M and the on-screen button; unmute. Listen for music and jump, gem, spring, damage, checkpoint and completion effects. Pause and focus loss suspend sound. | Not run |
| 4 | Resize larger/smaller, including below 426×240. Verify centered letterboxing, no clipping, readable controls and crisp integer scaling where space permits. | Not run |
| 5 | Hold movement/jump, switch away and return. Input clears, no elapsed-time jump occurs, and a deliberate pause is preserved. Disconnect/reconnect the controller; release held controls before resuming. | Not run |
| 6 | Complete the easy main route from title to finish, recording elapsed time and any forced retries. Assess the roughly 3–5-minute target and forgiving timing/control clarity for Henry, age six. | Not run |
| 7 | Traverse at maximum speed in both directions where possible. Inspect each slope join, collision boundary and camera transition for snagging, tunneling, jitter or unreadable hazards. | Not run |
| 8 | At meadow X=570, hillside X=1220 and cave X=1780, inspect marker bases and activate each while grounded. Trigger recovery from each and verify safe terrain contact, zero residual velocity and preserved gems. Record any diagnostic method used if a fall cannot be reached naturally. Retest #26 after its fix. | Not run |
| 9 | Explore optional/hidden gem routes and both springs. Verify reachability, safe return to the main route and no progression traps. | Not run |
| 10 | Inspect every Henry animation/frame and facing direction in art preview and gameplay; check anchors, transparency, seams, foreground/background contrast, hazards and finish celebration. | Not run |
| 11 | Finish with collected gems, check the total and celebration, then replay with Space / primary face button. Start again and verify gems and checkpoint return to fresh-run state. | Not run |
| 12 | Collect gems and activate a checkpoint; reload, start and verify zero gems/default checkpoint. Repeat by closing and reopening the page. Check that no checkpoint/gem storage is created. | Not run |
| 13 | Inspect console and network activity across the route: local assets load, no uncaught errors, external generation/API calls or credential requirements. | Not run |

## Defects and retest

For each failure file a separate issue (check for an existing report first):
include scenario ID, game commit, exact browser/OS/input, reproduction steps,
expected/actual result, evidence, and blocking/non-blocking triage with a reason.
A non-blocking defect needs a link in the README/release notes. Do not fix defects
inside issue #8. Once the fix is closed and integrated, record its commit and
rerun the affected scenarios; retain the original failed result alongside the
retest date and outcome. Close certification only when all required combinations
are executed and no blocking defect remains open.
