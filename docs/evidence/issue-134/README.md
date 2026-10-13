# Trail progress ribbon — issue #134

The gameplay HUD adds a 136 × 14 logical-pixel ribbon below the brief control
hint, at `(5, 54)`. Henry's green-haired marker moves along a pale rail toward a
finish flag. Checkpoints appear as hollow posts and fill gold only when their
activation events arrive. The ribbon has no text or numbers, and its fixed
position avoids jumping around as hints expire.

The dark backing and pale outlines keep it readable against all six trail
palettes. It uses less than 2% of the 426 × 240 playfield and stays within the
existing left HUD cluster, clear of reward panels, hints, location notices and
the checkpoint notice. Native and small-window review supports keeping it: it
answers how far Henry has travelled without adding another label or counter.

## Position and checkpoint behavior

Position maps `level.start.x` to zero and `level.finish.x` to one, using the
same player-origin boundary as the adventure finish trigger. Pixel rounding
keeps Henry one pixel short of the flag until that boundary. The gameplay HUD
is replaced by the finish panel on completion; the ribbon is absent on both
the map and finish panel.

Checkpoint fills use a small set of activated IDs inside `HudPresentation`.
Position alone cannot prove activation: Henry can bypass a flag's contact
region, and backtracking must not unfill an activated post. `RunState` holds
only the current recovery flag, so it cannot reconstruct this history either.
Presentation consumes existing events without changing simulation or storage.
Each new run creates a fresh HUD, clearing the set for Replay, Next trail and
map selection. Recovery moves the marker back to the recovery flag while
preserving activated posts, including a later flag after backtracking.

## Reproduce the captures

Open `/?debug=1`, dismiss the opening story, select a trail and press its Play
button. Capture at the start, then move right and jump over hazards until the
first checkpoint activates. Repeat at browser viewports 426 × 240 and 320 × 240.
The small window proportionally scales the same logical canvas and letterboxes
it; it does not crop the ribbon.

The `milestone` Playwright tests drive the real keyboard/controller input
boundary with an accelerated animation clock, freeze simulation just after the
first checkpoint and capture both viewports. They observe real Canvas drawing
without exposing production scene state or teleporting Henry, then complete
the route three times to verify Choose trail, Replay and Next trail resets.
The observer batches complete samples and writes attributes only on changes,
avoiding intermediate DOM mutations that would otherwise inflate Playwright
traces and slow the input pilot. Per-canvas samples decide absence after each
opaque scene render, so map/finish labels cannot conceal unexpected ribbon
drawing and translucent pause overlays cannot erase a valid sample.

| Trail | Native start | Small start | Native checkpoint | Small checkpoint |
| --- | --- | --- | --- | --- |
| Plains | [426](chromium/plains-ribbon-start-426.png) | [320](chromium/plains-ribbon-start-320.png) | [426](chromium/plains-ribbon-checkpoint-426.png) | [320](chromium/plains-ribbon-checkpoint-320.png) |
| Quarry Run | [426](chromium/quarry-ribbon-start-426.png) | [320](chromium/quarry-ribbon-start-320.png) | [426](chromium/quarry-ribbon-checkpoint-426.png) | [320](chromium/quarry-ribbon-checkpoint-320.png) |
| Treetop Timbers | [426](chromium/timbers-ribbon-start-426.png) | [320](chromium/timbers-ribbon-start-320.png) | [426](chromium/timbers-ribbon-checkpoint-426.png) | [320](chromium/timbers-ribbon-checkpoint-320.png) |
| Sunset Site | [426](chromium/sunset-ribbon-start-426.png) | [320](chromium/sunset-ribbon-start-320.png) | [426](chromium/sunset-ribbon-checkpoint-426.png) | [320](chromium/sunset-ribbon-checkpoint-320.png) |
| Frost Ridge | [426](chromium/frost-ribbon-start-426.png) | [320](chromium/frost-ribbon-start-320.png) | [426](chromium/frost-ribbon-checkpoint-426.png) | [320](chromium/frost-ribbon-checkpoint-320.png) |
| Sandy Cove | [426](chromium/cove-ribbon-start-426.png) | [320](chromium/cove-ribbon-start-320.png) | [426](chromium/cove-ribbon-checkpoint-426.png) | [320](chromium/cove-ribbon-checkpoint-320.png) |

Screenshots come from the production build in Chromium, with no new generated
game assets. Firefox and WebKit run the same behavior and screenshot checks.

## Validation

- `npm test -- --maxWorkers=4 --testTimeout=15000`: 630 tests passed. The initial
  sandboxed run blocked the existing Python atlas tests; with subprocess access,
  the existing finish-layout tests still exceeded their default five-second
  timeout on this host. The command above passed without repository timeout
  changes.
- `npm test -- tests/feedback.test.ts`: all 29 tests passed after strengthening
  the backtracking/recovery assertion.
- `npm run typecheck` and `npm run build`: passed.
- Full browser-suite results and independent review are recorded in the PR.

Focused unit coverage checks all trails' start/midpoint/finish mapping, real
checkpoint positions, skipped checkpoints, repeated activation, backtracking,
recovery, fresh-run resets, ribbon layout against all notices and the control
hint at both viewport sizes, wordless drawing and finish-marker rounding.
