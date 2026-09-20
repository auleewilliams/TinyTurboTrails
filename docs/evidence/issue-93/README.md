# Issue #93 — optional signature challenges

Based on fetched remote main `f9b1b25` (PR #117), in an isolated worktree.
The original checkout was preserved. See [route design](../../signature-challenges.md)
and [art provenance](../../../assets/source/specials/PROVENANCE.md).

## Verification

- `npm test`: 519 passed, 30 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Focused Chromium/WebKit signature runs: six passed before the final safe-runout
  patrol bound and landing-sign placement refinement. Complete final browser
  results and screenshots will be recorded after the running matrix finishes.
- Windows Firefox fails before opening a page with `browserType.launch: spawn
  UNKNOWN` at the bundled `firefox-1543/firefox/firefox.exe`. This matches the
  host limitation documented in PR #117. Hosted Linux CI will supply Firefox
  coverage; no assertions, retry counts or repository security settings changed.

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
