# Issue 162: Return to Trails from pause

The active-trail pause menu now includes Resume and Return to Trails. It uses
the existing canvas palette and native button overlays for pointer, Tab, Enter,
Space and controller selection.

Press Escape (or controller Start) to pause, then T to request a return.
The confirmation explains that the current run resets, while completed trail
results stay recorded for this session. Press T again to leave, or Escape/Start
to cancel. Pointer users can click the actions; controller users choose with
left/right and select with a face button. Confirmation defaults to Keep playing.
Held T, Enter, Space, face-button and direction input cannot carry through the
confirmation or immediately restart a trail on the map.

Returning keeps the selected destination, clears the run, player, camera,
platforms and presentation state, stops trail audio and releases the user pause.
Starting another trail restores normal gameplay and music. Unfinished runs do
not add completion results, and the map does not show a completion banner.

## Screenshots

Captured from the production build in Chromium by the focused browser tests:

- [Keyboard pause at 426 × 240](keyboard-pause.png)
- [Confirmation at 360 × 240](confirmation-small.png)
- [Controller selection at 1366 × 768](controller-pause.png)

## Validation

- `npm run typecheck` and `npm run build` passed.
- `npm test -- --maxWorkers=2 --testTimeout=15000` passed: 654 tests in 36 files.
  The longer timeout accommodates the existing exhaustive finish-layout test on
  this host. The sprite-processing tests required subprocess access outside the
  filesystem sandbox.
- `npm run test:ci` passed.
- The independent subagent review found no remaining blockers after the held
  Enter and direction guards were fixed. Its focused unit run passed 43 tests.
- Browser coverage exercises keyboard T confirmation/cancellation and repeats,
  pointer/Tab/Enter/Space actions, focus-loss cancellation, controller selection,
  held-action release on the map, fresh run state and trail-audio shutdown/restart.
- The final focused Playwright run passed all 18 checks across Chromium, Firefox
  and WebKit with `--workers=1`. Controller presses await animation frames so
  every edge is sampled reliably on a busy host.
- The full local browser run was interrupted after this host exhausted memory
  during concurrent runs (`ERR_INSUFFICIENT_RESOURCES` and asset-load failures).
  The final focused run uses one browser worker; the complete suite also runs in
  the pull request's Foundation checks workflow before merge.
