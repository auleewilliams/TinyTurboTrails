# Issue 172 viewport verification

Implementation: local commit `a7f7056`, based on main `02e200f` (including sign
removal and browser scheduling). Verification ran on Windows Urza on 2026-10-14
UTC. No push, PR publication, merge or deployment was performed for this issue.

The canvas remains 426×240 internally. Uniform fractional fitting maximizes the
complete game view, with dark margins. Mute and rumble stay outside the canvas:
natural margins are reused first; when necessary the larger fit above or beside
a compact measured control rail is chosen. The normal buttons are 114×36 CSS
pixels together, with small gaps. No camera, simulation, artwork or level data
changed. Non-integer scales can give pixel columns/rows uneven displayed widths;
this is the approved scaling tradeoff.

| Check | Result |
| --- | --- |
| `npm ci` | Passed; lockfile unchanged |
| `npm test` | 693 passed, 37 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run test:ci` | 8 passed |
| Full Chromium/WebKit browser suite, two workers, zero retries | 176 passed, 1 skipped, 1 failed in 17.9 minutes |
| Isolated WebKit Quarry diagnostic, one worker | 1 passed in 30.0 seconds; no changes |
| WebKit Quarry + Treetop diagnostic, two workers | 2 passed in 33.3 seconds; no changes |
| Firefox smoke launch | Blocked before page creation: `browserType.launch: spawn UNKNOWN` |

The new browser matrix checks story, map, gameplay, pause and finish at
2048×1178, 1366×768, 1280×720, 1024×768, 2560×1080, 2040×1080, 852×480,
426×240, 320×240 and 390×844 CSS pixels. It checks the fixed logical camera,
uniform scale, maximum safe fit, visible settings, no canvas/settings overlap,
no document overflow, and native menu rectangles and pointer hit targets after
resizing. Pointer map selection, pause confirmation, keyboard settings and the
existing input-only controller pilot exercise real scene transitions through
finish and back to the map. App fullscreen checks retain native menu targets and
both settings; controller Start pauses within fullscreen because Escape exits
fullscreen in WebKit. Windowed keyboard Escape remains covered.

Both new tests passed in both engines. The full run had 89 Chromium passes and
87 WebKit passes, one WebKit native-audio skip, and one failure in the existing
`signature QUARRY RUN: nine-star route, native/small evidence and fresh navigation`
case. It reached Finish with `STARS 0/3`, rather than the asserted `STARS 3/3`.
The trace recorded X=2292/Y=63 at the first challenge stop and X=2490/Y=86 at the
second; the second capture shows Henry below the star shelf. The route test body,
terrain, camera and simulation are unchanged by this patch. The isolated rerun
and one two-worker run with the neighboring Treetop case passed without changes.
The cause of the full-run failure is not established; the diagnostics do not
replace that result or justify claiming a clean full-suite pass. The process
continued through the reported Urza disconnect and finished without recovery or
a duplicated complete run after that disconnect.

The exact command was `npm run test:browser -- --project=chromium --project=webkit
--workers=2 --output=test-results/viewport-rebased --reporter=line,json`, with
`PLAYWRIGHT_PORT=4182` and the JSON output file set to
`test-results/viewport-rebased/results.json`. The [results summary](browser-results.json)
retains counts, timestamps, diagnostic commands and the original report hash.
The raw report and failed-case trace remain locally under `test-results/viewport-rebased`.

Screenshots are unmodified full-viewport captures from the production build in
local Playwright engines. Chromium is 153.0.8010.12; WebKit is 26.6. The matrix
records actual CSS viewport, canvas bounds and device pixel ratio as JSON test
attachments and in [viewport-metadata.json](viewport-metadata.json); these captures
use DPR 1. At 2048×1178, both engines measured a 2012.84375×1134 canvas (the old
integer-fit calculation at that CSS size is 1704×960). Installed-browser/Safari-on-macOS coverage
and physical-controller testing are not claimed.

Inspected representative captures:

- [Gameplay at 2048×1178](chromium-gameplay-2048x1178.png): substantially larger
  playfield than the former integer fit; complete HUD and ribbon, separate controls.
- [Gameplay near a wide-window threshold](chromium-gameplay-2040x1080.png):
  side rail retains more game area than a bottom rail.
- [Map at 320×240](chromium-map-320x240.png): complete map, Play/story targets and
  both settings remain visible.
- [Pause at 320×240](chromium-pause-320x240.png): resume and return actions stay
  clear of the settings.
- [Finish at 426×240](chromium-finish-426x240.png): results, reunion picture,
  celebration and all finish actions remain inside the camera.
- [Portrait story at 390×844](webkit-story-390x844.png): the complete story and
  settings remain visible, with deliberate dark vertical margins.
- [Ultrawide map at 2560×1080](webkit-map-2560x1080.png): the camera uses the full
  height and the controls reuse the side margin.
- Fullscreen pause in [Chromium](chromium-fullscreen-pause.png) and
  [WebKit](webkit-fullscreen-pause.png): menu actions and both settings remain
  visible and usable inside app fullscreen.
- The [original WebKit Quarry failure](webkit-quarry-full-run-failure.png) and
  [passing isolated finish](webkit-quarry-isolated-finish-426x240.png) retain the
  differing star results for review.

The original Library screenshot's CSS viewport and DPR remain unknown. These
captures exercise the verified layout mechanism, without claiming an exact
reproduction of that physical window. The original Library materialization was
not retried after the previously reported unsupported Windows `os.setxattr`
failure. Local Firefox was attempted once and failed to launch; no host repair
was attempted, and no Firefox assertions ran. Three-browser CI for this patch
remains outstanding because publication is not authorized.
