# Issue #93 — optional signature challenges

Based on fetched remote main `f9b1b25` (PR #117), in an isolated worktree.
The original checkout was preserved. See [route design](../../signature-challenges.md)
and [art provenance](../../../assets/source/specials/PROVENANCE.md).

## Verification

- `npm test`: 519 passed, 30 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Full local browser command: `npm run test:browser -- --workers=2 --reporter=line`: **115 passed, one existing native-audio skip, 58 Firefox launch failures** (15.6 minutes). All Chromium/WebKit checks passed, including all nine stars and native/small captures. [Machine-readable local results](local-results.json).
- Windows Firefox fails before opening a page with `browserType.launch: spawn
  UNKNOWN` at the bundled `firefox-1543/firefox/firefox.exe`. This matches the
  host limitation documented in PR #117. Hosted Linux CI supplies the required independent Firefox
  environment; no assertions, retry counts or repository security settings changed.

Automated checks exercise all nine stars from real level starts through ordinary
keyboard/directional/jump inputs, separate once-only counts, pit/health recovery,
Replay / Next trail / Choose trail, reload and trails without stars. Unit failure
cases reverse, stop or walk off each challenge and then return to the route.
Lift checks cover three boarding positions across six cycle phases, with no jump.
Landing-band checks cover continuous terrain and complete hazard patrol extents.

The browser pilot observes the public debug position, dispatches keyboard events
and uses the shipped fixed-step simulation. It never accesses a live scene,
teleports Henry, grants a reward, disables hazards or edits run progress. It
accelerates the animation timestamp outside the challenge region and freezes that
timestamp during screenshots, preserving a real gameplay frame for both sizes.
This is automated traversal, not human or Henry playtesting.

## Inspected visual evidence

Runtime is commit `cefe4ba`. The 24 Chromium captures in [chromium/](chromium/)
cover both **426 × 240 native** and **320 × 240 small-window** layouts. Six
additional [WebKit samples](webkit/) cover all three challenges and small finish
screens. Complete per-test captures are also uploaded by the browser workflow.

| View | Native | Small window |
| --- | --- | --- |
| Plains slope / 0 stars | [426](chromium/plains-challenge-1-426.png) | [320](chromium/plains-challenge-1-320.png) |
| Plains runout / 3 stars | [426](chromium/plains-challenge-2-426.png) | [320](chromium/plains-challenge-2-320.png) |
| Quarry lift approach | [426](chromium/quarry-challenge-1-426.png) | [320](chromium/quarry-challenge-1-320.png) |
| Quarry shelf / 2 stars | [426](chromium/quarry-challenge-2-426.png) | [320](chromium/quarry-challenge-2-320.png) |
| Timbers first spring | [426](chromium/timbers-challenge-1-426.png) | [320](chromium/timbers-challenge-1-320.png) |
| Timbers first landing / 1 star | [426](chromium/timbers-challenge-2-426.png) | [320](chromium/timbers-challenge-2-320.png) |
| Timbers second spring / 2 stars | [426](chromium/timbers-challenge-3-426.png) | [320](chromium/timbers-challenge-3-320.png) |
| Timbers third spring | [426](chromium/timbers-challenge-4-426.png) | [320](chromium/timbers-challenge-4-320.png) |
| Timbers third landing / 3 stars | [426](chromium/timbers-challenge-5-426.png) | [320](chromium/timbers-challenge-5-320.png) |
| Plains finish | [426](chromium/plains-finish-426.png) | [320](chromium/plains-finish-320.png) |
| Quarry finish | [426](chromium/quarry-finish-426.png) | [320](chromium/quarry-finish-320.png) |
| Timbers finish | [426](chromium/timbers-finish-426.png) | [320](chromium/timbers-finish-320.png) |

Inspection checked star/gem silhouette separation, readable signs and landing
bands, HUD separation from hearts/gems/notices, and all result/action labels
inside the viewport. No clipping or overlap between the star counter and other
HUD/result controls remained. World sprites can briefly pass in front of signs.
Windows WebKit's small monospace raster is coarser than Chromium's; native
screenshots are included rather than implying identical rasterization.

Reproduce after `npm ci` and `npm run build`:

`npx playwright test --grep signature --workers=2`

Images are generated in each test's `test-results/` directory. The tests require
3/3 results, exercise Replay/Next/Choose across the three trails and assert zero
after a fresh start and reload. They do not use test retries.

## Investigation record

Early contact/traversal tests caught missed approaches; the pilot learned to stay
on the raised Quarry shelf rather than jumping at hazards below it. Screenshot
inspection then caught a Plains star overlapping a rock hazard and a Quarry star
overlapping an ordinary gem. Plains now uses the clear early downhill and Quarry
stars sit along the shelf. Visual inspection also moved Timbers landing signs out
of ordinary gem art. The Plains patrol no longer enters the marked safe runout.

An early browser capture used Escape and briefly resumed to take pictures; this
could alter a spring approach or capture the pause panel. It was replaced by
freezing render time. A subsequent fixed-time-per-render driver progressed too
slowly on Windows WebKit and timed out; the final driver follows the existing
browser pilot's wall-clock strategy outside challenges. Interrupted development
runs are not reported as passing. All final assertions retain full 3/3 results,
finish navigation and reset checks, with zero Playwright retries.

## Remaining human checks

Henry has **not** tested this milestone. A parent-led check of recognizing the
stars/signs and enjoying the optional routes remains a useful usability check.
No physical controller hardware or Safari on macOS session is claimed; Playwright
WebKit is automated engine coverage. No merge, deployment or release is included.

## Hosted validation

[PR #118 checks](https://github.com/auleewilliams/TinyTurboTrails/pull/118/checks)
run the complete Chromium, Firefox and WebKit matrix with zero retries and upload
`browser-test-results`. The PR description records the completed hosted run and
exact totals. The evidence follow-up changes documentation and strengthens the
independent gem/star assertion; runtime source is identical to `cefe4ba`.
